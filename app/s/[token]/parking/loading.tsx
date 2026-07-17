// Shown instantly during navigation into the parking route while its JS loads.
export default function Loading() {
  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col">
      <header className="flex h-12 items-center" />
      <div className="py-6 text-center">
        <div className="text-4xl" aria-hidden>
          🅿️
        </div>
        <h1 className="mt-2 text-2xl font-bold">Parking issue</h1>
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
    </main>
  );
}
