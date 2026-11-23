import { describe, expect, it } from "vitest";
import { guestStep, safeRedirect, saveGuestStep, setGuest } from "./guest";

describe("guest mode", () => {
  it("keeps progress in memory and never lowers it", () => {
    saveGuestStep("first-led", 3); saveGuestStep("first-led", 1);
    expect(guestStep("first-led")).toBe(3);
  });
  it("exiting guest mode forgets progress", () => {
    saveGuestStep("first-led", 2); setGuest(false);
    expect(guestStep("first-led")).toBe(-1);
  });
  it("only returns to same-site lesson paths after sign-in", () => {
    expect(safeRedirect("/lesson/first-led")).toBe("/lesson/first-led");
    expect(safeRedirect("https://evil.example")).toBeUndefined();
    expect(safeRedirect("//evil.example")).toBeUndefined();
  });
});
