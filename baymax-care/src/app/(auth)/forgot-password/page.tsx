import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { forgotPasswordAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your Baymax Care account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email address on your account. If it exists, we'll send a reset link that expires in 60 minutes."
      footer={
        <p>
          Remembered it?{" "}
          <Link className="link" href="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ActionForm action={forgotPasswordAction} submitLabel="Send reset link">
        <FormField label="Email address" name="email">
          <input
            className="input"
            id="field-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
            maxLength={254}
          />
        </FormField>
        <p className="text-[0.73rem] leading-5 text-muted">
          For privacy, this page shows the same message whether or not an account exists. Check
          your spam folder before requesting another link.
        </p>
      </ActionForm>
    </AuthShell>
  );
}
