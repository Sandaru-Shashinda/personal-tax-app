import "server-only";
import { randomUUID } from "node:crypto";
import type { DocumentCategory, Prisma } from "@prisma/client";
import type { z } from "zod";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { storage } from "@/lib/storage";
import type { documentMetaSchema } from "@/lib/validation/records";
import { getTaxYear } from "@/services/tax/rule-repository";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Allowed types, identified by the file's leading bytes rather than its name or declared type. */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

export const ACCEPTED_UPLOAD_TYPES = "application/pdf,image/png,image/jpeg,image/webp";

export function detectMimeType(data: Buffer): string | null {
  return SIGNATURES.find((s) => s.test(data))?.mime ?? null;
}

type DocumentMeta = z.infer<typeof documentMetaSchema>;

function toDTO(row: Prisma.DocumentGetPayload<{ include: { taxYear: true; incomeSource: { select: { name: true } } } }>) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    taxYear: row.taxYear?.code ?? null,
    incomeSourceName: row.incomeSource?.name ?? null,
    expenseId: row.expenseId,
    paymentId: row.paymentId,
    createdAt: row.createdAt.toISOString(),
  };
}
export type DocumentDTO = ReturnType<typeof toDTO>;

export async function listDocuments(
  userId: string,
  query: { taxYear?: string; category?: DocumentCategory; q?: string; page: number; pageSize: number },
) {
  const taxYearId = query.taxYear ? (await getTaxYear(query.taxYear)).id : undefined;
  const where: Prisma.DocumentWhereInput = {
    userId,
    deletedAt: null,
    ...(taxYearId ? { taxYearId } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q, mode: "insensitive" } }, { originalName: { contains: query.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.document.findMany({
      where,
      include: { taxYear: true, incomeSource: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.document.count({ where }),
  ]);
  return { items: rows.map(toDTO), total, page: query.page, pageSize: query.pageSize };
}

/** Every linked record must belong to the uploader; otherwise a document could be attached to someone else's data. */
async function assertLinksOwned(userId: string, meta: DocumentMeta) {
  const checks = await Promise.all([
    meta.incomeSourceId ? db.incomeSource.count({ where: { id: meta.incomeSourceId, userId, deletedAt: null } }) : 1,
    meta.expenseId ? db.expense.count({ where: { id: meta.expenseId, userId, deletedAt: null } }) : 1,
    meta.paymentId ? db.taxPayment.count({ where: { id: meta.paymentId, userId, deletedAt: null } }) : 1,
  ]);
  if (checks.some((c) => c === 0)) throw notFound("linked record");
}

export async function uploadDocument(userId: string, file: { name: string; data: Buffer }, meta: DocumentMeta): Promise<string> {
  if (file.data.length === 0) throw new AppError("That file is empty.", 422);
  if (file.data.length > MAX_UPLOAD_BYTES) throw new AppError("Files can be up to 10 MB.", 422);
  const mimeType = detectMimeType(file.data);
  if (!mimeType) throw new AppError("Only PDF, PNG, JPEG and WebP files can be uploaded.", 422);
  await assertLinksOwned(userId, meta);
  const taxYearId = meta.taxYear ? (await getTaxYear(meta.taxYear)).id : null;

  const storageKey = `${userId}/${randomUUID()}`;
  await storage().put(storageKey, file.data);
  try {
    const doc = await db.document.create({
      data: {
        userId,
        taxYearId,
        incomeSourceId: meta.incomeSourceId ?? null,
        expenseId: meta.expenseId ?? null,
        paymentId: meta.paymentId ?? null,
        category: meta.category,
        title: meta.title,
        // The stored name is display-only; it is never used to build a path.
        originalName: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 255) || "document",
        mimeType,
        sizeBytes: file.data.length,
        storageKey,
        sha256: sha256(file.data),
      },
    });
    await audit({ userId, action: "document.upload", entity: "Document", entityId: doc.id, after: { title: meta.title, category: meta.category, sizeBytes: file.data.length, mimeType } });
    return doc.id;
  } catch (error) {
    await storage().delete(storageKey).catch(() => undefined);
    throw error;
  }
}

/** Returns the file only to its owner. */
export async function readDocument(userId: string, id: string) {
  const doc = await db.document.findFirst({ where: { id, userId, deletedAt: null } });
  if (!doc) throw notFound("document");
  return { data: await storage().get(doc.storageKey), mimeType: doc.mimeType, originalName: doc.originalName };
}

export async function deleteDocument(userId: string, id: string): Promise<void> {
  const doc = await db.document.findFirst({ where: { id, userId, deletedAt: null } });
  if (!doc) throw notFound("document");
  // Deleting a document removes the file itself, not just the row.
  await storage().delete(doc.storageKey);
  await db.document.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId, action: "document.delete", entity: "Document", entityId: id, before: { title: doc.title, category: doc.category } });
}
