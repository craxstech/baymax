import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, PhoneCall, ShieldCheck, Settings, UserRound } from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
  Panel,
  PanelBody,
  Stack,
  SectionSubnav,
} from "@/components/ui/app-ui";
import { InlineNotice, PageHeader, SectionHeading } from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { getDb } from "@/db";
import { desc, eq } from "drizzle-orm";
import { sessions, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { brand } from "@/lib/config";
import { changePasswordSchema } from "@/lib/validation";
import {
  changePasswordAction,
  revokeSpecificSessionAction,
  revokeOtherSessionsAction,
} from "@/app/actions/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Security & sessions" };

export default async function SecurityPage() {
  const user = await requireUser("/app/settings/security");
  const db = await getDb();

  const activeSessions = await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ipHash: sessions.ipHash,
      expiresAt: sessions.expiresAt,
      lastUsedAt: sessions.lastUsedAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .orderBy(desc(sessions.lastUsedAt));

  const currentSessionId = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .limit(1);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Settings" },
            { label: "Security & sessions" },
          ]} />
        }
        title="Security & sessions"
        description="Change your password, sign out other devices, and review active sessions."
        action={
          <Link className="btn btn-secondary" href="/app/settings">
            <ShieldCheck size={15} aria-hidden="true" /> Back to settings
          </Link>
        }
      />

      <SectionSubnav
        items={[
          { href: "/app/settings", label: "Profile" },
          { href: "/app/settings/privacy", label: "Privacy & consents" },
          { href: "/app/settings/security", label: "Security & sessions" },
        ]}
        current="/app/settings/security"
      />

      <Panel>
        <PanelBody>
          <SectionHeading title="Change password" />
          <p className="mb-4 text-[0.78rem] leading-5 text-muted">
            Your password must be at least 10 characters with a letter and a number. Changing it signs
            out all other sessions; this session stays active.
          </p>
          <ActionForm action={changePasswordAction} submitLabel="Change password">
            <FormField label="Current password" name="currentPassword">
              <input
                className="input"
                id="field-current-password"
                name="currentPassword"
                type="password"
                required
              />
            </FormField>
            <FormField label="New password" name="newPassword">
              <input
                className="input"
                id="field-new-password"
                name="newPassword"
                type="password"
                required
              />
            </FormField>
            <FormField label="Confirm new password" name="confirmPassword">
              <input
                className="input"
                id="field-confirm-password"
                name="confirmPassword"
                type="password"
                required
              />
            </FormField>
          </ActionForm>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <SectionHeading title="Active sessions" />
          <p className="mb-4 text-[0.78rem] leading-5 text-muted">
            Each session represents a signed-in device. You can sign out individual sessions or all
            other sessions at once.
          </p>
          {activeSessions.length === 0 ? (
            <p className="text-[0.78rem] text-muted">No active sessions found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Last used</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => {
                  const isCurrent = session.id === currentSessionId?.[0]?.id;
                  return (
                    <tr key={session.id}>
                      <td>
                        {session.userAgent ? (
                          <span className="text-[0.78rem] text-ink truncate inline-block max-w-xs">
                            {session.userAgent}
                          </span>
                        ) : (
                          <span className="text-[0.78rem] text-muted">Unknown device</span>
                        )}
                        {isCurrent && (
                          <span className="ml-2 text-[0.62rem] badge badge-neutral">This device</span>
                        )}
                      </td>
                      <td className="text-[0.72rem] text-muted">
                        {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "—"}
                      </td>
                      <td className="text-[0.72rem] text-muted">
                        {new Date(session.expiresAt).toLocaleString()}
                      </td>
                      <td>
                        {isCurrent ? (
                          <span className="text-[0.7rem] text-muted">—</span>
                        ) : (
                          <ActionForm
                            action={revokeSpecificSessionAction}
                            submitLabel="Sign out"
                            submitClassName="btn btn-danger-outline btn-sm"
                            hideSubmit
                            footer={
                              <button
                                type="submit"
                                className="btn btn-danger-outline btn-sm"
                                aria-label="Sign out session"
                                onClick={(e) => {
                                  if (!window.confirm("Sign out this session?")) e.preventDefault();
                                }}
                              >
                                <LogOut size={12} aria-hidden="true" />
                              </button>
                            }
                          >
                            <input type="hidden" name="sessionId" value={session.id} />
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-4">
            <ActionForm
              action={revokeOtherSessionsAction}
              submitLabel="Sign out all other sessions"
              submitClassName="btn btn-danger-outline"
              hideSubmit
              footer={
                <button
                  type="submit"
                  className="btn btn-danger-outline"
                  onClick={(e) => {
                    if (
                      !window.confirm(
                        "Sign out all other sessions? This device stays active.",
                      )
                    )
                      e.preventDefault();
                  }}
                >
                  <LogOut size={14} aria-hidden="true" />
                  Sign out all other sessions
                </button>
              }
            >
              <>
              </>
            </ActionForm>
          </p>
        </PanelBody>
      </Panel>

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
