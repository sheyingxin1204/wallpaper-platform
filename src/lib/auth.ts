import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db, schema } from "@/db";

const secret = process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-before-deploy";

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
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
