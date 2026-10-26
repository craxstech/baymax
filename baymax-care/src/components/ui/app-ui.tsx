import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  as: Component = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return <Component className={cn("panel", className)}>{children}</Component>;
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4 sm:px-5", className)}>{children}</div>;
}

export function DisclosurePanel({
  summary,
  children,
  description,
  defaultOpen = false,
  tone = "default",
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  description?: string;
  defaultOpen?: boolean;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <details
      className={cn("disclosure panel", tone === "danger" && "disclosure-danger", className)}
      open={defaultOpen || undefined}
    >
      <summary className="disclosure-summary">
        <span className="min-w-0">
          <span className={cn("block text-sm font-semibold", tone === "danger" ? "text-[#a82f3d]" : "text-ink")}>
            {summary}
          </span>
          {description && <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>}
        </span>
        <ChevronRight
          size={15}
          className="disclosure-chevron shrink-0 text-muted"
          aria-hidden="true"
        />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[0.72rem] text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <ChevronRight size={11} aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-aqua-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-[#4d6068]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-[#52666e] hover:text-aqua-700"
    >
      <ChevronLeft size={14} aria-hidden="true" /> {label}
    </Link>
  );
}

export function ExternalTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-medium text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:decoration-aqua-700"
    >
      {children} <ExternalLink size={11} aria-hidden="true" />
    </a>
  );
}

export function KeyValue({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.055em] text-[#7c8c92]">{label}</dt>
      <dd className="mt-0.5 break-words text-[0.83rem] leading-5 text-ink">{children}</dd>
    </div>
  );
}

export function TwoColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]", className)}>{children}</div>;
}

export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function InlineEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-[#fbfdfd] px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SectionSubnav({
  items,
  current,
}: {
  items: Array<{ href: string; label: string }>;
  current: string;
}) {
  return (
    <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-1 border-b border-line pb-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={current === item.href ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium",
            current === item.href
              ? "bg-aqua-50 text-aqua-800"
              : "text-[#52666e] hover:bg-[#f4f9f8] hover:text-aqua-700",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DemoTag() {
  return <span className="demo-label">Synthetic demo data</span>;
}
