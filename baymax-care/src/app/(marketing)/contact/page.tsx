import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Clock3, Mail, ShieldCheck } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { ContactForm } from "./contact-form";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact and support",
  description: "Contact the Baymax Care team about product support, privacy, security, accessibility, or partnerships.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Contact & support"
        title="Tell us what is not working."
        description="Product questions, privacy requests, accessibility issues, and integration enquiries all have a route here. Support is not a medical service."
      />

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
          <div className="panel p-5 sm:p-7">
            <h2 className="text-lg font-semibold tracking-[-0.03em]">Send a message</h2>
            <p className="mt-1.5 text-[0.8rem] leading-5 text-muted">
              Messages are saved in the support queue and are not used to provide medical advice.
              We aim to reply within two working days.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="panel p-5">
              <Mail size={17} className="text-aqua-700" aria-hidden="true" />
              <h2 className="mt-3 text-[0.86rem] font-semibold">Support email</h2>
              <a href={`mailto:${brand.contactEmail}`} className="link mt-1 block text-[0.8rem] break-all">
                {brand.contactEmail}
              </a>
              <p className="mt-2 text-[0.72rem] leading-5 text-muted">
                Use the contact form for privacy or security matters so the request enters the
                support queue.
              </p>
            </div>
            <div className="panel p-5">
              <Clock3 size={17} className="text-aqua-700" aria-hidden="true" />
              <h2 className="mt-3 text-[0.86rem] font-semibold">Support hours</h2>
              <p className="mt-1 text-[0.8rem] text-[#4e626b]">{brand.supportHours}</p>
              <p className="mt-2 text-[0.72rem] leading-5 text-muted">
                Support is not an emergency or clinical service and is not continuously staffed.
              </p>
            </div>
            <div className="panel p-5">
              <ShieldCheck size={17} className="text-aqua-700" aria-hidden="true" />
              <h2 className="mt-3 text-[0.86rem] font-semibold">Privacy and account requests</h2>
              <p className="mt-2 text-[0.72rem] leading-5 text-muted">
                You can export records, manage consent, and delete your account from Settings. If
                you cannot sign in, read the account deletion guidance.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.74rem]">
                <Link href="/privacy" className="link">
                  Privacy policy
                </Link>
                <Link href="/account-deletion" className="link">
                  Account deletion
                </Link>
              </div>
            </div>
            <div className="notice notice-warning">
              <CircleAlert size={16} aria-hidden="true" />
              <div>
                <p className="font-semibold">Do not use this form for an emergency.</p>
                <p className="mt-0.5">
                  Call{" "}
                  <a className="font-semibold text-danger underline underline-offset-2" href={`tel:${brand.emergencyNumber}`}>
                    {brand.emergencyNumber}
                  </a>{" "}
                  or your local emergency number.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
