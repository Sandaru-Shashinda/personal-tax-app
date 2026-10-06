import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark with a mark drawn from a stylised lotus bud: three stacked petals, like tax bands. */
export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="8" className="fill-primary" />
        <path d="M14 5.5c3.2 3 4.8 6 4.8 9s-1.6 5.6-4.8 8c-3.2-2.400-4.800-5-4.800-8s1.600-6 4.800-9Z" className="fill-primary-foreground" opacity=".95" />
        <path d="M6 13.500c2.600.500 4.600 2 6 4.500 1 1.800 1.500 3.300 1.700 4.500C9.300 22 6.400 18.800 6 13.500Zm16 0c-2.600.500-4.600 2-6 4.500-1 1.800-1.500 3.300-1.700 4.500 4.400-.500 7.300-3.700 7.700-9Z" className="fill-primary-foreground" opacity=".55" />
      </svg>
      <span className="text-[1.05rem]">Ayakara</span>
    </Link>
  );
}
