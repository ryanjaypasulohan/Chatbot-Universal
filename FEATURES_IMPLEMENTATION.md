# AI Chatbot Platform - Features Implementation Guide

## Overview
This document outlines all the newly implemented features for the AI Universal Chatbot Widget & Dashboard platform.

---

## 1. Core Functionality & Data Ingestion

### Deep Web Crawling
- **Feature**: The crawler now crawls the entire accessible domain, not just the homepage
- **Implementation**: 
  - Changed max page limit from 5 to 100 in `crawlWebsite()` function
  - Uses breadth-first search to discover all same-domain URLs
  - Automatically extracts links and adds them to the crawl queue
- **Usage**: POST `/api/crawl` with website_id and optional start_url

### Content Management
- **API Endpoints**:
  - `GET /api/websites/:id/pages` - List all crawled pages
  - `DELETE /api/websites/:website_id/pages/:page_id` - Delete specific page
  - `POST /api/websites/:website_id/pages/:page_id/recrawl` - Re-crawl specific page

- **Dashboard Features**:
  - Content Management tab shows all crawled URLs
  - Users can manually delete pages (soft delete)
  - Users can trigger re-crawl for individual pages
  - Shows page title and creation timestamp

---

## 2. Chatbot Widget UI/UX Customization

### Widget Settings
- **Stored In**: `widget_settings` table with fields:
  - `avatarUrl`: Custom bot avatar/icon
  - `greetingMessage`: Custom welcome message
  - `position`: Widget screen position
  - `theme`: Light/dark theme
  - `primaryColor`: Custom brand color

- **API Endpoints**:
  - `GET /api/websites/:id/widget-settings` - Retrieve settings
  - `PUT /api/websites/:id/widget-settings` - Update settings

### Flexible Positioning
- **6 Position Options**:
  1. Bottom-Right (Default)
  2. Bottom-Left
  3. Middle-Left
  4. Middle-Right
  5. Top-Left
  6. Top-Right

- **Mobile Responsive Rule**:
  - Screens < 768px: Auto-defaults to compact bottom-left or bottom-right
  - Preserves screen real estate on mobile devices
  - Adjusts width to fill available space

### Responsive Design
- Desktop: 320px width, fixed positioning
- Tablet: 320-640px with flexible scaling
- Mobile: Full width minus padding, adjusted height
- Smooth transitions and animations
- No text clipping or layout breaking

---

## 3. Message Presentation & Interactive CTA Elements

### Rich Text Formatting
- **Markdown Support**:
  - `**bold text**` → Bold
  - `*italic text*` → Italic
  - `- bullet point` → Bullet lists
  - Line breaks preserved

- **Implementation**: `parseMarkdown()` function in widget

### Smart Component Rendering
Automatically detects and renders as interactive components:

1. **URLs**:
   - Detection: Pattern matching for http/https URLs
   - Rendering: Styled CTA buttons with domain name
   - Action: Opens in new tab with `target="_blank"`
   - Style: Primary color buttons with hover effects

2. **Email Addresses**:
   - Detection: Standard email pattern matching
   - Rendering: Styled button with 📧 icon
   - Action: Triggers `mailto:` handler
   - Behavior: Opens user's default email client

3. **Phone Numbers**:
   - Detection: +1-234-567-8900 format variations
   - Rendering: Styled button with ☎️ icon
   - Action: Triggers `tel:` handler
   - Behavior: Initiates phone call on mobile devices

- **Implementation**: `detectAndRenderComponents()` function processes all messages

---

## 4. Dashboard Analytics & Chat Management

### Conversation Logs
- **Storage**: `chat_sessions` and `messages` tables
- **Features**:
  - Track all user conversations
  - Unique visitor ID for each session
  - Session creation and end timestamps
  - Message history with timestamps and roles

### Chat History
- **API Endpoints**:
  - `GET /api/websites/:id/conversations` - List all sessions
  - `GET /api/conversations/:session_id/messages` - Get session messages
  - `GET /api/websites/:id/conversations/search` - Search by date range

