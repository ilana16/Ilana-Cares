import { beforeAll, describe, expect, it, vi } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
const shared = vi.hoisted(() => ({ keys: undefined as any }));
vi.mock("jose", async importOriginal => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet:
      () =>
      (...args: any[]) =>
        shared.keys(...args),
  };
});
import { requireReviewAdmin } from "./reviewAuth";
let privateKey: CryptoKey;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  shared.keys = createLocalJWKSet({
    keys: [
      {
        ...(await exportJWK(pair.publicKey)),
        kid: "test",
        alg: "RS256",
        use: "sig",
      },
    ],
  });
});
async function token(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: "admin",
    email: "Ilanadevorah25@gmail.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" },
    auth_time: now,
    iat: now,
    exp: now + 3600,
    aud: "icnew-77651",
    iss: "https://securetoken.google.com/icnew-77651",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .sign(privateKey);
}
describe("review admin authentication", () => {
  it("accepts the specified verified Google account", async () => {
    await expect(requireReviewAdmin(await token())).resolves.toBeUndefined();
  });
  it.each([
    { email: "someone@gmail.com" },
    { email_verified: false },
    { firebase: { sign_in_provider: "password" } },
    { aud: "another-project" },
    { iss: "https://attacker.example" },
    { exp: 1 },
    { sub: "" },
    { iat: Math.floor(Date.now() / 1000) + 1000 },
  ])("rejects invalid identity or claims %j", async overrides => {
    await expect(
      requireReviewAdmin(await token(overrides))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects unsigned or malformed tokens", async () => {
    await expect(requireReviewAdmin("forged")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
