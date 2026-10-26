"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DateTime } from "luxon";
import { getDb } from "@/db";
import {
  mealLogs,
  mealPlanItems,
  mealPlans,
  nutritionPreferences,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, zodFieldErrors, type ActionState } from "@/lib/action-state";
import { linesToArray, mealLogSchema, nutritionPreferencesSchema } from "@/lib/validation";
import { hasActiveConsent } from "@/lib/consents";
import { aiConfigured } from "@/lib/config";
import { chatWithAi } from "@/lib/ai";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function saveNutritionPreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/nutrition");
  const memberId = String(formData.get("memberId") ?? "");
  const parsed = nutritionPreferencesSchema.safeParse({
    memberId,
    dietaryPattern: formData.get("dietaryPattern"),
    goals: formData.getAll("goals").map(String),
    allergies: formData.get("allergies")?.toString() || undefined,
    dislikes: formData.get("dislikes")?.toString() || undefined,
    cuisines: linesToArray(formData.get("cuisines"), 8),
    clinicianDietNotes: formData.get("clinicianDietNotes")?.toString() || undefined,
    waterGoalMl: formData.get("waterGoalMl") || 2000,
  });
  if (!parsed.success) {
    return errorState("Check the nutrition preferences.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const values = {
    memberId,
    dietaryPattern: parsed.data.dietaryPattern,
    goals: parsed.data.goals,
    allergies: parsed.data.allergies
      ? linesToArray(parsed.data.allergies, 20)
      : [],
    dislikes: parsed.data.dislikes ? linesToArray(parsed.data.dislikes, 20) : [],
    cuisines: parsed.data.cuisines,
    clinicianDietNotes: parsed.data.clinicianDietNotes || null,
    waterGoalMl: parsed.data.waterGoalMl,
    updatedAt: new Date(),
  };

  await db
    .insert(nutritionPreferences)
    .values(values)
    .onConflictDoUpdate({
      target: nutritionPreferences.memberId,
      set: {
        dietaryPattern: values.dietaryPattern,
        goals: values.goals,
        allergies: values.allergies,
        dislikes: values.dislikes,
        cuisines: values.cuisines,
        clinicianDietNotes: values.clinicianDietNotes,
        waterGoalMl: values.waterGoalMl,
        updatedAt: values.updatedAt,
      },
    });

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "nutrition.preferences_saved",
    entityType: "nutrition_preferences",
    entityId: memberId,
    metadata: { dietaryPattern: values.dietaryPattern },
  });

  revalidatePath("/app/nutrition");
  return successState("Nutrition preferences saved.");
}

export async function logMealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/nutrition");
  const parsed = mealLogSchema.safeParse({
    memberId: formData.get("memberId"),
    loggedOn: formData.get("loggedOn"),
    mealType: formData.get("mealType"),
    description: formData.get("description"),
    waterMl: formData.get("waterMl") || 0,
    notes: formData.get("notes")?.toString() || undefined,
  });
  if (!parsed.success) {
    return errorState("Check the meal entry.", zodFieldErrors(parsed.error));
  }

  try {
    await requireMemberAccess(user.id, parsed.data.memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  await db.insert(mealLogs).values({
    memberId: parsed.data.memberId,
    userId: user.id,
    loggedOn: parsed.data.loggedOn,
    mealType: parsed.data.mealType,
    description: parsed.data.description,
    waterMl: parsed.data.waterMl,
    notes: parsed.data.notes || null,
  });

  await recordAudit({
    actorUserId: user.id,
    memberId: parsed.data.memberId,
    action: "nutrition.meal_logged",
    entityType: "meal_log",
    metadata: { mealType: parsed.data.mealType },
  });

  revalidatePath("/app/nutrition");
  return successState("Meal logged.");
}

export async function deleteMealLogAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/nutrition");
  const logId = String(formData.get("logId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const db = await getDb();
  const result = await db
    .delete(mealLogs)
    .where(
      and(
        eq(mealLogs.id, logId),
        eq(mealLogs.memberId, memberId),
        eq(mealLogs.userId, user.id),
      ),
    )
    .returning({ id: mealLogs.id });
  if (result.length === 0) return errorState("That meal entry could not be found.");

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "nutrition.meal_deleted",
    entityType: "meal_log",
    entityId: logId,
    metadata: {},
  });

  revalidatePath("/app/nutrition");
  return successState("Meal entry deleted.");
}

const mealPlanSchema = z.object({
  title: z.string().trim().min(1).max(160),
  days: z
    .array(
      z.object({
        meals: z.object({
          breakfast: z.string().trim().min(1).max(600),
          lunch: z.string().trim().min(1).max(600),
          dinner: z.string().trim().min(1).max(600),
          snack: z.string().trim().min(1).max(600),
        }),
        ingredients: z.array(z.string().trim().max(80)).max(30).default([]),
      }),
    )
    .length(7),
  limitations: z.string().trim().max(2000).default(""),
});

