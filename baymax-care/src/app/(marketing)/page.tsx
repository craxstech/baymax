import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  CircleAlert,
  FileText,
  HeartPulse,
  LockKeyhole,
  MessageSquareText,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { CareCompanion } from "@/components/brand";
import {
  ChatVisual,
  DashboardPreview,
  FamilyVisual,
  ModuleStrip,
  ReportVisual,
  ScheduleVisual,
} from "@/components/marketing-visuals";

const featureLinks = [
  { label: "AI family doctor", href: "/features#ai-doctor", icon: Sparkles },
  { label: "Report explanations", href: "/features#reports", icon: FileText },
  { label: "Medication schedules", href: "/features#medications", icon: Pill },
  { label: "Family records", href: "/features#family", icon: Users },
  { label: "Consultations", href: "/features#consultations", icon: Stethoscope },
  { label: "Women's health", href: "/features#womens-health", icon: HeartPulse },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-band border-b border-line">
        <div className="container-site grid gap-12 pb-16 pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-24">
          <div className="relative z-10">
            <p className="eyebrow">Family health, thoughtfully connected</p>
            <h1 className="display-xl mt-5 max-w-[690px]">
              Your family&apos;s health,
              <br />
              in one caring place.
            </h1>
            <p className="lede mt-6 max-w-[540px]">
              Understand medical reports, manage medications, keep family health records
              organised, and connect with healthcare professionals when you need them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn btn-primary btn-lg">
                Create your account
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/features" className="btn btn-secondary btn-lg">
                Explore features
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-[0.76rem] text-[#52686f]">
              <li className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-aqua-700" aria-hidden="true" />
                Private health records
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-aqua-700" aria-hidden="true" />
                AI with clear limits
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-aqua-700" aria-hidden="true" />
                Emergency guidance that stays visible
              </li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[510px]">
            <div className="relative min-h-[400px] overflow-hidden rounded-xl border border-[#dcebe9] bg-[#f4fbfa] sm:min-h-[475px]">
              <svg
                viewBox="0 0 500 475"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
                preserveAspectRatio="xMidYMid slice"
              >
                <circle cx="376" cy="103" r="152" fill="none" stroke="#ccece8" />
                <circle cx="376" cy="103" r="109" fill="none" stroke="#ddf2ef" />
                <path d="M0 356c65-42 111-39 173 5s127 43 192-11 93-51 135-21" fill="none" stroke="#d4edeb" />
                <path d="M42 72l12 0M48 66l0 12" stroke="#a8ded9" strokeWidth="1.2" />
                <circle cx="436" cy="337" r="3.5" fill="#9eddda" />
                <circle cx="99" cy="401" r="2.5" fill="#b9e6e2" />
              </svg>
              <CareCompanion
                className="relative z-[1] mx-auto h-[370px] w-auto pt-8 sm:h-[430px]"
                label="An original care companion illustration with a calm, reassuring expression"
              />
              <div className="absolute left-4 top-4 z-[2] inline-flex items-center gap-2 rounded-md border border-white bg-white/95 px-2.5 py-1.5 text-[0.64rem] font-medium text-ink-soft shadow-sm sm:left-6 sm:top-6">
                <span className="h-1.5 w-1.5 rounded-full bg-aqua-500" />
                A companion, not a clinician
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-[2] flex items-center gap-3 rounded-lg border border-white bg-white/95 p-3 shadow-sm backdrop-blur sm:bottom-6 sm:left-6 sm:right-6">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-aqua-50 text-aqua-700">
                  <LockKeyhole size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-semibold text-ink">
                    Your records. Your permission.
                  </p>
                  <p className="mt-0.5 text-[0.65rem] leading-4 text-muted">
                    Family access is checked on every server request.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-right text-[0.63rem] text-muted">
              Original care companion illustration.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white py-14 md:py-20" aria-labelledby="preview-heading">
        <div className="container-site">
          <div className="mb-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="eyebrow">A real product, not a promise</p>
              <h2 id="preview-heading" className="display-md mt-3 max-w-xl">
                The whole care picture, without the clutter.
              </h2>
            </div>
            <p className="max-w-sm text-[0.82rem] leading-6 text-muted md:text-right">
              An illustrated preview of the dashboard. When you create an account, your own
              records, schedules, and family profiles replace it.
            </p>
          </div>
          <DashboardPreview />
          <p className="mt-3 text-[0.68rem] text-muted">
            Illustrative product demonstration with synthetic sample content. It is not live
            patient data, clinical advice, or a real care record.
          </p>
        </div>
      </section>

      <section className="border-b border-line py-16 md:py-24" aria-labelledby="scattered-heading">
        <div className="container-site grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="eyebrow">The problem is rarely the care</p>
            <h2 id="scattered-heading" className="section-title mt-3 max-w-md">
              It&apos;s keeping everything around it together.
            </h2>
          </div>
          <div className="lg:pt-1">
            <p className="text-[1.04rem] leading-7 text-ink-soft">
              Reports sit in email. Medicines live in a message thread. Questions are scattered
              across notes, and everyone remembers a different version of events. When a
              household needs to act, the important details are harder to find than they should be.
            </p>
            <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {[
                ["Collect", "One private place for each person's records and documents."],
                ["Understand", "Plain-language context with the limits made clear."],
                ["Act", "Medication schedules, care contacts, and verified next steps."],
              ].map(([title, copy], index) => (
                <div key={title} className="bg-white p-5">
                  <span className="text-[0.62rem] font-semibold text-aqua-700">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 text-[0.88rem] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[0.76rem] leading-5 text-muted">{copy}</p>
                </div>
              ))}
            </div>
            <nav aria-label="Jump to a feature" className="mt-7 flex flex-wrap gap-2">
              {featureLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className="chip hover:border-aqua-300 hover:bg-aqua-50">
                    <Icon size={13} className="text-aqua-700" aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white py-16 md:py-24" aria-labelledby="ai-heading">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="eyebrow">01 · AI family doctor</p>
            <h2 id="ai-heading" className="section-title mt-3 max-w-lg">
              Answers that know their limits.
            </h2>
            <p className="lede mt-5 max-w-lg text-[0.98rem]">
              Ask about a medical term, prepare for an appointment, or make sense of the
              instructions you were given. The assistant helps you think clearly without acting
              like it is your doctor.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Use selected family records only when you choose to share them.",
                "Urgent symptoms are redirected toward emergency help, not a longer chat.",
                "Every response is labelled as AI guidance — never a diagnosis.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-[0.84rem] leading-6 text-ink-soft">
                  <span className="mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-aqua-100 text-aqua-800">
                    <Check size={10} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/features#ai-doctor" className="link inline-flex items-center gap-1.5 text-sm">
                Explore the assistant <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/safety" className="link-quiet inline-flex items-center gap-1.5 text-sm text-muted">
                Read the safety boundaries <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ChatVisual />
        </div>
      </section>

      <section className="border-b border-line bg-mint py-16 md:py-24" aria-labelledby="reports-heading">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <ReportVisual />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">02 · Medical reports</p>
            <h2 id="reports-heading" className="section-title mt-3 max-w-lg">
              From numbers to a clearer conversation.
            </h2>
            <p className="lede mt-5 max-w-lg text-[0.98rem]">
              Add a laboratory report or scan document. Keep the original safely, see the
              laboratory&apos;s own reference ranges, and get a plain-language explanation that
              shows its uncertainty.
            </p>
            <div className="mt-6 grid gap-3 border-y border-line py-5 sm:grid-cols-2">
              <div>
                <p className="text-[0.78rem] font-semibold">Range-aware</p>
                <p className="mt-1 text-[0.75rem] leading-5 text-muted">
                  Values are compared to the reference range printed on your report — not an
                  invented normal.
                </p>
              </div>
              <div>
                <p className="text-[0.78rem] font-semibold">Questions included</p>
                <p className="mt-1 text-[0.75rem] leading-5 text-muted">
                  See useful questions to take to the clinician who knows your context.
                </p>
              </div>
            </div>
            <p className="mt-4 flex gap-2 text-[0.72rem] leading-5 text-muted">
              <CircleAlert size={14} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden="true" />
              A single isolated value cannot confirm a diagnosis. Report explanations are
              informational and should be interpreted by a qualified professional.
            </p>
            <Link href="/features#reports" className="link mt-6 inline-flex items-center gap-1.5 text-sm">
              How report analysis works <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white py-16 md:py-24" aria-labelledby="medication-heading">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="eyebrow">03 · Medication care</p>
            <h2 id="medication-heading" className="section-title mt-3 max-w-lg">
              The small things, remembered.
            </h2>
            <p className="lede mt-5 max-w-lg text-[0.98rem]">
              Turn a written prescription into a clear schedule, then confirm each dose as taken
              or skipped. Keep the original prescription attached to the plan.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Schedules are created only from a prescription already on file.",
                "Times respect the family member's time zone.",
                "The app never tells you to double a missed dose.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-[0.84rem] leading-6 text-ink-soft">
                  <Check size={15} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/features#medications" className="link mt-7 inline-flex items-center gap-1.5 text-sm">
              See medication scheduling <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ScheduleVisual />
        </div>
      </section>

      <section className="border-b border-line bg-[#fbfdfd] py-16 md:py-24" aria-labelledby="family-heading">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <FamilyVisual />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">04 · Family care</p>
            <h2 id="family-heading" className="section-title mt-3 max-w-lg">
              A household, not a shared folder.
            </h2>
            <p className="lede mt-5 max-w-lg text-[0.98rem]">
              Add the people you care for, each with a separate health record. Choose what a
              caregiver can see or manage, and revoke that access when circumstances change.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
              <div>
                <LockKeyhole size={17} className="text-aqua-700" aria-hidden="true" />
                <p className="mt-2 text-[0.78rem] font-semibold">Separate records</p>
                <p className="mt-1 text-[0.73rem] leading-5 text-muted">
                  Every request checks the signed-in person&apos;s access to that specific profile.
                </p>
              </div>
              <div>
                <Users size={17} className="text-aqua-700" aria-hidden="true" />
                <p className="mt-2 text-[0.78rem] font-semibold">Caregiver controls</p>
                <p className="mt-1 text-[0.73rem] leading-5 text-muted">
                  Invite another adult with granular permissions. Access can be revoked.
                </p>
              </div>
            </div>
            <Link href="/for-families" className="link mt-7 inline-flex items-center gap-1.5 text-sm">
              How family care works <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white py-16 md:py-24" aria-labelledby="more-care-heading">
        <div className="container-site">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">05 · The rest of daily care</p>
            <h2 id="more-care-heading" className="section-title mt-3">
              Care beyond the consultation room.
            </h2>
            <p className="mt-4 text-[0.94rem] leading-6 text-muted">
              Women&apos;s health, nutrition, clinician access, and emergency contacts have their
              own considered tools — with privacy and honesty built into each one.
            </p>
          </div>
          <ModuleStrip />
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem]">
            <Link href="/features#consultations" className="link inline-flex items-center gap-1">
              Consultations <ArrowRight size={12} aria-hidden="true" />
            </Link>
            <Link href="/features#womens-health" className="link inline-flex items-center gap-1">
              Women&apos;s health <ArrowRight size={12} aria-hidden="true" />
            </Link>
            <Link href="/features#nutrition" className="link inline-flex items-center gap-1">
              Nutrition care <ArrowRight size={12} aria-hidden="true" />
            </Link>
            <Link href="/features#emergency" className="link inline-flex items-center gap-1">
              SOS & emergency contacts <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#102a32] py-16 text-white md:py-24" aria-labelledby="trust-heading">
        <div className="container-site grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="eyebrow !text-aqua-300">Built for trust, not theatre</p>
            <h2 id="trust-heading" className="section-title mt-3 !text-white">
              Clear about what we can do. Clearer about what we can&apos;t.
            </h2>
            <p className="mt-5 max-w-md text-[0.94rem] leading-6 text-[#b6cbce]">
              Health products should not borrow credibility they have not earned. We use plain
              language about privacy, medical limits, and every integration that is not yet live.
            </p>
            <Link href="/safety" className="btn btn-secondary mt-7 border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5">
              Read our safety approach
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-x-8 gap-y-0 border-t border-white/15 sm:grid-cols-2">
            {[
              {
                title: "Server-side access control",
                copy: "Your family member's records cannot be opened by changing a URL or identifier.",
              },
              {
                title: "AI is never the doctor",
                copy: "No diagnosis, no prescription, no invented source. Uncertainty is stated plainly.",
              },
              {
                title: "Verification is a real status",
                copy: "A prescription upload starts as unverified. A document alone never becomes a verified prescription.",
              },
              {
                title: "Integrations show the truth",
                copy: "No fake pharmacies, appointments, dispatches, delivery estimates, or prices.",
              },
              {
                title: "Notifications must be confirmed",
                copy: "Delivery attempts record whether a configured provider accepted the message.",
              },
              {
                title: "Emergency access stays direct",
                copy: "A prominent phone action is available without relying on the assistant or a healthy database.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-white/15 py-5">
                <h3 className="text-[0.84rem] font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[0.75rem] leading-5 text-[#a9c1c4]">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-aqua-50 py-16 md:py-20">
        <div className="container-site grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">Start with one profile</p>
            <h2 className="display-md mt-3 max-w-2xl">
              Bring the scattered pieces into one caring place.
            </h2>
            <p className="mt-4 max-w-xl text-[0.9rem] leading-6 text-muted">
              Create a private account, add yourself or a family member, and start with a single
              report, question, or medication schedule. You can add the rest as you go.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn btn-primary btn-lg">
                Create your account <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/how-it-works" className="btn btn-secondary btn-lg">
                See how it works
              </Link>
            </div>
          </div>
          <div className="hidden justify-end md:flex">
            <CareCompanion
              variant="small"
              className="h-36 w-36"
              label="The Baymax Care companion illustration"
            />
          </div>
        </div>
      </section>
    </>
  );
}
