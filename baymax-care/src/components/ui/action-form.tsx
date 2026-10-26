"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialActionState, type ActionState } from "@/lib/action-state";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(initialActionState);

export function useFormActionState() {
  return useContext(FormStateContext);
}

export function ActionForm({
  action,
  children,
  submitLabel,
  submitClassName,
  className,
  secondarySubmit,
  resetOnSuccess = true,
  footer,
  hideSubmit = false,
}: {
  action: ServerAction;
  children: ReactNode;
  submitLabel: string;
  submitClassName?: string;
  className?: string;
  secondarySubmit?: ReactNode;
  resetOnSuccess?: boolean;
  footer?: ReactNode;
  hideSubmit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" && resetOnSuccess) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  const errors = state.fieldErrors
    ? Object.entries(state.fieldErrors).filter(([, value]) => value.length > 0)
    : [];

  return (
    <FormStateContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={cn("form-grid", className)}>
        {state.status === "error" && state.message ? (
          <div className="notice notice-danger" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <div>
              <p className="font-medium">{state.message}</p>
              {errors.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {errors.map(([field, messages]) => (
                    <li key={field}>
                      <a className="underline underline-offset-2" href={`#field-${field}`}>
                        {messages[0]}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        {state.status === "success" && state.message ? (
          <div className="notice notice-success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>
              {state.message}
              {state.data?.link && (
                <>
                  {" "}
                  <a className="font-semibold underline underline-offset-2" href={state.data.link}>
                    {state.data.linkLabel ?? "Continue"}
                  </a>
                </>
              )}
            </span>
          </div>
        ) : null}
        {children}
        {!hideSubmit && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className={cn("btn btn-primary", submitClassName)}
              disabled={pending}
              aria-busy={pending}
            >
              {pending && <span className="btn-spinner" aria-hidden="true" />}
              <span className="btn-label">{pending ? "Working…" : submitLabel}</span>
            </button>
            {secondarySubmit}
          </div>
        )}
        {footer}
      </form>
    </FormStateContext.Provider>
  );
}

export function FormFieldError({ name }: { name: string }) {
  const state = useFormActionState();
  const message = state.fieldErrors?.[name]?.[0];
  if (!message) return null;
  return (
    <p className="field-error" id={`error-${name}`} role="alert">
      {message}
    </p>
  );
}

export function FormField({
  label,
  name,
  hint,
  optional = false,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const state = useFormActionState();
  const invalid = Boolean(state.fieldErrors?.[name]?.length);
  return (
    <div className={cn("field", className)}>
      <label className="label" htmlFor={`field-${name}`}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <div data-invalid={invalid || undefined}>{children}</div>
      {hint && <p className="hint">{hint}</p>}
      <FormFieldError name={name} />
    </div>
  );
}
