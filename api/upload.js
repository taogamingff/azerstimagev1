import { handleUpload } from "@vercel/blob/client";

const MAX_SIZE = 10 * 1024 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const body = req.body;

    if (!body) {
      return res.status(400).json({
        success: false,
        error: "Request body không hợp lệ"
      });
    }

    const response = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async (pathname) => {
        const extension = pathname
          .split(".")
          .pop()
          ?.toLowerCase();

        const allowedExtensions = [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif",
          "avif"
        ];

        if (!allowedExtensions.includes(extension)) {
          throw new Error(
            "Chỉ hỗ trợ PNG, JPG, JPEG, WEBP, GIF và AVIF"
          );
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,

          maximumSizeInBytes: MAX_SIZE,

          addRandomSuffix: false,

          tokenPayload: JSON.stringify({
            app: "azerst-image-vn",
            maxSize: MAX_SIZE
          })
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log(
          "Azerst Image upload completed:",
          blob.url
        );
      }
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error(
      "VERCEL BLOB ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Lỗi Vercel Blob",
      message:
        error?.message ||
        String(error)
    });
  }
}
