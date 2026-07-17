// Shown instantly during navigation into the accident route while its JS loads.
export default function Loading() {
  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <header className="flex h-12 items-center" />
      <p className="py-4 text-center text-base text-white/80">Getting the camera ready…</p>
      <div className="relative flex-1 overflow-hidden rounded-3xl bg-black">
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/20" />
      </div>
      <div className="flex items-center justify-center py-6">
        <div className="h-20 w-20 animate-pulse rounded-full border-4 border-white/40 bg-white/10" />
      </div>
    </main>
  );
}
