export type ApiEnv = Cloudflare.Env & {
  GMAIL_APP_PASSWORD?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_SPREADSHEET_ID?: string;
};
