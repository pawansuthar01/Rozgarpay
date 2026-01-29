"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error" | "warning" | "info" | "confirm";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function MessageModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: MessageModalProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 300);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    handleClose();
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      case "info":
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* MODAL */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out ${
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-4 opacity-0 scale-95"
        }`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-start p-4 pb-2">
          <div className="flex-1" />
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-6 pb-2">
          {/* ICON */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${getBgColor()}`}>
              {getIcon()}
            </div>
          </div>

          {/* TITLE */}
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            {title}
          </h3>

          {/* MESSAGE */}
          <p className="text-gray-600 text-center text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 p-4 pt-2">
          {type === "confirm" ? (
            <>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold text-sm  transform transition-all duration-200 active:scale-95"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold text-sm  transform transition-all duration-200 active:scale-95"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility functions for easy usage
export const showSuccessMessage = (
  title: string,
  message: string,
  onConfirm?: () => void,
) => {
  // This would be used with a global modal context
  console.log("Success:", title, message);
  if (onConfirm) onConfirm();
};

export const showErrorMessage = (
  title: string,
  message: string,
  onConfirm?: () => void,
) => {
  console.log("Error:", title, message);
  if (onConfirm) onConfirm();
};

export const showConfirmMessage = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
) => {
  console.log("Confirm:", title, message);
  // In a real implementation, this would show the modal
  // For now, we'll use a simple approach
  if (window.confirm(`${title}\n\n${message}`)) {
    onConfirm();
  } else if (onCancel) {
    onCancel();
  }
};
