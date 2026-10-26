import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  HeartPulse,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Waves,
} from "lucide-react";
import { MemberAvatar } from "@/components/ui/primitives";

export function ChatVisual() {
  return (
    <div className="panel overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-aqua-100 text-aqua-700">
            <Sparkles size={14} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.78rem] font-semibold">Care assistant</p>
            <p className="text-[0.63rem] text-muted">AI guidance · not a diagnosis</p>
          </div>
        </div>
        <span className="badge badge-aqua">Illustrative</span>
      </div>
      <div className="space-y-4 p-4">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-[#eef3f5] px-3.5 py-2.5">
          <p className="text-[0.78rem] leading-5 text-ink-soft">
            I have a follow-up next week. Can you help me prepare the questions I should ask?
          </p>
        </div>
        <div className="max-w-[92%]">
          <div className="rounded-lg rounded-bl-sm border border-line bg-white px-3.5 py-3">
            <p className="mb-2 text-[0.78rem] font-medium text-ink">
              A useful way to prepare is to organise your notes around four areas:
            </p>
            <ul className="space-y-1.5 text-[0.73rem] leading-5 text-muted">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-aqua-500" />
                What has changed since your last visit
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-aqua-500" />
                Any symptoms, timing, and possible triggers
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-aqua-500" />
                Medicines and supplements currently being taken
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-aqua-500" />
                What you want to understand before leaving
              </li>
            </ul>
            <p className="mt-2.5 border-t border-line pt-2.5 text-[0.68rem] leading-4 text-muted">
              Bring your own records and let your clinician guide diagnosis and treatment.
            </p>
          </div>
          <p className="mt-1.5 text-[0.62rem] text-muted">A safe next step, not a diagnosis.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[0.7rem] text-muted">
          <MessageCircle size={13} aria-hidden="true" /> Ask about your records, or choose not to
          share them.
        </div>
      </div>
    </div>
  );
}

export function ReportVisual() {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#f1f6fa] text-info">
            <FileText size={14} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.78rem] font-semibold">Blood report explained</p>
            <p className="text-[0.63rem] text-muted">Illustrative report view</p>
          </div>
        </div>
        <span className="badge badge-neutral">Synthetic</span>
      </div>
      <div className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="badge badge-neutral">Laboratory range shown</span>
          <span className="badge badge-info">1 value flagged</span>
        </div>
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-left text-[0.7rem]">
            <caption className="sr-only">
              Illustrative laboratory result table with synthetic data
            </caption>
            <thead className="bg-[#f8fbfb] text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium">Lab range</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-3 py-2.5">Haemoglobin</td>
                <td className="px-3 py-2.5 font-medium">13.1 g/dL</td>
                <td className="px-3 py-2.5 text-muted">12.0–15.0</td>
              </tr>
              <tr className="border-t border-line bg-[#fffbf5]">
                <td className="px-3 py-2.5">Vitamin D</td>
                <td className="px-3 py-2.5 font-medium text-warning">22 ng/mL</td>
                <td className="px-3 py-2.5 text-muted">30–100</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2.5">Fasting glucose</td>
                <td className="px-3 py-2.5 font-medium">91 mg/dL</td>
                <td className="px-3 py-2.5 text-muted">70–99</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded-md bg-aqua-50 px-3 py-2.5 text-[0.7rem] leading-5 text-[#406069]">
          <p className="font-medium text-aqua-800">A question worth asking</p>
          <p className="mt-0.5">
            Ask your clinician whether this result should be repeated, and whether anything else
            could affect it.
          </p>
        </div>
        <p className="mt-2 text-[0.62rem] text-muted">
          Explanations are informational and do not replace professional interpretation.
        </p>
      </div>
    </div>
  );
}

