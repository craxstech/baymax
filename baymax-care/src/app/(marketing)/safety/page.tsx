import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  FileText,
  HeartPulse,
  PhoneCall,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Safety and limitations",
  description:
    "How Baymax Care approaches medical AI safety, report limitations, prescriptions, consultations, and emergency situations.",
  alternates: { canonical: "/safety" },
};

const sections = [
  {
    id: "emergency",
    icon: CircleAlert,
    title: "Emergencies come before everything else",
    body: [
      "Baymax Care is not an emergency service. It does not contact emergency dispatchers, send an ambulance, or guarantee a response time.",
      "If you or someone else may be in immediate danger, call your local emergency number now. In India, that number is 112. If you are outside India, use the emergency number for your location.",
      "When the assistant detects wording that may indicate a life-threatening emergency, it stops giving general guidance and directs the user to emergency help. This detection is a safety layer, not a diagnosis and not a substitute for human judgment.",
      "A public emergency page with direct phone links remains available even when the AI provider or application database is unavailable.",
    ],
    callout: {
      text: "This product does not dispatch ambulance services. A phone link opens your dialler; it does not notify a dispatcher.",
      href: "/emergency",
      label: "Open emergency information",
    },
  },
  {
    id: "ai",
    icon: Sparkles,
    title: "The assistant is guidance, not a clinician",
    body: [
      "Baymax Care uses a configured large language model through a server-side adapter. The model can provide general health information, explain terminology, help prepare questions, and summarise context the user explicitly selects.",
      "It cannot examine you, order tests, verify a diagnosis, prescribe a medicine, change a prescription, contact a clinician, or make an emergency dispatch.",
      "The assistant is instructed to acknowledge uncertainty, ask for relevant context when appropriate, avoid inventing citations, and recommend a qualified clinician or emergency service when needed. These are safeguards, not guarantees. AI output can be wrong or incomplete.",
      "Do not use an AI response to delay care or to start, stop, or change a prescription medicine without the involvement of a qualified clinician or pharmacist.",
      "AI conversations and optional report analysis are only sent to the configured AI provider when that provider is set up. Read the deployment privacy notice before enabling an external model.",
    ],
  },
  {
    id: "reports",
    icon: FileText,
    title: "A laboratory value is not a diagnosis",
    body: [
      "Report explanations are informational. They are based on the text extracted from the document and, where configured, an AI-generated interpretation validated against a structured schema.",
      "Reference ranges vary by laboratory, method, age, sex where clinically relevant, pregnancy status, and other factors. Baymax Care displays the range supplied in the document; it does not invent a normal range or replace professional interpretation.",
      "The product does not label a report normal or abnormal with certainty, and it does not diagnose a condition from a single result. OCR can make mistakes. Always check the original document and ask the clinician who ordered the test.",
      "Image report extraction requires an OCR provider. If one is not configured, the document can still be stored privately, but the app clearly says that image text extraction is unavailable.",
    ],
  },
  {
    id: "prescriptions",
    icon: Pill,
    title: "A prescription upload is not verification",
    body: [
      "Prescription status begins as unverified. A successful file upload, extraction, or human-entered detail does not make a prescription verified.",
      "Medication schedules created in the app are linked to a prescription record on file and to the prescriber details supplied by the user. They are a planning aid, not a new prescription. The app does not alter the prescribed dose or direct the user to double a missed dose.",
      "Medicine ordering is disabled unless a contracted pharmacy integration is configured and can return genuine eligibility, stock, price, and fulfillment information. No orders are simulated.",
      "If a prescription appears wrong or has expired, contact the prescriber or a pharmacist. Do not use this product to independently obtain prescription-only medicines.",
    ],
  },
  {
    id: "consultations",
    icon: Stethoscope,
    title: "Only genuine clinician availability appears",
    body: [
      "The consultation module presents clinicians, availability, booking, and appointment records only when a configured scheduling provider returns them.",
      "A provider must supply the clinician identity, credential verification status, languages, specialties, real slots, and booking response. The app does not invent any of this information.",
      "The public name for this module is not a promise of unconditional 24/7 coverage. If continuous clinical coverage is not contractually configured, the actual availability or integration-unavailable state is shown.",
      "AI guidance is not a consultation with a qualified human clinician, even when the assistant is configured and available.",
    ],
  },
  {
    id: "medicines",
    icon: ShieldCheck,
    title: "Medication reminders do not replace the instructions",
    body: [
      "A reminder is a message or in-app record about a scheduled dose. It is not a medical instruction and cannot confirm that a dose was swallowed.",
      "The user marks doses as taken or skipped. Missed doses may be shown as missed. No recommendation is made to double a dose unless an appropriate clinician-approved instruction exists for that specific medicine.",
      "Delivery is only shown as sent when the configured email or SMS provider accepts it. If no provider is configured, the alert or reminder is recorded as unavailable and the user is told what to do next.",
      "Time-zone handling is applied to scheduling, but device clocks, provider outages, and quiet hours can still affect real delivery.",
    ],
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy is a boundary, not a slogan",
    body: [
      "Every protected medical operation checks the signed-in account's access to the specific family member. Interface hiding is not treated as security.",
      "Report and prescription files are stored outside the public web root. Authorised downloads use short-lived, signed links. Application logs are structured to avoid health content, passwords, and tokens.",
      "URL parameters do not grant access. You cannot access a different family's record by changing an identifier.",
      "No system is perfect. If you discover a security concern, contact us privately through the contact page and select Security. Do not include another person's medical records in the report.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Medical AI safety"
        title="Trust begins with saying what the product cannot do."
        description="Baymax Care is designed to help people understand and organise care. It is not a doctor, an emergency dispatcher, a pharmacy, or a guarantee. This page explains where the boundaries are and what the application actually enforces."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href={`tel:${brand.emergencyNumber}`} className="btn btn-danger">
            <PhoneCall size={15} aria-hidden="true" />
            Call emergency services ({brand.emergencyNumber})
          </a>
          <Link href="/emergency" className="btn btn-secondary">
            Emergency guidance
          </Link>
        </div>
      </MarketingPageHero>

      <section className="border-b border-line bg-[#fff9f5]">
        <div className="container-site flex flex-col justify-between gap-5 py-5 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <CircleAlert size={18} className="mt-0.5 flex-shrink-0 text-danger" aria-hidden="true" />
            <p className="max-w-3xl text-[0.82rem] leading-6 text-[#6d3f45]">
              <strong>For a possible emergency, stop and call {brand.emergencyNumber}</strong> or your
              local emergency number. Do not wait for a chatbot, report explanation, or app
              notification. This website cannot send an ambulance.
            </p>
          </div>
          <a href={`tel:${brand.emergencyNumber}`} className="btn btn-danger btn-sm flex-shrink-0">
            Call {brand.emergencyNumber}
          </a>
        </div>
      </section>

      <div className="container-site grid gap-10 py-14 lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-20">
        <nav aria-label="Safety sections" className="lg:sticky lg:top-32 lg:self-start">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted">
            On this page
          </p>
          <ul className="space-y-1 border-l border-line pl-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="block py-1.5 text-[0.76rem] text-muted hover:text-aqua-800">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 divide-y divide-line">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-32 py-10 first:pt-0">
                <div className="flex items-start gap-3">
                  <span className="icon-tile flex-shrink-0">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-aqua-700">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{section.title}</h2>
                  </div>
                </div>
                <div className="mt-4 space-y-3 pl-0 sm:pl-[52px]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[0.88rem] leading-7 text-[#485b64]">
                      {paragraph}
                    </p>
                  ))}
                  {section.callout && (
                    <div className="notice notice-danger">
                      <HeartPulse size={16} aria-hidden="true" />
                      <div>
                        <p>{section.callout.text}</p>
                        <Link href={section.callout.href} className="link mt-1 inline-flex items-center gap-1 text-xs">
                          {section.callout.label} <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <section className="border-t border-line bg-mint py-14">
        <div className="container-narrow">
          <p className="eyebrow">Before you rely on an answer</p>
          <h2 className="display-md mt-3">A short, practical checklist.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              "Check whether the answer applies to the right person, age, and context.",
              "Compare any report explanation with the original document and its laboratory range.",
              "Confirm medication instructions with the prescriber or pharmacist.",
              "Treat severe, sudden, or worsening symptoms as a reason to seek urgent human care.",
              "Do not share more health information with an AI or third party than is necessary.",
              "Use the contact page for product, privacy, or security concerns — not urgent medical advice.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 border-t border-line pt-3">
                <ShieldCheck size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                <p className="text-[0.78rem] leading-5 text-ink-soft">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn btn-secondary">
              Read the privacy policy
            </Link>
            <Link href="/contact" className="btn btn-primary">
              Contact the team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
