import { put, get } from "@vercel/blob";

const MAX_SIZE = 64 * 1024 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

function randomName(length = 9) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let name = "";

  for (let i = 0; i < length; i++) {
    name += chars[Math.floor(Math.random() * chars.length)];
  }

  return name;
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
          success: false,
          error: "Thiếu tên file"
        });
      }

      const result = await get(filename, {
        access: "public"
      });

      if (!result || !result.stream) {
        return res.status(404).json({
          success: false,
          error: "Không tìm thấy ảnh"
        });
      }

      res.statusCode = 200;

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
        success: false,
        error: "Method không được hỗ trợ"
      });
    }

    // =========================
    // GET FORM DATA
    // =========================
    const formData = await req.formData();

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return res.status(400).json({
        success: false,
        error: "Không tìm thấy file ảnh"
      });
    }

    // =========================
    // CHECK FILE TYPE
    // =========================
    if (!ALLOWED_TYPES[file.type]) {
      return res.status(400).json({
        success: false,
        error: "Chỉ hỗ trợ PNG, JPG, JPEG, WEBP, GIF, AVIF"
      });
    }

    // =========================
    // CHECK FILE SIZE
    // =========================
    if (file.size > MAX_SIZE) {
      return res.status(413).json({
        success: false,
        error: "File vượt quá giới hạn 64 GB"
      });
    }

    // =========================
    // CREATE RANDOM FILENAME
    // =========================
    const extension = ALLOWED_TYPES[file.type];

    const filename = `${randomName(9)}.${extension}`;

    // =========================
    // UPLOAD TO VERCEL BLOB
    // OIDC tự động
    // =========================
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 31536000
    });

    // =========================
    // FINAL IMAGE URL
    // =========================
    const imageUrl =
      "https://Azerst-Image-VN.vercel.app/images/" +
      encodeURIComponent(filename);

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      filename: filename,
      url: imageUrl,
      blobUrl: blob.url,
      type: file.type,
      size: file.size
    });

  } catch (error) {
    console.error("VERCEL BLOB ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Lỗi Vercel Blob",
      message: error?.message || String(error),
      code: error?.code || null
    });
  }
}
