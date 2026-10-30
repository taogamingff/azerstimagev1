import { handleUpload } from "@vercel/blob/client";

const MAX_SIZE = 10 * 1024 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
];

function isAllowedPathname(pathname) {
  if (typeof pathname !== "string") return false;

  // Chỉ cho phép images/<tên-an-toàn>.<đuôi>
  return /^images\/[A-Za-z0-9_-]{1,100}\.(png|jpg|jpeg|webp|gif|avif)$/i.test(pathname);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return response.status(500).json({
        error: "Thiếu BLOB_READ_WRITE_TOKEN trong Environment Variables của Vercel."
      });
    }

    const body = request.body;

    const result = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedPathname(pathname)) {
          throw new Error("Tên hoặc đường dẫn ảnh không hợp lệ.");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            purpose: "azerst-image-upload"
          })
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log("AZERST upload completed:", {
          pathname: blob.pathname,
          url: blob.url,
          contentType: blob.contentType
        });
      }
    });

    return response.status(200).json(result);
  } catch (error) {
    console.error("AZERST UPLOAD API ERROR:", error);
    return response.status(400).json({
      error: error?.message || "Không thể cấp quyền upload."
    });
  }
}
