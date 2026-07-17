import Link from "next/link";

/**
 * Root screen. In production, users never land here directly — they arrive via
 * the QR deep-link at /s/{token}. This page just explains that, and (in dev)
 * offers a demo entry so the flow is testable without a physical QR sticker.
 */
export default function Home() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="text-6xl" aria-hidden>
        🛡️
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Guardian</h1>
        <p className="text-white/70">
          Scan the Guardian QR code on the vehicle to report an accident or a
          parking issue. Nothing to install.
        </p>
      </div>

      {isDev && (
        <Link
          href="/s/DEMO-PLATE-123"
          className="mt-4 rounded-2xl border border-white/20 px-5 py-3 text-sm text-white/80 active:translate-y-0.5"
        >
          ▶ Open demo flow (dev only)
        </Link>
      )}
    </main>
  );
}
