import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm } from "@/components/ui/action-form";
import { InlineNotice } from "@/components/ui/primitives";
import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { emailConfigured, serverConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Verify the email address on your Baymax Care account.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; needed?: string }>;
}) {
  const params = await searchParams;
  const [user, cookieStore] = await Promise.all([getSessionUser(), cookies()]);
  const queryToken = params.token?.trim();
  const devToken = cookieStore.get("baymax_dev_verify")?.value;
  const token = queryToken || devToken;
  const isDevToken = !queryToken && Boolean(devToken);

  return (
    <AuthShell
      title={user?.emailVerifiedAt ? "Email verified" : "Verify your email"}
      description={
        user?.emailVerifiedAt
          ? "Your account email is confirmed. Verification helps protect account recovery and reminder delivery."
          : "Verified email helps us protect your account and deliver important service messages."
      }
      footer={
        <p>
          <Link className="link" href={user ? "/app" : "/login"}>
            {user ? "Back to your dashboard" : "Back to sign in"}
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {user?.emailVerifiedAt ? (
          <InlineNotice tone="success" title="This email is already verified">
            You can continue to your health space. If you need to change your email address,
            contact support while we finish the self-service email-change flow.
          </InlineNotice>
        ) : null}

        {!user?.emailVerifiedAt && params.needed === "1" ? (
          <InlineNotice tone="warning" title="Verification needed">
            Some sensitive features are limited until your email is verified.
          </InlineNotice>
        ) : null}

        {!user?.emailVerifiedAt && token ? (
          <>
            <InlineNotice tone="info" title="One more step">
              Confirm this email address for{" "}
              <strong className="font-semibold">{user?.email ?? params.email ?? "your account"}</strong>
              . Verification links expire after 24 hours.
            </InlineNotice>
            {isDevToken ? (
              <p className="text-[0.72rem] leading-5 text-muted">
                This link comes from the local development fallback because SMTP is not
                configured. It is not a delivered email.
              </p>
            ) : null}
            <ActionForm action={verifyEmailAction} submitLabel="Verify my email">
              <input type="hidden" name="token" value={token} />
              <div className="flex items-center gap-2 text-[0.72rem] text-muted">
                <MailCheck size={14} aria-hidden="true" />
                Email verification tokens are stored as hashes and can only be used once.
              </div>
            </ActionForm>
          </>
        ) : null}

        {!user?.emailVerifiedAt && !token ? (
          <InlineNotice tone="warning" title="Open the link from your verification email">
            This page needs a valid verification token. If the link expired, request a new one
            below.{" "}
            {!emailConfigured() && !serverConfig.isProduction
              ? "Email delivery is not configured locally, so a new link may not reach an inbox."
              : ""}
          </InlineNotice>
        ) : null}

        {user && !user.emailVerifiedAt ? (
          <div className="border-t border-line pt-4">
            <ActionForm
              action={resendVerificationAction}
              submitLabel="Send a new verification email"
              submitClassName="btn-secondary"
            >
              <p className="text-[0.73rem] leading-5 text-muted">
                Signed in as {user.email}. A new link invalidates older unused verification
                links when it is used.
              </p>
            </ActionForm>
          </div>
        ) : null}

        {!user ? (
          <InlineNotice tone="neutral" title="Sign in to manage verification">
            {token
              ? "You can verify with the link above without signing in. To resend a link, sign in first."
              : "Sign in to request another verification email."}
          </InlineNotice>
        ) : null}

        {!emailConfigured() && serverConfig.isProduction ? (
          <InlineNotice tone="danger" title="Email delivery is not configured">
            This deployment cannot deliver verification messages until SMTP settings are
            provided. Contact the operator.
          </InlineNotice>
        ) : null}
      </div>
    </AuthShell>
  );
}
