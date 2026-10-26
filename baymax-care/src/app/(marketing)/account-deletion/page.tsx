import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Database, FileArchive, Mail, Trash2 } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Account deletion",
  description:
    "How to delete a Baymax Care account, what is removed, what may be retained, and what to do if you cannot sign in.",
  alternates: { canonical: "/account-deletion" },
};

const steps = [
  {
    icon: Trash2,
    title: "Delete from your account settings",
    copy: "Sign in, open Settings, then Security. Use the account deletion control and complete the confirmation. You will need to confirm with your password and a deletion phrase.",
  },
  {
    icon: Database,
    title: "Associated application records are removed",
    copy: "The deletion workflow removes your user record and database-linked family profiles, health records, reports, prescriptions, schedules, conversations, cycle entries, nutrition logs, alerts, and sessions through database relationships.",
  },
  {
    icon: FileArchive,
    title: "Uploaded files are removed from private storage",
    copy: "Local uploaded reports and prescriptions are deleted from the application's private storage. In a production deployment using object storage, the configured storage deletion process must be verified and documented by the operator.",
  },
  {
    icon: Check,
    title: "A minimal deletion record is kept",
    copy: "A one-way hash of the account email and the deletion time are kept so the deletion can be evidenced without retaining the original email. External legal, tax, or security retention obligations may still apply.",
  },
];

export default function AccountDeletionPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Account deletion"
        title="Your account. Your decision to leave."
        description="This page explains the actual deletion workflow in Baymax Care, what it removes, and what still depends on the production operator's backups and legal obligations."
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/app/settings/security" className="btn btn-primary">
            Open account security <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/contact" className="btn btn-secondary">
            Contact support
          </Link>
        </div>
      </MarketingPageHero>

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
          <div>
            <p className="eyebrow">Deleting a signed-in account</p>
            <h2 className="display-md mt-3">Four steps that actually run.</h2>
            <ol className="mt-7 space-y-0 border-l border-line">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="relative pb-8 pl-7 last:pb-0">
                    <span className="absolute -left-[16px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-aqua-200 bg-white text-aqua-700">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-aqua-700">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-[0.94rem] font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-[0.81rem] leading-6 text-muted">{step.copy}</p>
                  </li>
                );
              })}
            </ol>
          </div>
          <aside className="space-y-4">
            <div className="panel p-5">
              <Mail size={17} className="text-aqua-700" aria-hidden="true" />
              <h2 className="mt-3 text-[0.88rem] font-semibold">If you cannot sign in</h2>
              <p className="mt-2 text-[0.77rem] leading-6 text-muted">
                Use the contact form with the topic &ldquo;Privacy or data request&rdquo; and explain
                that you need help deleting your account. Do not include a password or detailed
                medical information. Support may ask for reasonable identity verification.
              </p>
              <p className="mt-2 text-[0.72rem] leading-5 text-[#7b8c92]">
                The automated workflow requires signing in. A request sent by email does not
                complete automatically; the operator must process it through its support workflow.
              </p>
            </div>
            <div className="notice notice-warning">
              <CircleAlert size={16} aria-hidden="true" />
              <div>
                <p className="font-semibold">Backups and legal retention are configuration-specific.</p>
                <p className="mt-1">
                  The application removes active records. Backup expiration, external provider
                  deletion, and legally required retention depend on the production deployment and
                  applicable law. The operator must publish a concrete backup deletion period.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-[#fbfdfd] p-5">
              <h2 className="text-[0.85rem] font-semibold">Prefer to remove one item?</h2>
              <p className="mt-1.5 text-[0.75rem] leading-5 text-muted">
                Individual medical history records, reports, cycle entries, meal logs, and
                schedules can be deleted from their module without closing your account. Deleting
                your whole account is permanent.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-mint py-12">
        <div className="container-narrow">
          <h2 className="text-base font-semibold">Need help before deleting?</h2>
          <p className="mt-2 max-w-2xl text-[0.83rem] leading-6 text-muted">
            If you are trying to correct a record, export your information, or stop a reminder,
            those actions do not require account deletion. Read the Privacy Policy for the
            implemented access, correction, and export controls.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/privacy" className="btn btn-secondary">
              Privacy policy
            </Link>
            <Link href="/contact" className="btn btn-primary">
              Contact support
            </Link>
            <a href={`mailto:${brand.contactEmail}`} className="btn btn-secondary">
              Email support
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
