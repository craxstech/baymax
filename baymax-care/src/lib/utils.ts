import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateTime } from "luxon";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, timeZone = "Asia/Kolkata") {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatTime(value: string | Date, timeZone = "Asia/Kolkata") {
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(":").map(Number);
    return DateTime.fromObject(
      { hour: hours, minute: minutes },
      { zone: timeZone },
    ).toLocaleString({ hour: "numeric", minute: "2-digit" });
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function relativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "Just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

export function todayInZone(timeZone = "Asia/Kolkata") {
  return DateTime.now().setZone(timeZone).toISODate() ?? DateTime.now().toISODate()!;
}

export function ageFromDob(dob: string | null | undefined) {
  if (!dob) return null;
  const birth = DateTime.fromISO(dob);
  if (!birth.isValid) return null;
  return Math.max(0, Math.floor(DateTime.now().diff(birth, "years").years));
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function safeInternalPath(value: FormDataEntryValue | null | undefined, fallback = "/app") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function initialsTone(tone: number) {
  const tones = [
    "bg-[#E8F8F6] text-[#087F83]",
    "bg-[#EEF4FA] text-[#2463A6]",
    "bg-[#FCF3E8] text-[#8C5A16]",
    "bg-[#F6EEF0] text-[#93404A]",
  ];
  return tones[Math.abs(tone) % tones.length];
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
