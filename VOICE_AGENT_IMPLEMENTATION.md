# Voice Agent Implementation - Complete Guide

## Overview
Successfully implemented a zero-cost AI voice agent feature for the Universal AI Website Chatbot platform, enabling browser-native voice interactions through a tabbed widget interface with speech-to-text (Whisper) and LLM (Llama) processing via Groq Cloud.

## Architecture Implementation

### 1. Widget Enhancement (apps/widget/src/embed.js)

#### New Features:
- **Tabbed Interface**: Chat Tab (default) and Voice Tab
- **Voice Recording**: MediaRecorder API for audio capture
- **Waveform Visualization**: 5-bar animated waveform during recording
- **Audio Playback**: Web Speech API (speechSynthesis) for text-to-speech responses
- **Persistent Sessions**: LocalStorage-based conversation persistence across tabs

#### Key Components:
```javascript
// Voice Tab UI Elements
- Microphone button (60x60px circular, color-coded states)
- Animated waveform bars (5 bars with staggered animation)
- Voice status indicator
- Recording/playback states with visual feedback

// Tab Switching Logic
- Smooth transitions between Chat and Voice modes
- Conditional input row visibility (hidden in voice mode)
- Independent message history display
```

#### Styling Highlights:
- Recording animation: Pulsing red background with glow effect
- Waveform bars: Synchronized animation with 0.1s stagger
- Microphone button: 60px diameter with box shadow and hover effects
- Mobile responsive: Stacked layout for screens < 768px

### 2. API Package (packages/ai/)

#### New Package Structure:
```
packages/ai/
├── package.json          (OpenAI dependency)
├── tsconfig.json         (TypeScript config)
└── src/
    ├── index.ts          (Main AI module)
    └── index.d.ts        (Type definitions)
```

#### Exported Functions:

**`createGroqClient(apiKey: string): OpenAI`**
- Initializes Groq client with baseURL: https://api.groq.com/openai/v1

**`transcribeAudio(groq: OpenAI, audioBuffer: Buffer): Promise<string>`**
- Uses Groq Whisper API (whisper-large-v3)
- Converts WebM audio to text transcription
- Handles temporary file management

**`generateLlamaResponse(groq: OpenAI, prompt: string, contextChunks?: string[]): Promise<string>`**
- Uses Groq Llama (llama-3.3-70b-versatile)
- Accepts optional context chunks for RAG
- Returns concise (max 400 tokens) responses
- Includes system prompt with instructions

**`processVoiceMessage(groq: OpenAI, audioBuffer: Buffer, contextChunks?: string[]): Promise<{transcription, response}>`**
- Orchestrates full voice pipeline
- Transcribes audio → generates response
- Returns both transcription and response for analytics

### 3. Voice API Endpoint (apps/api/src/index.ts)

#### Endpoint: `POST /api/voice/respond`

**Request:**
- `website_id` (string, required): Website identifier
- `session_id` (string, optional): Existing session ID
- `audio` (file, multipart/form-data, required): WebM audio blob

**Response:**
```json
{
  "answer": "Generated response text",
  "transcription": "User's spoken message",
  "sessionId": "UUID of chat session"
}
```

