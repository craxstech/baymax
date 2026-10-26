import type { Metadata } from "next";
import Link from "next/link";
import { PhoneCall, ShieldCheck } from "lucide-react";
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
import { consents } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { type ConsentKind } from "@/lib/consents";
import { aiConfigured, emailConfigured, smsConfigured, brand } from "@/lib/config";
import { ocrConfigured } from "@/lib/config";
import { pharmacyConfigured, consultationConfigured, ambulanceConfigured } from "@/lib/config";
import { updateConsentAction } from "@/app/actions/settings";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Privacy & consents" };

const CONSENTS: Array<{
  kind: ConsentKind;
  title: string;
  description: string;
  dependsOn?: ConsentKind;
}> = [
  {
    kind: "TERMS",
    title: "Terms of service",
    description:
      "You agree to the terms under which you may use Baymax Care. Required to use the platform.",
  },
  {
    kind: "PRIVACY",
    title: "Privacy policy",
    description:
      "You agree to how your information is collected, used, and protected. Required to use the platform.",
  },
  {
    kind: "HEALTH_PROCESSING",
    title: "Health data processing",
    description:
      "Allows Baymax Care to store and process your health records, reports, and medications.",
  },
  {
    kind: "AI_PROCESSING",
    title: "AI processing",
    description:
      "Allows selected health information to be sent to a configured AI provider for explanations and answers.",
    dependsOn: "HEALTH_PROCESSING",
  },
  {
    kind: "MARKETING",
    title: "Marketing communications",
    description:
      "Allows Baymax Care to send you product updates and health tips by email.",
  },
  {
    kind: "WOMENS_HEALTH",
    title: "Women's health tracking",
    description:
      "Allows private cycle and symptom entries to be stored and viewed in the women's health section.",
  },
];

export default async function PrivacyPage() {
  const user = await requireUser("/app/settings/privacy");
  const db = await getDb();

  const consentRows = await db
    .select()
    .from(consents)
    .where(and(eq(consents.userId, user.id), isNull(consents.revokedAt)))
    .orderBy(desc(consents.createdAt));

  const grantedByKind = new Map<string, boolean>();
  for (const row of consentRows) {
    if (!grantedByKind.has(row.kind)) {
      grantedByKind.set(row.kind, row.granted);
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Settings" },
            { label: "Privacy & consents" },
          ]} />
        }
        title="Privacy & consents"
        description="Review and change what Baymax Care may do with your information."
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
        current="/app/settings/privacy"
      />

      <Panel>
        <PanelBody>
          <SectionHeading title="Consents" />
          <p className="mb-4 text-[0.78rem] leading-5 text-muted">
            Grant or withdraw consent for each purpose. Withdrawing a consent disables the features
            that depend on it. Existing data is not automatically deleted unless you delete it or
            delete your account.
          </p>

          {CONSENTS.map((item) => {
            const granted = grantedByKind.get(item.kind) ?? false;
            const depends = item.dependsOn
              ? grantedByKind.get(item.dependsOn) ?? false
              : true;
            const canToggle = depends;
            return (
              <DisclosurePanel
                key={item.kind}
                summary={item.title}
                description={item.description}
                defaultOpen={false}
              >
                {!canToggle && item.dependsOn && (
                  <InlineNotice tone="warning" className="mb-3" title="Prerequisite not granted">
                    You must grant {item.dependsOn.replace(/_/g, " ").toLowerCase()} before enabling
                    this consent.
                  </InlineNotice>
                )}
                {canToggle ? (
                  <ActionForm
                    action={updateConsentAction}
                    submitLabel={granted ? "Withdraw consent" : "Grant consent"}
                    submitClassName={granted ? "btn-danger-outline" : undefined}
                  >
                    <input type="hidden" name="kind" value={item.kind} />
                    <input type="hidden" name="granted" value={String(!granted)} />
                  </ActionForm>
                ) : (
                  <p className="text-[0.68rem] leading-4 text-muted">
                    Cannot change until {item.dependsOn!.replace(/_/g, " ").toLowerCase()} is granted.
                  </p>
                )}
                <p className="mt-2 text-[0.68rem] leading-4 text-muted">
                  Status:{" "}
                  {granted ? <span className="font-semibold text-[#176a48]">Active</span> : <span className="font-semibold text-[#a82f3d]">Not granted</span>}
                </p>
              </DisclosurePanel>
            );
          })}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <SectionHeading title="Integration transparency" />
          <p className="mb-4 text-[0.78rem] leading-5 text-muted">
            Baymax Care only contacts external services when you take an action that requires them.
            Each integration below shows whether it is configured on this server.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Status</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Private file storage</td>
                <td>
                  <span className="badge badge-success">Ready</span>
                </td>
                <td>
                  Reports and prescriptions are stored privately. Download links are short-lived and
                  signed.
                </td>
              </tr>
              <tr>
                <td>AI health assistant</td>
                <td>
                  {aiConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Explains reports and answers health questions. Not used unless you send a message.
                </td>
              </tr>
              <tr>
                <td>Image OCR</td>
                <td>
                  {ocrConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Extracts text from image reports. Not used for text-based PDFs.
                </td>
              </tr>
              <tr>
                <td>Email delivery</td>
                <td>
                  {emailConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Verification, password reset, and SOS alerts. Not used if not configured.
                </td>
              </tr>
              <tr>
                <td>SMS delivery</td>
                <td>
                  {smsConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  SOS alerts and reminders. Not used if not configured.
                </td>
              </tr>
              <tr>
                <td>Pharmacy ordering</td>
                <td>
                  {pharmacyConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Sends prescription orders to a pharmacy partner. No order is placed without one.
                </td>
              </tr>
              <tr>
                <td>Doctor consultations</td>
                <td>
                  {consultationConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Books appointments with verified clinicians. No booking without one.
                </td>
              </tr>
              <tr>
                <td>Ambulance partner</td>
                <td>
                  {ambulanceConfigured() ? (
                    <span className="badge badge-success">Configured</span>
                  ) : (
                    <span className="badge badge-neutral">Not configured</span>
                  )}
                </td>
                <td>
                  Sends ambulance requests to a partner. No request without one; call emergency
                  services directly instead.
                </td>
              </tr>
            </tbody>
          </table>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <SectionHeading title="Your rights" />
          <ul className="space-y-3 text-[0.78rem] leading-5 text-muted">
            <li>
              <span className="font-semibold">Access and export:</span> You can view and download
              your records from each section of the app.
            </li>
            <li>
              <span className="font-semibold">Correct:</span> You can edit or delete most entries.
              Medical history changes are audited.
            </li>
            <li>
              <span className="font-semibold">Delete:</span> You can delete individual entries or
              request full account deletion from Settings.
            </li>
            <li>
              <span className="font-semibold">Withdraw consent:</span> Any consent on this page can
              be withdrawn at any time.
            </li>
            <li>
              <span className="font-semibold">Revoke access:</span> Caregiver access to family
              members can be revoked from Family.
            </li>
          </ul>
        </PanelBody>
      </Panel>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`tel:${brand.emergencyNumber}`} className="btn btn-danger-outline">
          <PhoneCall size={14} aria-hidden="true" /> Call {brand.emergencyNumber}
        </Link>
        <Link href="/privacy" className="btn btn-secondary">
          Read privacy policy
        </Link>
        <Link href="/terms" className="btn btn-secondary">
          Read terms & conditions
        </Link>
      </div>
    </div>
  );
}
