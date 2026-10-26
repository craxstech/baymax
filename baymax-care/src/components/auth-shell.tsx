import Link from "next/link";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { CareCompanion, Logo } from "./brand";
import { brand } from "@/lib/config";

export function AuthShell({
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <aside className="relative hidden overflow-hidden bg-[#074b4f] px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="relative">
          <Logo light />
        </div>

        <div className="relative my-12 max-w-md">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-aqua-200">
            A calmer health space
          </p>
          <h2 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.045em] text-white xl:text-[2.35rem]">
            One place for the health of the people you love.
          </h2>
          <p className="mt-5 text-[0.88rem] leading-6 text-[#c3e3e0]">
            Keep records together, understand what they mean, and coordinate everyday care
            without turning your family life into a filing system.
          </p>

          <ul className="mt-8 space-y-3.5 text-[0.8rem] text-[#d9efec]">
            {[
              "Private by default, with access checked on the server",
              "Clear limits on AI guidance and emergency support",
              "Your records stay exportable and deletable",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Check size={10} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="relative mx-auto w-[190px]">
            <CareCompanion
              variant="small"
              className="h-[132px] w-full opacity-95"
              label="An original care companion illustration"
            />
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-4 text-[0.67rem] text-[#b7dad7]">
            <ShieldCheck size={13} aria-hidden="true" />
            <span>{brand.name} is an independent product.</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-[68px] items-center justify-between border-b border-line px-5 lg:hidden">
          <Logo />
          <Link href="/" className="text-xs font-medium text-muted hover:text-aqua-700">
            Back to site
          </Link>
        </header>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-10 lg:py-14"
        >
          <div className={wide ? "w-full max-w-[520px]" : "w-full max-w-[420px]"}>
            <div className="mb-7">
              <p className="eyebrow mb-3">Baymax Care account</p>
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.045em] text-ink">{title}</h1>
              <p className="mt-2.5 text-[0.88rem] leading-6 text-muted">{description}</p>
            </div>
            {children}
            {footer && (
              <div className="mt-7 border-t border-line pt-5 text-[0.82rem] text-muted">{footer}</div>
            )}
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-[0.68rem] text-muted sm:px-8">
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole size={11} aria-hidden="true" /> Private health workspace
          </span>
          <nav className="flex gap-4" aria-label="Legal">
            <Link href="/privacy" className="hover:text-aqua-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-aqua-700">
              Terms
            </Link>
            <Link href="/safety" className="hover:text-aqua-700">
              Safety
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
