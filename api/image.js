import { get } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const filename = req.query?.filename;

    if (!filename) {
      return res.status(400).send("Thiếu tên ảnh");
    }

    const result = await get(filename, {
      access: "public"
    });

    if (!result || !result.stream) {
      return res.status(404).send("Không tìm thấy ảnh");
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

  } catch (error) {
    console.error("IMAGE ERROR:", error);

    return res.status(500).send(
      "Lỗi Vercel Blob: " +
      (error?.message || String(error))
    );
  }
}
