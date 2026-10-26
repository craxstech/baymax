"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Link2, LoaderCircle } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type MemberOption = {
  id: string;
  name: string;
  relationship: string;
  isSelf?: boolean;
};

export function MemberFilter({
  members,
  current,
  basePath,
  includeAll = true,
  allLabel = "All family",
  label = "Family member",
}: {
  members: MemberOption[];
  current?: string;
  basePath: string;
  includeAll?: boolean;
  allLabel?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const resolvedCurrent = current && members.some((member) => member.id === current) ? current : "";

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="font-medium text-[#52666e]">{label}</span>
      <span className="relative">
        <select
          className="select min-h-9 py-1 pr-7 text-xs"
          value={resolvedCurrent}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value;
            startTransition(() => {
              router.push(value ? `${basePath}?member=${value}` : basePath);
            });
          }}
        >
          {includeAll && <option value="">{allLabel}</option>}
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
              {member.isSelf ? " (you)" : ` · ${member.relationship}`}
            </option>
          ))}
        </select>
        {pending && (
          <LoaderCircle
            size={12}
            className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-aqua-700"
            aria-hidden="true"
          />
        )}
      </span>
    </label>
  );
}

export function InlineAction({
  action,
  fields,
  label,
  pendingLabel = "Working…",
  variant = "secondary",
  size = "sm",
  className,
  confirmMessage,
  icon,
}: {
  action: ServerAction;
  fields: Record<string, string | number | boolean>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "danger-outline" | "quiet";
  size?: "sm" | "md";
  className?: string;
  confirmMessage?: string;
  icon?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    "danger-outline": "btn-danger-outline",
    quiet: "btn-quiet",
  };

  return (
    <form
      action={formAction}
      className={cn("inline-flex flex-col items-start gap-1", className)}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <button
        type="submit"
        className={cn("btn", variants[variant], size === "sm" && "btn-sm")}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <span className="btn-spinner" aria-hidden="true" /> : icon}
        <span className="btn-label">{pending ? pendingLabel : label}</span>
      </button>
      {state.status === "error" && state.message ? (
        <span className="max-w-xs text-[0.7rem] leading-4 text-[#a82f3d]">{state.message}</span>
      ) : null}
      {state.status === "success" && state.message ? (
        <span className="max-w-xs text-[0.7rem] leading-4 text-[#176a48]">{state.message}</span>
      ) : null}
    </form>
  );
}

export function SosLocationFields() {
  const [location, setLocation] = useState<{
    latitude: string;
    longitude: string;
    accuracy: string;
  }>({ latitude: "", longitude: "", accuracy: "" });
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("This browser does not support location sharing. You can still send an SOS without a location.");
      return;
    }
    setStatus("locating");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          accuracy: String(Math.round(position.coords.accuracy)),
        });
        setStatus("ready");
        setMessage("Location attached. It is shared only with the contacts you select and is not sent to emergency services.");
      },
      (error) => {
        setStatus("error");
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can still send an SOS without a location."
            : "Your location could not be read. You can still send an SOS without a location.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  return (
    <fieldset className="rounded-lg border border-line bg-[#fbfdfd] p-3">
      <legend className="px-1 text-xs font-semibold text-[#3e515a]">Shared location (optional)</legend>
      <input type="hidden" name="latitude" value={location.latitude} />
      <input type="hidden" name="longitude" value={location.longitude} />
      <input type="hidden" name="accuracy" value={location.accuracy} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={requestLocation}
          disabled={status === "locating"}
        >
          <Crosshair size={14} aria-hidden="true" />
          {status === "locating" ? "Locating…" : location.latitude ? "Update location" : "Attach my location"}
        </button>
        {location.latitude && (
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setLocation({ latitude: "", longitude: "", accuracy: "" });
              setStatus("idle");
              setMessage("");
            }}
          >
            Remove
          </button>
        )}
      </div>
      {location.latitude && (
        <p className="mt-2 text-[0.7rem] leading-5 text-[#52666e]">
          Latitude {location.latitude}, longitude {location.longitude}
          {location.accuracy ? ` (±${location.accuracy} m)` : ""}.{" "}
          <a
            className="font-medium text-aqua-700 underline underline-offset-2"
            href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            Preview map
          </a>
        </p>
      )}
      {message && (
        <p
          className={cn(
            "mt-2 text-[0.7rem] leading-5",
            status === "error" ? "text-[#a82f3d]" : "text-[#52666e]",
          )}
          role="status"
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}

export function CopyLinkButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      <Link2 size={13} aria-hidden="true" />
      {copied ? "Copied" : label}
    </button>
  );
}
