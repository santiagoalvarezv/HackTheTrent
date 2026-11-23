import { describe, expect, it, vi } from "vitest";
import { SERVER_UNREACHABLE, withTimeout } from "./with-timeout";

describe("account call timeout", () => {
  it("fails with the friendly message after 15 s", async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise(() => {}));
    vi.advanceTimersByTime(15000);
    await expect(p).rejects.toThrow(SERVER_UNREACHABLE);
    vi.useRealTimers();
  });
  it("passes through a fast answer", async () => {
    await expect(withTimeout(Promise.resolve(1))).resolves.toBe(1);
  });
});
