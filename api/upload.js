import { put, get } from "@vercel/blob";

/*
==================================================
  AZERST IMAGE VN
  MAXIMUM FILE SIZE: 64 GB
==================================================
*/

const MAX_SIZE =
    64 * 1024 * 1024 * 1024;


const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/avif"
];


/* ==============================================
   JSON RESPONSE
============================================== */

function json(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                "Cache-Control":
                    "no-store"
            }
        }
    );

}


/* ==============================================
   CONTENT TYPE
============================================== */

function getContentType(filename) {

    const ext =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    const types = {

        png: "image/png",

        jpg: "image/jpeg",

        jpeg: "image/jpeg",

        webp: "image/webp",

        gif: "image/gif",

        avif: "image/avif"

    };


    return (
        types[ext] ||
        "application/octet-stream"
    );

}


/* ==============================================
   UPLOAD
============================================== */

export async function POST(request) {

    try {

        const formData =
            await request.formData();


        const file =
            formData.get("file");


        if (
            !file ||
            typeof file.arrayBuffer !== "function"
        ) {

            return json(
                {
                    success: false,
                    error:
                        "Không nhận được file."
                },
                400
            );

        }


        /* CHECK TYPE */

        if (
            !ALLOWED_TYPES.includes(
                file.type
            )
        ) {

            return json(
                {
                    success: false,
                    error:
                        "Định dạng ảnh không được hỗ trợ."
                },
                400
            );

        }


        /* CHECK SIZE */

        if (
            file.size >
            MAX_SIZE
        ) {

            return json(
                {
                    success: false,
                    error:
                        "Ảnh vượt quá dung lượng tối đa 64 GB."
                },
                413
            );

        }


        /*
        ==========================================
        LẤY PHẦN MỞ RỘNG
        ==========================================
        */

        let ext =
            String(file.name || "")
                .split(".")
                .pop()
                .toLowerCase();


        if (ext === "jpeg") {

            ext = "jpg";

        }


        const allowedExtensions = [
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif",
            "avif"
        ];


        if (
            !allowedExtensions.includes(ext)
        ) {

            ext = "png";

        }


        /*
        ==========================================
        TẠO TÊN 9 KÝ TỰ
        VD: Ab123Cd34.png
        ==========================================
        */

        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


        let randomName = "";


        for (
            let i = 0;
            i < 9;
            i++
        ) {

            randomName +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }


        const filename =
            randomName +
            "." +
            ext;


        /*
        ==========================================
        VERCEL BLOB
        ==========================================
        */

        const blob =
            await put(
                filename,
                file,
                {
                    access: "public",

                    addRandomSuffix: false,

                    contentType:
                        file.type,

                    cacheControlMaxAge:
                        31536000
                }
            );


        /*
        ==========================================
        TRẢ URL
        ==========================================
        */

        return json(
            {
                success: true,

                filename: filename,

                url:
                    "/images/" +
                    encodeURIComponent(
                        filename
                    ),

                blobUrl:
                    blob.url
            },
            200
        );


    } catch (error) {

        console.error(
            "AZERST UPLOAD ERROR:",
            error
        );


        return json(
            {
                success: false,

                error:
                    error?.message ||
                    "Upload thất bại."
            },
            500
        );

    }

}


/* ==============================================
   GET IMAGE
============================================== */

export async function GET(request) {

    try {

        const url =
            new URL(request.url);


        const filename =
            url.searchParams.get(
                "filename"
            );


        if (!filename) {

            return new Response(
                "Thiếu filename.",
                {
                    status: 400
                }
            );

        }


        const result =
            await get(
                filename,
                {
                    access: "public"
                }
            );


        if (
            !result ||
            !result.stream
        ) {

            return new Response(
                "Không tìm thấy hình ảnh.",
                {
                    status: 404
                }
            );

        }


        const headers =
            new Headers();


        headers.set(
            "Content-Type",

            result.blob?.contentType ||
            getContentType(
                filename
            )
        );


        headers.set(
            "Content-Disposition",
            "inline"
        );


        headers.set(
            "Cache-Control",
            "public, max-age=31536000, immutable"
        );


        return new Response(
            result.stream,
            {
                status: 200,
                headers
            }
        );


    } catch (error) {

        console.error(
            "AZERST GET IMAGE ERROR:",
            error
        );


        return new Response(
            "Không thể tải hình ảnh.",
            {
                status: 500
            }
        );

    }

    }
