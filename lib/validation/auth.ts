import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Enter a valid e-mail address").max(254);

export const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "Use at most 200 characters")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(200),
  email,
  password,
  acceptTerms: z.literal(true, { error: "Please accept to continue" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: password,
});

export const totpCodeSchema = z.object({ code: z.string().trim().min(6, "Enter the 6-digit code").max(20) });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
