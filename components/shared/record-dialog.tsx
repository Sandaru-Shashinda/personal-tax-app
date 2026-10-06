"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/errors";
import { toFieldErrors } from "@/lib/errors";
import { useT } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/translate";
import { applyActionResult, FormError, submitHandler } from "./form";

/**
 * Validates form values with the same Zod schema the server uses, puts any errors on the
 * fields, and returns the parsed data. The server validates again; this is only for fast feedback.
 */
export function parseForm<S extends z.ZodType>(form: UseFormReturn<FieldValues>, schema: S, values: unknown): z.output<S> | null {
  const parsed = schema.safeParse(values);
  if (parsed.success) return parsed.data;
  for (const [field, messages] of Object.entries(toFieldErrors(parsed.error))) {
    form.setError(field, { type: "validate", message: messages[0] });
  }
  form.setError("root", { type: "validate", message: msg("Please check the highlighted fields.") });
  return null;
}

interface RecordDialogProps<S extends z.ZodType> {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  form: UseFormReturn<FieldValues>;
  schema: S;
  /** Adds fixed values (tax year, record type) before validation. */
  prepare?: (values: FieldValues) => unknown;
  action: (data: z.output<S>) => Promise<ActionResult>;
  submitLabel: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** A dialog holding one create/edit form, with shared validation, pending and error handling. */
export function RecordDialog<S extends z.ZodType>({ trigger, title, description, form, schema, prepare, action, submitLabel, defaultOpen = false, children }: RecordDialogProps<S>) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const t = useT();
  const { isSubmitting, errors } = form.formState;
  const submit = submitHandler(form, async (values: FieldValues) => {
    const data = parseForm(form, schema, prepare ? prepare(values) : values);
    if (!data) return;
    if (applyActionResult(form, await action(data))) {
      setOpen(false);
      form.reset();
      router.refresh();
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Delete with an explicit confirmation step. */
export function DeleteButton({ label, description, action }: { label: string; description: string; action: () => Promise<ActionResult> }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <Trash2 aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("Keep it")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action();
                if (result.ok) {
                  toast.success(result.message ?? t("Deleted."));
                  setOpen(false);
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {t("Delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
