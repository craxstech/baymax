/**
 * Central, typed application configuration.
 * Values are read lazily so local tooling and tests can import helpers
 * without requiring a full production environment.
 */

function env(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function bool(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function num(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const brand = {
  name: env("NEXT_PUBLIC_APP_NAME", env("APP_NAME", "Baymax Care")),
  tagline: env("BRAND_TAGLINE", "Your family's health, in one caring place."),
  description:
    "A calm place to understand health records, organise medications, and coordinate care for the people you love.",
  contactEmail: env("CONTACT_EMAIL", "care@example.com"),
  emergencyNumber: env("EMERGENCY_NUMBER", "112"),
  url: env("NEXT_PUBLIC_APP_URL", env("APP_URL", "http://localhost:3000")).replace(/\/$/, ""),
  locale: "en_IN",
  supportHours: "Monday–Friday, 9:00–18:00 IST",
  legalVersion: "2026-10-26",
};

export const serverConfig = {
  nodeEnv: env("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  sessionSecret: env("SESSION_SECRET"),
  encryptionKey: env("APP_ENCRYPTION_KEY"),
  defaultTimeZone: env("DEFAULT_TIME_ZONE", "Asia/Kolkata"),
  uploadMaxBytes: num("UPLOAD_MAX_MB", 15) * 1024 * 1024,
  devExposeAuthLinks: bool("DEV_EXPOSE_AUTH_LINKS", false),
  cronSecret: env("CRON_SECRET"),
  reminderLookaheadDays: num("REMINDER_LOOKAHEAD_DAYS", 2),
  adminEmails: env("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  rateLimitEnabled: bool("RATE_LIMIT_ENABLED", true),
  demoMode: bool("DEMO_MODE", false),
  demoLoginHint: env("NEXT_PUBLIC_DEMO_LOGIN"),
};

export const integrations = {
  ai: {
    provider: env("AI_PROVIDER", "unconfigured").toLowerCase(),
    nvidiaBaseUrl: env("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1"),
    nvidiaApiKey: env("NVIDIA_NIM_API_KEY"),
    nvidiaModel: env("NVIDIA_NIM_MODEL", "meta/llama-3.1-70b-instruct"),
    reportModel: env("AI_REPORT_MODEL", env("NVIDIA_NIM_MODEL", "")),
    timeoutMs: num("AI_REQUEST_TIMEOUT_MS", 45000),
  },
  email: {
    host: env("SMTP_HOST"),
    port: num("SMTP_PORT", 587),
    secure: bool("SMTP_SECURE", false),
    user: env("SMTP_USER"),
    password: env("SMTP_PASSWORD"),
    from: env("EMAIL_FROM", "Baymax Care <no-reply@example.com>"),
  },
  sms: {
    accountSid: env("TWILIO_ACCOUNT_SID"),
    authToken: env("TWILIO_AUTH_TOKEN"),
    fromNumber: env("TWILIO_FROM_NUMBER"),
  },
  ocr: {
    apiKey: env("OCR_SPACE_API_KEY"),
    endpoint: env("OCR_SPACE_ENDPOINT", "https://api.ocr.space/parse/image"),
  },
  storage: {
    driver: env("STORAGE_DRIVER", "local"),
    region: env("S3_REGION"),
    bucket: env("S3_BUCKET"),
    endpoint: env("S3_ENDPOINT"),
    accessKeyId: env("S3_ACCESS_KEY_ID"),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
  },
  pharmacy: {
    provider: env("PHARMACY_PROVIDER"),
    baseUrl: env("PHARMACY_API_BASE_URL"),
    apiKey: env("PHARMACY_API_KEY"),
    webhookSecret: env("PHARMACY_WEBHOOK_SECRET"),
  },
  consultation: {
    provider: env("CONSULTATION_PROVIDER"),
    baseUrl: env("CONSULTATION_API_BASE_URL"),
    apiKey: env("CONSULTATION_API_KEY"),
    webhookSecret: env("CONSULTATION_WEBHOOK_SECRET"),
  },
  ambulance: {
    provider: env("AMBULANCE_PROVIDER"),
    baseUrl: env("AMBULANCE_API_BASE_URL"),
    apiKey: env("AMBULANCE_API_KEY"),
  },
} as const;

export const aiConfigured = () =>
  integrations.ai.provider === "nvidia" && Boolean(integrations.ai.nvidiaApiKey);

export const emailConfigured = () =>
  Boolean(integrations.email.host && integrations.email.user && integrations.email.password);

export const smsConfigured = () =>
  Boolean(
    integrations.sms.accountSid &&
      integrations.sms.authToken &&
      integrations.sms.fromNumber,
  );

export const pharmacyConfigured = () =>
  integrations.pharmacy.provider !== "" &&
  integrations.pharmacy.baseUrl !== "" &&
  integrations.pharmacy.apiKey !== "";

export const consultationConfigured = () =>
  integrations.consultation.provider !== "" &&
  integrations.consultation.baseUrl !== "" &&
  integrations.consultation.apiKey !== "";

export const ocrConfigured = () => Boolean(integrations.ocr.apiKey);

export const ambulanceConfigured = () =>
  integrations.ambulance.provider !== "" &&
  integrations.ambulance.baseUrl !== "" &&
  integrations.ambulance.apiKey !== "";

export function integrationStatus() {
  return [
    {
      type: "AI" as const,
      label: "AI health assistant",
      configured: aiConfigured(),
      note: aiConfigured()
        ? `${integrations.ai.provider} · ${integrations.ai.nvidiaModel}`
        : "Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY.",
    },
    {
      type: "EMAIL" as const,
      label: "Email delivery",
      configured: emailConfigured(),
      note: emailConfigured() ? "SMTP credentials present." : "Set SMTP_* variables.",
    },
    {
      type: "SMS" as const,
      label: "SMS & emergency alerts",
      configured: smsConfigured(),
      note: smsConfigured() ? "Twilio credentials present." : "Set TWILIO_* variables.",
    },
    {
      type: "STORAGE" as const,
      label: "Private file storage",
      configured: true,
      note:
        integrations.storage.driver === "s3"
          ? "S3 driver selected (configure and verify credentials)."
          : "Local private storage under .data/uploads.",
    },
    {
      type: "OCR" as const,
      label: "Image report OCR",
      configured: ocrConfigured(),
      note: ocrConfigured()
        ? "OCR.space configured."
        : "Set OCR_SPACE_API_KEY for image report extraction.",
    },
    {
      type: "PHARMACY" as const,
      label: "Pharmacy ordering",
      configured: pharmacyConfigured(),
      note: pharmacyConfigured()
        ? `${integrations.pharmacy.provider} credentials present.`
        : "No pharmacy partner configured. Ordering is disabled.",
    },
    {
      type: "CONSULTATION" as const,
      label: "Doctor consultations",
      configured: consultationConfigured(),
      note: consultationConfigured()
        ? `${integrations.consultation.provider} credentials present.`
        : "No clinician scheduling partner configured. Booking is disabled.",
    },
    {
      type: "AMBULANCE" as const,
      label: "Ambulance partner",
      configured: ambulanceConfigured(),
      note: ambulanceConfigured()
        ? `${integrations.ambulance.provider} credentials present.`
        : "No ambulance partner configured. Call emergency services directly.",
    },
  ];
}
