export type ApiEnv = Cloudflare.Env & {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_SPREADSHEET_ID?: string;
};
