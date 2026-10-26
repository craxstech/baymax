"use client";

import { ActionForm, FormField } from "@/components/ui/action-form";
import { contactAction } from "@/app/actions/public";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} submitLabel="Send message" className="gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" name="name">
          <input
            id="field-name"
            name="name"
            className="input"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </FormField>
        <FormField label="Email address" name="email">
          <input
            id="field-email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            required
          />
        </FormField>
      </div>
      <FormField label="What is this about?" name="topic">
        <select id="field-topic" name="topic" className="select" required defaultValue="product">
          <option value="product">Using the product</option>
          <option value="privacy">Privacy or data request</option>
          <option value="security">Security concern</option>
          <option value="accessibility">Accessibility feedback</option>
          <option value="partnerships">Clinical, pharmacy, or integration partnership</option>
          <option value="other">Something else</option>
        </select>
      </FormField>
      <FormField
        label="Message"
        name="message"
        hint="Do not include urgent medical information or another person's health records."
      >
        <textarea
          id="field-message"
          name="message"
          className="textarea min-h-36"
          required
          minLength={20}
          maxLength={3000}
          placeholder="Tell us what you need help with."
        />
      </FormField>
      <p className="text-[0.7rem] leading-5 text-muted">
        This form is for product and support messages. It is not monitored as an emergency
        channel. For urgent medical help, contact local emergency services.
      </p>
    </ActionForm>
  );
}
