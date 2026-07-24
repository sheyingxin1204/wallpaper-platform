export {};

process.env.BETTER_AUTH_ALLOW_SIGN_UP = "true";

const [email, password, displayName = "Administrator"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: pnpm admin:create <email> <password> [name]");
  process.exitCode = 1;
} else {
  const [{ auth }, { requireDatabase }, { users }] = await Promise.all([
    import("@/lib/auth"),
    import("@/db"),
    import("@/db/schema"),
  ]);
  const existing = await requireDatabase().select({ id: users.id }).from(users).limit(1);
  if (existing.length) {
    console.error("An administrator already exists. Create additional accounts through a controlled maintenance process.");
    process.exitCode = 1;
  } else {
    await auth.api.signUpEmail({ body: { email, password, name: displayName } });
    console.log(`Created administrator ${email}.`);
  }
}
