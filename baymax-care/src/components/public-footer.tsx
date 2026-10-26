import Link from "next/link";
import { Logo } from "./brand";
import { brand } from "@/lib/config";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/for-families", label: "For families" },
      { href: "/register", label: "Create an account" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact & support" },
      { href: "/safety", label: "Medical AI safety" },
      { href: "/emergency", label: "Emergency information" },
    ],
  },
  {
    title: "Trust & legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/account-deletion", label: "Account deletion" },
      { href: "/privacy#your-rights", label: "Your privacy rights" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-[#fbfdfd]">
      <div className="container-site py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-6 text-muted">
              A calmer way to understand your health, organise care for your family, and know
              what to do next.
            </p>
            <p className="mt-5 text-xs leading-5 text-muted">
              Baymax Care is independent and is not affiliated with, endorsed by, or connected to
              Disney or the Big Hero 6 franchise.
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.8rem] text-muted transition-colors hover:text-aqua-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-11 flex flex-col justify-between gap-4 border-t border-line pt-6 text-[0.72rem] text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          <p>
            Emergency? Call{" "}
            <a
              className="font-semibold text-danger underline underline-offset-2"
              href={`tel:${brand.emergencyNumber}`}
            >
              {brand.emergencyNumber}
            </a>{" "}
            or your local emergency number.
          </p>
        </div>
      </div>
    </footer>
  );
}
