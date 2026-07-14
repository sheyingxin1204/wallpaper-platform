import { bigint, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * 第一阶段的最小壁纸表。分类、标签、素材版本和审核记录会在对应阶段扩展。
 */
export const wallpapers = mysqlTable("wallpapers", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

