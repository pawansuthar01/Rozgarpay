import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(
  file: File,
  folder: string = "attendance",
): Promise<string> {
  try {
    let buffer: Buffer;
    let arrayBuffer: ArrayBuffer;
    arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "image",
            allowed_formats: ["jpg", "png", "jpeg"],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result.secure_url);
            } else {
              reject(new Error("Upload failed"));
            }
          },
        )
        .end(buffer);
    });
  } catch (error) {
    throw new Error("Failed to upload image");
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    throw new Error("Failed to delete image");
  }
}
export async function uploadImageFromDataUrl(
  dataUrl: string,
  folder: string = "attendance",
): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUrl,
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "png", "jpeg"],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Upload failed"));
          }
        },
      );
    });
  } catch (error) {
    throw new Error("Failed to upload image");
  }
}