**Processing Pipeline:**
1. Validate audio file (25MB max, audio/* mimetype)
2. Create/reuse chat session
3. Transcribe audio using Groq Whisper
4. Generate response using Groq Llama
5. Store messages with `mode: 'voice'` attribute
6. Return response for Web Speech API playback

#### Middleware Configuration:
- Multer for file uploads (memory storage)
- CORS enabled for `/api/voice/respond`
- Rate limiting applies (180 req/min)
- Error handling with generic messages

### 4. Database Schema Update

#### Migration: 002_add_voice_mode_to_messages.sql

**Changes to `messages` table:**
```sql
ALTER TABLE messages ADD COLUMN mode text DEFAULT 'text' 
  CHECK (mode IN ('text', 'voice'));

-- Indices for analytics
CREATE INDEX idx_messages_mode ON messages(mode);
CREATE INDEX idx_messages_session_mode ON messages(session_id, mode);
```

**Schema Update (Drizzle ORM):**
```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => chatSessions.id).notNull(),
  role: text('role').$type<'user' | 'assistant'>().notNull(),
  content: text('content').notNull(),
  mode: text('mode').$type<'text' | 'voice'>().default('text'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 5. Dependencies Added

**apps/api/package.json:**
- `@ai-chatbot/ai`: New workspace package
- `multer@^1.4.5-lts.1`: File upload handling
- `@types/multer@^2.1.0`: TypeScript definitions

**packages/ai/package.json:**
- `openai@^4.20.0`: Groq API client

## Infrastructure Costs: $0

### Cost Breakdown:
| Component | Service | Cost |
|-----------|---------|------|
| Audio Capture | Browser MediaRecorder API | $0.00 |
| Speech-to-Text | Groq Whisper (Free Tier) | $0.00 |
| Transcription Storage | Supabase (pgvector) | $0.00 (Existing) |
| LLM Processing | Groq Llama (Free Tier) | $0.00 |
| Audio Playback | Browser speechSynthesis API | $0.00 |
| Database | Supabase (Free Tier) | $0.00 (Existing) |
| **Total** | | **$0.00** |

## Implementation Checklist

- ✅ Widget UI: Chat/Voice tabbed interface
- ✅ Audio Capture: MediaRecorder API integration
- ✅ Waveform Visualization: Animated 5-bar display
- ✅ Microphone Button: Toggle recording/playback
- ✅ Voice Status: Real-time feedback messages
- ✅ API Package: Groq Whisper + Llama bindings
- ✅ Voice Endpoint: `/api/voice/respond` POST handler
- ✅ Session Management: Create/reuse sessions
- ✅ Audio Playback: Web Speech API integration
- ✅ Database Schema: Mode attribute added
- ✅ Migrations: SQL + Drizzle ORM updates
- ✅ CORS Configuration: Voice endpoint allowed
- ✅ Error Handling: Microphone permission checks
- ✅ Type Safety: Full TypeScript support
- ✅ Build: All packages compile successfully

## Testing Procedures

### Manual Testing Steps:

1. **Widget Rendering:**
   - Load test website with widget embed code
   - Verify Chat tab displays by default
   - Click Voice tab and verify UI switches

2. **Voice Recording:**
   - Click microphone button
   - Verify red pulsing animation
   - Speak a test message (e.g., "What's your return policy?")
   - Stop recording (click mic again)
   - Verify "Processing..." status

3. **Response Generation:**
   - Verify transcription appears in chat
   - Listen to audio response (if browser supports speechSynthesis)
   - Verify response text appears in chat window

4. **Session Persistence:**
   - Switch between Chat and Voice tabs
   - Verify conversation history remains intact
   - Refresh page and verify conversation loads from localStorage

5. **Error Scenarios:**
   - Test without microphone permission (should show error)
   - Test with invalid audio (should show error)
   - Test without website_id (should return 400)

### API Testing (curl):
```bash
# Record audio first, then:
curl -X POST http://localhost:3000/api/voice/respond \
  -F "website_id=<your-website-id>" \
  -F "session_id=<optional-session-id>" \
  -F "audio=@audio.webm"
```

## Browser Compatibility

- **MediaRecorder API**: Chrome 49+, Firefox 25+, Safari 14.1+
- **Web Speech API**: Chrome 25+, Safari (partial), Edge 79+
- **getUserMedia**: Chrome 21+, Firefox 17+, Safari 11+

## Performance Considerations

1. **Audio Encoding**: WebM format reduces file size (~50KB for 5s audio)
2. **Groq Response Time**: Typical 500-1500ms for LLM response
3. **Network**: Single POST request for entire voice message
4. **Memory**: Temp audio file cleaned up after transcription

## Future Enhancements

1. **Premium Features** (Phase 2):
   - Simulated System Call UI for lead capture
   - Real-time WebSocket sync to admin dashboard
   - Dedicated telephony integrations (Vapi, Twilio)

2. **Analytics** (Phase 2):
   - Voice interaction metrics
   - Transcription confidence scoring
   - Response latency tracking

3. **Advanced Features** (Phase 3):
   - Multi-language support
   - Custom voice models
   - Voice authentication

## Deployment Notes

1. **Environment Variables:** Ensure `GROQ_API_KEY` is set
2. **Dependencies:** Run `pnpm install` to fetch all packages
3. **Build:** Run `pnpm run build` to compile TypeScript
4. **Database:** Apply migration `002_add_voice_mode_to_messages.sql`
5. **Widget:** Embed script loads new voice-enabled version automatically

## Files Modified/Created

### New Files:
- `packages/ai/` (entire package)
- `apps/widget/src/embed-voice.js` (template for new widget)
- `migrations/002_add_voice_mode_to_messages.sql`

### Modified Files:
- `apps/widget/src/embed.js` (replaced with voice-enabled version)
- `apps/api/src/index.ts` (added voice endpoint + imports)
- `apps/api/package.json` (added dependencies)
- `packages/shared/src/db/schema.ts` (added mode column)

## Validation Results

✅ **Build Status**: All packages compile successfully
✅ **TypeScript**: Full type safety enabled
✅ **Dependencies**: All packages resolved
✅ **Schema**: Migration script created
✅ **API Endpoint**: Implemented and integrated
✅ **Widget**: Voice UI components added
✅ **CORS**: Voice endpoint accessible from client

## Next Steps

1. **Run the dev server**: `pnpm run dev`
2. **Test the widget**: Embed on test website and use voice feature
3. **Monitor logs**: Check API logs for transcription/processing errors
4. **Collect feedback**: Gather user feedback on voice quality
5. **Deploy to production**: Follow your deployment process

---

**Implementation Date**: June 2026
**Status**: ✅ Complete
**Cost**: $0 infrastructure scaling
