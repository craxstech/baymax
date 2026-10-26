import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { Logo } from "./brand";
import type { CurrentUser } from "@/lib/auth";
import { brand } from "@/lib/config";
import { initials } from "@/lib/utils";

const nav = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-families", label: "For families" },
  { href: "/safety", label: "Safety" },
];

export function PublicHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-[6px]">
      <div className="container-site flex h-[68px] items-center justify-between gap-5">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-[0.82rem] font-medium text-[#4e626b] transition-colors hover:bg-aqua-50 hover:text-aqua-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-aqua-100 text-[0.68rem] font-semibold text-aqua-800">
                {initials(user.name)}
              </span>
              <Link href="/app" className="btn btn-primary btn-sm">
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-quiet btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          {!user && (
            <Link href="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          )}
          <details className="relative">
            <summary
              className="btn btn-secondary btn-icon list-none"
              aria-label="Open navigation menu"
            >
              <Menu size={18} aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 border border-line bg-white p-2 shadow-md">
              <nav aria-label="Mobile navigation" className="flex flex-col">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-sm px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-aqua-50"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-line" />
                {user ? (
                  <Link href="/app" className="btn btn-primary btn-sm mx-2 mb-1">
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="rounded-sm px-3 py-2.5 text-sm font-medium">
                      Sign in
                    </Link>
                    <Link href="/register" className="btn btn-primary btn-sm mx-2 mt-1 mb-1">
                      Create account
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </details>
        </div>
      </div>
      <div className="border-t border-line/70 bg-mint/60">
        <div className="container-site flex h-8 items-center justify-between gap-3 overflow-hidden text-[0.67rem] text-[#5e737a]">
          <p className="truncate">
            AI guidance is informational, not a diagnosis. For an emergency, call{" "}
            <a
              className="font-semibold text-danger underline underline-offset-2"
              href={`tel:${brand.emergencyNumber}`}
            >
              {brand.emergencyNumber}
            </a>
            .
          </p>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <ShieldCheck size={12} aria-hidden="true" />
            Your health space is private by default
          </span>
        </div>
      </div>
    </header>
  );
}
