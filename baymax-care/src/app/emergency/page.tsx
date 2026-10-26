import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, MapPin, PhoneCall, Stethoscope } from "lucide-react";
import { Logo } from "@/components/brand";
import { PublicFooter } from "@/components/public-footer";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Emergency information",
  description:
    "A direct emergency information page that remains available without AI. Baymax Care does not dispatch ambulances.",
  alternates: { canonical: "/emergency" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function EmergencyPage() {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="container-site flex h-[68px] items-center justify-between">
          <Logo />
          <a
            href={`tel:${brand.emergencyNumber}`}
            className="btn btn-danger btn-sm"
            aria-label={`Call emergency number ${brand.emergencyNumber}`}
          >
            <PhoneCall size={14} aria-hidden="true" />
            Call {brand.emergencyNumber}
          </a>
        </div>
      </header>
      <main id="main-content" className="min-h-[70vh] bg-[#fffafa]">
      <div className="container-narrow py-12 md:py-20">
        <div className="border-l-4 border-danger pl-5 md:pl-7">
          <p className="eyebrow !text-danger">Emergency information</p>
          <h1 className="display-lg mt-3">If someone is in immediate danger, call for help now.</h1>
          <p className="lede mt-4 max-w-2xl">
            Do not wait for this website, an AI assistant, or a message thread. Call your local
            emergency number and follow the dispatcher&apos;s instructions.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-[#efd0d4] bg-white p-5 md:p-7">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-danger">
            Configured local emergency number
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{brand.emergencyNumber}</p>
          <p className="mt-2 text-[0.78rem] leading-5 text-muted">
            In India, 112 is the national emergency number. If you are elsewhere, use the
            emergency number for your location.
          </p>
          <a href={`tel:${brand.emergencyNumber}`} className="btn btn-danger btn-lg mt-5">
            <PhoneCall size={18} aria-hidden="true" />
            Call {brand.emergencyNumber}
          </a>
          <p className="mt-3 flex items-start gap-2 text-[0.72rem] leading-5 text-[#7c4a50]">
            <CircleAlert size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            This link opens your phone&apos;s dialler. It does not contact Baymax Care, notify a
            dispatcher, or send an ambulance. No ambulance dispatch is integrated.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <section className="panel p-5">
            <MapPin size={18} className="text-aqua-700" aria-hidden="true" />
            <h2 className="mt-3 text-[0.92rem] font-semibold">Before help arrives</h2>
            <ul className="mt-3 space-y-2 text-[0.78rem] leading-5 text-muted">
              <li>Stay with the person if it is safe to do so.</li>
              <li>Give the dispatcher your exact location and a callback number.</li>
              <li>Follow their instructions; do not move someone who may be seriously injured unless there is immediate danger.</li>
              <li>If possible, have a list of medicines, allergies, and known conditions ready.</li>
            </ul>
          </section>
          <section className="panel p-5">
            <Stethoscope size={18} className="text-aqua-700" aria-hidden="true" />
            <h2 className="mt-3 text-[0.92rem] font-semibold">What Baymax Care can do here</h2>
            <ul className="mt-3 space-y-2 text-[0.78rem] leading-5 text-muted">
              <li>Keep your emergency contacts available in your account.</li>
              <li>Let you record an SOS alert and see whether a configured channel accepted it.</li>
              <li>Keep this public page available without depending on AI or your dashboard.</li>
              <li>It cannot send an ambulance, diagnose an emergency, or replace the dispatcher.</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-secondary">
            Back to Baymax Care
          </Link>
          <Link href="/app/alerts" className="btn btn-secondary">
            Emergency contacts and SOS
          </Link>
          <Link href="/safety" className="btn btn-primary">
            Read emergency limitations
          </Link>
        </div>
      </div>
      </main>
      <PublicFooter />
    </>
  );
}
