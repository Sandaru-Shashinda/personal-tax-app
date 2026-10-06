"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { authenticateAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";
import { deadlineUpdateSchema, draftVersionSchema, newTaxYearSchema, sourceSchema } from "@/lib/admin-schemas";
import { uuid } from "@/lib/validation/common";
import * as admin from "@/services/admin/rule-admin-service";

// Tax rules are changed only here, and every action re-checks the ADMIN role on the server.

export async function createDraftVersionAction(input: unknown): Promise<ActionResult<{ versionId: string }>> {
  return run(async () => {
    const user = await authenticateAdmin();
    const versionId = await admin.createDraftVersion(user.id, draftVersionSchema.parse(input));
    revalidatePath("/admin", "layout");
    return { versionId };
  }, "We couldn't save the draft. Please try again.", "Draft version saved.");
}

export async function previewDraftVersionAction(versionId: unknown): Promise<ActionResult<Awaited<ReturnType<typeof admin.previewDraftVersion>>>> {
  return run(async () => {
    await authenticateAdmin();
    return admin.previewDraftVersion(uuid.parse(versionId));
  }, "We couldn't run the test scenarios. Please try again.");
}

export async function activateVersionAction(versionId: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticateAdmin();
      await admin.activateVersion(user.id, uuid.parse(versionId));
      revalidatePath("/", "layout");
    },
    "We couldn't activate this version. Please try again.",
    "Rule version activated.",
  );
}

export async function discardDraftAction(versionId: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticateAdmin();
      await admin.discardDraft(user.id, uuid.parse(versionId));
      revalidatePath("/admin", "layout");
    },
    "We couldn't discard this draft. Please try again.",
    "Draft discarded.",
  );
}

export async function createSourceAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticateAdmin();
      await admin.createSource(user.id, sourceSchema.parse(input));
      revalidatePath("/admin", "layout");
    },
    "We couldn't save this source. Please try again.",
    "Source added.",
  );
}

export async function createTaxYearAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticateAdmin();
      await admin.createTaxYear(user.id, newTaxYearSchema.parse(input).code);
      revalidatePath("/", "layout");
    },
    "We couldn't create the tax year. Please try again.",
    "Tax year created. Its rules are drafts until you verify and activate them.",
  );
}

export async function updateDeadlineAction(input: unknown): Promise<ActionResult> {
  return run(
    async () => {
      const user = await authenticateAdmin();
      await admin.updateDeadline(user.id, deadlineUpdateSchema.parse(input));
      revalidatePath("/", "layout");
    },
    "We couldn't update this deadline. Please try again.",
    "Deadline updated.",
  );
}
