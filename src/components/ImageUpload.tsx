"use client";

import { useState, useRef } from "react";
import {
  Camera,
  X,
  Upload,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  type: "profile" | "logo";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  showUploadBtn?: boolean;
}

export default function ImageUpload({
  currentImage,
  onUpload,
  onDelete,
  type,
  size = "md",
  disabled = false,
  showUploadBtn = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-12 h-12 sm:w-16 sm:h-16",
    md: "w-16 h-16 sm:w-20 sm:h-20",
    lg: "w-20 h-20 sm:w-24 sm:h-24",
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      await onUpload(file);
      setSuccess(true);
      setPreview(null); // Clear preview after successful upload
      setTimeout(() => setSuccess(false), 3000); // Hide success after 3 seconds
    } catch (error) {
      console.error("Upload failed:", error);
      setError("Failed to upload image. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    setError(null);
    setDeleting(true);
    try {
      await onDelete();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Delete failed:", error);
      setError("Failed to delete image. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Image Display */}
      <div
        className={`relative group ${sizeClasses[size]} rounded-full border-2 ${
          success
            ? "border-green-400"
            : error
              ? "border-red-400"
              : "border-gray-300"
        } bg-gray-50 transition-colors ${!showUploadBtn && !disabled ? "cursor-pointer" : ""}`}
        onClick={
          !showUploadBtn && !disabled
            ? () => fileInputRef.current?.click()
            : undefined
        }
      >
        {displayImage ? (
          <Image
            key={displayImage}
            src={displayImage}
            alt={type === "profile" ? "Profile Photo" : "Company Logo"}
            fill
            unoptimized
            className="object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
          </div>
        )}

        {/* Upload Overlay */}
        {!disabled && !success && (
          <div className="absolute inset-0 bg-black/20 bg-opacity-50 rounded-full flex justify-center items-center">
            {uploading ? (
              <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            )}
          </div>
        )}

        {/* Delete Button */}
        {currentImage && !disabled && !uploading && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
            className="absolute z-10 -top-1 -right-1 sm:-top-1 sm:-right-2 p-1 sm:p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md"
            title={`Delete ${type}`}
          >
            {deleting ? (
              <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-2 h-2 sm:w-3 sm:h-3" />
            )}
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center space-x-1 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-1 text-green-600 text-xs">
          <CheckCircle className="w-3 h-3" />
          <span>Updated!</span>
        </div>
      )}

      {/* Upload Button */}
      {!disabled && showUploadBtn && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors"
        >
          {uploading ? (
            <>
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                Choose {type === "profile" ? "Photo" : "Logo"}
              </span>
              <span className="sm:hidden">Upload</span>
            </>
          )}
        </button>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading || deleting}
      />
    </div>
  );
}
