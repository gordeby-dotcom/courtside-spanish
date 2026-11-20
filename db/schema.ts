import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  topicTitle: text("topic_title").notNull(),
  exercises: text("exercises").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("sessions_owner_date").on(table.owner, table.createdAt)]);

export const responses = sqliteTable("responses", {
  sessionId: text("session_id").notNull().references(() => sessions.id),
  position: integer("position").notNull(),
  owner: text("owner").notNull(),
  skill: text("skill").notNull(),
  exercise: text("exercise").notNull(),
  state: text("state").notNull(),
  revision: integer("revision").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.sessionId, table.position] }),
  index("responses_owner_date").on(table.owner, table.updatedAt),
]);
