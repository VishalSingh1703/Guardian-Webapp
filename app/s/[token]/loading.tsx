// Shown instantly during navigation into the landing route while its JS loads.
export default function Loading() {
  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <header className="py-8 text-center">
        <div className="text-4xl" aria-hidden>
          🛡️
        </div>
        <h1 className="mt-2 text-2xl font-bold">How can we help?</h1>
      </header>
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="h-28 w-full animate-pulse rounded-3xl bg-white/10" />
        <div className="h-28 w-full animate-pulse rounded-3xl bg-white/10" />
      </div>
    </main>
  );
}
