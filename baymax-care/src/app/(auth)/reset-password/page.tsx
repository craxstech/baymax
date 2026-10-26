import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineNotice } from "@/components/ui/primitives";
import { resetPasswordAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Baymax Care account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();

  return (
    <AuthShell
      title="Choose a new password"
      description="Your reset link is single-use. Setting a new password signs out other active sessions."
      footer={
        <p>
          Need a new link?{" "}
          <Link className="link" href="/forgot-password">
            Request another reset email
          </Link>
        </p>
      }
    >
      {!token ? (
        <div className="space-y-4">
          <InlineNotice tone="warning" title="This link is incomplete">
            Open the reset link from your email, or request a new one.
          </InlineNotice>
          <Link className="btn btn-primary btn-block" href="/forgot-password">
            Request a reset link
          </Link>
        </div>
      ) : (
        <ActionForm action={resetPasswordAction} submitLabel="Set new password">
          <input type="hidden" name="token" value={token} />
          <FormField
            label="New password"
            name="password"
            hint="At least 10 characters, including a letter and a number."
          >
            <input
              className="input"
              id="field-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </FormField>
          <FormField label="Confirm new password" name="confirmPassword">
            <input
              className="input"
              id="field-confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </FormField>
        </ActionForm>
      )}
    </AuthShell>
  );
}
