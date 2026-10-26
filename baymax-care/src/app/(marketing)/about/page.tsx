import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, LockKeyhole, MessageSquareText, PencilRuler } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { CareCompanion } from "@/components/brand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Baymax Care exists, how the original care companion was designed, and the standards we hold the product to.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="About Baymax Care"
        title="Healthcare admin, treated with the care it deserves."
        description="Baymax Care is an original product concept inspired by the calm, reassuring idea of a personal healthcare companion. It is not a character product, a diagnostic tool, or a replacement for professional care."
      />

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-start lg:gap-20">
          <div className="max-w-2xl">
            <p className="eyebrow">Why this exists</p>
            <h2 className="display-md mt-3">The care is hard enough. The organisation should not be.</h2>
            <div className="prose mt-5">
              <p>
                Families carry a quiet administrative load: reports in several inboxes,
                prescriptions in photos, medication times remembered by one person, and questions
                that surface at the wrong moment. That load is not a small inconvenience. It can
                make it harder to notice changes, prepare for an appointment, or follow a plan.
              </p>
              <p>
                Baymax Care is a working attempt to make that load lighter and more legible.
                Instead of adding another feed, it uses structured records, plain-language
                explanations, honest status labels, and clear next steps. The goal is not to
                automate care. It is to make the human care around it easier to coordinate.
              </p>
            </div>
            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              {[
                {
                  icon: HeartHandshake,
                  title: "Calm over urgency",
                  copy: "Clear hierarchy, restrained motion, and no distracting effects around important health actions.",
                },
                {
                  icon: LockKeyhole,
                  title: "Privacy by boundary",
                  copy: "Sensitive records stay separated by person and are checked server-side.",
                },
                {
                  icon: MessageSquareText,
                  title: "Plain language",
                  copy: "If a result is uncertain or an integration is unavailable, the product says so.",
                },
                {
                  icon: PencilRuler,
                  title: "Original identity",
                  copy: "The mark, companion illustration, and interface are original work.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-white p-5">
                    <Icon size={17} className="text-aqua-700" aria-hidden="true" />
                    <h3 className="mt-3 text-[0.83rem] font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-[0.74rem] leading-5 text-muted">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lg:sticky lg:top-32">
            <div className="rounded-xl border border-aqua-200 bg-aqua-50 p-6">
              <CareCompanion
                className="mx-auto h-60 w-auto"
                label="The original Baymax Care companion illustration"
              />
              <div className="mt-4 border-t border-aqua-200 pt-4">
                <p className="text-[0.8rem] font-semibold">Meet the care companion</p>
                <p className="mt-1.5 text-[0.74rem] leading-6 text-muted">
                  A small original illustration, not a licensed character. It exists to make the
                  product feel less clinical and more human — never to imply that a character can
                  provide medical care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-mint py-14 md:py-20">
        <div className="container-narrow">
          <p className="eyebrow">What we are building</p>
          <h2 className="display-md mt-3">A product with visible seams.</h2>
          <p className="mt-4 text-[0.94rem] leading-6 text-muted">
            This build is deliberately honest about its stage. Core records, family access, AI
            conversations, medication schedules, report handling, women&apos;s health, nutrition,
            notifications, and emergency-contact alerts are implemented against a real database.
            Some external services require credentials and commercial agreements before they can
            be considered live.
          </p>
          <div className="mt-7 border-y border-line">
            {[
              ["No invented doctors", "Clinician profiles cannot appear without a real scheduling provider and verified credentials."],
              ["No disguised simulations", "Pharmacy orders and ambulance dispatches are unavailable unless a real provider exists."],
              ["No hidden limits", "AI guidance, report limitations, and emergency boundaries are stated in the interface."],
              ["No borrowed credibility", "The site does not claim certifications, approvals, or clinical outcomes it has not verified."],
            ].map(([title, copy]) => (
              <div key={title} className="grid gap-1 border-b border-line py-4 last:border-b-0 sm:grid-cols-[190px_1fr] sm:gap-6">
                <h3 className="text-[0.8rem] font-semibold">{title}</h3>
                <p className="text-[0.78rem] leading-5 text-muted">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/safety" className="btn btn-secondary">
              Read about safety
            </Link>
            <Link href="/contact" className="btn btn-primary">
              Get in touch <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-narrow text-[0.78rem] leading-6 text-muted">
          <h2 className="text-sm font-semibold text-ink">Trademark and attribution</h2>
          <p className="mt-2">
            &ldquo;Baymax&rdquo; is associated with a third-party entertainment franchise. This
            independent project uses the working product name &ldquo;Baymax Care&rdquo; at the
            request of its owner for development purposes. It is not affiliated with, endorsed by,
            or licensed by Disney or the Big Hero 6 franchise. Before public commercial launch,
            the owner must secure appropriate branding rights or choose a distinct mark. All
            original interface artwork here is independently drawn and does not reproduce
            copyrighted character artwork.
          </p>
        </div>
      </section>
    </>
  );
}
