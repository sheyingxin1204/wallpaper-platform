import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db, schema } from "@/db";

const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();
const developmentSecret = "local-development-secret-change-before-deploy-1234567890";

// Keep local route/build checks usable without credentials, but never allow a
// production deployment to silently run with a development secret.
export const authConfigurationError = process.env.NODE_ENV === "production" && !configuredSecret;
const secret = configuredSecret || developmentSecret;

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // Trust the Host header so sessions work behind Cloudflare Workers/custom
  // domains, not only the hardcoded baseURL.
  trustHost: true,
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.BETTER_AUTH_ALLOW_SIGN_UP !== "true",
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "admin", input: false },
      disabled: { type: "boolean", defaultValue: false, input: false },
    },
  },
});
