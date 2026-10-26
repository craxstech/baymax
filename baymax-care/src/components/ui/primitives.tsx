import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  MinusCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn, initials, initialsTone, titleCase } from "@/lib/utils";

/* ───────── Page header ───────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  breadcrumb,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2 text-xs text-muted">{breadcrumb}</div>}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ───────── Avatars & identity ───────── */

export function MemberAvatar({
  name,
  tone = 0,
  size = "md",
  className,
}: {
  name: string;
  tone?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-[11px]",
    lg: "h-12 w-12 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full border border-white/50 font-semibold",
        sizes[size],
        initialsTone(tone),
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function FamilyChip({
  name,
  tone = 0,
  relationship,
}: {
  name: string;
  tone?: number;
  relationship?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <MemberAvatar name={name} tone={tone} size="sm" />
      <span className="text-xs font-medium text-ink">{name}</span>
      {relationship && <span className="text-[11px] text-muted">· {relationship}</span>}
    </span>
  );
}

/* ───────── Status ───────── */

const statusTone: Record<string, string> = {
  verified: "badge-success",
  active: "badge-success",
  ready: "badge-success",
  completed: "badge-success",
  taken: "badge-success",
  sent: "badge-success",
  normal: "badge-success",
  confirmed: "badge-success",
  unverified: "badge-warning",
  pending: "badge-warning",
  pending_verification: "badge-warning",
  requested: "badge-warning",
  extracting: "badge-warning",
  ai_unavailable: "badge-warning",
  ocr_unavailable: "badge-warning",
  paused: "badge-neutral",
  skipped: "badge-neutral",
  missed: "badge-danger",
  rejected: "badge-danger",
  failed: "badge-danger",
  high: "badge-danger",
  low: "badge-info",
  abnormal: "badge-danger",
  unavailable: "badge-neutral",
  cancelled: "badge-neutral",
  expired: "badge-neutral",
  ai_analysis_ready: "badge-aqua",
  unsupported: "badge-neutral",
  no_channel: "badge-danger",
  partial: "badge-warning",
  failed_delivery: "badge-danger",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("badge", statusTone[status.toLowerCase()] ?? "badge-neutral", className)}>
      {label ?? titleCase(status)}
    </span>
  );
}

/* ───────── Alerts & notices ───────── */

export function InlineNotice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger" | "neutral";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const icons = {
    info: Info,
    success: Check,
    warning: CircleAlert,
    danger: AlertCircle,
    neutral: Info,
  };
  const toneClass = {
    info: "notice-info",
    success: "notice-success",
    warning: "notice-warning",
    danger: "notice-danger",
    neutral: "",
  }[tone];
  const Icon = icons[tone];
  return (
    <div className={cn("notice", toneClass, className)} role={tone === "danger" ? "alert" : undefined}>
      <Icon size={16} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ───────── Empty / error / loading ───────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-5 text-center",
        compact ? "py-8" : "py-14",
      )}
    >
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-aqua-200 bg-aqua-50 text-aqua-700">
        <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this section",
  description = "Something went wrong while retrieving your information. Nothing has been changed.",
  retry,
}: {
  title?: string;
  description?: string;
  retry?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#fdf4f5] text-danger">
        <AlertCircle size={20} aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-muted">{description}</p>
      {retry && <div className="mt-4">{retry}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-2.5" role="status" aria-live="polite">
      <LoaderCircle className="h-4 w-4 animate-spin text-aqua-700" aria-hidden="true" />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/* ───────── Stats ───────── */

export function Stat({
  label,
  value,
  detail,
  icon: Icon,
  accent = "aqua",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  accent?: "aqua" | "warn" | "danger" | "info";
}) {
  const accentClass = {
    aqua: "text-aqua-700 bg-aqua-50 border-aqua-200",
    warn: "text-[#8c5a16] bg-[#fdf8ee] border-[#ecd5af]",
    danger: "text-[#a82f3d] bg-[#fdf4f5] border-[#eccbd0]",
    info: "text-[#205488] bg-[#f4f8fc] border-[#cadcf0]",
  }[accent];
  return (
    <div className="panel px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
            {label}
          </p>
          <div className="mt-2 text-xl font-semibold tracking-[-0.035em] text-ink">{value}</div>
          {detail && <p className="mt-1 text-[0.72rem] leading-4 text-muted">{detail}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border",
              accentClass,
            )}
            aria-hidden="true"
          >
            <Icon size={15} strokeWidth={1.8} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────── Misc ───────── */

export function ViewAllLink({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link className="inline-flex items-center gap-1 text-xs font-medium text-aqua-700" href={href}>
      {label} <ArrowRight size={13} aria-hidden="true" />
    </Link>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function UnavailableBadge() {
  return (
    <span className="badge badge-neutral">
      <MinusCircle size={11} aria-hidden="true" />
      Not configured
    </span>
  );
}

export function PrivacyLabel({ text = "Private to your account" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted">
      <Check size={11} aria-hidden="true" /> {text}
    </span>
  );
}
