"use client";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * The single emergency trigger. Stays disabled until the server confirms
 * verification (sosUnlocked) — the client never decides "verified" itself.
 */
export default function SosButton({ onClick, disabled, loading }: Props) {
  return (
    <div className="relative grid place-items-center">
      {!disabled && !loading && (
        <span className="absolute h-52 w-52 rounded-full bg-danger/60 animate-pulseRing" />
      )}
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="relative grid h-52 w-52 place-items-center rounded-full bg-danger text-white shadow-2xl transition active:scale-95 disabled:bg-white/15 disabled:text-white/40"
      >
        <span className="flex flex-col items-center">
          <span className="text-5xl font-black tracking-widest">SOS</span>
          <span className="mt-1 text-sm font-medium opacity-90">
            {loading ? "Dispatching…" : "Tap to call for help"}
          </span>
        </span>
      </button>
    </div>
  );
}
