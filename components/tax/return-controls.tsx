"use client";

import { Check, Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { recordFiledAction, setSectionReviewedAction } from "@/app/actions/return";
import { Field, fieldError } from "@/components/shared/form";
import { RecordDialog } from "@/components/shared/record-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayInSriLanka } from "@/lib/format";
import { optionalText, pastOrTodayDate, taxYearCode } from "@/lib/validation/common";
import { useT } from "@/lib/i18n/client";

export function ReviewToggle({ taxYear, sectionKey, reviewed, label = "Mark as reviewed" }: { taxYear: string; sectionKey: string; reviewed: boolean; label?: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={reviewed ? "ghost" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setSectionReviewedAction({ taxYear, key: sectionKey, reviewed: !reviewed });
          if (!result.ok) toast.error(result.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : reviewed ? <Undo2 aria-hidden /> : <Check aria-hidden />}
      {reviewed ? t("Undo") : label}
    </Button>
  );
}

const filedSchema = z.object({ taxYear: taxYearCode, filedOn: pastOrTodayDate, acknowledgementNo: optionalText(80) });

export function RecordFiledForm({ taxYear }: { taxYear: string }) {
  const t = useT();
  const form = useForm<FieldValues>({ defaultValues: { filedOn: todayInSriLanka(), acknowledgementNo: "" } });
  const err = (name: string) => fieldError(form.formState.errors as Record<string, unknown>, name);
  return (
    <RecordDialog
      trigger={<Button variant="outline">{t("I have filed this return with IRD")}</Button>}
      title={t("Record that you filed")}
      description={t("Use this after you have submitted your return yourself through IRD e-Services. Ayakara does not submit returns; this only updates your own records.")}
      form={form}
      schema={filedSchema}
      prepare={(values) => ({ ...values, taxYear })}
      action={recordFiledAction}
      submitLabel={t("Save")}
    >
      <Field label={t("Date you filed")} error={err("filedOn")}>
        {(p) => <Input type="date" max={todayInSriLanka()} {...p} {...form.register("filedOn")} />}
      </Field>
      <Field label={t("IRD acknowledgement number")} error={err("acknowledgementNo")} optional>
        {(p) => <Input {...p} {...form.register("acknowledgementNo")} />}
      </Field>
    </RecordDialog>
  );
}
