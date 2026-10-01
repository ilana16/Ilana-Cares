import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { TRPCError } from "@trpc/server";
import { REVIEW_ADMIN_EMAIL, REVIEW_FIREBASE_PROJECT } from "../shared/reviews";

const keys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);
export function isReviewAdmin(payload: JWTPayload): boolean {
  const firebase = payload.firebase as
    | { sign_in_provider?: string }
    | undefined;
  const now = Math.floor(Date.now() / 1000);
  return (
    typeof payload.sub === "string" &&
    payload.sub.length > 0 &&
    payload.sub.length <= 128 &&
    typeof payload.email === "string" &&
    payload.email.toLowerCase() === REVIEW_ADMIN_EMAIL &&
    payload.email_verified === true &&
    firebase?.sign_in_provider === "google.com" &&
    typeof payload.iat === "number" &&
    payload.iat <= now &&
    typeof payload.auth_time === "number" &&
    payload.auth_time <= now
  );
}
export async function requireReviewAdmin(token: string) {
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ["RS256"],
      audience: REVIEW_FIREBASE_PROJECT,
      issuer: `https://securetoken.google.com/${REVIEW_FIREBASE_PROJECT}`,
      requiredClaims: ["exp", "iat", "sub", "auth_time"],
    });
    if (!isReviewAdmin(payload)) throw new Error("Not allowed");
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sign in with Ilanadevorah25@gmail.com to manage reviews.",
    });
  }
}
