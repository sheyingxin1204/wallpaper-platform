import {
  bigint,
  boolean,
  char,
  datetime,
  index,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const wallpaperStatuses = [
  "draft",
  "pending_processing",
  "pending_review",
  "published",
  "unlisted",
  "rejected",
] as const;

export const assetKinds = ["original", "preview_1920", "preview_960", "thumbnail_480"] as const;
export const crawlTaskStatuses = ["running", "completed", "failed"] as const;
export const crawlRecordStatuses = ["queued", "imported", "duplicate", "failed"] as const;

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: varchar("image", { length: 2048 }),
    role: mysqlEnum("role", ["admin"] as const).notNull().default("admin"),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: datetime("created_at", { mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date" }).notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    createdAt: datetime("created_at", { mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date" }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("sessions_token_unique").on(table.token), index("sessions_user_id_index").on(table.userId)],
);

export const accounts = mysqlTable(
  "accounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: longtext("access_token"),
    refreshToken: longtext("refresh_token"),
    idToken: longtext("id_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at", { mode: "date" }),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at", { mode: "date" }),
    scope: varchar("scope", { length: 1024 }),
    password: varchar("password", { length: 512 }),
    createdAt: datetime("created_at", { mode: "date" }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date" }).notNull(),
  },
  (table) => [
    index("accounts_user_id_index").on(table.userId),
    uniqueIndex("accounts_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const verifications = mysqlTable(
  "verifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: varchar("value", { length: 512 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: datetime("created_at", { mode: "date" }),
    updatedAt: datetime("updated_at", { mode: "date" }),
  },
  (table) => [index("verifications_identifier_index").on(table.identifier)],
);

export const categories = mysqlTable(
  "categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const tags = mysqlTable(
  "tags",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_slug_unique").on(table.slug)],
);

export const crawlTasks = mysqlTable(
  "crawl_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    provider: varchar("provider", { length: 120 }).notNull(),
    providerVersion: varchar("provider_version", { length: 40 }).notNull(),
    input: longtext("input"),
    status: mysqlEnum("status", crawlTaskStatuses).notNull().default("running"),
    candidateCount: int("candidate_count").notNull().default(0),
    importedCount: int("imported_count").notNull().default(0),
    duplicateCount: int("duplicate_count").notNull().default(0),
    error: text("error"),
    startedAt: datetime("started_at", { mode: "date" }).notNull(),
    finishedAt: datetime("finished_at", { mode: "date" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("crawl_tasks_status_index").on(table.status), index("crawl_tasks_provider_index").on(table.provider)],
);

export const sources = mysqlTable(
  "sources",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    originalUrl: varchar("original_url", { length: 2048 }).notNull(),
    author: varchar("author", { length: 160 }),
    capturedAt: datetime("captured_at", { mode: "date" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("sources_original_url_index").on(table.originalUrl)],
);

export const licenses = mysqlTable("licenses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  type: varchar("type", { length: 120 }).notNull(),
  evidenceUrl: varchar("evidence_url", { length: 2048 }),
  notes: text("notes"),
  confirmedAt: datetime("confirmed_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wallpapers = mysqlTable(
  "wallpapers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", wallpaperStatuses).notNull().default("draft"),
    orientation: mysqlEnum("orientation", ["landscape", "portrait", "square"] as const),
    width: int("width"),
    height: int("height"),
    dominantColor: char("dominant_color", { length: 7 }),
    categoryId: varchar("category_id", { length: 36 }).references(() => categories.id, { onDelete: "set null" }),
    sourceId: varchar("source_id", { length: 36 }).references(() => sources.id, { onDelete: "set null" }),
    licenseId: varchar("license_id", { length: 36 }).references(() => licenses.id, { onDelete: "set null" }),
    sourceSha256: char("source_sha256", { length: 64 }),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id),
      publishedAt: datetime("published_at", { mode: "date" }),
      processingError: text("processing_error"),
      viewCount: int("view_count").notNull().default(0),
      downloadCount: int("download_count").notNull().default(0),
      createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("wallpapers_slug_unique").on(table.slug),
    index("wallpapers_status_published_at_index").on(table.status, table.publishedAt),
    index("wallpapers_category_id_index").on(table.categoryId),
    index("wallpapers_source_sha256_index").on(table.sourceSha256),
  ],
);

export const crawlRecords = mysqlTable(
  "crawl_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    taskId: varchar("task_id", { length: 36 })
      .notNull()
      .references(() => crawlTasks.id, { onDelete: "cascade" }),
    pageUrl: varchar("page_url", { length: 2048 }).notNull(),
    imageUrl: varchar("image_url", { length: 2048 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    author: varchar("author", { length: 160 }),
    licenseType: varchar("license_type", { length: 120 }).notNull(),
    licenseEvidenceUrl: varchar("license_evidence_url", { length: 2048 }),
    licenseNotes: text("license_notes"),
    status: mysqlEnum("status", crawlRecordStatuses).notNull().default("queued"),
    wallpaperId: varchar("wallpaper_id", { length: 36 }).references(() => wallpapers.id, { onDelete: "set null" }),
    sourceSha256: char("source_sha256", { length: 64 }),
    error: text("error"),
    capturedAt: datetime("captured_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("crawl_records_task_page_unique").on(table.taskId, table.pageUrl),
    index("crawl_records_task_id_index").on(table.taskId),
    index("crawl_records_source_sha256_index").on(table.sourceSha256),
  ],
);

export const wallpaperAssets = mysqlTable(
  "wallpaper_assets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    wallpaperId: varchar("wallpaper_id", { length: 36 })
      .notNull()
      .references(() => wallpapers.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", assetKinds).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    width: int("width"),
    height: int("height"),
    byteSize: bigint("byte_size", { mode: "number" }),
    sha256: char("sha256", { length: 64 }),
    perceptualHash: char("perceptual_hash", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wallpaper_assets_kind_unique").on(table.wallpaperId, table.kind),
    index("wallpaper_assets_sha256_index").on(table.sha256),
  ],
);

export const wallpaperTags = mysqlTable(
  "wallpaper_tags",
  {
    wallpaperId: varchar("wallpaper_id", { length: 36 })
      .notNull()
      .references(() => wallpapers.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.wallpaperId, table.tagId] })],
);

export const wallpaperAuditLogs = mysqlTable(
  "wallpaper_audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    wallpaperId: varchar("wallpaper_id", { length: 36 })
      .notNull()
      .references(() => wallpapers.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 80 }).notNull(),
    fromStatus: mysqlEnum("from_status", wallpaperStatuses),
    toStatus: mysqlEnum("to_status", wallpaperStatuses),
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("wallpaper_audit_logs_wallpaper_id_index").on(table.wallpaperId)],
);
