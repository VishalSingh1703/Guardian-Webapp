"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import SosButton from "@/components/SosButton";
import Spinner from "@/components/Spinner";
import { initIncident, triggerSos, verifyAccident } from "@/lib/api";
import { getCurrentCoords } from "@/lib/geo";
import type { Coords } from "@/lib/types";

type Step =
  | "init" // opening the incident
  | "capture" // live camera
  | "preview" // review captured photo
  | "verifying" // server image-verification pipeline
  | "rejected" // verification failed -> retake
  | "verified" // SOS unlocked
  | "dispatching" // SOS in flight
  | "dispatched"; // help on the way

export default function AccidentPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [step, setStep] = useState<Step>("init");
  const [incidentToken, setIncidentToken] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [reason, setReason] = useState<string>("");
  const gpsRef = useRef<Coords | null>(null);

  // Open the incident up-front so the token is ready before verification.
  const startInit = useCallback(() => {
    let alive = true;
    setReason("");
    setStep("init");
    initIncident(token)
      .then((r) => {
        if (!alive) return;
        setIncidentToken(r.incidentToken);
        setStep("capture");
      })
      .catch(() => {
        if (alive) setReason("Couldn't start. Please check your connection and try again.");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => startInit(), [startInit]);

  // Clean up any object URL we created for the preview.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const onCapture = useCallback((blob: Blob, url: string) => {
    setPhoto({ blob, url });
    setStep("preview");
  }, []);

  const retake = useCallback(() => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    setReason("");
    setStep("capture");
  }, [photo]);

  const submit = useCallback(async () => {
    if (!photo || !incidentToken) return;
    setStep("verifying");
    // GPS is best-effort and must never block the flow.
    gpsRef.current = await getCurrentCoords();
    try {
      const result = await verifyAccident(incidentToken, photo.blob, gpsRef.current);
      if (result.verified && result.sosUnlocked) {
        setStep("verified");
      } else {
        setReason(result.reason ?? "We couldn't confirm an accident from this photo.");
        setStep("rejected");
      }
    } catch {
      setReason("Verification failed. Please check your connection and retake.");
      setStep("rejected");
    }
  }, [photo, incidentToken]);

  const fireSos = useCallback(async () => {
    if (!incidentToken) return;
    setStep("dispatching");
    try {
      const res = await triggerSos(incidentToken, gpsRef.current);
      setStep(res.dispatched ? "dispatched" : "verified");
    } catch {
      // Keep the button available so the bystander can retry.
      setStep("verified");
    }
  }, [incidentToken]);

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <Header
        onBack={() => router.push(`/s/${token}`)}
        showBack={step === "capture" || step === "preview"}
      />

      {step === "init" && (
        <Centered>
          {reason ? (
            <>
              <div className="text-5xl" aria-hidden>
                ⚠️
              </div>
              <p className="mt-4 max-w-xs text-center text-white/80">{reason}</p>
              <button
                onClick={startInit}
                className="mt-8 rounded-2xl bg-white px-6 py-3 font-semibold text-ink active:translate-y-0.5"
              >
                Try again
              </button>
            </>
          ) : (
            <Spinner label="Preparing…" />
          )}
        </Centered>
      )}

      {step === "capture" && (
        <div className="flex flex-1 flex-col">
          <Instruction>
            Point at the accident and take a photo. The photo must be taken now —
            gallery images aren&apos;t accepted.
          </Instruction>
          <CameraCapture onCapture={onCapture} />
        </div>
      )}

      {step === "preview" && photo && (
        <div className="flex flex-1 flex-col">
          <Instruction>Use this photo?</Instruction>
          <div className="flex-1 overflow-hidden rounded-3xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Captured accident" className="h-full w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-6">
            <button
              onClick={retake}
              className="rounded-2xl border border-white/25 py-4 font-semibold text-white active:translate-y-0.5"
            >
              Retake
            </button>
            <button
              onClick={submit}
              className="rounded-2xl bg-danger py-4 font-bold text-white active:translate-y-0.5"
            >
              Use photo
            </button>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <Centered>
          <Spinner label="Verifying the accident…" />
          <p className="mt-4 max-w-xs text-center text-sm text-white/50">
            Checking the photo and matching the vehicle.
          </p>
        </Centered>
      )}

      {step === "rejected" && (
        <Centered>
          <div className="text-5xl" aria-hidden>
            ⚠️
          </div>
          <p className="mt-4 max-w-xs text-center text-white/80">{reason}</p>
          <button
            onClick={retake}
            className="mt-8 rounded-2xl bg-white px-6 py-3 font-semibold text-ink active:translate-y-0.5"
          >
            Retake photo
          </button>
        </Centered>
      )}

      {(step === "verified" || step === "dispatching") && (
        <Centered>
          <p className="mb-8 max-w-xs text-center text-lg font-semibold text-white/90">
            Accident confirmed. Tap SOS to alert the owner&apos;s emergency contacts.
          </p>
          <SosButton onClick={fireSos} loading={step === "dispatching"} />
        </Centered>
      )}

      {step === "dispatched" && (
        <Centered>
          <div className="text-6xl" aria-hidden>
            ✅
          </div>
          <h2 className="mt-6 text-2xl font-bold">Help is on the way</h2>
          <p className="mt-2 max-w-xs text-center text-white/70">
            Emergency contacts are being called and notified. Stay with the
            vehicle if it&apos;s safe to do so.
          </p>
        </Centered>
      )}
    </main>
  );
}

function Header({ onBack, showBack }: { onBack: () => void; showBack: boolean }) {
  return (
    <header className="flex h-12 items-center">
      {showBack && (
        <button onClick={onBack} className="text-white/70 active:text-white" aria-label="Back">
          ← Back
        </button>
      )}
    </header>
  );
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-base text-white/80">{children}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
  );
}
