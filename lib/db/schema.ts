import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"
import type { Line } from "@/lib/playbook"
import type { Report } from "@/lib/schemas"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const rcLink = pgTable("rc_link", {
  userId: text("userId").primaryKey(),
  extensionId: text("extensionId").notNull().unique(),
  extensionNumber: text("extensionNumber"),
  extensionName: text("extensionName"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export type CallStatus = "pending" | "processing" | "done" | "error"

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  rcCallId: text("rcCallId").notNull().unique(),
  recordingId: text("recordingId"),
  direction: text("direction"),
  fromNumber: text("fromNumber"),
  fromName: text("fromName"),
  toNumber: text("toNumber"),
  toName: text("toName"),
  startedAt: timestamp("startedAt").notNull(),
  duration: integer("duration").notNull().default(0),
  status: text("status").$type<CallStatus>().notNull().default("pending"),
  error: text("error"),
  transcript: jsonb("transcript").$type<Line[]>(),
  report: jsonb("report").$type<Report>(),
  score: integer("score"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export type Call = typeof calls.$inferSelect
