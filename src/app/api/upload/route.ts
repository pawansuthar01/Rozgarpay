import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image missing" }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "attendance",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png"],
    });

    return NextResponse.json({
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
