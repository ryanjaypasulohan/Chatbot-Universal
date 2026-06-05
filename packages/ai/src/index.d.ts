import OpenAI from 'openai';

export declare function createGroqClient(apiKey: string): OpenAI;

export declare function transcribeAudio(groq: OpenAI, audioBuffer: Buffer): Promise<string>;

export declare function generateLlamaResponse(
  groq: OpenAI,
  prompt: string,
  contextChunks?: string[],
  maxTokens?: number
): Promise<string>;

export declare function processVoiceMessage(
  groq: OpenAI,
  audioBuffer: Buffer,
  contextChunks?: string[]
): Promise<{ transcription: string; response: string }>;

export type { OpenAI };
