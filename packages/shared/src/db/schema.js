"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageLogs = exports.leads = exports.messages = exports.chatSessions = exports.websitePages = exports.websites = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Users table (website owners)
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    name: (0, pg_core_1.text)('name'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Websites table
exports.websites = (0, pg_core_1.pgTable)('websites', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    domain: (0, pg_core_1.text)('domain').notNull().unique(),
    embedCode: (0, pg_core_1.text)('embed_code').notNull().unique(),
    settings: (0, pg_core_1.jsonb)('settings').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    lastCrawledAt: (0, pg_core_1.timestamp)('last_crawled_at'),
});
// Website pages (crawled content)
exports.websitePages = (0, pg_core_1.pgTable)('website_pages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    websiteId: (0, pg_core_1.uuid)('website_id').references(() => exports.websites.id).notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    title: (0, pg_core_1.text)('title'),
    content: (0, pg_core_1.text)('content').notNull(), // plain text version of the page
    lastModified: (0, pg_core_1.timestamp)('last_modified').defaultNow(),
});
// Embeddings will be stored using pgvector (we'll add that column later)
// Chat sessions
exports.chatSessions = (0, pg_core_1.pgTable)('chat_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    websiteId: (0, pg_core_1.uuid)('website_id').references(() => exports.websites.id).notNull(),
    visitorId: (0, pg_core_1.text)('visitor_id'), // anonymous identifier
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    endedAt: (0, pg_core_1.timestamp)('ended_at'),
});
// Messages
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').references(() => exports.chatSessions.id).notNull(),
    role: (0, pg_core_1.text)('role').$type().notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Leads (contact info collected during chat)
exports.leads = (0, pg_core_1.pgTable)('leads', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    websiteId: (0, pg_core_1.uuid)('website_id').references(() => exports.websites.id),
    sessionId: (0, pg_core_1.uuid)('session_id').references(() => exports.chatSessions.id),
    name: (0, pg_core_1.text)('name'),
    email: (0, pg_core_1.text)('email'),
    phone: (0, pg_core_1.text)('phone'),
    message: (0, pg_core_1.text)('message'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Usage logs for analytics
exports.usageLogs = (0, pg_core_1.pgTable)('usage_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    websiteId: (0, pg_core_1.uuid)('website_id').references(() => exports.websites.id),
    messageCount: (0, pg_core_1.integer)('message_count').default(1),
    tokensUsed: (0, pg_core_1.integer)('tokens_used').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=schema.js.map