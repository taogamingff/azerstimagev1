import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const body = req.body;

    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/avif"
          ],

          maximumSizeInBytes: 64 * 1024 * 1024 * 1024,

          addRandomSuffix: false,

          tokenPayload: JSON.stringify({
            app: "azerst-image-vn"
          })
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.url);
      }
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error("BLOB ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Lỗi Vercel Blob",
      message: error?.message || String(error),
      code: error?.code || null
    });
  }
}
