import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  Apple,
  Clock,
  PhoneCall,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  EmptyState,
  InlineNotice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { MemberFilter } from "@/components/app-controls";
import { getDb } from "@/db";
import {
  mealLogs,
  mealPlanItems,
  mealPlans,
  nutritionPreferences,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  permissionMessage,
  requireMemberAccess,
  getAccessibleMembers,
} from "@/lib/authorization";
import { hasActiveConsent } from "@/lib/consents";
import { aiConfigured, brand } from "@/lib/config";
import {
  saveNutritionPreferencesAction,
  logMealAction,
  deleteMealLogAction,
  generateMealPlanAction,
} from "@/app/actions/nutrition";
import { formatDate, todayInZone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nutrition care" };

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; saved?: string }>;
}) {
  const user = await requireUser("/app/nutrition");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member)
      ? params.member
      : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-000000000000"];
  const db = await getDb();

  const [preferences, logs, plans] = await Promise.all([
    db
      .select()
      .from(nutritionPreferences)
      .where(
        selectedMemberId
          ? eq(nutritionPreferences.memberId, selectedMemberId)
          : inArray(nutritionPreferences.memberId, scopeIds),
      )
      .limit(1),
    db
      .select()
      .from(mealLogs)
      .where(
        selectedMemberId
          ? eq(mealLogs.memberId, selectedMemberId)
          : inArray(mealLogs.memberId, scopeIds),
      )
      .orderBy(desc(mealLogs.loggedOn), desc(mealLogs.createdAt))
      .limit(60),
    db
      .select()
      .from(mealPlans)
      .where(
        selectedMemberId
          ? eq(mealPlans.memberId, selectedMemberId)
          : inArray(mealPlans.memberId, scopeIds),
      )
      .orderBy(desc(mealPlans.createdAt))
      .limit(20),
  ]);

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row.member]));
  const managed = accessible.filter((row) => row.access.canManage);
  const defaultMemberId = selectedMemberId && managed.some((row) => row.member.id === selectedMemberId)
    ? selectedMemberId
    : managed[0]?.member.id ?? "";

  const today = todayInZone(user.timezone);
  const planById = new Map(plans.map((p) => [p.id, p]));
  const planItems = await db
    .select()
    .from(mealPlanItems)
    .where(
      inArray(
        mealPlanItems.planId,
        plans.map((p) => p.id),
      ),
    )
    .orderBy(mealPlanItems.dayIndex, mealPlanItems.mealType);

  const itemsByPlan = new Map<string, typeof planItems>();
  for (const item of planItems) {
    const list = itemsByPlan.get(item.planId) ?? [];
    list.push(item);
    itemsByPlan.set(item.planId, list);
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Breadcrumbs items={[
            { label: "Care", href: "/app" },
            { label: "Nutrition" },
          ]} />
        }
        title="Diet & nutrition care"
        description={
          "Set dietary preferences, log meals and water, and generate a 7-day meal plan. " +
          "Plans are general inspiration, not clinical nutrition advice."
        }
        action={
          <>
            <Link className="btn btn-secondary" href="/app/settings/privacy">
              <ShieldCheck size={15} aria-hidden="true" /> Privacy
            </Link>
            <a
              className="btn btn-danger-outline"
              href={`tel:${brand.emergencyNumber}`}
              aria-label={`Call emergency number ${brand.emergencyNumber}`}
            >
              <PhoneCall size={15} aria-hidden="true" /> Emergency
            </a>
          </>
        }
      />

      {!preferences?.[0] ? (
        <DisclosurePanel
          summary="Set your nutrition preferences"
          description="Tell us your dietary pattern, goals, allergies, and preferred cuisines so meal plans suit your household."
          defaultOpen
        >
          {managed.length > 0 ? (
            <ActionForm action={saveNutritionPreferencesAction} submitLabel="Save preferences">
              <FormField label="Family member" name="memberId">
                <select
                  className="select"
                  id="field-memberId"
                  name="memberId"
                  defaultValue={defaultMemberId}
                  required
                >
                  {managed.map((row) => (
                    <option key={row.member.id} value={row.member.id}>
                      {row.member.name}
                      {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Dietary pattern" name="dietaryPattern">
                <select className="select" id="field-dietaryPattern" name="dietaryPattern" defaultValue="vegetarian">
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="non_vegetarian">Non-vegetarian</option>
                  <option value="pescatarian">Pescatarian</option>
                </select>
              </FormField>
              <FormField label="Goals" name="goals" optional hint="Comma-separated, e.g. balanced meals, more protein, hydration">
                <input
                  className="input"
                  id="field-goals"
                  name="goals"
                  placeholder="balanced meals, more vegetables"
                  maxLength={200}
                />
              </FormField>
              <FormField label="Allergies" name="allergies" optional hint="Comma-separated ingredients to avoid">
                <input
                  className="input"
                  id="field-allergies"
                  name="allergies"
                  placeholder="peanuts, shellfish, dairy"
                  maxLength={500}
                />
              </FormField>
              <FormField label="Dislikes" name="dislikes" optional hint="Comma-separated foods to avoid">
                <input
                  className="input"
                  id="field-dislikes"
                  name="dislikes"
                  placeholder="coriander, olives"
                  maxLength={500}
                />
              </FormField>
              <FormField label="Preferred cuisines" name="cuisines" optional hint="Comma-separated, e.g. South Indian, North Indian, Continental">
                <input
                  className="input"
                  id="field-cuisines"
                  name="cuisines"
                  placeholder="South Indian, North Indian"
                  maxLength={200}
                />
              </FormField>
              <FormField label="Clinician diet notes" name="clinicianDietNotes" optional hint="Any instructions from a clinician or dietitian">
                <textarea
                  className="textarea"
                  id="field-clinicianDietNotes"
                  name="clinicianDietNotes"
                  rows={2}
                  maxLength={1000}
                />
              </FormField>
              <FormField label="Daily water goal (ml)" name="waterGoalMl" optional>
                <input
                  className="input"
                  id="field-waterGoalMl"
                  name="waterGoalMl"
                  type="number"
                  min="500"
                  max="6000"
                  defaultValue={2000}
                />
              </FormField>
              <p className="text-[0.68rem] leading-4 text-muted">
                Meal plans use your preferences and a configured AI provider. Without a provider, you
                can still log meals and track water manually.
              </p>
            </ActionForm>
          ) : (
            <InlineNotice tone="info" title="Manage permission required">
              You need manage permission for a family member to set nutrition preferences. Add a family
              member first, or ask the account owner to grant you access.
            </InlineNotice>
          )}
        </DisclosurePanel>
      ) : null}

      {preferences?.[0] && (
        <>
          <TwoColumn>
            <Stack>
              <Panel>
                <PanelBody>
                  <SectionHeading title="Today's nutrition" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="panel p-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                        Water goal
                      </p>
                      <p className="text-lg font-semibold text-ink">
                        {preferences[0].waterGoalMl} ml
                      </p>
                    </div>
                    <div className="panel p-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-muted">
                        Dietary pattern
                      </p>
                      <p className="text-lg font-semibold text-ink">
                        {titleCase(preferences[0].dietaryPattern)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[0.72rem] leading-5 text-muted">
                    Log meals and water throughout the day. Entries are private to the selected family
                    member.
                  </p>
                  <ActionForm action={logMealAction} submitLabel="Log meal">
                    <FormField label="Family member" name="memberId">
                      <select
                        className="select"
                        id="field-nutrition-memberId"
                        name="memberId"
                        defaultValue={defaultMemberId}
                        required
                      >
                        {managed.map((row) => (
                          <option key={row.member.id} value={row.member.id}>
                            {row.member.name}
                            {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Date" name="loggedOn">
                      <input
                        className="input"
                        id="field-loggedOn"
                        name="loggedOn"
                        type="date"
                        defaultValue={today}
                        max={today}
                        required
                      />
                    </FormField>
                    <FormField label="Meal type" name="mealType">
                      <select className="select" id="field-mealType" name="mealType" defaultValue="breakfast">
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </select>
                    </FormField>
                    <FormField label="What did you eat?" name="description">
                      <input
                        className="input"
                        id="field-description"
                        name="description"
                        placeholder="e.g. two idlis with sambar, a glass of water"
                        maxLength={500}
                        required
                      />
                    </FormField>
                    <FormField label="Water (ml)" name="waterMl" optional>
                      <input
                        className="input"
                        id="field-waterMl"
                        name="waterMl"
                        type="number"
                        min="0"
                        max="10000"
                        defaultValue={0}
                      />
                    </FormField>
                    <FormField label="Notes" name="notes" optional>
                      <input
                        className="input"
                        id="field-nutrition-notes"
                        name="notes"
                        placeholder="How you felt after eating"
                        maxLength={500}
                      />
                    </FormField>
                  </ActionForm>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelBody>
                  <SectionHeading title="Recent meal logs" />
                  {logs.length === 0 ? (
                    <EmptyState
                      icon={Apple}
                      title="No meals logged yet"
                      description="Log your first meal to start tracking nutrition and water intake."
                      compact
                    />
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 20).map((log) => {
                        const loggedOnStr = String(log.loggedOn).slice(0, 10);
                        return (
                          <Link
                            key={log.id}
                            href="#"
                            className="flex items-start gap-2.5 rounded-md border border-line p-2.5 hover:border-aqua-300 hover:bg-aqua-50/30"
                          >
                            <div className="mt-1 flex-shrink-0">
                              <Apple size={13} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.78rem] font-medium text-ink truncate">
                                {memberById.get(log.memberId)?.name ?? "Family member"}
                              </p>
                              <p className="mt-0.5 text-[0.68rem] text-muted">
                                {log.mealType} · {formatDate(loggedOnStr)}{" · "}
                                {log.waterMl > 0 ? `${log.waterMl} ml water` : "No water logged"}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                      {logs.length > 20 && (
                        <p className="mt-2 text-[0.68rem] text-muted">
                          Showing the most recent 20 entries.
                        </p>
                      )}
                    </div>
                  )}
                </PanelBody>
              </Panel>
            </Stack>

            <Stack>
              <Panel>
                <PanelBody>
                  <SectionHeading title="Meal plans" />
                  {plans.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="No meal plans yet"
                      description="Set nutrition preferences, then generate a 7-day meal plan."
                      compact
                      action={
                        aiConfigured() ? (
                          <Link className="btn btn-secondary btn-sm" href="#generate">
                            Generate a meal plan
                          </Link>
                        ) : (
                          <span className="badge badge-neutral">Not configured</span>
                        )
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {plans.slice(0, 10).map((plan) => {
                        const items = itemsByPlan.get(plan.id) ?? [];
                        const days = new Set(items.map((i) => i.dayIndex)).size;
                        const startDateStr = String(plan.startDate).slice(0, 10);
                        const endDateStr = String(plan.endDate).slice(0, 10);
                        return (
                          <Link
                            key={plan.id}
                            href="#"
                            className="rounded-md border border-line p-3 hover:border-aqua-300"
                          >
                            <p className="text-[0.8rem] font-semibold text-ink">{plan.title}</p>
                            <p className="mt-0.5 text-[0.68rem] text-muted">
                              {formatDate(startDateStr)} to {formatDate(endDateStr)} · {days} days
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </PanelBody>
              </Panel>

              <DisclosurePanel
                summary="Generate a 7-day meal plan"
                description={
                  "A plan is generated from your saved preferences using an AI provider. It is general " +
                  "inspiration, not clinical nutrition advice. Always check ingredient labels for allergens."
                }
                defaultOpen={false}
              >
                {aiConfigured() && managed.length > 0 ? (
                  <ActionForm action={generateMealPlanAction} submitLabel="Generate meal plan">
                    <FormField label="Family member" name="memberId">
                      <select
                        className="select"
                        id="field-plan-memberId"
                        name="memberId"
                        defaultValue={defaultMemberId}
                        required
                      >
                        {managed.map((row) => (
                          <option key={row.member.id} value={row.member.id}>
                            {row.member.name}
                            {row.member.isSelf ? " (you)" : ` · ${row.member.relationship}`}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <p className="text-[0.68rem] leading-4 text-muted">
                      The plan covers 7 days of breakfast, lunch, dinner, and snack, with a shopping
                      list of ingredients per day.
                    </p>
                  </ActionForm>
                ) : !aiConfigured() ? (
                  <InlineNotice tone="warning" title="AI provider not configured">
                    Meal plan generation requires a configured AI provider. Set AI_PROVIDER=nvidia and
                    NVIDIA_NIM_API_KEY on the server.
                  </InlineNotice>
                ) : (
                  <InlineNotice tone="info" title="Manage permission required">
                    You need manage permission for a family member to generate a meal plan.
                  </InlineNotice>
                )}
              </DisclosurePanel>
            </Stack>
          </TwoColumn>

          <Panel>
            <PanelBody>
              <SectionHeading title="Delete a meal log" />
              <p className="mb-3 text-[0.78rem] leading-5 text-[#6b3b42]">
                Deleting a meal log cannot be undone. Only entries you created can be deleted.
              </p>
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.slice(0, 10).map((log) => {
                    const loggedOnStr = String(log.loggedOn).slice(0, 10);
                    return (
                      <ActionForm
                        key={log.id}
                        action={deleteMealLogAction}
                        submitLabel="Delete"
                        submitClassName="btn btn-danger-outline btn-sm"
                        hideSubmit
                        footer={
                          <button
                            type="submit"
                            className="btn btn-danger-outline btn-sm"
                            aria-label="Delete meal log"
                          >
                            <Trash2 size={12} aria-hidden="true" />
                          </button>
                        }
                      >
                        <input type="hidden" name="logId" value={log.id} />
                        <input type="hidden" name="memberId" value={log.memberId} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.74rem] font-medium text-ink truncate">
                            {log.description}
                          </p>
                          <p className="mt-0.5 text-[0.64rem] text-muted">
                            {memberById.get(log.memberId)?.name} · {formatDate(loggedOnStr)}
                          </p>
                        </div>
                      </ActionForm>
                    );
                  })}
                </div>
              ) : null}
            </PanelBody>
          </Panel>
        </>
      )}
    </div>
  );
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
