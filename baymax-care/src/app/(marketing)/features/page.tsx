import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardList,
  Droplets,
  HeartPulse,
  LockKeyhole,
  MessageSquareText,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Timer,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import {
  ChatVisual,
  FamilyVisual,
  ReportVisual,
  ScheduleVisual,
} from "@/components/marketing-visuals";
import { CareCompanion } from "@/components/brand";
import { InlineNotice } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Baymax Care: AI-assisted health guidance, report explanations, medication schedules, family records, consultations, women's health, nutrition, and emergency contacts.",
  alternates: { canonical: "/features" },
};

const toc = [
  ["ai-doctor", "AI family doctor"],
  ["reports", "Medical reports"],
  ["medications", "Medication schedules"],
  ["family", "Family records"],
  ["consultations", "Consultations"],
  ["womens-health", "Women's health"],
  ["nutrition", "Nutrition care"],
  ["emergency", "SOS & emergency"],
];

function FeatureLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      {number} · {children}
    </p>
  );
}

function BoundaryNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-[0.74rem] leading-5 text-muted">
      <CircleAlert size={14} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Features"
        title="Eight connected pieces of family care."
        description="Baymax Care is built around the ordinary tasks that make health harder than it needs to be: finding a record, understanding a report, remembering a dose, and knowing when to ask for help."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className="btn btn-primary">
            Create your account <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/how-it-works" className="btn btn-secondary">
            See how it works
          </Link>
        </div>
      </MarketingPageHero>

      <div className="container-site grid gap-10 py-12 lg:grid-cols-[210px_1fr] lg:gap-16 lg:py-16">
        <nav aria-label="Feature sections" className="lg:sticky lg:top-32 lg:self-start">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted">
            On this page
          </p>
          <ol className="space-y-0.5 border-l border-line pl-0">
            {toc.map(([id, label], index) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-start gap-2.5 rounded-r py-1.5 pl-3 text-[0.76rem] text-muted transition-colors hover:bg-aqua-50 hover:text-aqua-800"
                >
                  <span className="text-[0.62rem] font-semibold tabular-nums text-[#99aaad]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex items-start gap-2 text-[0.7rem] leading-5 text-muted">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-aqua-700" aria-hidden="true" />
              Every feature has an honest unavailable state when its provider is not configured.
            </div>
          </div>
        </nav>

        <div className="min-w-0 divide-y divide-line">
          {/* AI doctor */}
          <section id="ai-doctor" className="scroll-mt-32 pb-16 pt-2 first:pt-0">
            <div className="grid gap-9 xl:grid-cols-[1fr_0.88fr] xl:items-center">
              <div>
                <FeatureLabel number="01">AI family doctor</FeatureLabel>
                <h2 className="display-md mt-3">A thinking partner for the questions between visits.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  The assistant can explain terms, summarise the records you choose to include,
                  help you prepare for a clinician, and suggest a sensible level of care. It
                  keeps uncertainty visible and never poses as your doctor.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Conversations persist in your private account, with delete controls.",
                    "You decide whether a family member's context is included.",
                    "Potentially urgent symptoms trigger emergency guidance before anything else.",
                    "Answers are sanitised before display; feedback can flag unhelpful responses.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  AI guidance is informational. It cannot diagnose, prescribe, order tests, call a
                  clinician, or dispatch emergency services.
                </BoundaryNote>
              </div>
              <ChatVisual />
            </div>
          </section>

          {/* Reports */}
          <section id="reports" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[0.9fr_1fr] xl:items-center">
              <div className="order-2 xl:order-1">
                <ReportVisual />
              </div>
              <div className="order-1 xl:order-2">
                <FeatureLabel number="02">Medical report analyzer</FeatureLabel>
                <h2 className="display-md mt-3">A report should not require a second degree.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  Upload a PDF, JPEG, or PNG. The original stays in private storage. When the
                  relevant extraction service is configured, Baymax Care extracts text and asks
                  the AI model for a structured explanation with limits and follow-up questions.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: LockKeyhole,
                      title: "Private original",
                      copy: "Authorised, expiring download links — not public folders.",
                    },
                    {
                      icon: ClipboardList,
                      title: "Structured findings",
                      copy: "Value, unit, lab range, and flag only when data supports it.",
                    },
                    {
                      icon: Sparkles,
                      title: "Plain-language context",
                      copy: "Explanations labelled informational, never diagnostic.",
                    },
                    {
                      icon: CircleAlert,
                      title: "Honest states",
                      copy: "Image OCR and AI are marked unavailable if not configured.",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="border-l-2 border-aqua-200 pl-3">
                        <Icon size={15} className="text-aqua-700" aria-hidden="true" />
                        <p className="mt-1.5 text-[0.77rem] font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-[0.71rem] leading-5 text-muted">{item.copy}</p>
                      </div>
                    );
                  })}
                </div>
                <Link href="/safety#reports" className="link mt-6 inline-flex items-center gap-1.5 text-sm">
                  Report safety and limitations <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Meds */}
          <section id="medications" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[1fr_0.88fr] xl:items-center">
              <div>
                <FeatureLabel number="03">Medication reminders</FeatureLabel>
                <h2 className="display-md mt-3">A schedule has to come from somewhere real.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  Add a prescription, then build a medication schedule from the instructions it
                  contains. The schedule keeps the original prescription attached and records
                  who created it.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Daily and seven-day views with taken, skipped, and missed states.",
                    "Scheduled times use the family member's configured time zone.",
                    "A persistent job endpoint is available for reminder delivery; if no scheduler or channel is configured, nothing is claimed as delivered.",
                    "Pause or end a schedule with an audit record, preserving the history.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  The app never changes a dose or recommends doubling a missed dose. Follow the
                  written instructions from your prescriber or pharmacist.
                </BoundaryNote>
              </div>
              <ScheduleVisual />
            </div>
          </section>

          {/* Family */}
          <section id="family" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[0.9fr_1fr] xl:items-center">
              <div className="order-2 xl:order-1">
                <FamilyVisual />
              </div>
              <div className="order-1 xl:order-2">
                <FeatureLabel number="04">Family health records</FeatureLabel>
                <h2 className="display-md mt-3">Everyone has a profile. Not everyone sees everything.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  The account owner adds family profiles with date of birth, preferred language,
                  relationship, and optional health details. Each profile is a separate data
                  boundary.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Medical history, allergies, procedures, hospitalisations, immunisations, and notes in one timeline.",
                    "Search and filter without mixing one person's records with another's.",
                    "Caregiver invitations with view, manage, medication, and alert permissions.",
                    "Invitation acceptance is signed-in and email-bound; revocation takes effect immediately.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/for-families" className="link mt-6 inline-flex items-center gap-1.5 text-sm">
                  Family access, children, and consent <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Consultations */}
          <section id="consultations" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[1fr_0.78fr] xl:items-start">
              <div>
                <FeatureLabel number="05">24/7 doctor consultation</FeatureLabel>
                <h2 className="display-md mt-3">Availability should be real.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  When a verified consultation partner is configured, Baymax Care can present
                  genuine clinicians, specialties, languages, slots, and booking states. Until
                  then, you will see an honest setup state — not a dressed-up waiting room.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Verified clinician profiles only from a provider connection.",
                    "Time-zone-aware booking, cancellation, and rescheduling through the adapter.",
                    "Webhook signatures are verified before any appointment update is accepted.",
                    "AI guidance stays visibly separate from a human consultation.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  No clinician profiles, credentials, ratings, slots, prices, or consultations are
                  fabricated in this deployment. The interface explains when a provider is not
                  connected.
                </BoundaryNote>
              </div>
              <div className="panel overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.78rem] font-semibold">Consultation availability</p>
                    <span className="badge badge-neutral">Integration state</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3 rounded-md border border-line bg-[#fbfdfd] p-3">
                    <Stethoscope size={16} className="mt-0.5 text-muted" aria-hidden="true" />
                    <div>
                      <p className="text-[0.76rem] font-medium">Provider not connected</p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-muted">
                        No verified clinician or availability data can be shown without a real
                        scheduling partner.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2.5 text-[0.7rem] leading-5 text-muted">
                    <CalendarDays size={14} className="mt-0.5 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                    <p>
                      In the meantime, your care assistant can help you prepare questions for the
                      clinician you already see.
                    </p>
                  </div>
                  <Link href="/safety#consultations" className="link mt-4 inline-flex items-center gap-1 text-[0.75rem]">
                    How provider verification works <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Women's health */}
          <section id="womens-health" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[0.85fr_1fr] xl:items-center">
              <div className="panel overflow-hidden order-2 xl:order-1">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse size={15} className="text-aqua-700" aria-hidden="true" />
                    <p className="text-[0.78rem] font-semibold">Private cycle log</p>
                  </div>
                  <span className="badge badge-aqua">Only you</span>
                </div>
                <div className="p-4">
                  <div className="calendar-grid">
                    {Array.from({ length: 28 }, (_, index) => {
                      const day = index + 1;
                      const period = day >= 5 && day <= 9;
                      const predicted = day >= 26;
                      return (
                        <div
                          key={day}
                          className={`calendar-day ${period ? "calendar-day-period" : predicted ? "calendar-day-predicted" : ""}`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[0.62rem] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-aqua-500" /> Logged period
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm border border-[#b8d6f0] bg-[#f2f7fc]" />{" "}
                      Estimate, not certainty
                    </span>
                  </div>
                </div>
              </div>
              <div className="order-1 xl:order-2">
                <FeatureLabel number="06">Women&apos;s health</FeatureLabel>
                <h2 className="display-md mt-3">Private by architecture, not just wording.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  Log periods, flow, symptoms, mood, energy, and personal notes in a dedicated
                  private space. Cycle estimates are calculated from your own recorded history
                  and clearly labelled as estimates.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Visible only to the signed-in account that owns the private health space.",
                    "Never included in shared family dashboards, AI context, or notifications by default.",
                    "Free-text notes are application-encrypted before storage.",
                    "Predictions can be disabled; estimates are never presented as fertility or pregnancy certainty.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  Cycle dates alone cannot confirm ovulation, fertility, pregnancy, or a medical
                  condition. Speak with a qualified clinician about concerns.
                </BoundaryNote>
              </div>
            </div>
          </section>

          {/* Nutrition */}
          <section id="nutrition" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[1fr_0.8fr] xl:items-start">
              <div>
                <FeatureLabel number="07">Diet & nutrition care</FeatureLabel>
                <h2 className="display-md mt-3">Everyday food, without miracle claims.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  Record preferences, goals, allergies, and dietary patterns. Generate a
                  practical seven-day plan from a curated set of meal ideas, keep a food and water
                  log, and download the plan or shopping list.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Vegetarian, vegan, eggetarian, pescatarian, and non-vegetarian plans.",
                    "Indian meal options alongside other familiar cuisines.",
                    "Allergy exclusions respected in plan generation.",
                    "Meal and hydration summaries reflect only what you actually logged.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  No calorie or nutrient values are invented. Nutrition calculations that require
                  a database are disabled until a reputable provider is configured. Meal plans are
                  general suggestions, not treatment for a medical condition.
                </BoundaryNote>
              </div>
              <div className="panel overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={15} className="text-aqua-700" aria-hidden="true" />
                    <p className="text-[0.78rem] font-semibold">A vegetarian day</p>
                  </div>
                </div>
                <div className="divide-y divide-line">
                  {[
                    ["Breakfast", "Masala oats with peanuts and seasonal fruit"],
                    ["Lunch", "Rajma, brown rice, cucumber salad"],
                    ["Snack", "Roasted chana and a cup of tea"],
                    ["Dinner", "Palak paneer with two rotis"],
                  ].map(([meal, food]) => (
                    <div key={meal} className="flex gap-3 px-4 py-3">
                      <span className="w-16 flex-shrink-0 text-[0.62rem] font-medium uppercase tracking-wider text-muted">
                        {meal}
                      </span>
                      <p className="text-[0.73rem] leading-5 text-ink-soft">{food}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line bg-[#fbfdfd] px-4 py-2.5">
                  <p className="text-[0.62rem] text-muted">
                    Example plan from the curated suggestion set. Not individualized medical advice.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Emergency */}
          <section id="emergency" className="scroll-mt-32 py-16">
            <div className="grid gap-9 xl:grid-cols-[0.9fr_1fr] xl:items-center">
              <div className="order-2 xl:order-1">
                <div className="panel overflow-hidden">
                  <div className="border-b border-[#f0d3d7] bg-[#fff8f8] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CircleAlert size={15} className="text-danger" aria-hidden="true" />
                      <p className="text-[0.78rem] font-semibold text-[#872e39]">
                        Personal emergency support
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="rounded-md border border-[#efd0d4] bg-[#fdf4f5] p-4">
                      <p className="text-[0.72rem] font-semibold text-[#7f2b36]">
                        This does not dispatch an ambulance.
                      </p>
                      <p className="mt-1 text-[0.7rem] leading-5 text-[#7c4a50]">
                        For immediate danger, call your local emergency number directly and follow
                        the dispatcher&apos;s instructions.
                      </p>
                      <a href="tel:112" className="btn btn-danger btn-sm mt-3">
                        Call emergency services (112)
                      </a>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        ["SOS alert", "Records each configured contact and delivery attempt."],
                        ["Emergency contacts", "Requires the contact's consent before sharing details."],
                        ["Ambulance adapter", "Shows unavailability rather than a pretend dispatch."],
                      ].map(([title, copy]) => (
                        <div key={title} className="flex gap-2.5 rounded border border-line p-2.5">
                          <Check size={13} className="mt-0.5 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                          <div>
                            <p className="text-[0.73rem] font-medium">{title}</p>
                            <p className="text-[0.66rem] leading-4 text-muted">{copy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 xl:order-2">
                <FeatureLabel number="08">Personal SOS & emergency</FeatureLabel>
                <h2 className="display-md mt-3">Fast where it matters. Honest about what happens next.</h2>
                <p className="lede mt-4 text-[0.94rem]">
                  Keep emergency contacts close, share the minimum necessary information, and see
                  the actual delivery result for every channel. A direct emergency-call page
                  remains available without depending on AI or the application database.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Large, labelled emergency actions that do not rely on colour alone.",
                    "Location is requested only when needed and shared only with chosen contacts.",
                    "Each SMS or email attempt records a real provider status.",
                    "Emergency information is available publicly at /emergency.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.8rem] leading-5 text-ink-soft">
                      <Check size={14} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <BoundaryNote>
                  An SOS alert is a message to your selected contacts. It is not a call to
                  emergency services, and a dialler link does not mean an ambulance was dispatched.
                </BoundaryNote>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="border-t border-line bg-mint py-14">
        <div className="container-site grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2">
              <CareCompanion variant="small" className="h-11 w-11" />
              <p className="eyebrow">Ready when you are</p>
            </div>
            <h2 className="display-md mt-3 max-w-2xl">
              Start with a record, a question, or a single reminder.
            </h2>
            <p className="mt-3 max-w-xl text-[0.86rem] leading-6 text-muted">
              Nothing has to be perfect or complete. A private account, a first family profile,
              and one useful next step are enough.
            </p>
          </div>
          <Link href="/register" className="btn btn-primary btn-lg">
            Create your account <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
