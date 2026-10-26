"use client";

import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  trigger,
  title,
  description,
  children,
  triggerClassName,
  width = "default",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  width?: "default" | "wide";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? "btn btn-secondary"}
        onClick={() => ref.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        className={cn("dialog-panel", width === "wide" && "sm:max-w-2xl")}
        aria-labelledby="dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold tracking-[-0.03em]">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
          </div>
          <button
            type="button"
            className="btn btn-quiet btn-icon -mr-1 -mt-1"
            onClick={() => ref.current?.close()}
            aria-label="Close dialog"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
