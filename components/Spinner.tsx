export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-white/70">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
