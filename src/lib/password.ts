import { z } from "zod";

/** Sign-up password rules: one entry per requirement so the UI can show a live checklist. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export type Strength = "weak" | "medium" | "strong";

/** weak: 0-2 rules met, medium: 3-4, strong: all 5. */
export function passwordStrength(p: string): { met: number; strength: Strength } {
  const met = PASSWORD_RULES.filter((r) => r.test(p)).length;
  return { met, strength: met === PASSWORD_RULES.length ? "strong" : met >= 3 ? "medium" : "weak" };
}

export const passwordSchema = PASSWORD_RULES.reduce(
  (s, r) => s.refine(r.test, { message: r.label }),
  z.string() as z.ZodType<string>,
);

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(100, "Keep it under 100 characters"),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const logInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Enter your password"),
});
