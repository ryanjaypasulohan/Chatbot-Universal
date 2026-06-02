import { pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';

// Users table (website owners)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Widget settings
export const widgetSettings = pgTable('widget_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').references(() => websites.id).notNull(),
  avatarUrl: text('avatar_url'), // custom avatar/icon URL
  greetingMessage: text('greeting_message'), // custom greeting
  position: text('position').$type<'bottom-right' | 'bottom-left' | 'middle-left' | 'middle-right' | 'top-left' | 'top-right'>().default('bottom-right'), // widget position
  theme: text('theme').$type<'light' | 'dark'>().default('light'),
  primaryColor: text('primary_color').default('#2563eb'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Websites table
export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  domain: text('domain').notNull().unique(),
  embedCode: text('embed_code').notNull().unique(),
  settings: jsonb('settings').$type<{
    theme?: 'light' | 'dark';
    primaryColor?: string;
    position?: 'bottom-right' | 'bottom-left' | 'middle-left' | 'middle-right' | 'top-left' | 'top-right';
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastCrawledAt: timestamp('last_crawled_at'),
});

// Website pages (crawled content)
export const websitePages = pgTable('website_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').references(() => websites.id).notNull(),
  url: text('url').notNull(),
  title: text('title'),
  content: text('content').notNull(), // plain text version of the page
  lastModified: timestamp('last_modified').defaultNow(),
});

// Embeddings will be stored using pgvector (we'll add that column later)
// Chat sessions
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').references(() => websites.id).notNull(),
  visitorId: text('visitor_id'), // anonymous identifier
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => chatSessions.id).notNull(),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leads (contact info collected during chat)
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').references(() => websites.id),
  sessionId: uuid('session_id').references(() => chatSessions.id),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Usage logs for analytics
export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  websiteId: uuid('website_id').references(() => websites.id),
  messageCount: integer('message_count').default(1),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Page crawl metadata (for tracking, re-crawl, deletion)
export const pageCrawlMetadata = pgTable('page_crawl_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => websitePages.id).notNull(),
  isDeleted: integer('is_deleted').default(0), // soft delete
  lastRecrawlAt: timestamp('last_recrawl_at'),
  crawlCount: integer('crawl_count').default(1),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});