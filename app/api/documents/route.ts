import { z } from "zod";
import { authed, json, searchParams } from "@/lib/api";
import { rateLimit } from "@/lib/auth/rate-limit";
import { AppError } from "@/lib/errors";
import { pagination, taxYearCode } from "@/lib/validation/common";
import { DOCUMENT_CATEGORIES, documentMetaSchema } from "@/lib/validation/records";
import { listDocuments, MAX_UPLOAD_BYTES, uploadDocument } from "@/services/documents/document-service";

const query = pagination.extend({ year: taxYearCode.optional(), category: z.enum(DOCUMENT_CATEGORIES).optional(), q: z.string().max(80).optional() });

export const GET = authed("We couldn't load your documents.", async (request, user) => {
  const { year, ...rest } = query.parse(searchParams(request));
  return json(await listDocuments(user.id, { taxYear: year, ...rest }));
});

export const POST = authed("We couldn't upload this document. Please try again.", async (request, user) => {
  await rateLimit("upload", user.id);
  // Reject oversized bodies before buffering them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("Files can be up to 10 MB.", 422);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("Choose a file to upload.", 422, { file: ["Choose a file"] });
  const meta = documentMetaSchema.parse({
    title: form.get("title") ?? file.name,
    category: form.get("category"),
    taxYear: form.get("taxYear") ?? "",
    incomeSourceId: form.get("incomeSourceId") ?? "",
    expenseId: form.get("expenseId") ?? "",
    paymentId: form.get("paymentId") ?? "",
  });
  const id = await uploadDocument(user.id, { name: file.name, data: Buffer.from(await file.arrayBuffer()) }, meta);
  return json({ id }, 201);
});