- **Dashboard Features**:
  - Dedicated "Chat History" tab
  - View all past conversations
  - Click conversation to view message thread
  - Search by date range (start and end date)
  - Display visitor session ID and timestamps

### Live Chat Feed
- **Implementation**:
  - Real-time conversation list in dashboard
  - Automatic session creation on first user message
  - Session tracking with `sessionId` returned from chat API
  - Display active and completed conversations

### Session Management
- **Session Creation**: Automatic on first message with unique visitor ID
- **Session Persistence**: `sessionId` stored and reused for continuous conversations
- **Session Data**: All messages stored with timestamps and roles

---

## 5. Database Schema Extensions

### New Tables

#### `widget_settings`
```sql
CREATE TABLE widget_settings (
  id UUID PRIMARY KEY,
  website_id UUID REFERENCES websites(id),
  avatar_url TEXT,
  greeting_message TEXT,
  position TEXT (bottom-right|bottom-left|middle-left|middle-right|top-left|top-right),
  theme TEXT (light|dark),
  primary_color TEXT,
  updated_at TIMESTAMP
);
```

#### `page_crawl_metadata`
```sql
CREATE TABLE page_crawl_metadata (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES website_pages(id),
  is_deleted INTEGER,
  last_recrawl_at TIMESTAMP,
  crawl_count INTEGER,
  updated_at TIMESTAMP
);
```

### Extended Tables

#### `websites` Table
- Updated `settings` JSONB to support all position options:
  - bottom-right, bottom-left, middle-left, middle-right, top-left, top-right

#### `chat_sessions` Table
- Ensures all conversations are tracked
- Auto-generates visitor_id for anonymous users
- Tracks session creation and end times

#### `messages` Table
- Stores both user and assistant messages
- Supports rich text content (markdown, formatted components)
- Includes role and timestamp for each message

---

## 6. API Endpoints Summary

### Website Management
- `GET /api/websites` - List all websites
- `POST /api/websites` - Create new website
- `GET /api/websites/:id/pages` - List crawled pages
- `DELETE /api/websites/:website_id/pages/:page_id` - Delete page
- `POST /api/websites/:website_id/pages/:page_id/recrawl` - Re-crawl page

### Chat & Conversations
- `POST /api/chat` - Send message (creates/reuses session)
- `GET /api/websites/:id/conversations` - List all conversations
- `GET /api/conversations/:session_id/messages` - Get conversation messages
- `GET /api/websites/:id/conversations/search` - Search conversations by date

### Widget Settings
- `GET /api/websites/:id/widget-settings` - Get widget config
- `PUT /api/websites/:id/widget-settings` - Update widget config

### Crawling
- `POST /api/crawl` - Start deep web crawl
- `GET /api/health` - Health check

---

## 7. Dashboard Tabs

### Websites Tab
- Create new websites
- Trigger website crawls
- View all websites with embed snippets
- Display last crawl timestamp

### Content Management Tab
- Select website from dropdown
- View all crawled URLs with titles
- Manage individual pages:
  - Re-crawl specific pages
  - Delete pages
  - Display page count

### Widget Settings Tab
- Select website
- Upload custom avatar URL
- Set custom greeting message
- Choose widget position (6 options)
- Select theme (light/dark)
- Pick primary color
- Save and apply settings

### Chat History Tab
- Select website
- View all conversations sorted by date
- Search conversations by date range
- Click conversation to view message thread
- See full message history with timestamps
- Filter and sort capabilities

---

## 8. Widget Features

### Default Behavior
- Starts minimized with "💬 Chat" button
- Default position: Bottom-right
- Default greeting: "Hello! How can I help you today?"
- Default color: #2563eb (Blue)

### Interactive Features
- Click to open/close
- Auto-focus on input field when opened
- Keyboard support (Enter to send, Shift+Enter for new line)
- Auto-scroll to latest message
- Responsive to window resize

