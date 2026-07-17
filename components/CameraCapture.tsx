"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  /** Called with the captured frame. The camera stream is stopped before this fires. */
  onCapture: (blob: Blob, previewUrl: string) => void;
};

type Status = "requesting" | "live" | "error";

function describeCameraError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Please allow the camera and try again — a live photo is required.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "Couldn't start the camera. Make sure you're on a secure (https) connection and try again.";
  }
}

/**
 * Live, in-page camera capture. Intentionally offers NO file picker — the
 * accident photo must be taken live at the scene (SPEC §5 / §8). Gallery
 * uploads are not possible from this component.
 */
export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("requesting");
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setStatus("requesting");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("unsupported"), { name: "NotFoundError" });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("live");
    } catch (e) {
      setStatus("error");
      setError(describeCameraError(e));
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        stop();
        onCapture(blob, url);
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture, stop]);

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-5xl" aria-hidden>
          📷
        </div>
        <p className="text-base text-white/80">{error}</p>
        <button
          onClick={start}
          className="rounded-2xl bg-white px-6 py-3 font-semibold text-ink active:translate-y-0.5"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="relative flex-1 overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {status === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            Starting camera…
          </div>
        )}
        {/* Framing guide */}
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/40" />
      </div>

      <div className="flex items-center justify-center py-6">
        <button
          onClick={capture}
          disabled={status !== "live"}
          aria-label="Capture photo"
          className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20 backdrop-blur transition active:scale-95 disabled:opacity-40"
        >
          <span className="h-16 w-16 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
