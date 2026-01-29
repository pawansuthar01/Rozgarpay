import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: File,
  folder: string = "Rozgarpay",
): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "auto",
            transformation: [
              { width: 500, height: 500, crop: "limit" },
              { quality: "auto" },
            ],
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
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete from Cloudinary:", error);
  }
};

export const extractPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
  return match ? match[1] : null;
};

export const uploadPDF = async (
  file: File | Buffer,
  folder: string = "Rozgarpay",
  filename?: string,
): Promise<string> => {
  try {
    let buffer: Buffer;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: "raw", // For PDFs and other non-image files
        format: "pdf",
      };

      if (filename) {
        uploadOptions.public_id = filename;
      }

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Upload failed"));
          }
        })
        .end(buffer);
    });
  } catch (error) {
    throw new Error("Failed to upload PDF");
  }
};

export const deletePDF = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch (error) {
    console.error("Failed to delete PDF from Cloudinary:", error);
  }
};
