import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing-page-shell";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "The terms that govern use of Baymax Care, including medical limitations, family accounts, AI, prescriptions, consultations, and emergency boundaries.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & conditions"
      version="1.0"
      effectiveDate="26 October 2026"
      summary="These terms set out the rules for using Baymax Care. They are deliberately explicit about the product's medical limits. Nothing here replaces emergency services or professional medical advice."
    >
      <p>
        These Terms & Conditions (&ldquo;Terms&rdquo;) govern access to and use of the {brand.name}{" "}
        application and services (&ldquo;Service&rdquo;). By creating an account, accessing the
        dashboard, or using a feature, you agree to these Terms and the{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
      </p>
      <p>
        The Service is operated by the entity deploying it. That entity&apos;s legal name, registered
        address, and grievance contact must be published before public launch and added here.
      </p>

      <h2>1. The Service is not medical care</h2>
      <p>
        Baymax Care is an organisational and informational tool. It is not a hospital, clinic,
        medical practice, diagnostic service, pharmacy, or emergency service. It does not practise
        medicine or provide a diagnosis, treatment, prescription, or clinical decision. No
        patient–clinician relationship is created by using it, including through the AI assistant.
      </p>
      <p>
        Always seek the advice of a qualified clinician for a medical condition or before changing
        a medicine or treatment. Do not disregard professional advice or delay seeking it because
        of something you read in the Service.
      </p>

      <h2>2. Emergencies</h2>
      <p>
        The Service is not for emergencies. It cannot dispatch an ambulance, contact a dispatcher,
        or guarantee that a human will see a message. If you or another person may be in immediate
        danger, call {brand.emergencyNumber} in India or the appropriate local emergency number.
        A call link in the Service only opens your device&apos;s dialler. It does not establish that
        help has been requested or dispatched.
      </p>

      <h2>3. Eligibility and account responsibilities</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>Provide accurate account information and keep your password confidential.</li>
        <li>You are responsible for activity carried out through your account, unless applicable law provides otherwise.</li>
        <li>Use a secure device and sign out of shared devices. Tell us immediately if you believe your account has been compromised.</li>
        <li>You may not share your account credentials. Invite a caregiver through the in-product permission workflow rather than sharing access.</li>
        <li>Email verification and password reset links are sensitive. Do not forward them.</li>
      </ul>

      <h2>4. Family accounts and authority</h2>
      <p>
        If you add a family member, you represent that you have the authority, guardianship, or
        consent needed to provide their information and manage their access. For a child, you
        represent that you are the parent or legal guardian. The current Service does not verify
        this representation.
      </p>
      <p>
        Caregivers receive only the permissions selected by the account owner. Access may be
        revoked. You must use caregiver access only for the supported care purpose and must not
        copy, share, or misuse the records you can see. If someone else&apos;s information is
        exposed to you without appropriate authorisation, notify us and do not continue to use it.
      </p>

      <h2>5. AI-assisted features</h2>
      <p>
        The AI assistant and report explanations are optional, may be unavailable, and depend on a
        configured model provider. They produce probabilistic output that can be incomplete,
        inaccurate, or inappropriate for your context. You must not rely on them as a diagnosis,
        prescription, emergency response, or sole basis for a health decision.
      </p>
      <p>
        The AI may summarise selected records only when you choose to include them. You must not
        use the assistant to send another person&apos;s health information without authority. We may
        apply safety filters, rate limits, and context restrictions. We do not warrant that the
        assistant will identify every emergency or that any response is clinically complete.
      </p>

      <h2>6. Reports and uploaded content</h2>
      <p>
        You retain ownership of the documents and records you upload, subject to the rights needed
        to operate the Service. You grant the operator a limited licence to store, process,
        extract, display, and transmit that content only to deliver the features you request and
        as described in the Privacy Policy.
      </p>
      <p>
        You must have the right to upload each document. Do not upload malicious files, another
        person&apos;s records without authority, or content you are legally prohibited from
        processing. OCR and AI extraction can make mistakes. The original document and its
        laboratory reference ranges control over an automated explanation. Report explanations are
        informational and require professional interpretation.
      </p>

      <h2>7. Prescriptions, medications, and ordering</h2>
      <p>
        Uploading a prescription does not verify it. The Service shows a verification status and
        does not represent that a document has been clinically authenticated unless a real,
        authorised verification process has actually returned that result. Medication schedules
        are created from information on file and are planning aids, not new prescriptions.
      </p>
      <p>
        The Service does not provide advice to double a missed dose, change a dose, stop a
        medicine, or substitute a medicine. Contact the prescriber or pharmacist with questions.
        Medicine ordering is unavailable unless a contracted pharmacy provider is configured.
        Prices, stock, delivery estimates, payments, and order confirmations are shown only when
        returned by that provider. No current transaction is completed by this build.
      </p>

      <h2>8. Consultations</h2>
      <p>
        Consultation booking and clinician profiles are available only through a configured
        scheduling provider that has verified the clinician and supplied genuine availability.
        The Service does not fabricate a clinician, credential, rating, appointment slot, or
        completed appointment. Use of a consultation provider may be subject to that
        provider&apos;s separate terms, fees, cancellation policy, privacy notice, and clinical
        suitability process.
      </p>
      <p>
        AI guidance is not a consultation with a qualified clinician. A chat interface does not
        mean a doctor is present.
      </p>

      <h2>9. Notifications, SOS, and contact alerts</h2>
      <p>
        Reminders and SOS alerts depend on your device, network, configured provider, quiet hours,
        and consent. Delivery is not guaranteed. The Service records a provider&apos;s actual
        response but cannot confirm that a human read or acted on a message. Emergency contacts
        must consent to being contacted. Do not include a person as an emergency contact without
        their knowledge.
      </p>
      <p>
        You should maintain an emergency plan that does not rely solely on this Service. If a
        delivery fails, call emergency services or the person directly.
      </p>

      <h2>10. Women&apos;s health and nutrition</h2>
      <p>
        Cycle estimates are based on recorded dates and may be inaccurate. They are not a
        pregnancy test, fertility assessment, ovulation guarantee, or diagnosis. Nutrition plans
        are general suggestions and may not be suitable for a medical condition, allergy, or
        clinician-prescribed diet. You are responsible for checking ingredients and seeking
        professional advice when needed. The current build does not calculate calories or
        nutrients unless a reputable provider is configured, and no invented values are displayed.
      </p>

      <h2>11. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>Access another person&apos;s records or attempt to bypass authorisation.</li>
        <li>Upload malware, exploit a vulnerability, scrape the service, or interfere with its operation.</li>
        <li>Use the Service to provide unlicensed medical care, prescribe, or impersonate a clinician.</li>
        <li>Harass another person, send unlawful emergency alerts, or misuse contact details.</li>
        <li>Reverse-engineer protected components except where applicable law permits it.</li>
        <li>Use automated tools to overload the service or evade rate limits.</li>
      </ul>

      <h2>12. Third-party services and availability</h2>
      <p>
        The Service may depend on third-party hosting, database, storage, email, SMS, OCR, AI,
        pharmacy, and clinician scheduling providers. Those providers may fail, change terms, or
        become unavailable. The current deployment may intentionally show an unavailable state for
        integrations that require credentials or contracts. We do not guarantee uninterrupted or
        error-free availability.
      </p>
      <p>
        The Service may be unavailable during maintenance or emergencies. Essential emergency
        information is intended to remain available on a public page, but no internet service is
        infallible. Never rely on a website as your only emergency plan.
      </p>

      <h2>13. Fees and payments</h2>
      <p>
        The current build does not process payments, medicine purchases, consultation fees, or
        delivery charges. Any future payment flow must show applicable fees and provider terms
        before confirmation and use a secure payment provider. No payment card data should be
        entered into or stored by the application.
      </p>

      <h2>14. Intellectual property</h2>
      <p>
        The original interface, illustrations, code, and brand elements in this application are
        owned by or licensed to the operator, subject to third-party open-source licences. You may
        not copy or redistribute the Service except as permitted by law or written permission.
        Your own uploaded records remain yours as described above.
      </p>
      <p>
        The working name &ldquo;Baymax Care&rdquo; and the original care companion illustration are
        development assets. They are not affiliated with or endorsed by Disney or the Big Hero 6
        franchise. Before public commercial launch, the operator must secure appropriate rights to
        the product name or choose a distinct brand.
      </p>

      <h2>15. Suspension and termination</h2>
      <p>
        We may suspend or terminate access for a material breach, a security risk, unlawful use, or
        where required by law. Where appropriate, we will provide notice and a route to export
        permitted records. Account deletion controls are described in the{" "}
        <Link href="/account-deletion">account deletion guidance</Link>. Some records may be
        retained where law requires or where needed to resolve a dispute, subject to the retention
        schedule.
      </p>

      <h2>16. Disclaimers and limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, the Service is provided on an
        &ldquo;as available&rdquo; basis. We do not warrant clinical accuracy, fitness for a
        particular medical purpose, uninterrupted availability, or that a third-party integration
        will be operational. Medical decisions belong with qualified professionals.
      </p>
      <p>
        To the extent permitted by law, the operator will not be liable for indirect, incidental,
        special, consequential, or punitive loss arising from use of the Service, including
        reliance on an AI response, delayed reminder, failed alert, unavailable integration, or
        user-entered error. Nothing in these Terms excludes liability that cannot legally be
        excluded, including mandatory consumer rights. India&apos;s applicable consumer protection
        and data protection requirements must be reviewed by counsel for the production offering.
      </p>

      <h2>17. Governing law and disputes</h2>
      <p>
        These Terms are intended to be governed by the laws of India, with courts at the
        operator&apos;s registered principal place of business having jurisdiction, subject to
        mandatory consumer protections and any applicable arbitration requirement. The final
        governing-law and dispute provisions must be completed and reviewed by qualified counsel
        before launch. Nothing in this clause prevents a person from contacting a regulator or
        emergency service.
      </p>

      <h2>18. Changes to these Terms</h2>
      <p>
        We may update these Terms as the Service evolves. We will publish the new version and
        effective date. If a change materially affects your rights, we will provide an appropriate
        notice where required. Continued use after the effective date may constitute acceptance.
        If you do not agree, stop using the Service and use the deletion controls.
      </p>

      <h2>19. Contact</h2>
      <p>
        Questions about these Terms: use the <Link href="/contact">contact page</Link> or email{" "}
        <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>. Emergency help: call{" "}
        {brand.emergencyNumber} in India or your local emergency number.
      </p>
      <p>
        These Terms must be reviewed by qualified Indian legal counsel and completed with the
        operator&apos;s legal entity and jurisdiction details before public launch. They are not a
        claim of legal compliance.
      </p>

      <h2>Version history</h2>
      <ul>
        <li>Version 1.0 — 26 October 2026 — initial implementation-aligned terms.</li>
      </ul>
    </LegalShell>
  );
}
