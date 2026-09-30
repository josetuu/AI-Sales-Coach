import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export type ColumnMap = {
  name?: number
  phone: number
  email?: number
  company?: number
  status: number
  disposition: number
  attempts: number
  lastCalled: number
  callback: number
  notes: number
}

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  spreadsheetId: text('spreadsheetId').notNull(),
  spreadsheetTitle: text('spreadsheetTitle'),
  sheetName: text('sheetName').notNull(),
  columnMap: jsonb('columnMap').$type<ColumnMap>().notNull(),
  headers: jsonb('headers').$type<string[]>().notNull(),
  agentPhone: text('agentPhone'),
  maxAttempts: integer('maxAttempts').notNull().default(3),
  autoAdvance: boolean('autoAdvance').notNull().default(true),
  script: text('script'),
  lastSyncedAt: timestamp('lastSyncedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  campaignId: integer('campaignId').notNull(),
  rowNumber: integer('rowNumber').notNull(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  company: text('company'),
  extra: jsonb('extra').$type<Record<string, string>>().notNull().default({}),
  status: text('status').notNull().default('new'),
  disposition: text('disposition'),
  attempts: integer('attempts').notNull().default(0),
  lastCalledAt: timestamp('lastCalledAt', { withTimezone: true }),
  callbackAt: timestamp('callbackAt', { withTimezone: true }),
  notes: text('notes'),
  syncPending: boolean('syncPending').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('leads_campaign_row_uniq').on(t.campaignId, t.rowNumber)])

export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  campaignId: integer('campaignId').notNull(),
  leadId: integer('leadId').notNull(),
  ringoutId: text('ringoutId'),
  phone: text('phone'),
  status: text('status').notNull().default('initiated'),
  disposition: text('disposition'),
  notes: text('notes'),
  startedAt: timestamp('startedAt', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('endedAt', { withTimezone: true }),
  durationSec: integer('durationSec'),
})

export type Campaign = typeof campaigns.$inferSelect
export type Lead = typeof leads.$inferSelect
export type Call = typeof calls.$inferSelect
