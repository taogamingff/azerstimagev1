import { put, get } from "@vercel/blob";

const MAX_SIZE = 64 * 1024 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
]);

function randomName(length = 9) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

export default async function handler(req, res) {
  try {
    // =========================
    // GET IMAGE
    // =========================
    if (req.method === "GET") {
      const filename = req.query?.filename;

      if (!filename) {
        return res.status(400).json({
          error: "Thiếu tên file"
        });
      }

      const result = await get(filename, {
        access: "public"
      });

      if (!result?.stream) {
        return res.status(404).json({
          error: "Không tìm thấy ảnh"
        });
      }

      res.setHeader(
        "Content-Type",
        result.blob?.contentType || "application/octet-stream"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );

      result.stream.pipe(res);
      return;
    }

    // =========================
    // ONLY POST
    // =========================
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method không được hỗ trợ"
      });
    }

    // =========================
    // CHECK TOKEN
    // =========================
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error:
          "Thiếu BLOB_READ_WRITE_TOKEN. Hãy kết nối Vercel Blob với Project và Redeploy."
      });
    }

    // =========================
    // READ FORM
    // =========================
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return res.status(400).json({
        error: "Không tìm thấy file"
      });
    }

    // =========================
    // CHECK TYPE
    // =========================
    if (!ALLOWED_TYPES.has(file.type)) {
      return res.status(400).json({
        error: "Định dạng ảnh không được hỗ trợ"
      });
    }

    // =========================
    // CHECK SIZE
    // =========================
    if (file.size > MAX_SIZE) {
      return res.status(413).json({
        error: "File vượt quá giới hạn 64 GB"
      });
    }

    // =========================
    // EXTENSION
    // =========================
    const extensionMap = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif"
    };

    const extension = extensionMap[file.type];

    const filename = `${randomName(9)}.${extension}`;

    // =========================
    // UPLOAD VERCEL BLOB
    // =========================
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 31536000
    });

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      filename,
      url: `https://Azerst-Image-VN.vercel.app/images/${encodeURIComponent(
        filename
      )}`,
      blobUrl: blob.url
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return res.status(500).json({
      error: "Lỗi Vercel Blob",
      message: error?.message || "Unknown error"
    });
  }
}
