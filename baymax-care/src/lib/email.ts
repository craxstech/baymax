import "server-only";

import nodemailer from "nodemailer";
import { integrations, emailConfigured, brand } from "./config";
import { logger } from "./logger";

export type DeliveryResult =
  | { status: "sent"; providerReference?: string }
  | { status: "unavailable"; error: string }
  | { status: "failed"; error: string };

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(content: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5fbfa;font-family:Inter,Arial,sans-serif;color:#172b35;">
  <div style="max-width:560px;margin:32px auto;padding:0 20px;">
    <div style="border:1px solid #dce8e8;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid #dce8e8;font-weight:650;font-size:16px;letter-spacing:-0.02em;">
        <span style="display:inline-block;width:9px;height:9px;background:#16b8b0;border-radius:2px;margin-right:8px;"></span>
        ${escapeHtml(brand.name)}
      </div>
      <div style="padding:24px;font-size:14px;line-height:1.7;color:#3e515a;">${content}</div>
      <div style="padding:16px 24px;border-top:1px solid #dce8e8;background:#fbfdfd;font-size:12px;color:#60727a;">
        This is an automated message from ${escapeHtml(brand.name)}. Do not reply with medical information.
      </div>
    </div>
  </div>
</body></html>`;
}

export async function sendEmail(input: EmailInput): Promise<DeliveryResult> {
  if (!emailConfigured()) {
    return {
      status: "unavailable",
      error: "Email delivery is not configured. Add the SMTP_* environment variables.",
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: integrations.email.host,
      port: integrations.email.port,
      secure: integrations.email.secure,
      auth: {
        user: integrations.email.user,
        pass: integrations.email.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const result = await transport.sendMail({
      from: integrations.email.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? layout(`<p>${escapeHtml(input.text).replaceAll("\n", "<br>")}</p>`),
    });
    logger.info("email_sent", { messageId: result.messageId });
    return { status: "sent", providerReference: result.messageId };
  } catch (error) {
    logger.error("email_delivery_failed", error);
    return {
      status: "failed",
      error: "The email provider did not accept the message.",
    };
  }
}

export function verificationEmail(name: string, url: string) {
  return {
    subject: `Verify your ${brand.name} email`,
    text: `Hello ${name},\n\nVerify your email address to finish setting up ${brand.name}:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this message.`,
    html: layout(
      `<p>Hello ${escapeHtml(name)},</p><p>Verify your email address to finish setting up ${escapeHtml(brand.name)}.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#087f83;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Verify email</a></p><p style="font-size:12px;color:#60727a;">This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`,
    ),
  };
}

export function passwordResetEmail(name: string, url: string) {
  return {
    subject: `Reset your ${brand.name} password`,
    text: `Hello ${name},\n\nA password reset was requested for your account. Use this link within 60 minutes:\n${url}\n\nIf you did not request this, you can ignore the message. Your password has not changed.`,
    html: layout(
      `<p>Hello ${escapeHtml(name)},</p><p>A password reset was requested for your account.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#087f83;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Reset password</a></p><p style="font-size:12px;color:#60727a;">This link expires in 60 minutes. If you did not request it, you can ignore this message. Your password has not changed.</p>`,
    ),
  };
}

export function caregiverInviteEmail(inviterName: string, memberName: string, url: string) {
  return {
    subject: `${inviterName} invited you to help with care on ${brand.name}`,
    text: `Hello,\n\n${inviterName} invited you to be a caregiver for ${memberName} on ${brand.name}.\n\nReview the invitation and its permissions:\n${url}\n\nThis invitation expires in 7 days. If you were not expecting it, ignore this email.`,
    html: layout(
      `<p>Hello,</p><p><strong>${escapeHtml(inviterName)}</strong> invited you to be a caregiver for <strong>${escapeHtml(memberName)}</strong> on ${escapeHtml(brand.name)}.</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#087f83;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Review invitation</a></p><p style="font-size:12px;color:#60727a;">This invitation expires in 7 days. If you were not expecting it, ignore this email.</p>`,
    ),
  };
}

export function sosEmail(
  contactName: string,
  memberName: string,
  locationText: string | null,
  healthSummary?: string | null,
) {
  return {
    subject: `Emergency alert from ${brand.name}`,
    text: `Hello ${contactName},\n\n${memberName} used ${brand.name} to alert an emergency contact. This email is a notification only; it does not dispatch emergency services.\n\n${locationText ? `Shared location: ${locationText}\n\n` : "No location was shared.\n\n"}${healthSummary ? `Health information the person chose to share:\n${healthSummary}\n\n` : ""}If this is an emergency, call your local emergency number and try to reach the person directly.`,
    html: layout(
      `<p>Hello ${escapeHtml(contactName)},</p><p><strong>${escapeHtml(memberName)}</strong> used ${escapeHtml(brand.name)} to alert an emergency contact.</p><p style="border-left:3px solid #c83e4d;padding-left:12px;"><strong>This email is a notification only. It does not dispatch emergency services.</strong></p>${locationText ? `<p>Shared location: ${escapeHtml(locationText)}</p>` : `<p>No location was shared.</p>`}${healthSummary ? `<p><strong>Health information the person chose to share</strong></p><p>${escapeHtml(healthSummary).replaceAll("\n", "<br>")}</p>` : ""}<p>If this is an emergency, call your local emergency number and try to reach the person directly.</p>`,
    ),
  };
}
