import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "Email address is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter a name with at least 2 characters.")
  .max(100, "Name must be 100 characters or fewer.");

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a complete phone number.")
  .max(24, "Phone number is too long.")
  .regex(/^\+?[0-9()\-\s]{7,24}$/, "Use digits, spaces, parentheses, or a leading +.");

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), "Choose a valid date.");

export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time.");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", {
      error: "You must agree to the Terms and Privacy Policy.",
    }),
    acceptHealthProcessing: z.literal("on", {
      error: "Health data processing consent is required to create a health record account.",
    }),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "The reset link is invalid."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const familyMemberSchema = z.object({
  name: nameSchema,
  relationship: z
    .string()
    .trim()
    .min(2, "Describe the relationship.")
    .max(40, "Relationship must be 40 characters or fewer."),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Choose a valid date of birth.",
    )
    .refine((value) => !value || new Date(`${value}T00:00:00`) <= new Date(), "Date of birth cannot be in the future."),
  sex: z
    .enum(["", "female", "male", "intersex", "not_specified"])
    .optional()
    .transform((value) => (value ? value : undefined)),
  preferredLanguage: z.string().trim().min(1).max(60).default("English"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address."),
  bloodGroup: z.string().trim().max(10).optional(),
});

export const medicalHistorySchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  category: z.enum([
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
  ]),
  title: z.string().trim().min(2, "Add a title.").max(160, "Keep the title under 160 characters."),
  details: z.string().trim().max(4000, "Keep details under 4,000 characters.").optional(),
  status: z.string().trim().max(80).optional(),
  severity: z.enum(["", "mild", "moderate", "severe", "unknown"]).optional(),
  recordedAt: isoDateSchema,
  source: z.enum(["PATIENT", "CAREGIVER", "CLINICIAN", "IMPORT"]).default("PATIENT"),
  clinicianName: z.string().trim().max(120).optional(),
});

export const reportSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  title: z
    .string()
    .trim()
    .min(2, "Add a report title.")
    .max(160, "Keep the title under 160 characters."),
  category: z.enum(["lab", "imaging", "discharge", "consultation", "other"]),
  reportDate: isoDateSchema,
});

export const reportFindingSchema = z.object({
  reportId: z.string().uuid(),
  memberId: z.string().uuid(),
  name: z.string().trim().min(1, "Add the test or finding name.").max(200),
  value: z.string().trim().min(1, "Add the reported value.").max(200),
  unit: z.string().trim().max(60).optional(),
  referenceRange: z.string().trim().max(160).optional(),
  flag: z.enum(["NORMAL", "HIGH", "LOW", "ABNORMAL", "UNKNOWN"]).default("UNKNOWN"),
  explanation: z.string().trim().max(1200).optional(),
});

export const prescriptionSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  prescriberName: z.string().trim().min(2, "Add the prescribing clinician's name.").max(120),
  clinicName: z.string().trim().max(160).optional(),
  issuedAt: isoDateSchema,
  validUntil: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export const medicationSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  prescriptionId: z.string().uuid("Choose the prescription this schedule follows."),
  name: z.string().trim().min(2, "Enter the medicine name.").max(120),
  strength: z.string().trim().min(1, "Enter the strength, e.g. 500 mg.").max(60),
  dosageForm: z.string().trim().min(1, "Enter the form, e.g. tablet.").max(60),
  prescribedDose: z.string().trim().min(1, "Enter the prescribed dose.").max(80),
  route: z.string().trim().min(1, "Enter the route, e.g. oral.").max(60),
  frequency: z.string().trim().min(1, "Enter the frequency.").max(80),
  times: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .refine((times) => times.length > 0, "Add at least one scheduled time.")
    .refine((times) => times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)), "Use comma-separated 24-hour times, e.g. 08:00, 20:00."),
  startDate: isoDateSchema,
  endDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  prescriber: z.string().trim().min(2, "Enter the prescriber.").max(120),
  instructions: z.string().trim().max(1000).optional(),
  foodInstructions: z.string().trim().max(300).optional(),
  refillNote: z.string().trim().max(300).optional(),
});

export const cycleEntrySchema = z.object({
  startDate: isoDateSchema,
  endDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Choose a valid end date."),
  flow: z.enum(["SPOTTING", "LIGHT", "MEDIUM", "HEAVY"]).optional(),
  symptoms: z.array(z.string().trim().max(60)).max(20).default([]),
  mood: z.string().trim().max(60).optional(),
  energy: z.enum(["", "low", "medium", "high"]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const emergencyContactSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  name: z.string().trim().min(2, "Enter the contact's name.").max(100),
  relationship: z.string().trim().min(2, "Enter their relationship.").max(60),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address."),
  isPrimary: z.boolean().default(false),
  consentToContact: z.literal("on", { error: "The contact must agree to be contacted." }),
  consentToShareHealth: z.boolean().default(false),
});

export const mealLogSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  loggedOn: isoDateSchema,
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().trim().min(2, "Describe what you ate.").max(500),
  waterMl: z.coerce.number().int().min(0).max(10000).default(0),
  notes: z.string().trim().max(500).optional(),
});

export const nutritionPreferencesSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  dietaryPattern: z.enum(["vegetarian", "vegan", "eggetarian", "non_vegetarian", "pescatarian"]),
  goals: z.array(z.string().max(80)).max(8).default([]),
  allergies: z.string().trim().max(500).optional(),
  dislikes: z.string().trim().max(500).optional(),
  cuisines: z.array(z.string().max(60)).max(8).default([]),
  clinicianDietNotes: z.string().trim().max(1000).optional(),
  waterGoalMl: z.coerce.number().int().min(500).max(6000).default(2000),
});

export const caregiverInviteSchema = z.object({
  memberId: z.string().uuid("Choose a family member."),
  email: emailSchema,
});

export const profileSchema = z.object({
  name: nameSchema,
  timezone: z.string().trim().min(1, "Choose a time zone.").max(60),
  locale: z.enum(["en-IN", "en-US", "en-GB"]).default("en-IN"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export function checkDateOrder(start: string, end?: string | null) {
  if (!end) return true;
  return new Date(`${start}T00:00:00`) <= new Date(`${end}T00:00:00`);
}

export function linesToArray(value: FormDataEntryValue | null, max = 8) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, max);
}
