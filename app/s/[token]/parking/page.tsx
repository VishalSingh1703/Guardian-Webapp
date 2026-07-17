"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { reportParking } from "@/lib/api";

// Preset messages keep it anonymous and prevent free-text abuse (SPEC §6).
const PRESETS = [
  "Vehicle is blocking my driveway / exit.",
  "Vehicle is double-parked.",
  "Vehicle is blocking traffic.",
  "Parked in a reserved / accessible spot.",
];

type Step = "choose" | "sending" | "sent";

export default function ParkingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");

  async function send(message: string) {
    setStep("sending");
    setError("");
    try {
      await reportParking(token, message);
      setStep("sent");
    } catch {
      setError("Couldn't send the alert. Please try again.");
      setStep("choose");
    }
  }

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <header className="flex h-12 items-center">
        <button
          onClick={() => router.push(`/s/${token}`)}
          className="text-white/70 active:text-white"
          aria-label="Back"
        >
          ← Back
        </button>
      </header>

      {step === "sent" ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-6xl" aria-hidden>
            ✅
          </div>
          <h2 className="mt-6 text-2xl font-bold">Owner notified</h2>
          <p className="mt-2 max-w-xs text-white/70">
            We&apos;ve sent an anonymous alert asking them to move the vehicle.
          </p>
        </div>
      ) : step === "sending" ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Sending alert…" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="py-6 text-center">
            <div className="text-4xl" aria-hidden>
              🅿️
            </div>
            <h1 className="mt-2 text-2xl font-bold">Parking issue</h1>
            <p className="mt-1 text-sm text-white/60">
              Pick a message. The owner gets an anonymous alert.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {PRESETS.map((msg) => (
              <button
                key={msg}
                onClick={() => send(msg)}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-5 text-left text-base font-medium active:translate-y-0.5"
              >
                {msg}
              </button>
            ))}
          </div>
          {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
        </div>
      )}
    </main>
  );
}
