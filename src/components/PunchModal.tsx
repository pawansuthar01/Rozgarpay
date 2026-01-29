"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, X, RotateCcw, Loader2, CheckCircle } from "lucide-react";
import { useModal } from "./ModalProvider";

interface PunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPunch: (type: "in" | "out", image: string) => Promise<boolean>;
  punchType: "in" | "out";
}

export default function PunchModal({
  isOpen,
  onClose,
  onPunch,
  punchType,
}: PunchModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const { showMessage } = useModal();
  const [stage, setStage] = useState<
    "idle" | "opening" | "live" | "preview" | "uploading" | "success"
  >("idle");

  const [isAnimating, setIsAnimating] = useState(false);

  /* ---------------- CLEANUP ON MODAL CLOSE ---------------- */
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(false);
      setStage("idle");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  /* ---------------- START CAMERA ---------------- */
  async function startCamera() {
    try {
      setStage("opening");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;

      // wait for actual play
      await videoRef.current.play();

      setStage("live");
    } catch (err) {
      // Instead of alert, we could emit an error event or use a callback
      // For now, we'll keep it simple but could be improved with a modal
      showMessage(
        "error",
        "Error",
        "Camera access failed. Please allow permission.",
      );
      setStage("idle");
    }
  }

  /* ---------------- STOP CAMERA ---------------- */
  async function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  /* ---------------- TAKE PHOTO ---------------- */
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error("Video or canvas missing");
      return;
    }

    // VERY IMPORTANT
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showMessage("info", "wait 1 sec", "Camera still loading, wait 1 second");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCamera();
    setStage("preview");
  };

  /* ---------------- RETAKE ---------------- */
  const retakePhoto = () => {
    setStage("idle");
  };

  /* ---------------- CONFIRM ---------------- */
  const confirmPunch = async () => {
    if (!canvasRef.current) return;

    try {
      setStage("uploading");
      const image = canvasRef.current.toDataURL("image/jpeg", 0.85);
      const res = await onPunch(punchType, image);
      if (!res) {
        handleClose();
        setStage("idle");
        return;
      }
      setStage("success");

      // Auto close after success
      setTimeout(() => {
        handleClose();
        setStage("idle");
      }, 2000);
    } catch (_) {
      showMessage("error", "Error", "Punch failed, try again");
      setStage("preview");
    }
  };
  function handleClose() {
    if (stage == "uploading") {
      showMessage("warning", "Please wait ", "Please wait a few sec...");
      return;
    }
    setIsAnimating(false);
    setTimeout(() => {
      stopCamera();
      setShouldRender(false);
      onClose();
    }, 500);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center p-4">
      {/* BACKDROP WITH SMOOTH FADE */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* MODAL WITH BOTTOM-TO-TOP ANIMATION */}
      <div
        className={`absolute bottom-0 bg-white w-full max-w-sm rounded-t-3xl shadow-2xl
  transform transition-all duration-500 ease-out
  ${
    isAnimating
      ? "translate-y-0 opacity-100 scale-100"
      : "translate-y-full opacity-0 scale-95"
  }`}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Punch {punchType === "in" ? "In" : "Out"}
            </h2>
            <p className="text-sm text-gray-600">
              {stage === "idle" && "Ready to capture your photo"}
              {stage === "opening" && "Opening camera..."}
              {stage === "live" && "Position yourself and tap capture"}
              {stage === "preview" && "Review your photo"}
              {stage === "uploading" && "Processing your punch..."}
              {stage === "success" && "Punch successful!"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100  cursor-pointer  rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CAMERA / PREVIEW CONTAINER */}
        <div className="relative mx-4 mb-4 bg-gray-900 rounded-2xl overflow-hidden shadow-inner">
          <div className="aspect-[4/3] relative">
            {/* VIDEO – ALWAYS MOUNTED */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                stage === "live"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              }`}
              style={{ transform: "scaleX(-1)" }} // Mirror effect for selfie
            />

            {/* CANVAS – ALWAYS MOUNTED */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full transition-all duration-300 ${
                stage === "preview"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              }`}
            />

            {/* PLACEHOLDER */}
            {stage !== "live" && stage !== "preview" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Camera Preview</p>
                <p className="text-xs text-white/70 mt-1">
                  {stage === "opening"
                    ? "Initializing..."
                    : "Tap start to begin"}
                </p>
              </div>
            )}

            {/* SUCCESS OVERLAY */}
            {stage === "success" && (
              <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center">
                <div className="text-center text-white">
                  <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-lg font-bold">Success!</p>
                  <p className="text-sm">Punch recorded</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="p-4 pt-0">
          {stage === "idle" && (
            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg transform transition-all duration-200 active:scale-95"
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Start Camera
              </div>
            </button>
          )}

          {stage === "opening" && (
            <div className="text-center py-8">
              <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3 text-blue-500" />
              <p className="text-gray-600 font-medium">Opening camera...</p>
              <p className="text-sm text-gray-500 mt-1">
                Please allow camera access
              </p>
            </div>
          )}

          {stage === "live" && (
            <div className="flex justify-center gap-6">
              <button
                onClick={takePhoto}
                className="bg-white border-4 border-white shadow-2xl p-6 rounded-full text-green-600 hover:bg-green-50 transform transition-all duration-200 active:scale-90"
                style={{
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 4px rgba(34,197,94,0.1)",
                }}
              >
                <Camera className="w-8 h-8" />
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setStage("idle");
                }}
                className="bg-white/90 backdrop-blur-sm border-2 border-white/50 shadow-lg p-4 rounded-full text-red-600 hover:bg-red-50 transform transition-all duration-200 active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}

          {stage === "preview" && (
            <div className="flex gap-3">
              <button
                onClick={confirmPunch}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg transform transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Confirm Punch
                </div>
              </button>
              <button
                onClick={retakePhoto}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-4 rounded-2xl font-medium shadow-md transform transition-all duration-200 active:scale-95"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          )}

          {stage === "uploading" && (
            <div className="text-center py-8">
              <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3 text-blue-500" />
              <p className="text-gray-600 font-medium">
                Processing your punch...
              </p>
              <p className="text-sm text-gray-500 mt-1">Please wait</p>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                Punch Successful!
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Closing automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
