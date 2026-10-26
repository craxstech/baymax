export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };

export function errorState(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(message: string, data?: Record<string, string>): ActionState {
  return { status: "success", message, data };
}

export function zodFieldErrors(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] = [...(fields[key] ?? []), issue.message];
  }
  return fields;
}
