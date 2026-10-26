import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { registerAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/config";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a private family health space with Baymax Care.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const next = safeInternalPath(params.next, "/app");
  if (user) redirect(next);

  return (
    <AuthShell
      wide
      title="Create your health space"
      description="Start with your own profile. You can add family members and choose what each caregiver can see."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            className="link"
            href={`/login${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`}
          >
            Sign in
          </Link>
        </p>
      }
    >
      <ActionForm action={registerAction} submitLabel="Create account">
        <input type="hidden" name="next" value={next} />
        <FormField label="Full name" name="name">
          <input
            className="input"
            id="field-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Ananya Sharma"
            required
            minLength={2}
            maxLength={100}
          />
        </FormField>
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
        <div className="form-grid sm:grid-cols-2">
          <FormField
            label="Password"
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
          <FormField label="Confirm password" name="confirmPassword">
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
        </div>

        <div className="mt-1 space-y-3 border-t border-line pt-4">
          <label className="check-row" htmlFor="field-acceptTerms">
            <input id="field-acceptTerms" name="acceptTerms" type="checkbox" required />
            <span className="check-copy">
              I agree to the{" "}
              <Link className="link" href="/terms" target="_blank">
                Terms &amp; conditions
              </Link>{" "}
              and{" "}
              <Link className="link" href="/privacy" target="_blank">
                Privacy policy
              </Link>
              .
            </span>
          </label>
          <label className="check-row" htmlFor="field-acceptHealthProcessing">
            <input
              id="field-acceptHealthProcessing"
              name="acceptHealthProcessing"
              type="checkbox"
              required
            />
            <span className="check-copy">
              I understand that {brand.name} stores health information I choose to add, and that
              I&apos;m responsible for having permission to add information about family members.
            </span>
          </label>
          <p className="hint pl-7">
            This is not consent for marketing. AI processing and optional communications have
            separate controls in your account.
          </p>
        </div>
      </ActionForm>
    </AuthShell>
  );
}
