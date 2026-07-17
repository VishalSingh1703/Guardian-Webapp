"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import OptionButton from "@/components/OptionButton";
import Spinner from "@/components/Spinner";
import { resolveQr } from "@/lib/api";
import type { QrContext } from "@/lib/types";

export default function LandingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [ctx, setCtx] = useState<QrContext | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    resolveQr(token)
      .then((c) => alive && setCtx(c))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <header className="py-8 text-center">
        <div className="text-4xl" aria-hidden>
          🛡️
        </div>
        <h1 className="mt-2 text-2xl font-bold">How can we help?</h1>
        <p className="mt-1 text-sm text-white/60">
          Choose what&apos;s happening with this vehicle.
        </p>
      </header>

      {failed ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-white/70">
          This QR code could not be verified. Please try scanning again.
        </div>
      ) : !ctx ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Verifying code…" />
        </div>
      ) : !ctx.active ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-white/70">
          This vehicle is not registered with Guardian.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-5">
          {ctx.categoriesEnabled.includes("accident") && (
            <OptionButton
              href={`/s/${token}/accident`}
              tone="danger"
              icon="🚨"
              title="Accident / Safety"
              subtitle="Someone may be hurt — report a crash"
            />
          )}
          {ctx.categoriesEnabled.includes("parking") && (
            <OptionButton
              href={`/s/${token}/parking`}
              tone="parking"
              icon="🅿️"
              title="Parking Issue"
              subtitle="Vehicle is blocking or parked badly"
            />
          )}
        </div>
      )}

      <footer className="pt-6 text-center text-xs text-white/30">
        Guardian keeps the owner&apos;s personal details private.
      </footer>
    </main>
  );
}
