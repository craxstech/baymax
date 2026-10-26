import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/config";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label={`${brand.name} mark`}
    >
      <rect width="32" height="32" rx="8" fill="#087F83" />
      <path
        d="M11.25 9.8c-2.55 1.75-2.55 5.6 0 7.35M20.75 9.8c2.55 1.75 2.55 5.6 0 7.35"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 21.7v-5.15m-2.55 2.58h5.1"
        fill="none"
        stroke="#8FE3DE"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="6.6" fill="none" stroke="#FFFFFF" strokeOpacity=".36" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  light = false,
  compact = false,
}: {
  className?: string;
  href?: string;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-sm", className)}
      aria-label={`${brand.name} home`}
    >
      <BrandMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      {!compact && (
        <span
          className={cn(
            "text-[1.02rem] font-semibold tracking-[-0.035em]",
            light ? "text-white" : "text-ink",
          )}
        >
          Baymax{" "}
          <span className={light ? "font-normal text-aqua-100" : "font-normal text-muted"}>
            Care
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * Original care-companion illustration. It uses soft geometry and a simple
 * expression as a calm visual anchor, without reproducing a licensed character.
 */
export function CareCompanion({
  className,
  variant = "full",
  label = "A calm care companion illustration",
}: {
  className?: string;
  variant?: "full" | "small";
  label?: string;
}) {
  const small = variant === "small";
  return (
    <svg
      viewBox={small ? "0 0 120 120" : "0 0 360 400"}
      className={cn(className)}
      role="img"
      aria-label={label}
      fill="none"
    >
      {!small && (
        <>
          <path
            d="M58 299c18-29 45-48 67-62 33-21 55-53 55-89"
            stroke="#BFE7E3"
            strokeWidth="1.5"
            strokeDasharray="3 7"
          />
          <circle cx="180" cy="148" r="134" stroke="#D9EFEC" strokeWidth="1" />
          <circle cx="180" cy="148" r="104" stroke="#E8F5F3" strokeWidth="1" />
          <path
            d="M298 84c18 1 28 11 31 27M60 343c21 2 33 12 36 26"
            stroke="#B2E1DC"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="73" cy="92" r="5" fill="#C7EFEC" />
          <circle cx="309" cy="259" r="3.5" fill="#8FE3DE" />
        </>
      )}
      <g transform={small ? "translate(17 14)" : "translate(92 82)"}>
        <path
          d={small ? "M12 80c-5-20 3-45 34-51 5-1 10-1 15 0 29 6 39 31 34 51z" : "M8 216c-12-54 7-124 92-142 14-3 28-3 43 0 78 18 97 88 85 142z"}
          fill="#FFFDF8"
          stroke="#17333D"
          strokeWidth={small ? 1.5 : 1.6}
        />
        <path
          d={small ? "M78 82c5-1 10-1 15 0 12 2.5 20 8 25 16H53c5-8 13-13.5 25-16z" : "M218 220c14-3 28-3 43 0 24 5.5 43 18 54 37H164c11-19 30-31.5 54-37z"}
          fill="#F2FAF8"
          stroke="#D5E9E6"
          strokeWidth="1"
        />
        {small ? (
          <>
            <circle cx="45" cy="50" r="2.2" fill="#17333D" />
            <circle cx="71" cy="50" r="2.2" fill="#17333D" />
            <path d="M54 58c3 2 6 2 9 0" stroke="#60727A" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M58 75c-4-4-10-2-10 3 0 4 5 7 10 10 5-3 10-6 10-10 0-5-6-7-10-3z" fill="#16B8B0" />
          </>
        ) : (
          <>
            <circle cx="151" cy="119" r="6" fill="#17333D" />
            <circle cx="207" cy="119" r="6" fill="#17333D" />
            <path
              d="M164 140c10 8 22 8 32 0"
              stroke="#4A626B"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M178 178c-13-12-34-4-34 11 0 13 17 25 34 36 17-11 34-23 34-36 0-15-21-23-34-11z"
              fill="#16B8B0"
              stroke="#087F83"
              strokeWidth="2"
            />
            <path
              d="M30 156c-12 14-14 29-7 43M216 156c12 14 14 29 7 43"
              stroke="#17333D"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
      {!small && (
        <g transform="translate(238 300)">
          <rect width="92" height="58" rx="7" fill="#FFFFFF" stroke="#C6D9D8" />
          <path d="M15 17h30M15 27h44M15 37h21" stroke="#9EB7B5" strokeWidth="2" strokeLinecap="round" />
          <circle cx="75" cy="18" r="6" fill="#E8F8F6" />
          <path d="M72 18l2 2 4-4" stroke="#087F83" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
