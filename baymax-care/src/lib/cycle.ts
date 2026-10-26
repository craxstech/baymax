import { DateTime } from "luxon";

export type CyclePrediction = {
  averageCycleDays: number;
  cyclesUsed: number;
  lastStart: string;
  nextStart: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  cycleDay: number;
  confidence: "low" | "moderate";
  explanation: string;
};

/**
 * A simple calendar average, not a medical device or a contraceptive method.
 * It is intentionally conservative and exposes its uncertainty.
 */
export function predictCycle(
  starts: string[],
  today = DateTime.now().toISODate() ?? "",
): CyclePrediction | null {
  const valid = starts
    .map((value) => DateTime.fromISO(value))
    .filter((date) => date.isValid)
    .sort((a, b) => b.toMillis() - a.toMillis());
  if (valid.length === 0) return null;

  const gaps: number[] = [];
  for (let index = 0; index < Math.min(valid.length - 1, 6); index += 1) {
    const gap = Math.round(valid[index].diff(valid[index + 1], "days").days);
    if (gap >= 15 && gap <= 60) gaps.push(gap);
  }

  const averageCycleDays =
    gaps.length > 0 ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : 28;
  const lastStart = valid[0];
  const todayDate = DateTime.fromISO(today);

  let next = lastStart.plus({ days: averageCycleDays });
  let guard = 0;
  while (next < todayDate && guard < 24) {
    next = next.plus({ days: averageCycleDays });
    guard += 1;
  }

  const cycleDay = Math.max(1, Math.round(todayDate.diff(lastStart, "days").days) + 1);
  const fertileStart = next.minus({ days: 16 });
  const fertileEnd = next.minus({ days: 11 });

  return {
    averageCycleDays,
    cyclesUsed: gaps.length,
    lastStart: lastStart.toISODate() ?? "",
    nextStart: next.toISODate() ?? "",
    fertileWindowStart: fertileStart.toISODate() ?? "",
    fertileWindowEnd: fertileEnd.toISODate() ?? "",
    cycleDay,
    confidence: gaps.length >= 3 ? "moderate" : "low",
    explanation:
      gaps.length >= 3
        ? `Based on the average of your last ${gaps.length} recorded cycle gaps. Bodies vary; this is not a diagnosis or contraception.`
        : "Based on limited history. Add more cycle starts for a more useful average. This is not a diagnosis or contraception.",
  };
}
