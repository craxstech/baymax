import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  Bell,
  Clock,
  Mail,
  PhoneCall,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  EmptyState,
  InlineNotice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { getDb } from "@/db";
import {
  notificationPreferences,
  notifications,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { emailConfigured, smsConfigured, brand } from "@/lib/config";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  updateNotificationPreferencesAction,
} from "@/app/actions/notifications";
import { formatDateTime } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  MEDICATION: "Medication reminder",
  CONSULTATION: "Upcoming consultation",
  PRESCRIPTION: "Prescription status",
  ORDER: "Medicine order",
  REPORT: "Report analysis",
  HEALTH_REMINDER: "Health reminder",
  FAMILY: "Family alert",
  EMERGENCY: "Emergency notification",
  SYSTEM: "System",
};

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  MEDICATION: Bell,
  CONSULTATION: Clock,
  PRESCRIPTION: Mail,
  ORDER: Mail,
  REPORT: Bell,
  HEALTH_REMINDER: Bell,
  FAMILY: Bell,
  EMERGENCY: Bell,
  SYSTEM: Bell,
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ read?: string; marked?: string }>;
}) {
  const user = await requireUser("/app/notifications");
  const params = await searchParams;
  const db = await getDb();

  const [preferences, allNotifications] = await Promise.all([
    db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(120),
  ]);

  const unreadCount = allNotifications.filter((n) => isNullDate(n.readAt)).length;
  const preference = preferences?.[0];
  const categories = (preference?.categories ?? {}) as Record<string, boolean>;

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Notifications" },
          ]} />
        }
        title="Notification center"
        description={
          "Medication reminders, consultation updates, prescription status, order updates, report " +
          "analysis completion, and emergency alerts. Mark items as read and manage delivery channels."
        }
        action={
          <>
            <Link className="btn btn-secondary" href="/app/settings">
              <ShieldCheck size={15} aria-hidden="true" /> Settings
            </Link>
            <a
              className="btn btn-danger-outline"
              href={`tel:${brand.emergencyNumber}`}
              aria-label={`Call emergency number ${brand.emergencyNumber}`}
            >
              <PhoneCall size={15} aria-hidden="true" /> Emergency
            </a>
          </>
        }
      />

      <InlineNotice
        tone="info"
        className="mb-5"
        title="Delivery depends on configured providers"
      >
        In-app notifications are always stored. Email and SMS delivery are only sent when the
        corresponding provider is configured on this server. Quiet hours can be set below.
      </InlineNotice>

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading
                title="Your notifications"
                description={`${allNotifications.length} notification${allNotifications.length === 1 ? "" : "s"} stored. ${unreadCount} unread.`}
                action={
                  <Link
                    className="btn btn-secondary btn-sm"
                    href="/app/notifications?marked=all"
                  >
                    Mark all read
                  </Link>
                }
              />
              {allNotifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No notifications yet"
                  description="Reminders, consultation updates, and alerts will appear here."
                  compact
                />
              ) : (
                <div className="space-y-2">
                  {allNotifications.map((notification) => {
                    const Icon = CATEGORY_ICONS[notification.category] ?? Bell;
                    const isRead = !isNullDate(notification.readAt);
                    return (
                      <Link
                        key={notification.id}
                        href={notification.href || "#"}
                        className={`flex items-start justify-between gap-2 rounded-md border border-line p-2.5 ${
                          isRead
                            ? "bg-[#fbfdfd]"
                            : "hover:bg-aqua-50/30 hover:border-aqua-300"
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="mt-1 flex-shrink-0">
                            <Icon size={13} aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[0.78rem] font-semibold leading-5 ${isRead ? "text-muted" : "text-ink"}`}>
                              {CATEGORY_LABELS[notification.category] ?? notification.category}
                            </p>
                            <p className="mt-0.5 text-[0.68rem] leading-4 text-muted">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[0.66rem] leading-4 text-muted">
                              {notification.body}
                            </p>
                            <p className="mt-1 text-[0.62rem] text-[#8a999e]">
                              {formatDateTime(notification.createdAt, user.timezone)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-1">
                          {!isRead && (
                            <ActionForm
                              action={markNotificationReadAction}
                              submitLabel="Mark read"
                              submitClassName="btn btn-quiet btn-sm"
                              hideSubmit
                              footer={
                                <button
                                  type="submit"
                                  className="btn btn-quiet btn-sm"
                                  aria-label={`Mark "${notification.title}" as read`}
                                >
                                  <Bell size={11} className="text-aqua-700" aria-hidden="true" />
                                </button>
                              }
                            >
                              <input
                                type="hidden"
                                name="notificationId"
                                value={notification.id}
                              />
                            </ActionForm>
                          )}
                          <StatusBadge
                            status={isRead ? "read" : "unread"}
                            label={isRead ? "Read" : "Unread"}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="Delivery preferences" />
              <p className="mb-3 text-[0.78rem] leading-5 text-muted">
                Choose which channels receive notifications and set quiet hours. In-app notifications
                are not affected by quiet hours.
              </p>
              <ActionForm action={updateNotificationPreferencesAction} submitLabel="Save preferences">
                <div className="space-y-3">
                  <label className="check-row mb-2">
                    <input
                      type="checkbox"
                      name="emailEnabled"
                      defaultChecked={preference?.emailEnabled ?? false}
                    />
                    <span className="check-copy">
                      Email notifications{!emailConfigured() && " (not configured)"}
                    </span>
                  </label>
                  <label className="check-row mb-2">
                    <input
                      type="checkbox"
                      name="smsEnabled"
                      defaultChecked={preference?.smsEnabled ?? false}
                    />
                    <span className="check-copy">
                      SMS notifications{!smsConfigured() && " (not configured)"}
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Quiet hours start" name="quietHoursStart" optional>
                      <input
                        className="input"
                        id="field-quietStart"
                        name="quietHoursStart"
                        type="time"
                        defaultValue={preference?.quietHoursStart ?? ""}
                      />
                    </FormField>
                    <FormField label="Quiet hours end" name="quietHoursEnd" optional>
                      <input
                        className="input"
                        id="field-quietEnd"
                        name="quietHoursEnd"
                        type="time"
                        defaultValue={preference?.quietHoursEnd ?? ""}
                      />
                    </FormField>
                  </div>
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                      Categories
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        "MEDICATION",
                        "CONSULTATION",
                        "PRESCRIPTION",
                        "ORDER",
                        "REPORT",
                        "HEALTH_REMINDER",
                        "FAMILY",
                        "EMERGENCY",
                        "SYSTEM",
                      ].map((key) => (
                        <label key={key} className="check-row">
                          <input
                            type="checkbox"
                            name={`category_${key}`}
                            defaultChecked={categories[key] ?? true}
                          />
                          <span className="check-copy text-[0.72rem]">
                            {CATEGORY_LABELS[key]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {!emailConfigured() && (
                    <InlineNotice tone="info" className="mt-3" title="Email not configured">
                      Email delivery is not configured on this server, so email reminders will not be
                      sent yet.
                    </InlineNotice>
                  )}
                  {!smsConfigured() && (
                    <InlineNotice tone="info" className="mt-3" title="SMS not configured">
                      SMS delivery is not configured on this server, so text reminders will not be
                      sent yet.
                    </InlineNotice>
                  )}
                </div>
              </ActionForm>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="What you will see here" />
              <ul className="space-y-2 text-[0.78rem] leading-5 text-muted">
                <li>Medication dose reminders and end-of-day summaries</li>
                <li>Consultation booking confirmations and reminders</li>
                <li>Prescription status changes</li>
                <li>Medicine order status updates</li>
                <li>Report analysis completion notices</li>
                <li>Family caregiver access changes</li>
                <li>SOS delivery receipts</li>
                <li>System and account notifications</li>
              </ul>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}

function isNullDate(value: Date | null | undefined): value is null {
  return value === null;
}
