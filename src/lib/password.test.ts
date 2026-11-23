import { describe, expect, it } from "vitest";
import { passwordStrength, signUpSchema } from "./password";

const base = { name: "Ada", email: "ada@example.com" };

describe("sign-up password rules", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(signUpSchema.safeParse({ ...base, password: "Ab1!xyz", confirm: "Ab1!xyz" }).success).toBe(false);
  });
  it("requires an uppercase letter", () => {
    expect(signUpSchema.safeParse({ ...base, password: "abcdef1!", confirm: "abcdef1!" }).success).toBe(false);
  });
  it("requires a lowercase letter", () => {
    expect(signUpSchema.safeParse({ ...base, password: "ABCDEF1!", confirm: "ABCDEF1!" }).success).toBe(false);
  });
  it("requires a number", () => {
    expect(signUpSchema.safeParse({ ...base, password: "Abcdefg!", confirm: "Abcdefg!" }).success).toBe(false);
  });
  it("requires a special character", () => {
    expect(signUpSchema.safeParse({ ...base, password: "Abcdefg1", confirm: "Abcdefg1" }).success).toBe(false);
  });
  it("requires both passwords to match exactly", () => {
    expect(signUpSchema.safeParse({ ...base, password: "Abcdef1!", confirm: "Abcdef1?" }).success).toBe(false);
  });
  it("accepts a password meeting every rule", () => {
    expect(signUpSchema.safeParse({ ...base, password: "Abcdef1!", confirm: "Abcdef1!" }).success).toBe(true);
  });
  it("grades strength weak / medium / strong", () => {
    expect(passwordStrength("abc").strength).toBe("weak");
    expect(passwordStrength("abcdefgH").strength).toBe("medium");
    expect(passwordStrength("Abcdef1!").strength).toBe("strong");
  });
});
