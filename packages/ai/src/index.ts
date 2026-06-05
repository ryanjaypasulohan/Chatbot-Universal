import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize Groq client for speech-to-text and LLM
 */
export function createGroqClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

/**
 * Transcribe audio using Groq Whisper API
 */
export async function transcribeAudio(groq: OpenAI, audioBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file for the audio
    const tempFile = path.join(__dirname, `temp_audio_${Date.now()}.webm`);
    fs.writeFileSync(tempFile, audioBuffer);

    try {
      // @ts-ignore - Groq supports audio transcription via file
      const transcript = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-large-v3',
        language: 'en',
      });

      return transcript.text || '';
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Generate LLM response using Groq Llama
 */
export async function generateLlamaResponse(
  groq: OpenAI,
  prompt: string,
  contextChunks: string[] = [],
  maxTokens: number = 400
): Promise<string> {
  try {
    const systemPrompt = buildSystemPrompt(contextChunks);

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Unable to generate response';
  } catch (error) {
    console.error('LLM error:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Build system prompt with context chunks
 */
function buildSystemPrompt(contextChunks: string[]): string {
  const context =
    contextChunks.length > 0
      ? `You are a helpful website assistant. Use the following information to answer the user's question:\n\n${contextChunks.join('\n\n')}`
      : 'You are a helpful website assistant. Provide concise and accurate answers.';

  return `${context}

Instructions:
- Keep responses concise (2-3 sentences max)
- Be friendly and professional
- If you don't know the answer, say so honestly
- Focus on being helpful and relevant`;
}

/**
 * Extract text from audio file buffer
 */
export async function processVoiceMessage(
  groq: OpenAI,
  audioBuffer: Buffer,
  contextChunks: string[] = []
): Promise<{ transcription: string; response: string }> {
  // Step 1: Transcribe audio
  const transcription = await transcribeAudio(groq, audioBuffer);

  // Step 2: Generate response
  const response = await generateLlamaResponse(groq, transcription, contextChunks);

  return { transcription, response };
}

export type { OpenAI };
