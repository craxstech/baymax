import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketingPageHero({
  eyebrow,
  title,
  description,
  children,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <section className="border-b border-line bg-[#fbfdfd]">
      <div
        className={cn(
          "container-site py-14 md:py-20",
          align === "center" && "text-center",
        )}
      >
        <p className={cn("eyebrow", align === "center" && "justify-center")}>{eyebrow}</p>
        <h1 className={cn("display-lg mt-4 max-w-3xl", align === "center" && "mx-auto")}>
          {title}
        </h1>
        <p
          className={cn(
            "lede mt-5 max-w-2xl",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}

export function MarketingSection({
  eyebrow,
  title,
  description,
  children,
  className,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className={cn("py-14 md:py-20", className)}>
      <div className="container-site">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h2 className="display-md">{title}</h2>
            {description && <p className="mt-4 text-[0.94rem] leading-6 text-muted">{description}</p>}
          </div>
          {action && (
            <Link
              href={action.href}
              className="link inline-flex shrink-0 items-center gap-1.5 text-sm"
            >
              {action.label} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function LegalShell({
  title,
  version,
  effectiveDate,
  children,
  summary,
}: {
  title: string;
  version: string;
  effectiveDate: string;
  children: ReactNode;
  summary?: string;
}) {
  return (
    <div className="border-b border-line bg-mint/40">
      <div className="container-site py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow">Legal & trust</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
            <p className="mt-3 text-[0.75rem] leading-5 text-muted">
              Effective {effectiveDate}
              <br />
              Version {version}
            </p>
            <nav className="mt-6 space-y-2 border-t border-line pt-5 text-[0.78rem]" aria-label="Legal documents">
              <Link className="block text-muted hover:text-aqua-700" href="/privacy">
                Privacy policy
              </Link>
              <Link className="block text-muted hover:text-aqua-700" href="/terms">
                Terms & conditions
              </Link>
              <Link className="block text-muted hover:text-aqua-700" href="/safety">
                Medical AI safety
              </Link>
              <Link className="block text-muted hover:text-aqua-700" href="/account-deletion">
                Account deletion
              </Link>
              <Link className="block text-muted hover:text-aqua-700" href="/contact">
                Contact
              </Link>
            </nav>
          </aside>
          <article>
            {summary && (
              <div className="mb-8 rounded-lg border border-aqua-200 bg-aqua-50 p-5">
                <p className="text-[0.82rem] leading-6 text-[#33565e]">{summary}</p>
              </div>
            )}
            <div className="panel px-5 py-7 sm:px-8 sm:py-9">
              <div className="prose max-w-none">{children}</div>
            </div>
            <p className="mt-5 text-[0.7rem] leading-5 text-muted">
              This document describes the current implementation and identifies deployment
              obligations. It must be reviewed by qualified Indian legal counsel before public
              launch. It is not a claim of regulatory approval or certification.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
