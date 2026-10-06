"use client";

import { useId } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Label, control, hint and error wired together for assistive technology. */
export function Field({
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode;
}) {
  const id = useId();
  const t = useT();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> {t("(optional)")}</span>}
      </Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  const t = useT();
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {t(message)}
    </p>
  );
}

/** Copies server-side validation errors onto the matching fields. Returns true when the action succeeded. */
export function applyActionResult<T extends FieldValues, R>(form: UseFormReturn<T, unknown, any>, result: ActionResult<R>, successMessage?: string): result is { ok: true; data: R; message?: string } { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (result.ok) {
    const message = result.message ?? successMessage;
    if (message) toast.success(message);
    return true;
  }
  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (field !== "_form") form.setError(field as Path<T>, { type: "server", message: messages[0] });
  }
  form.setError("root", { type: "server", message: result.error });
  return false;
}

/**
 * Submit handler that first clears errors left by an earlier attempt. react-hook-form refuses
 * to submit while any error is set, and errors we set ourselves (from the shared schema or the
 * server) on values that are not registered inputs would otherwise never clear.
 */
export function submitHandler<T extends FieldValues>(form: UseFormReturn<T, unknown, any>, onValid: (values: any) => unknown) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (event?: React.BaseSyntheticEvent) => {
    form.clearErrors();
    return form.handleSubmit(onValid)(event);
  };
}

/** First error message for a field, however it is nested. */
export function fieldError(errors: Record<string, unknown>, name: string): string | undefined {
  const entry = errors[name] as { message?: unknown } | undefined;
  return typeof entry?.message === "string" ? entry.message : undefined;
}

export { nativeSelectClass } from "./form-classes";
