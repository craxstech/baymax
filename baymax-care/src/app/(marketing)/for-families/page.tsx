import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Check,
  CircleAlert,
  Eye,
  HeartHandshake,
  Home,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { MarketingPageHero } from "@/components/marketing-page-shell";
import { FamilyVisual } from "@/components/marketing-visuals";

export const metadata: Metadata = {
  title: "For families",
  description:
    "Manage care for parents, children, partners, and yourself with separate health records and explicit caregiver permissions.",
  alternates: { canonical: "/for-families" },
};

export default function ForFamiliesPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="For families"
        title="Care works better when the household can find the same facts."
        description="Baymax Care is designed for the person who remembers the appointment, keeps the prescription, and answers the call from school. It gives that work a proper structure — without turning one person's medical history into everyone's business."
      >
        <Link href="/register" className="btn btn-primary">
          Create a family account <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </MarketingPageHero>

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="eyebrow">One account, separate boundaries</p>
            <h2 className="display-md mt-3">
              Everyone gets their own record. You choose the access.
            </h2>
            <p className="lede mt-4 text-[0.94rem]">
              A family account does not mean a shared chart. Every family member has a distinct
              profile, and every server request checks the signed-in user&apos;s permission for
              that profile.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Add a self, partner, child, parent, or another relationship you define.",
                "Keep health history, reports, prescriptions, schedules, and alerts logically isolated by person.",
                "Give a caregiver only the permissions they need: view, manage, medication support, or alert receipt.",
                "Revoke caregiver access at any time; it takes effect on the next request.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.84rem] leading-6 text-ink-soft">
                  <Check size={15} className="mt-1 flex-shrink-0 text-aqua-700" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <FamilyVisual />
        </div>
      </section>

      <section className="border-b border-line bg-mint py-14 md:py-20">
        <div className="container-site">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">Permission model</p>
            <h2 className="display-md mt-3">Designed around least access.</h2>
            <p className="mt-4 text-[0.9rem] leading-6 text-muted">
              The account owner can invite another adult as a caregiver by email. Acceptance is
              tied to that email address and requires signing in. The invitation expires after
              seven days.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {[
              [
                Eye,
                "View",
                "Open the selected profile's history and records. The invitation can exclude management.",
              ],
              [
                UserRoundCheck,
                "Manage",
                "Add or correct history, reports, and care details for that specific profile.",
              ],
              [
                HeartHandshake,
                "Medication support",
                "Help maintain prescription-linked medication schedules and confirm doses.",
              ],
              [
                CircleAlert,
                "Alerts",
                "Be eligible to receive SOS messages when the members explicitly include them.",
              ],
            ].map(([Icon, title, copy]) => {
              const Component = Icon as typeof Eye;
              return (
                <div key={String(title)} className="bg-white p-5">
                  <Component size={17} className="text-aqua-700" aria-hidden="true" />
                  <h3 className="mt-3 text-[0.85rem] font-semibold">{String(title)}</h3>
                  <p className="mt-1.5 text-[0.74rem] leading-5 text-muted">{String(copy)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="panel p-5">
              <div className="flex items-center gap-2">
                <Baby size={16} className="text-aqua-700" aria-hidden="true" />
                <h3 className="text-[0.85rem] font-semibold">Children and guardian consent</h3>
              </div>
              <p className="mt-2 text-[0.78rem] leading-6 text-muted">
                A child&apos;s profile should be created and managed by a parent or legal guardian.
                The current implementation relies on the account owner&apos;s representation of
                guardianship; production deployment should add an appropriate verification and
                age-appropriate access policy for the operating jurisdiction.
              </p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center gap-2">
                <LockKeyhole size={16} className="text-aqua-700" aria-hidden="true" />
                <h3 className="text-[0.85rem] font-semibold">Sensitive modules stay private</h3>
              </div>
              <p className="mt-2 text-[0.78rem] leading-6 text-muted">
                Women&apos;s health entries are intentionally kept out of shared family views and
                AI context. They are available only inside the signed-in user&apos;s own private
                health space. Cycle notes are encrypted before storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line py-14 md:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="eyebrow">A practical household</p>
            <h2 className="display-md mt-3">Who it can help</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                icon: Home,
                title: "The adult holding the thread",
                copy: "One place for the family's appointments, prescriptions, and reports, without having to remember which phone or inbox has the latest version.",
              },
              {
                icon: Users,
                title: "Parents caring for children",
                copy: "Separate profiles for each child, with a timeline that keeps immunisations, allergies, and clinician notes together.",
              },
              {
                icon: HeartHandshake,
                title: "Adults caring for parents",
                copy: "Invite a sibling or trusted caregiver to help with medication support or records, with permissions that can be revoked.",
              },
              {
                icon: ShieldCheck,
                title: "Anyone preparing for a visit",
                copy: "Create a readable summary of relevant history and questions instead of reconstructing it in the waiting room.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-4 border-t border-line pt-5">
                  <span className="icon-tile">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[0.9rem] font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-[0.8rem] leading-6 text-muted">{item.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-aqua-50 py-14 md:py-20">
        <div className="container-narrow text-center">
          <p className="eyebrow justify-center">Family care, with fewer loose ends</p>
          <h2 className="display-md mx-auto mt-3 max-w-2xl">
            Add one person. Learn the shape of it. Add the rest later.
          </h2>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn btn-primary btn-lg">
              Create your account <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/privacy" className="btn btn-secondary btn-lg">
              Read the privacy policy
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
