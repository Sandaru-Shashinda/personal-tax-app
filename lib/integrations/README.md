# Integration seams

Nothing in this folder talks to an external service. Each file defines the interface a real
provider would implement, so a feature can be added without changing the code that calls it.

| Seam | File | Status |
|---|---|---|
| Receipt OCR | `ocr.ts` | Interface only. No provider. |
| E-mail delivery | `../email.ts` | Console provider (development). No SMTP/API provider. |
| Document storage | `../storage/index.ts` | Local disk. S3-compatible provider not written. |
| Exchange rates | — | Not integrated. Users enter the rate and its source by hand. |
| IRD e-Services | — | No official API exists for third parties; the app never files or pays on a user's behalf. |
| SMS / WhatsApp reminders | — | Not built. `Reminder.channel` would gain values. |
| AI tax assistant | `assistant.ts` | Retrieval contract only. No model is called. |

Planned shape for larger features (accountant access, family accounts, business accounts): every
user-owned row already carries `userId`; sharing would add a membership table mapping a
principal to a taxpayer with a role, and the ownership predicate in the services would become
"taxpayer I have access to" instead of "my userId".