### Message Features
- User messages: Styled with primary color, right-aligned
- Bot messages: Light background, left-aligned
- Rich component rendering for URLs, emails, phone numbers
- Markdown support for formatting
- Loading state while thinking

---

## 9. Mobile-First Responsive Design

### Mobile (< 768px)
- Full width with left/right 8px padding
- Auto-positioned to bottom-left or bottom-right
- Height capped at 60vh (max 600px)
- Input row uses flex-wrap for better spacing
- Touch-friendly button sizes

### Tablet (768px - 1024px)
- 320px width maintained
- Flexible positioning still applied
- Adjusted header/message sizes

### Desktop (> 1024px)
- 320px fixed width
- Full positioning flexibility
- All 6 positions available
- Smooth animations and transitions

---

## 10. Implementation Files Modified

### Backend
- `apps/api/src/index.ts` - All new API endpoints and chat session management
- `packages/shared/src/db/schema.ts` - Database schema extensions

### Frontend
- `apps/dashboard/public/index.html` - New dashboard tabs and UI
- `apps/dashboard/public/dashboard.js` - Tab switching and all CRUD operations
- `apps/widget/src/embed.js` - Widget customization, positioning, smart rendering

---

## 11. Usage Examples

### Creating a Website with Widget Customization
```javascript
// 1. Create website
POST /api/websites
{ "domain": "example.com" }

// 2. Update widget settings
PUT /api/websites/:id/widget-settings
{
  "avatarUrl": "https://example.com/avatar.png",
  "greetingMessage": "Welcome to our support!",
  "position": "bottom-right",
  "theme": "light",
  "primaryColor": "#ff6b6b"
}
```

### Crawling and Managing Content
```javascript
// 1. Start deep crawl
POST /api/crawl
{ "website_id": "123", "start_url": "https://example.com" }

// 2. List crawled pages
GET /api/websites/123/pages

// 3. Re-crawl specific page
POST /api/websites/123/pages/456/recrawl

// 4. Delete a page
DELETE /api/websites/123/pages/456
```

### Accessing Chat History
```javascript
// 1. Get all conversations
GET /api/websites/123/conversations

// 2. Get messages from conversation
GET /api/conversations/session-id/messages

// 3. Search by date
GET /api/websites/123/conversations/search?startDate=2024-01-01&endDate=2024-01-31
```

---

## 12. Optional Features (Future Enhancements)

### Live Handover
- Admin toggle to pause AI session
- Real-time chat takeover by support team
- Message routing to live agent
- Session transfer tracking

---

## Testing Checklist

- [ ] Create website and verify crawler finds multiple pages
- [ ] Update widget settings and verify in embed widget
- [ ] Test all 6 widget positions on desktop and mobile
- [ ] Send message with URL, email, and phone number
- [ ] Verify markdown formatting in messages
- [ ] Check responsive design on mobile (< 768px)
- [ ] Search conversations by date range
- [ ] Delete and re-crawl individual pages
- [ ] Verify session persistence across messages

---

## Deployment Considerations

1. **Database Migrations**: Run migrations for new tables (`widget_settings`, `page_crawl_metadata`)
2. **Environment Variables**: Ensure Supabase configuration is correct
3. **API Keys**: Update Groq API key if needed
4. **CORS Settings**: Dashboard and widget must be on same origin
5. **SSL/HTTPS**: Required for production (especially for embed widgets)

---

## Performance Notes

- Widget settings cached on first load
- Conversations loaded with limit of 50 by default (can be paginated)
- Smart component detection runs on client-side
- Markdown parsing lightweight and efficient
- Database indexes recommended on `website_id` and `session_id`

---

## Troubleshooting

### Widget not showing custom settings
- Check browser console for API errors
- Verify widget-settings record exists in database
- Check CORS configuration on API

### Crawl not finding all pages
- Verify robots.txt allows crawling
- Check for JavaScript-rendered content (requires headless browser)
- May need to increase page limit for large sites

### Rich text not rendering
- Clear browser cache
- Check content for valid markdown syntax
- Verify URL/email/phone patterns match detection regex

