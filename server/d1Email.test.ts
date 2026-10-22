import { beforeEach, describe, expect, it, vi } from "vitest";
const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));
import { email } from "../cloudflare/api/integrations";
import type { ApiEnv } from "../cloudflare/api/types";

describe("D1 Gmail notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail, close: smtp.close });
  });
  it("does not attempt sending without the configured app password", async () => {
    expect(await email({} as ApiEnv, "job-1", "subject", "text")).toBe(false);
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });
  it("authenticates to Gmail over TLS and sends from the requested Gmail address", async () => {
    smtp.sendMail.mockResolvedValue({ accepted: ["Ilanadevorah25@gmail.com"] });
    expect(await email({ GMAIL_APP_PASSWORD: "test only value" } as ApiEnv, "job-1", "subject", "text")).toBe(true);
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true,
      auth: { user: "Ilanadevorah25@gmail.com", pass: "testonlyvalue" },
      disableFileAccess: true, disableUrlAccess: true,
    }));
    expect(smtp.sendMail).toHaveBeenCalledWith({
      from: { name: "Ilana Care", address: "Ilanadevorah25@gmail.com" },
      to: "Ilanadevorah25@gmail.com", subject: "subject", text: "text", messageId: "<job-1@ilana.care>",
    });
    expect(smtp.close).toHaveBeenCalledOnce();
  });
  it("keeps failed delivery eligible for the durable outbox retry and closes SMTP", async () => {
    smtp.sendMail.mockRejectedValue(new Error("SMTP delivery unavailable"));
    await expect(email({ GMAIL_APP_PASSWORD: "test-only-value" } as ApiEnv, "job-2", "subject", "text")).rejects.toThrow("SMTP delivery unavailable");
    expect(smtp.close).toHaveBeenCalledOnce();
  });
});
