// Receipt scanning is not implemented. This is the seam a provider plugs into; until one
// exists `ocrProvider()` returns null and the UI offers manual entry only.

export interface OcrReceiptFields {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  /** 0–1 per field, so the confirmation screen can highlight what to check. */
  confidence: Partial<Record<"date" | "merchant" | "amount" | "category", number>>;
}

export interface OcrProvider {
  readonly name: string;
  extractReceipt(file: { data: Buffer; mimeType: string }): Promise<OcrReceiptFields>;
}

export function ocrProvider(): OcrProvider | null {
  return null;
}

// Intended flow once a provider exists:
//   upload receipt → Document(ocrStatus = PENDING) → provider.extractReceipt
//   → Document.ocrResult, ocrStatus = COMPLETED → user reviews and confirms → Expense created.
// Nothing is ever created from OCR output without the user's confirmation.
