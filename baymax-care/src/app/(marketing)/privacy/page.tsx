import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing-page-shell";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Baymax Care collects, uses, protects, and deletes account, family health, document, and AI processing data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy policy"
      version="1.0"
      effectiveDate="26 October 2026"
      summary="Baymax Care holds sensitive information. This policy explains what the current application stores, why, where it can go, and how to exercise your choices. It also separates implemented safeguards from deployment obligations that the operator must complete before public launch."
    >
      <p>
        This Privacy Policy describes how {brand.name} (&ldquo;Baymax Care&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) handles personal information through this application. It applies to
        account holders, added family members, and visitors who contact us. The operator of the
        deployed service is the data fiduciary or controller for the information described here.
        Contact details appear at the end of this document.
      </p>
      <p>
        Baymax Care is not a hospital, clinic, pharmacy, emergency service, or licensed medical
        provider. Health information entered here is used to organise care and provide the product
        features described. It is not used to diagnose or treat a condition.
      </p>

      <h2 id="information-we-collect">1. Information we collect</h2>
      <h3>Account and identity information</h3>
      <ul>
        <li>Name, email address, hashed password, preferred time zone and language, account role, and email verification status.</li>
        <li>Session metadata used to keep you signed in, such as a hashed session token, hashed IP-derived identifier, user agent, expiry time, and last-used time. Raw session tokens are not stored.</li>
        <li>Authentication security events, for example failed sign-in attempts, without recording passwords or health content.</li>
      </ul>
      <h3>Family profile information</h3>
      <ul>
        <li>Name, date of birth, relationship, preferred language, optional sex or blood group, contact information you choose to add, and account owner or caregiver access records.</li>
        <li>Consent records, including the type, version, grant time, and revocation time where applicable.</li>
      </ul>
      <h3>Health and care information</h3>
      <ul>
        <li>Medical history such as conditions, allergies, adverse reactions, procedures, hospitalisations, immunisations, clinicians, measurements, and visit notes.</li>
        <li>Medical reports you upload or enter, extracted text, findings, reference ranges, AI-generated explanations, and the original document.</li>
        <li>Prescription details and uploaded prescription documents, prescriber details, verification status and events, and medication schedules and dose events.</li>
        <li>Women&apos;s health entries including cycle dates, flow, symptoms, mood, energy, and optional notes. Free-text notes are application-encrypted before storage.</li>
        <li>Meal plans, meal logs, water intake, food preferences, goals, allergies, dietary restrictions, and clinician-provided diet notes you choose to add.</li>
        <li>Emergency contact names, relationship, phone number, optional email, consent flags, and SOS or alert delivery attempts.</li>
        <li>AI conversation content and message feedback, only when you use the AI feature.</li>
      </ul>
      <h3>Technical, support, and operational information</h3>
      <ul>
        <li>Essential session cookies and, in a local development environment only, a verification-token cookie.</li>
        <li>Messages you send through the contact form; IP-based rate-limit keys; audit records; integration delivery events; webhook events; background job records.</li>
        <li>Security logs containing identifiers and event categories. Logs are designed not to contain free-text health records, passwords, or raw tokens.</li>
      </ul>
      <p>
        At this build, we do not include third-party advertising trackers or cross-site behavioural
        analytics. If an operator adds analytics or monitoring, this policy and the consent
        interface must be updated before the addition goes live.
      </p>

      <h2 id="how-we-use">2. How we use information</h2>
      <ul>
        <li>To create and secure your account, verify your email, maintain sessions, and prevent abuse.</li>
        <li>To provide the family profiles, medical history, report library, medication schedules, prescription records, women&apos;s health space, nutrition tools, alerts, and notification centre you request.</li>
        <li>To call a configured AI model for a conversation or report explanation when you choose that feature and the service is available.</li>
        <li>To send essential account messages, notifications, and — where configured and consented to — emergency-contact SMS or email alerts.</li>
        <li>To generate a medical summary or an export you request, and to process caregiver invitations you send or accept.</li>
        <li>To investigate security reports, maintain audit trails, recover from failures, and meet applicable legal obligations.</li>
      </ul>
      <p>
        Depending on the deployment and applicable law, the processing grounds may include your
        consent, performance of the service you requested, compliance with law, and legitimate
        operational or security interests that do not override your rights. Consent is used for
        health-data processing, optional AI processing, and optional notification channels. You can
        withdraw consent through the consent controls, but withdrawal does not affect processing
        already carried out and may make some features unavailable.
      </p>

      <h2 id="family-members">3. Family member and caregiver information</h2>
      <p>
        An account owner can create health profiles for other people, including children. By
        adding someone, the account owner represents that they have the authority or guardianship
        required to do so. The current implementation cannot independently verify guardianship.
        Production operators must establish an appropriate verification, age-appropriate access,
        and re-consent process before relying on this feature for minors or adults who lack
        capacity.
      </p>
      <p>
        Adult caregivers can be invited by email. Acceptance is bound to the invited email address,
        requires the invitee to be signed in, and is subject to the permissions selected by the
        account owner. The owner can revoke access. Access is checked on the server for every
        protected request.
      </p>

      <h2 id="womens-health">4. Women&apos;s health data</h2>
      <p>
        Menstrual and cycle information is treated as especially sensitive. It is available only
        inside the signed-in user&apos;s private health space and is not included in shared family
        dashboards or the AI context selector. Optional free-text notes are encrypted before being
        stored using application-level AES-256-GCM encryption; the encryption key must be supplied
        through the deployment secret manager.
      </p>
      <p>
        Cycle predictions are estimates based on the dates you record. They are not a diagnosis,
        pregnancy test, fertility assessment, or guarantee of ovulation. You can disable
        predictions and reminders in the module. You can delete individual entries or all entries
        from the module; deleting your account removes associated cycle records from the
        application database, subject to the backup and legal-retention rules below.
      </p>

      <h2 id="documents">5. Uploaded medical documents and files</h2>
      <p>
        Uploaded reports and prescriptions are validated for type and size, stored separately from
        public web files, and associated with the relevant family member. Downloads require an
        authorised session or a short-lived signed link. In local development, files are stored in
        a private local directory. A production deployment must use private object storage with
        server-side encryption, appropriate bucket policies, and verified credential isolation.
      </p>
      <p>
        File contents may be processed for text extraction. PDF extraction runs within the
        application when supported. Image text extraction requires a configured OCR provider; if it
        is not configured, the file is stored but extraction is marked unavailable.
      </p>

      <h2 id="ai-processing">6. AI processing</h2>
      <p>
        The AI assistant and report explanations are optional. When the operator has configured an
        AI provider and the feature is used, the relevant prompt, conversation content, selected
        health context, or extracted report text is sent to that provider through the server. API
        credentials are kept server-side and are not exposed to the browser.
      </p>
      <p>
        The current preferred adapter is NVIDIA NIM, with provider and model configured through
        environment variables. The application does not train a model on user records. Whether the
        configured model provider retains, monitors, or trains on prompts depends on that
        provider&apos;s terms and account settings; the operator must verify those terms and
        configure a zero-retention arrangement where required before enabling the integration.
        If no AI provider is configured, AI features display an honest unavailable state and no
        prompt is sent.
      </p>
      <p>
        Do not include identifiers that are unnecessary for the question. You choose whether to
        attach a family member&apos;s selected health context in a conversation. AI outputs can be
        inaccurate and are not a diagnosis or prescription.
      </p>

      <h2 id="sharing">7. Service providers and disclosure</h2>
      <p>
        We do not sell health information. Information may be processed by service providers that
        operate the deployed product: hosting and database infrastructure, private object storage,
        email delivery, SMS delivery, OCR, an AI model provider, a pharmacy provider, a clinician
        scheduling provider, monitoring, and backup storage. Integration credentials identify the
        configured providers; those providers are not all operational in this build.
      </p>
      <p>
        A provider receives only the data necessary for its function, subject to its contract and
        security obligations. Currently unavailable integrations receive no data. We may disclose
        information if required by law or to protect a person from serious harm, subject to the
        applicable legal process. We do not claim that the current implementation handles every
        legal request scenario automatically; public deployment requires documented escalation and
        law-enforcement request procedures.
      </p>

      <h2 id="notifications">8. Notifications and emergency alerts</h2>
      <p>
        In-app notifications are stored in your account. Email and SMS channels are optional and
        disabled by default. They are only used to deliver account or care messages when the
        relevant provider is configured and the channel is enabled, with the legal basis and
        consent required in the deployment jurisdiction.
      </p>
      <p>
        An SOS alert sends a message to emergency contacts selected in the account through the
        configured channel. It is not a call to emergency services and does not dispatch an
        ambulance. Each delivery attempt is recorded with its actual provider status. If no channel
        is configured, the app shows the failure or unavailable state and directs the user to call
        emergency services directly. Do not rely on this feature as your only emergency plan.
      </p>

      <h2 id="security">9. Storage and security practices</h2>
      <p>
        The implemented application uses password hashing with bcrypt, HMAC-hashed session and
        action tokens, HttpOnly and SameSite session cookies, server-side family authorisation,
        input validation, rate limiting, server-only API credentials, private local file storage,
        short-lived signed file links, audit events, and AES-256-GCM encryption for free-text
        women&apos;s health notes. Transport security depends on the deployment; HTTPS/TLS must be
        enabled and verified.
      </p>
      <p>
        The application does not implement end-to-end encryption. Database and infrastructure
        encryption at rest must be configured in production. No system is completely secure, and
        we cannot guarantee that unauthorised access, loss, or interruption will never occur. If
        you see a security problem, use the contact page and select Security; do not include
        medical records in your report.
      </p>

      <h2 id="retention">10. Retention and deletion</h2>
      <p>
        Active account and health records are retained while your account is in use and as needed
        to provide the service. When an account deletion is completed, the implementation deletes
        the user record and associated application records through database relationships, removes
        local uploaded files for the deleted user, revokes sessions, and stores a non-identifying
        deletion record containing a one-way email hash and deletion time. Aggregate or security
        records that cannot be linked back to you may remain.
      </p>
      <p>
        Backup retention, provider-side retention, legally required medical-record retention, and
        tax or dispute records depend on the configured production services and applicable law.
        They must be documented by the operator in a deployment-specific retention schedule before
        launch. A backup is not considered immediately deleted; the operator must define and
        operate a backup expiry process. Do not promise deletion from backups before that process
        exists.
      </p>

      <h2 id="your-rights">11. Your choices and rights</h2>
      <p>
        Subject to applicable law, you may request access to your personal information, correction
        of inaccurate information, a copy of authorised records, deletion, withdrawal of consent,
        and information about how your data is processed. Account holders can use the following
        implemented controls:
      </p>
      <ul>
        <li>Review and change privacy and consent settings in <Link href="/app/settings/privacy">Privacy settings</Link>.</li>
        <li>Export or download a medical summary from the relevant family member&apos;s record.</li>
        <li>Delete medical history entries, reports, cycle entries, meal logs, and other user-created records where the module supports deletion.</li>
        <li>Revoke caregiver access and individual sessions from the account settings.</li>
        <li>Start account deletion from <Link href="/app/settings/security">Security settings</Link>.</li>
      </ul>
      <p>
        You can contact us through the <Link href="/contact">contact page</Link> for a request that
        cannot be completed in the app. We may need to verify identity before acting. The current
        application does not automatically complete a request received only by email. The operator
        must maintain an appropriate grievance and rights-request workflow for production.
      </p>

      <h2 id="children">12. Children&apos;s information</h2>
      <p>
        Accounts are intended for adults aged 18 or over. A child&apos;s profile must be created
        and managed by a parent or legal guardian. We do not knowingly allow a child to create an
        independent account or accept privacy terms. The current implementation relies on the
        account owner&apos;s representation of guardianship and does not verify a child&apos;s age
        independently. Production operators must implement age assurance, guardian consent, and
        age-appropriate access consistent with applicable law, including India&apos;s Digital
        Personal Data Protection Act framework where it applies.
      </p>

      <h2 id="cookies">13. Cookies and essential technical storage</h2>
      <p>
        The application uses an essential HttpOnly session cookie to keep you signed in. It may use
        a temporary development-only cookie to support local email verification when no email
        provider is configured. A signed file URL contains an expiry and signature but is not a
        tracking cookie. We do not set advertising cookies in this build. If additional essential
        or optional storage is introduced, the notice and consent interface must be updated.
      </p>

      <h2 id="cross-border">14. Cross-border processing</h2>
      <p>
        The deployment database, file storage, email, SMS, OCR, AI, and other providers may process
        information in India or other countries depending on the operator&apos;s configuration and
        contracts. The operator must identify these locations, satisfy any applicable cross-border
        transfer requirements, and update this notice for the production configuration. This
        document does not represent that all providers are located in India.
      </p>

      <h2 id="changes">15. Changes to this policy</h2>
      <p>
        We may update this policy as the product or applicable requirements change. The effective
        date and version will be updated, and a material change should be communicated through the
        account or another appropriate notice. Version 1.0 corresponds to the initial application
        build effective 26 October 2026. Before public commercial launch, this policy must be
        reviewed by qualified Indian legal counsel and aligned with the actual hosting, retention,
        and provider contracts.
      </p>

      <h2 id="contact">16. Contact</h2>
      <p>
        Privacy questions and rights requests: <Link href="/contact">contact form</Link>
        {" · "}
        <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>.
      </p>
      <p>
        Security concerns: use the contact form and choose Security. Do not send passwords or
        health records by email. Emergency: call {brand.emergencyNumber} in India or your local
        emergency number; this contact channel is not monitored as an emergency service.
      </p>
      <p>
        The operator must publish its legal entity name, registered address, and applicable
        grievance officer or Data Protection Officer details before public launch if required by
        applicable law. Those details are intentionally not fabricated in this development build.
      </p>

      <h2>Version history</h2>
      <ul>
        <li>Version 1.0 — 26 October 2026 — initial implementation-aligned policy.</li>
      </ul>
    </LegalShell>
  );
}
