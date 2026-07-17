import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "danger" | "parking";

const toneClasses: Record<Tone, string> = {
  danger: "bg-danger active:bg-danger-dark border-danger-dark",
  parking: "bg-parking active:bg-parking-dark border-parking-dark text-ink",
};

export default function OptionButton({
  href,
  title,
  subtitle,
  icon,
  tone,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: Tone;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-4 rounded-3xl border-b-4 px-6 py-7 text-left shadow-lg transition-transform active:translate-y-0.5 ${toneClasses[tone]}`}
    >
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-2xl font-bold leading-tight">{title}</span>
        <span className="text-sm opacity-90">{subtitle}</span>
      </span>
    </Link>
  );
}
