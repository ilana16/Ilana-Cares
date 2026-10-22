import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.doUnmock("firebase/app"); vi.doUnmock("firebase/analytics"); });

it("keeps Firebase available when browser analytics initialization throws", async () => {
  vi.resetModules();
  vi.stubGlobal("window", {});
  const app = { name: "test-app" };
  const getAnalytics = vi.fn(() => { throw new Error("cookies unavailable"); });
  vi.doMock("firebase/app", () => ({ initializeApp: () => app }));
  vi.doMock("firebase/analytics", () => ({ isSupported: async () => true, getAnalytics }));
  const firebase = await import("../client/src/lib/firebase");
  expect(firebase.app).toBe(app);
  await vi.waitFor(() => expect(getAnalytics).toHaveBeenCalled());
  expect(firebase.analytics).toBeUndefined();
});
