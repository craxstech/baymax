import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── Enums ─────────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "DELETED"]);
export const tokenTypeEnum = pgEnum("token_type", [
  "EMAIL_VERIFY",
  "PASSWORD_RESET",
  "CAREGIVER_INVITE",
]);
export const accessRoleEnum = pgEnum("access_role", ["OWNER", "CAREGIVER"]);
export const consentKindEnum = pgEnum("consent_kind", [
  "TERMS",
  "PRIVACY",
  "HEALTH_PROCESSING",
  "AI_PROCESSING",
  "MARKETING",
  "WOMENS_HEALTH",
]);
export const historyCategoryEnum = pgEnum("history_category", [
  "CONDITION",
  "ALLERGY",
  "SURGERY",
  "HOSPITALIZATION",
  "FAMILY_HISTORY",
  "IMMUNIZATION",
  "PROVIDER",
  "MEASUREMENT",
  "VISIT",
  "NOTE",
]);
export const historySourceEnum = pgEnum("history_source", [
  "PATIENT",
  "CAREGIVER",
  "CLINICIAN",
  "IMPORT",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "UPLOADED",
  "EXTRACTING",
  "READY",
  "AI_ANALYSIS_READY",
  "OCR_UNAVAILABLE",
  "AI_UNAVAILABLE",
  "FAILED",
]);
export const findingFlagEnum = pgEnum("finding_flag", [
  "NORMAL",
  "HIGH",
  "LOW",
  "ABNORMAL",
  "UNKNOWN",
]);
export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "UNVERIFIED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
]);
export const verificationEventTypeEnum = pgEnum("verification_event_type", [
  "UPLOADED",
  "DETAILS_RECORDED",
  "PROVIDER_CHECK",
  "FAILED",
  "SUPERSEDED",
]);
export const doseStatusEnum = pgEnum("dose_status", [
  "PENDING",
  "TAKEN",
  "SKIPPED",
  "MISSED",
]);
export const consultationStatusEnum = pgEnum("consultation_status", [
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "FAILED",
]);
export const cycleFlowEnum = pgEnum("cycle_flow", ["SPOTTING", "LIGHT", "MEDIUM", "HEAVY"]);
export const alertStatusEnum = pgEnum("alert_status", [
  "SENDING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "NO_CHANNEL",
]);
export const deliveryChannelEnum = pgEnum("delivery_channel", ["SMS", "EMAIL", "IN_APP"]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "PENDING",
  "SENT",
  "FAILED",
  "UNAVAILABLE",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT",
  "AWAITING_PROVIDER",
  "CONFIRMED",
  "PROCESSING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
]);
export const notificationCategoryEnum = pgEnum("notification_category", [
  "MEDICATION",
  "CONSULTATION",
  "PRESCRIPTION",
  "ORDER",
  "REPORT",
  "HEALTH_REMINDER",
  "FAMILY",
  "EMERGENCY",
  "SYSTEM",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);
export const webhookStatusEnum = pgEnum("webhook_status", [
  "RECEIVED",
  "PROCESSED",
  "FAILED",
  "IGNORED",
]);
export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "NEW",
  "READ",
  "CLOSED",
]);
export const integrationTypeEnum = pgEnum("integration_type", [
  "AI",
  "EMAIL",
  "SMS",
  "STORAGE",
  "PHARMACY",
  "CONSULTATION",
  "AMBULANCE",
  "OCR",
]);

/* ───────────────────────── Identity ───────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    locale: text("locale").notNull().default("en-IN"),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    isDemo: boolean("is_demo").notNull().default(false),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    type: tokenTypeEnum("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_tokens_hash_unique").on(t.tokenHash),
    index("auth_tokens_user_type_idx").on(t.userId, t.type),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  },
);

/* ───────────────────────── Family ───────────────────────── */

export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dateOfBirth: date("date_of_birth"),
    relationship: text("relationship").notNull(),
    sex: text("sex"),
    preferredLanguage: text("preferred_language").notNull().default("English"),
    phone: text("phone"),
    email: text("email"),
    bloodGroup: text("blood_group"),
    isSelf: boolean("is_self").notNull().default(false),
    avatarTone: integer("avatar_tone").notNull().default(0),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("family_members_family_idx").on(t.familyId)],
);

export const familyAccess = pgTable(
  "family_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: accessRoleEnum("role").notNull().default("CAREGIVER"),
    canView: boolean("can_view").notNull().default(true),
    canManage: boolean("can_manage").notNull().default(false),
    canManageMedications: boolean("can_manage_medications").notNull().default(false),
    canReceiveAlerts: boolean("can_receive_alerts").notNull().default(false),
    grantedById: uuid("granted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("family_access_member_user_unique").on(t.memberId, t.userId),
    index("family_access_user_idx").on(t.userId),
  ],
);

