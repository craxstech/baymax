"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className,
  variant = "primary",
  ...props
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "quiet";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    quiet: "btn-quiet",
  };
  return (
    <button
      type="submit"
      className={cn("btn", variants[variant], className)}
      disabled={pending || props.disabled}
      aria-busy={pending}
      {...props}
    >
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-label">{pending ? pendingLabel : children}</span>
    </button>
  );
}