export async function generateMealPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/app/nutrition");
  const memberId = String(formData.get("memberId") ?? "");

  try {
    await requireMemberAccess(user.id, memberId, "manage");
  } catch (error) {
    return errorState(permissionMessage(error));
  }
  if (!(await hasActiveConsent(user.id, "AI_PROCESSING"))) {
    return errorState(
      "AI processing consent is not active. Grant it in Settings → Privacy before generating a plan.",
    );
  }
  if (!aiConfigured()) {
    return errorState(
      "Meal-plan generation is unavailable because no AI provider is configured. Set AI_PROVIDER=nvidia and NVIDIA_NIM_API_KEY.",
    );
  }

  const limit = await checkRateLimit("meal-plan", user.id, 6, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [preferences] = await db
    .select()
    .from(nutritionPreferences)
    .where(eq(nutritionPreferences.memberId, memberId))
    .limit(1);
  if (!preferences) {
    return errorState("Save nutrition preferences before generating a meal plan.");
  }

  const prompt = `Create a 7-day Indian-home-friendly meal plan for one person using these preferences:
- Dietary pattern: ${preferences.dietaryPattern}
- Goals: ${preferences.goals.join(", ") || "not specified"}
- Allergies (must avoid): ${preferences.allergies.join(", ") || "none recorded"}
- Dislikes: ${preferences.dislikes.join(", ") || "none recorded"}
- Preferred cuisines: ${preferences.cuisines.join(", ") || "not specified"}
- Clinician diet notes: ${preferences.clinicianDietNotes || "none recorded"}

Safety rules:
- This is general meal inspiration, not clinical nutrition therapy.
- Strictly avoid listed allergens, but warn that ingredient labels must be checked by the user.
- Do not make medical claims or promise weight, glucose, or symptom outcomes.
- Keep meals realistic and varied.

Return ONLY valid JSON:
{"title":"...","days":[{"meals":{"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},"ingredients":["..."]}],"limitations":"..."}
Exactly 7 day objects. No markdown fences.`;

  const result = await chatWithAi({
    messages: [
      {
        role: "system",
        content:
          "You are a careful meal-planning assistant. You do not prescribe diets or give medical nutrition therapy. Return only the required JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    maxTokens: 2600,
  });

  if (result.status !== "ok") {
    await recordIntegrationEvent({
      type: "AI",
      status: result.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Meal plan generation did not complete.",
      detail: result.reason,
    });
    return errorState(result.reason);
  }

  const cleaned = result.content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    return errorState("The AI plan could not be read as structured data. Nothing was saved.");
  }
  const parsed = mealPlanSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return errorState("The AI plan did not match the expected format. Nothing was saved.");
  }

  const start = DateTime.now().startOf("day");
  const startDate = start.toISODate() ?? "";
  const endDate = start.plus({ days: 6 }).toISODate() ?? startDate;

  try {
    let planId = "";
    await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(mealPlans)
        .values({
          memberId,
          title: parsed.data.title.slice(0, 160),
          startDate,
          endDate,
          generatedFromPreferences: {
            dietaryPattern: preferences.dietaryPattern,
            goals: preferences.goals,
            allergies: preferences.allergies,
            cuisines: preferences.cuisines,
            model: result.model,
            provider: result.provider,
          },
        })
        .returning({ id: mealPlans.id });
      planId = plan.id;

      const items: Array<typeof mealPlanItems.$inferInsert> = [];
      parsed.data.days.forEach((day, index) => {
        for (const mealType of ["breakfast", "lunch", "dinner", "snack"] as const) {
          items.push({
            planId,
            dayIndex: index,
            mealType,
            title: day.meals[mealType].slice(0, 120),
            description: day.meals[mealType],
            ingredients: day.ingredients,
          });
        }
      });
      await tx.insert(mealPlanItems).values(items);
    });

    await recordAudit({
      actorUserId: user.id,
      memberId,
      action: "nutrition.meal_plan_generated",
      entityType: "meal_plan",
      entityId: planId,
      metadata: { days: 7, provider: result.provider },
    });
    await recordIntegrationEvent({
      type: "AI",
      status: "SUCCESS",
      summary: "AI meal plan generated.",
    });

    revalidatePath("/app/nutrition");
    return successState(
      `Meal plan saved. ${parsed.data.limitations} Always check ingredient labels for allergens; this plan is general inspiration, not clinical nutrition advice.`,
    );
  } catch (error) {
    logger.error("meal_plan_save_failed", error);
    return errorState("The meal plan could not be saved. Please try again.");
  }
}
