import { head, rename } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "webp", "gif", "avif"
]);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;

  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function validImagePath(pathname) {
  if (typeof pathname !== "string") return false;

  const match = pathname.match(
    /^images\/([A-Za-z0-9_-]{1,100})\.([A-Za-z0-9]+)$/i
  );

  return Boolean(
    match && ALLOWED_EXTENSIONS.has(match[2].toLowerCase())
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      error: "Method not allowed."
    });
  }

  try {
    const configuredKey = process.env.AZERST_RENAME_KEY;
    const providedKey = request.headers["x-azerst-rename-key"];

    if (!configuredKey) {
      return response.status(500).json({
        error: "Chưa cấu hình AZERST_RENAME_KEY trên Vercel."
      });
    }

    if (!safeEqual(providedKey, configuredKey)) {
      return response.status(403).json({
        error: "Mã quản trị không chính xác."
      });
    }

    const { from, to } = request.body || {};

    if (!validImagePath(from) || !validImagePath(to)) {
      return response.status(400).json({
        error: "Đường dẫn hoặc tên ảnh không hợp lệ."
      });
    }

    if (from === to) {
      return response.status(400).json({
        error: "Tên mới trùng tên hiện tại."
      });
    }

    const oldExtension = from.split(".").pop().toLowerCase();
    const newExtension = to.split(".").pop().toLowerCase();

    if (oldExtension !== newExtension) {
      return response.status(400).json({
        error: "Không được thay đổi định dạng ảnh."
      });
    }

    // Xác nhận file nguồn tồn tại và là ảnh.
    const source = await head(from);

    if (!source.contentType || !source.contentType.startsWith("image/")) {
      return response.status(400).json({
        error: "File nguồn không phải hình ảnh."
      });
    }

    // rename() không ghi đè file đích nếu tên đã tồn tại.
    const blob = await rename(from, to, {
      access: "public",
      contentType: source.contentType,
      cacheControlMaxAge: 60
    });

    return response.status(200).json({
      success: true,
      pathname: blob.pathname,
      url: blob.url,
      message: "Đổi tên thành công."
    });
  } catch (error) {
    console.error("AZERST RENAME API ERROR:", error);

    const message = error?.message || "Không thể đổi tên ảnh.";
    const statusCode =
      /not found|does not exist/i.test(message) ? 404 :
      /already exists|conflict/i.test(message) ? 409 :
      500;

    return response.status(statusCode).json({
      error: message
    });
  }
}