export const caregiverInvites = pgTable(
  "caregiver_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    permissions: jsonb("permissions")
      .$type<{ view: boolean; manage: boolean; medications: boolean; alerts: boolean }>()
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("caregiver_invites_token_unique").on(t.tokenHash),
    index("caregiver_invites_member_idx").on(t.memberId),
  ],
);

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => familyMembers.id, { onDelete: "cascade" }),
    kind: consentKindEnum("kind").notNull(),
    version: text("version").notNull(),
    granted: boolean("granted").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("consents_user_idx").on(t.userId, t.kind)],
);

/* ───────────────────────── Files & reports ───────────────────────── */

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: text("checksum").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_member_idx").on(t.memberId)],
);

export const medicalReports = pgTable(
  "medical_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    reportDate: date("report_date").notNull(),
    status: reportStatusEnum("status").notNull().default("UPLOADED"),
    extractedText: text("extracted_text"),
    aiSummary: text("ai_summary"),
    limitations: text("limitations"),
    analysisModel: text("analysis_model"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_member_idx").on(t.memberId), index("reports_date_idx").on(t.reportDate)],
);

export const reportFindings = pgTable(
  "report_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => medicalReports.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
    unit: text("unit"),
    referenceRange: text("reference_range"),
    flag: findingFlagEnum("flag").notNull().default("UNKNOWN"),
    explanation: text("explanation"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("report_findings_report_idx").on(t.reportId)],
);

/* ───────────────────────── Medical history ───────────────────────── */

export const medicalHistory = pgTable(
  "medical_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    category: historyCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    details: text("details"),
    status: text("status"),
    severity: text("severity"),
    recordedAt: date("recorded_at").notNull(),
    source: historySourceEnum("source").notNull().default("PATIENT"),
    recordedById: uuid("recorded_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clinicianName: text("clinician_name"),
    attachmentFileId: uuid("attachment_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("history_member_idx").on(t.memberId),
    index("history_category_idx").on(t.category),
  ],
);

/* ───────────────────────── Prescriptions ───────────────────────── */

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    prescriberName: text("prescriber_name").notNull(),
    clinicName: text("clinic_name"),
    issuedAt: date("issued_at").notNull(),
    validUntil: date("valid_until"),
    status: prescriptionStatusEnum("status").notNull().default("UNVERIFIED"),
    verificationNote: text("verification_note"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prescriptions_member_idx").on(t.memberId)],
);

export const prescriptionEvents = pgTable(
  "prescription_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    type: verificationEventTypeEnum("type").notNull(),
    note: text("note").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prescription_events_prescription_idx").on(t.prescriptionId)],
);

/* ───────────────────────── Medications ───────────────────────── */

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    strength: text("strength").notNull(),
    dosageForm: text("dosage_form").notNull(),
    prescribedDose: text("prescribed_dose").notNull(),
    route: text("route").notNull(),
    frequency: text("frequency").notNull(),
    scheduledTimes: jsonb("scheduled_times").$type<string[]>().notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    prescriber: text("prescriber").notNull(),
    instructions: text("instructions"),
    foodInstructions: text("food_instructions"),
    refillNote: text("refill_note"),
    active: boolean("active").notNull().default(true),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medications_member_idx").on(t.memberId)],
);

export const medicationDoses = pgTable(
  "medication_doses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    scheduledDate: date("scheduled_date").notNull(),
    scheduledTime: text("scheduled_time").notNull(),
    timezone: text("timezone").notNull(),
    status: doseStatusEnum("status").notNull().default("PENDING"),
    actedAt: timestamp("acted_at", { withTimezone: true }),
    actedById: uuid("acted_by_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("medication_dose_unique").on(t.medicationId, t.scheduledAt),
    index("medication_doses_day_idx").on(t.memberId, t.scheduledDate),
  ],
);

/* ───────────────────────── AI ───────────────────────── */

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => familyMembers.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    includeHealthContext: boolean("include_health_context").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_conversations_user_idx").on(t.userId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    safetyLevel: text("safety_level").notNull().default("STANDARD"),
    feedback: text("feedback"),
    provider: text("provider"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId)],
);

/* ───────────────────────── Consultations ───────────────────────── */

