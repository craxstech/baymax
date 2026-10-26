import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { InlineNotice } from "@/components/ui/primitives";
import { loginAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { brand, serverConfig } from "@/lib/config";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your private Baymax Care family health workspace.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
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
      title="Welcome back"
      description="Sign in to open your private family health space."
      footer={
        <p>
          New to {brand.name}?{" "}
          <Link className="link" href={`/register${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Create an account
          </Link>
        </p>
      }
    >
      <div className="form-grid">
        {serverConfig.demoMode && !serverConfig.isProduction && serverConfig.demoLoginHint ? (
          <InlineNotice tone="info" title="Local demo access">
            <span className="font-mono text-[0.75rem]">{serverConfig.demoLoginHint}</span>
            <p className="mt-1 text-[0.7rem]">
              The demo workspace contains clearly labelled synthetic records. It is available only
              because DEMO_MODE is enabled in this local environment.
            </p>
          </InlineNotice>
        ) : null}

        <ActionForm action={loginAction} submitLabel="Sign in">
          <input type="hidden" name="next" value={next} />
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
          <FormField label="Password" name="password">
            <input
              className="input"
              id="field-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              required
              maxLength={128}
            />
          </FormField>
          <div className="-mt-1 flex justify-end">
            <Link href="/forgot-password" className="text-[0.78rem] font-medium text-aqua-700 hover:underline">
              Forgot your password?
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-1 text-[0.72rem] leading-5 text-muted">
            <LogIn size={13} aria-hidden="true" />
            Sessions are protected with an HttpOnly cookie and can be revoked at any time.
          </div>
        </ActionForm>
      </div>
    </AuthShell>
  );
}
