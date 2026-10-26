import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { AppSidebar, AppTopbar } from "@/components/app-shell";
import { InlineNotice } from "@/components/ui/primitives";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Your health space",
    template: `%s · Baymax Care`,
  },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/app");
  const db = await getDb();
  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  const unreadNotifications = Number(unread?.value ?? 0);

  return (
    <div className="app-body">
      <AppSidebar user={user} unreadNotifications={unreadNotifications} />
      <div className="app-main">
        <AppTopbar user={user} unreadNotifications={unreadNotifications} />
        <div className="app-content">
          <div className="mx-auto max-w-[1240px]">
            {user.isDemo ? (
              <InlineNotice tone="info" className="mb-5" title="You are in the synthetic demo workspace">
                These records are invented for product evaluation and are visibly marked as demo
                data. Do not enter real health information here unless this deployment is
                configured for production use.{" "}
                <Link className="font-semibold underline underline-offset-2" href="/app/settings">
                  Leave or reset the demo
                </Link>
                .
              </InlineNotice>
            ) : null}
            {!user.emailVerifiedAt ? (
              <InlineNotice tone="warning" className="mb-5" title="Verify your email address">
                Email verification protects account recovery and reminder delivery. Sensitive AI
                and sharing actions stay limited until verification.{" "}
                <Link
                  className="font-semibold underline underline-offset-2"
                  href="/verify-email?needed=1"
                >
                  Verify email
                </Link>
                .
              </InlineNotice>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
