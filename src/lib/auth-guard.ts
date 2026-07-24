import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { isDatabaseConfigured, requireDatabase } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {}

export async function requireAdmin() {
  // A local checkout without cloud credentials should still expose the normal
  // unauthenticated redirect instead of failing with a database connection error.
  if (!isDatabaseConfigured()) throw new UnauthorizedError("请先配置数据库并登录管理员账号。");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError("请先登录管理员账号。");

  const [user] = await requireDatabase().select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user || user.disabled || user.role !== "admin") {
    throw new UnauthorizedError("当前会话没有管理员权限。");
  }

  return user;
}
