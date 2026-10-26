import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  FolderLock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { CareCompanion } from "@/components/brand";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "See how Baymax Care brings health records, report explanations, medication schedules, and family access together — and what stays deliberately unavailable.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    icon: UserPlus,
    title: "Create your private account",
    copy: "Register with your email. Your account gets its own family space and a self health profile, protected by a server-side session and a hashed password.",
    detail: "You can invite a caregiver later without sharing your password.",
  },
  {
    icon: FolderLock,
    title: "Add the people you care for",
    copy: "Create a separate profile for each family member. Their medical history, reports, medications, and contacts remain isolated from every other profile.",
    detail: "For children, the account owner is responsible for guardian consent and appropriate access.",
  },
  {
    icon: FileText,
    title: "Bring in what matters",
    copy: "Add health history, upload a report, or add a prescription. Files go into private storage. Report text is extracted only when a supported pipeline is configured.",
    detail: "Every record keeps its date, source, author, and creation time.",
  },
  {
    icon: MessageSquareText,
    title: "Understand and prepare",
    copy: "Read a plain-language report explanation, review the reference range shown on the document, or open the care assistant with selected context. You remain in control of what is shared.",
    detail: "AI guidance is not a diagnosis, and reporting an isolated value does not create one.",
  },
  {
    icon: Sparkles,
    title: "Act on the clear next step",
    copy: "Track a medication schedule, prepare for a visit, save an emergency contact, or make a food and water log. External actions only appear when a real provider is connected.",
    detail: "If a provider is unavailable, the product says so and explains what still works.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="How it works"
        title="A quiet workflow for a serious job."
        description="No long onboarding, no diagnostic claims, and no feature theatre. Here is the actual path through Baymax Care, including the points where the app waits for a real external provider."
      >
        <Link href="/register" className="btn btn-primary">
          Create your account <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </MarketingPageHero>

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="eyebrow">The path</p>
            <h2 className="display-md mt-3 max-w-md">
              Start small. Build the record as you live with it.
            </h2>
            <p className="mt-4 max-w-md text-[0.9rem] leading-6 text-muted">
              You do not need to upload an entire medical history on day one. Add a single report,
              one current medicine, or the questions for an upcoming appointment. Each piece is
              useful on its own.
            </p>
            <div className="mt-8 hidden justify-start lg:flex">
              <CareCompanion
                variant="small"
                className="h-40 w-40"
                label="The calm Baymax Care companion"
              />
            </div>
          </div>
          <ol className="space-y-0 border-l border-line">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative pb-9 pl-8 last:pb-0">
                  <span className="absolute -left-[17px] top-0 flex h-[33px] w-[33px] items-center justify-center rounded-full border border-aqua-200 bg-white text-aqua-700">
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-aqua-700">
                    Step {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.025em]">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-[0.85rem] leading-6 text-muted">{step.copy}</p>
                  <p className="mt-2 text-[0.72rem] leading-5 text-[#7b8c92]">{step.detail}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-b border-line bg-mint py-14 md:py-20">
        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="eyebrow">Built to behave</p>
              <h2 className="display-md mt-3">A realistic view of the technology.</h2>
              <p className="mt-4 text-[0.9rem] leading-6 text-muted">
                This is a working application, not a concept deck. Here is what is stored and
                enforced now — and what depends on deployment configuration.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  title: "Stored in a real database",
                  copy: "Users, family access, health records, schedules, reports, cycles, logs, and delivery attempts persist in PostgreSQL-compatible tables.",
                },
                {
                  icon: CircleAlert,
                  title: "Server-authorised",
                  copy: "Each read and mutation checks family access on the server. Changing a profile identifier in a URL does not grant access.",
                },
                {
                  icon: Sparkles,
                  title: "AI is configurable",
                  copy: "NVIDIA NIM is the preferred adapter. Without an API key, the assistant and report AI show an honest unavailable state.",
                },
                {
                  icon: FolderLock,
                  title: "Files stay private",
                  copy: "Local private storage is used in development. Production should use private object storage with short-lived signed links.",
                },
                {
                  icon: FileText,
                  title: "Scheduled reminders",
                  copy: "A protected cron endpoint creates due reminders and delivery records. A real scheduler and provider are required for delivery.",
                },
                {
                  icon: Check,
                  title: "No simulated success",
                  copy: "Ordering, consultations, ambulance dispatch, and notification delivery are never marked complete without a provider response.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-white p-5">
                    <Icon size={17} className="text-aqua-700" aria-hidden="true" />
                    <h3 className="mt-3 text-[0.82rem] font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-[0.73rem] leading-5 text-muted">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-narrow">
          <p className="eyebrow">Important boundaries</p>
          <h2 className="display-md mt-3">What the app will never pretend to do.</h2>
          <div className="mt-7 divide-y divide-line border-y border-line">
            {[
              "Confirm a diagnosis from a chat response or an isolated lab value.",
              "Verify a prescription simply because a file was uploaded.",
              "Create a clinician, credential, consultation slot, price, or pharmacy stock item.",
              "Say an emergency contact was reached when the provider did not confirm it.",
              "Dispatch an ambulance from a button that only opens a phone dialler.",
              "Replace emergency services or the judgment of a qualified clinician.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 py-3.5">
                <CircleAlert size={15} className="mt-1 flex-shrink-0 text-warning" aria-hidden="true" />
                <p className="text-[0.85rem] leading-6 text-ink-soft">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/safety" className="btn btn-secondary">
              Read the full safety approach
            </Link>
            <Link href="/register" className="btn btn-primary">
              Create your account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
