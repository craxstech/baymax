import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { count, eq } from "drizzle-orm";
import {
  Breadcrumbs,
  DisclosurePanel,
  Panel,
  PanelBody,
  Stack,
  SectionSubnav,
} from "@/components/ui/app-ui";
import {
  EmptyState,
  InlineNotice,
  PageHeader,
  SectionHeading,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { getDb } from "@/db";
import {
  users,
  families,
  familyMembers,
  files,
  sessions,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { brand } from "@/lib/config";
import { profileSchema } from "@/lib/validation";
import {
  updateProfileAction,
  requestAccountDeletionAction,
  resetDemoWorkspaceAction,
} from "@/app/actions/settings";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

const SETTINGS_SECTIONS = [
  { href: "/app/settings", label: "Profile" },
  { href: "/app/settings/privacy", label: "Privacy & consents" },
  { href: "/app/settings/security", label: "Security & sessions" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; deleted?: string }>;
}) {
  const user = await requireUser("/app/settings");
  const params = await searchParams;
  const db = await getDb();

  const [[familyCount], [memberCount], [fileCount], [sessionCount]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(families)
        .where(eq(families.ownerId, user.id)),
      db.select({ value: count() }).from(familyMembers),
      db
        .select({ value: count() })
        .from(files)
        .where(eq(files.ownerUserId, user.id)),
      db
        .select({ value: count() })
        .from(sessions)
        .where(eq(sessions.userId, user.id)),
    ]);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Settings" },
          ]} />
        }
        title="Account settings"
        description="Manage your profile, privacy consents, and security sessions."
        action={
          <Link className="btn btn-secondary" href="/app">
            <UserRound size={15} aria-hidden="true" /> Back to dashboard
          </Link>
        }
      />

      <SectionSubnav items={SETTINGS_SECTIONS} current="/app/settings" />

      <Panel>
        <PanelBody>
          <SectionHeading title="Profile" />
          <p className="mb-4 text-[0.78rem] leading-5 text-muted">
            Your name, time zone, and language are used across the app for dates, times, and
            communication.
          </p>
          <ActionForm action={updateProfileAction} submitLabel="Save profile">
            <FormField label="Name" name="name">
              <input className="input" id="field-name" name="name" defaultValue={user.name} required />
            </FormField>
            <FormField label="Time zone" name="timezone">
              <select className="select" id="field-timezone" name="timezone" defaultValue={user.timezone}>
                <option value="Asia/Kolkata">India Standard Time (IST) — Asia/Kolkata</option>
                <option value="Asia/Dubai">Gulf Standard Time — Asia/Dubai</option>
                <option value="Asia/Singapore">Singapore Time — Asia/Singapore</option>
                <option value="Asia/Tokyo">Japan Standard Time — Asia/Tokyo</option>
                <option value="Europe/London">Greenwich Mean Time — Europe/London</option>
                <option value="America/New_York">Eastern Time — America/New_York</option>
                <option value="America/Los_Angeles">Pacific Time — America/Los_Angeles</option>
                <option value="UTC">Coordinated Universal Time — UTC</option>
              </select>
            </FormField>
            <FormField label="Language" name="locale">
              <select className="select" id="field-locale" name="locale" defaultValue={user.locale}>
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
              </select>
            </FormField>
            <p className="mt-3 text-[0.68rem] leading-4 text-muted">
              Times across the app are shown in your selected time zone.
            </p>
          </ActionForm>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <SectionHeading title="Your account at a glance" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="panel p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Family records
              </p>
              <p className="text-lg font-semibold text-ink">{Number(familyCount.value)}</p>
              <p className="mt-1 text-[0.68rem] text-muted">Families you own</p>
            </div>
            <div className="panel p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Family members
              </p>
              <p className="text-lg font-semibold text-ink">{Number(memberCount.value)}</p>
              <p className="mt-1 text-[0.68rem] text-muted">Profiles under your care</p>
            </div>
            <div className="panel p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Private files
              </p>
              <p className="text-lg font-semibold text-ink">{Number(fileCount.value)}</p>
              <p className="mt-1 text-[0.68rem] text-muted">Uploaded reports and prescriptions</p>
            </div>
            <div className="panel p-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Active sessions
              </p>
              <p className="text-lg font-semibold text-ink">{Number(sessionCount.value)}</p>
              <p className="mt-1 text-[0.68rem] text-muted">Signed-in devices</p>
            </div>
          </div>
          <p className="mt-4 text-[0.68rem] leading-5 text-muted">
            Manage privacy consents and individual family-member access from Privacy & consents. Manage
            passwords and sessions from Security & sessions.
          </p>
        </PanelBody>
      </Panel>

      <Panel className="border-[#e7b9be] bg-[#fffafa]">
        <PanelBody>
          <SectionHeading title="Delete your account" />
          <p className="mb-3 text-[0.78rem] leading-5 text-[#6b3b42]">
            Deleting your account removes your profile, family members you created, medical history,
            reports, prescriptions, medications, cycle entries, meal logs, notifications, and private
            files. Uploaded files are removed from private storage. The action cannot be undone.
          </p>
          <p className="mb-3 text-[0.78rem] leading-5 text-[#6b3b42]">
            Legal retention may require some records to be kept for a limited period after deletion.
            See the privacy policy for details.
          </p>
          <ActionForm action={requestAccountDeletionAction} submitLabel="Delete my account" submitClassName="btn-danger">
            <FormField label="Password" name="password">
              <input
                className="input"
                id="field-delete-password"
                name="password"
                type="password"
                placeholder="Enter your current password"
                required
              />
            </FormField>
            <FormField label="Reason (optional)" name="reason">
              <textarea
                className="textarea"
                id="field-delete-reason"
                name="reason"
                rows={2}
                maxLength={500}
                placeholder="Why are you deleting your account?"
              />
            </FormField>
            <p className="text-[0.68rem] leading-4 text-[#6b3b42]">
              Type &quot;DELETE MY ACCOUNT&quot; exactly to confirm. This permanently removes your account and
              all associated data.
            </p>
          </ActionForm>
        </PanelBody>
      </Panel>

      {user.isDemo && process.env.NODE_ENV !== "production" && (
        <Panel>
          <PanelBody>
            <SectionHeading title="Demo workspace" />
            <p className="mb-3 text-[0.78rem] leading-5 text-muted">
              You are using a synthetic demo workspace. Resetting clears all demo care data so you can
              start fresh. This only works in local development.
            </p>
            <ActionForm action={resetDemoWorkspaceAction} submitLabel="Reset demo workspace" submitClassName="btn-secondary">
              <p className="text-[0.68rem] leading-4 text-muted">
                Demo data is synthetic and clearly marked. It is never real patient information.
              </p>
            </ActionForm>
          </PanelBody>
        </Panel>
      )}

      {params.demo === "reset" && (
        <InlineNotice tone="success" className="mb-5" title="Demo workspace reset">
          Demo care data has been cleared. Add your own records to begin.
        </InlineNotice>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`tel:${brand.emergencyNumber}`} className="btn btn-danger-outline">
          <PhoneCall size={14} aria-hidden="true" /> Call {brand.emergencyNumber}
        </Link>
        <Link href="/contact" className="btn btn-secondary">
          Contact &amp; support
        </Link>
      </div>
    </div>
  );
}