export const doctorProfiles = pgTable(
  "doctor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerClinicianId: text("provider_clinician_id").notNull(),
    displayName: text("display_name").notNull(),
    specialties: jsonb("specialties").$type<string[]>().notNull(),
    languages: jsonb("languages").$type<string[]>().notNull(),
    credentials: text("credentials"),
    credentialVerifiedAt: timestamp("credential_verified_at", { withTimezone: true }),
    availabilitySummary: text("availability_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("doctor_provider_ref_unique").on(t.provider, t.providerClinicianId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAppointmentId: text("provider_appointment_id"),
    doctorProfileId: uuid("doctor_profile_id").references(() => doctorProfiles.id, {
      onDelete: "set null",
    }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    kind: text("kind").notNull().default("VIDEO"),
    status: consultationStatusEnum("status").notNull().default("REQUESTED"),
    joinUrl: text("join_url"),
    notes: text("notes"),
    followUp: text("follow_up"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointments_member_idx").on(t.memberId)],
);

/* ───────────────────────── Women's health ───────────────────────── */

export const cycleEntries = pgTable(
  "cycle_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    flow: cycleFlowEnum("flow"),
    symptoms: jsonb("symptoms").$type<string[]>().notNull().default([]),
    mood: text("mood"),
    energy: text("energy"),
    notesEncrypted: text("notes_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cycle_entries_member_idx").on(t.memberId),
    index("cycle_entries_start_idx").on(t.startDate),
  ],
);

export const womenHealthPreferences = pgTable(
  "women_health_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    predictionsEnabled: boolean("predictions_enabled").notNull().default(true),
    remindersEnabled: boolean("reminders_enabled").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/* ───────────────────────── Nutrition ───────────────────────── */

export const nutritionPreferences = pgTable(
  "nutrition_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    dietaryPattern: text("dietary_pattern").notNull().default("vegetarian"),
    goals: jsonb("goals").$type<string[]>().notNull().default([]),
    allergies: jsonb("allergies").$type<string[]>().notNull().default([]),
    dislikes: jsonb("dislikes").$type<string[]>().notNull().default([]),
    cuisines: jsonb("cuisines").$type<string[]>().notNull().default([]),
    clinicianDietNotes: text("clinician_diet_notes"),
    waterGoalMl: integer("water_goal_ml").notNull().default(2000),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("nutrition_preferences_member_unique").on(t.memberId)],
);

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    generatedFromPreferences: jsonb("generated_from_preferences")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_plans_member_idx").on(t.memberId)],
);

export const mealPlanItems = pgTable(
  "meal_plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    mealType: text("meal_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_plan_items_plan_idx").on(t.planId)],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    loggedOn: date("logged_on").notNull(),
    mealType: text("meal_type").notNull(),
    description: text("description").notNull(),
    waterMl: integer("water_ml").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_logs_member_day_idx").on(t.memberId, t.loggedOn)],
);

/* ───────────────────────── Emergency ───────────────────────── */

export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    isPrimary: boolean("is_primary").notNull().default(false),
    consentToContact: boolean("consent_to_contact").notNull().default(true),
    consentToShareHealth: boolean("consent_to_share_health").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("emergency_contacts_member_idx").on(t.memberId)],
);

export const sosAlerts = pgTable(
  "sos_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    status: alertStatusEnum("status").notNull().default("SENDING"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    locationAccuracyM: integer("location_accuracy_m"),
    message: text("message"),
    shareHealthSummary: boolean("share_health_summary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("sos_alerts_user_idx").on(t.userId)],
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id")
      .notNull()
      .references(() => sosAlerts.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => emergencyContacts.id, {
      onDelete: "set null",
    }),
    channel: deliveryChannelEnum("channel").notNull(),
    status: deliveryStatusEnum("status").notNull().default("PENDING"),
    providerReference: text("provider_reference"),
    errorMessage: text("error_message"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alert_deliveries_alert_idx").on(t.alertId)],
);

export const ambulanceRequests = pgTable(
  "ambulance_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertId: uuid("alert_id").references(() => sosAlerts.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("unconfigured"),
    status: text("status").notNull().default("UNAVAILABLE"),
    providerRequestId: text("provider_request_id"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ambulance_requests_user_idx").on(t.userId)],
);

/* ───────────────────────── Pharmacy / orders ───────────────────────── */

export const medicineOrders = pgTable(
  "medicine_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    status: orderStatusEnum("status").notNull().default("AWAITING_PROVIDER"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    deliveryEstimate: text("delivery_estimate"),
    deliveryAddressEncrypted: text("delivery_address_encrypted"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medicine_orders_user_idx").on(t.userId)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => medicineOrders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  strength: text("strength").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  providerProductId: text("provider_product_id"),
});

/* ───────────────────────── Notifications & ops ───────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => familyMembers.id, { onDelete: "cascade" }),
    category: notificationCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("notifications_dedupe_unique").on(t.userId, t.dedupeKey),
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    smsEnabled: boolean("sms_enabled").notNull().default(false),
    quietHoursStart: text("quiet_hours_start"),
    quietHoursEnd: text("quiet_hours_end"),
    categories: jsonb("categories").$type<Record<string, boolean>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("background_jobs_dedupe_unique").on(t.dedupeKey),
    index("background_jobs_run_idx").on(t.status, t.runAt),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: webhookStatusEnum("status").notNull().default("RECEIVED"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("webhook_provider_event_unique").on(t.provider, t.eventId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    memberId: uuid("member_id").references(() => familyMembers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_actor_idx").on(t.actorUserId), index("audit_created_idx").on(t.createdAt)],
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: integrationTypeEnum("type").notNull(),
    status: text("status").notNull(),
    summary: text("summary").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("integration_events_created_idx").on(t.createdAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: contactMessageStatusEnum("status").notNull().default("NEW"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountDeletionRecords = pgTable(
  "account_deletion_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailHash: text("email_hash").notNull(),
    requestedByUserId: uuid("requested_by_user_id").notNull(),
    reason: text("reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_deletion_records_deleted_idx").on(t.deletedAt)],
);
