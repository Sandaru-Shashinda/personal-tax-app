import "server-only";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Development provider: writes the message to the server log instead of sending it.
 * No transactional e-mail service is wired up yet; implement EmailProvider for one
 * (SMTP, SES, Resend…) and return it from `emailProvider()`.
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info(`\n[email] To: ${message.to}\n[email] From: ${env().EMAIL_FROM}\n[email] Subject: ${message.subject}\n${message.text}\n`);
  }
}

const provider: EmailProvider = new ConsoleEmailProvider();

export function emailProvider(): EmailProvider {
  return provider;
}

export const isEmailDeliveryConfigured = false;
