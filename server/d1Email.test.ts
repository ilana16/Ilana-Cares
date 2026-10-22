import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const smtp = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: smtp.createTransport } }));
import { email } from "../cloudflare/api/integrations";
import type { ApiEnv } from "../cloudflare/api/types";

describe("D1 Gmail notifications", () => {
  afterEach(() => vi.unstubAllGlobals());
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
  it("uses the separate Gmail token and sends Unicode MIME over HTTPS as the requested account", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "gmail-message-1" })));
    vi.stubGlobal("fetch", fetchMock);
    const env = { GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret",
      GOOGLE_REFRESH_TOKEN: "calendar-token", GMAIL_REFRESH_TOKEN: "gmail-token", GMAIL_APP_PASSWORD: "test-password" } as ApiEnv;
    expect(await email(env, "d1-contact-8", "שלום\r\nBcc: other@example.com", "שלום 🌸")).toBe(true);
    expect(fetchMock.mock.calls[0][1].body.get("refresh_token")).toBe("gmail-token");
    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/Ilanadevorah25%40gmail.com/messages/send");
    expect(request.headers.Authorization).toBe("Bearer test-access");
    const mime = Buffer.from(JSON.parse(request.body).raw, "base64url").toString("utf8");
    expect(mime).toContain("From: Ilana Care <Ilanadevorah25@gmail.com>\r\nTo: Ilanadevorah25@gmail.com");
    expect(mime).not.toContain("\r\nBcc:");
    expect(Buffer.from(mime.split("\r\n\r\n")[1], "base64").toString("utf8")).toBe("שלום 🌸");
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });
  it("retains API delivery failures for retry without risking another SMTP send", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access" })))
      .mockResolvedValueOnce(new Response("{}", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(email({ GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", GMAIL_REFRESH_TOKEN: "test-token",
      GMAIL_APP_PASSWORD: "test-password" } as ApiEnv, "d1-contact-8", "Test", "Test")).rejects.toMatchObject({ code: "EGMAILAPI", responseCode: 403 });
    expect(smtp.createTransport).not.toHaveBeenCalled();
  });
});
