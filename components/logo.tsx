import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <path
          d="M16 3 4 26h7l5-9 5 9h7L16 3Z"
          className="fill-accent transition-transform group-hover:-translate-y-0.5"
        />
        <circle cx="16" cy="14" r="2.2" className="fill-background" />
      </svg>
      <span className="font-heading text-xl font-semibold tracking-tight">
        roadmap.io
      </span>
    </Link>
  );
}