export function ScheduleVisual() {
  const doses = [
    { time: "8:00 AM", label: "Morning medication", state: "Taken" },
    { time: "2:00 PM", label: "Afternoon medication", state: "Up next" },
    { time: "9:00 PM", label: "Evening medication", state: "Pending" },
  ];
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-aqua-100 text-aqua-700">
            <Pill size={14} aria-hidden="true" />
          </span>
          <p className="text-[0.78rem] font-semibold">Today&apos;s medication</p>
        </div>
        <span className="badge badge-aqua">Illustrative</span>
      </div>
      <div className="space-y-2 p-4">
        {doses.map((dose, index) => (
          <div
            key={dose.time}
            className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5"
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                index === 0
                  ? "bg-[#eaf7f0] text-success"
                  : index === 1
                    ? "bg-aqua-100 text-aqua-700"
                    : "bg-[#f4f7f8] text-muted"
              }`}
            >
              {index === 0 ? <Check size={12} aria-hidden="true" /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.76rem] font-medium text-ink">{dose.label}</p>
              <p className="text-[0.64rem] text-muted">Scheduled from your prescription</p>
            </div>
            <div className="text-right">
              <p className="text-[0.68rem] font-medium text-ink-soft">{dose.time}</p>
              <p className="text-[0.6rem] text-muted">{dose.state}</p>
            </div>
          </div>
        ))}
        <p className="pt-1 text-[0.62rem] text-muted">
          You confirm each dose. Baymax Care does not change prescribed doses.
        </p>
      </div>
    </div>
  );
}

export function FamilyVisual() {
  const people = [
    { name: "Aanya", relationship: "You", tone: 0 },
    { name: "Rohan", relationship: "Spouse", tone: 1 },
    { name: "Mira", relationship: "Child", tone: 2 },
    { name: "Dev", relationship: "Parent", tone: 3 },
  ];
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <p className="text-[0.78rem] font-semibold">One household, separate records</p>
        <p className="mt-0.5 text-[0.63rem] text-muted">Illustrative family view</p>
      </div>
      <div className="divide-y divide-line">
        {people.map((person) => (
          <div key={person.name} className="flex items-center gap-3 px-4 py-3">
            <MemberAvatar name={person.name} tone={person.tone} size="md" />
            <div className="flex-1">
              <p className="text-[0.78rem] font-medium">{person.name}</p>
              <p className="text-[0.63rem] text-muted">{person.relationship}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="badge badge-neutral">Private</span>
              <ChevronRight size={14} className="text-muted" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-[#fbfdfd] px-4 py-2.5 text-[0.63rem] text-muted">
        Access is decided by the account owner and checked on the server.
      </div>
    </div>
  );
}

export function ModuleStrip() {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {[
        {
          icon: Stethoscope,
          title: "Consultations",
          copy: "Book only when a verified scheduling partner is connected.",
          href: "/features#consultations",
        },
        {
          icon: Waves,
          title: "Women's health",
          copy: "Private cycle notes with estimates, never certainty.",
          href: "/features#womens-health",
        },
        {
          icon: HeartPulse,
          title: "Nutrition",
          copy: "Preferences, meal plans, and real food logs.",
          href: "/features#nutrition",
        },
        {
          icon: CircleAlert,
          title: "SOS & contacts",
          copy: "Honest delivery status and a direct emergency-call option.",
          href: "/features#emergency",
        },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="bg-white p-5">
            <Icon size={18} className="text-aqua-700" strokeWidth={1.7} aria-hidden="true" />
            <h3 className="mt-3 text-[0.82rem] font-semibold">{item.title}</h3>
            <p className="mt-1 text-[0.71rem] leading-5 text-muted">{item.copy}</p>
            <Link
              href={item.href}
              className="link mt-3 inline-flex items-center gap-1 text-[0.7rem]"
            >
              Learn more <ArrowRight size={11} aria-hidden="true" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div className="product-window" role="img" aria-label="Illustrative Baymax Care dashboard preview">
      <div className="product-window-bar justify-between">
        <div className="flex items-center gap-1.5">
          <span className="product-window-dot" />
          <span className="product-window-dot" />
          <span className="product-window-dot" />
        </div>
        <div className="flex items-center gap-1.5 rounded-sm border border-[#e3edec] bg-white px-2 py-0.5 text-[0.54rem] text-muted">
          <ShieldCheck size={9} aria-hidden="true" />
          baymaxcare.app/app
        </div>
        <span className="demo-label">Product preview</span>
      </div>
      <div className="grid min-h-[390px] grid-cols-[150px_1fr] bg-[#f8fbfa] sm:grid-cols-[188px_1fr]">
        <div className="hidden border-r border-[#e4eeed] bg-white px-3 py-4 sm:block">
          <div className="flex items-center gap-2 px-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-aqua-700 text-[8px] font-bold text-white">
              B
            </span>
            <span className="text-[0.63rem] font-semibold">Baymax Care</span>
          </div>
          <div className="mt-6 space-y-0.5">
            {[
              { label: "Overview", icon: Activity, active: true },
              { label: "AI assistant", icon: Sparkles, active: false },
              { label: "Medical history", icon: FileText, active: false },
              { label: "Reports", icon: FileText, active: false },
              { label: "Medications", icon: Pill, active: false },
              { label: "Family", icon: HeartPulse, active: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded px-2 py-1.5 text-[0.57rem] ${
                    item.active ? "bg-aqua-50 font-semibold text-aqua-800" : "text-muted"
                  }`}
                >
                  <Icon size={10} aria-hidden="true" />
                  {item.label}
                </div>
              );
            })}
          </div>
          <div className="mt-8 border-t border-line pt-3">
            <div className="rounded border border-line px-2 py-1.5">
              <p className="text-[0.48rem] uppercase tracking-wider text-muted">Emergency</p>
              <p className="mt-0.5 text-[0.58rem] font-semibold text-danger">Call 112</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[0.54rem] font-medium uppercase tracking-[0.1em] text-aqua-700">
                Care overview
              </p>
              <p className="mt-1 text-[0.98rem] font-semibold tracking-[-0.03em]">
                Good morning, Aanya
              </p>
              <p className="mt-0.5 text-[0.56rem] text-muted">
                A calm view of what needs your attention today.
              </p>
            </div>
            <span className="hidden items-center gap-1 rounded border border-line bg-white px-2 py-1 text-[0.52rem] sm:flex">
              <CalendarDays size={9} aria-hidden="true" /> Monday, 26 October
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Next medicine", value: "2:00 PM", note: "1 dose due", icon: Clock3 },
              { label: "Reports", value: "Ready to review", note: "0 unread", icon: FileText },
              { label: "Family", value: "4 profiles", note: "Private by design", icon: HeartPulse },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded border border-line bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.48rem] uppercase tracking-wider text-muted">
                      {card.label}
                    </p>
                    <Icon size={10} className="text-aqua-700" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 text-[0.65rem] font-semibold">{card.value}</p>
                  <p className="mt-0.5 text-[0.48rem] text-muted">{card.note}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2.5 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded border border-line bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[0.58rem] font-semibold">Your care timeline</p>
                <span className="text-[0.48rem] text-aqua-700">View all</span>
              </div>
              <div className="mt-2.5 space-y-2">
                {[
                  ["Today", "Medication schedule", "Prescription-linked"],
                  ["24 Oct", "Report added", "Explanation pending"],
                  ["18 Oct", "History updated", "Patient-reported"],
                ].map(([date, title, note], index) => (
                  <div key={title} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-aqua-500" : "bg-[#c9d8d7]"}`}
                      />
                      {index < 2 && <span className="mt-1 w-px flex-1 bg-line" />}
                    </div>
                    <div className="flex-1 pb-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[0.55rem] font-medium">{title}</p>
                        <span className="text-[0.45rem] text-muted">{date}</span>
                      </div>
                      <p className="text-[0.47rem] text-muted">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded border border-line bg-white p-3">
              <p className="text-[0.58rem] font-semibold">Prepare for a visit</p>
              <p className="mt-1 text-[0.5rem] leading-4 text-muted">
                Bring your questions, medication list, and recent reports into one place.
              </p>
              <div className="mt-3 flex items-center gap-1.5 rounded bg-aqua-50 px-2 py-1.5">
                <Sparkles size={9} className="text-aqua-700" aria-hidden="true" />
                <span className="text-[0.48rem] font-medium text-aqua-800">Open care assistant</span>
                <ArrowUpRight size={8} className="ml-auto text-aqua-700" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustGrid() {
  const principles = [
    {
      icon: ShieldCheck,
      title: "Private by default",
      copy: "Every medical request is authorised on the server against your family access, not just hidden in the interface.",
    },
    {
      icon: Sparkles,
      title: "AI with clear edges",
      copy: "The assistant explains and helps you prepare. It does not diagnose, prescribe, or pretend uncertainty is certainty.",
    },
    {
      icon: FileText,
      title: "Prescription status is explicit",
      copy: "Uploading a prescription does not verify it. The status remains unverified until an authorised clinical process confirms it.",
    },
    {
      icon: CircleAlert,
      title: "Emergency care stays simple",
      copy: "Emergency instructions and a direct phone link are available without waiting for AI, database, or dashboard services.",
    },
    {
      icon: Stethoscope,
      title: "Availability is never invented",
      copy: "Consultations and medicine ordering stay unavailable until a genuine provider connection returns real information.",
    },
    {
      icon: Check,
      title: "You control your data",
      copy: "Review consent, export records, revoke sessions, and start account deletion from your settings.",
    },
  ];

  return (
    <div className="grid divide-y divide-[#e4eeed] border-y border-line md:grid-cols-2 md:divide-x lg:grid-cols-3">
      {principles.map((principle) => {
        const Icon = principle.icon;
        return (
          <div key={principle.title} className="px-0 py-6 md:px-6 md:first:pl-0">
            <Icon size={18} strokeWidth={1.7} className="text-aqua-700" aria-hidden="true" />
            <h3 className="mt-3 text-[0.9rem] font-semibold">{principle.title}</h3>
            <p className="mt-1.5 text-[0.8rem] leading-6 text-muted">{principle.copy}</p>
          </div>
        );
      })}
    </div>
  );
}
