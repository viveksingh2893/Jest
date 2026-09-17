/**
 * OpenAI Service
 *
 * API key is loaded from your .env file via react-native-dotenv.
 * Copy .env.example → .env and fill in your key:
 *   OPENAI_API_KEY=sk-...
 *
 * Get your key at: https://platform.openai.com/api-keys
 */
import {OPENAI_API_KEY} from '@env';

// ─── Configuration ────────────────────────────────────────────────────────────

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${OPENAI_API_KEY}`,
};


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {role: string; content: string};
    finish_reason: string;
  }>;
  usage: {prompt_tokens: number; completion_tokens: number; total_tokens: number};
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{url: string; revised_prompt?: string}>;
}

export interface TextCompletionResponse {
  text: string;
  model: string;
  tokensUsed: number;
}

// ─── Chat Completion ──────────────────────────────────────────────────────────

/**
 * Send a conversation to GPT and get a reply.
 * @param messages - The full conversation history
 * @param model - GPT model to use (default: gpt-4o-mini)
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  model: string = 'gpt-4o-mini',
): Promise<string> {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as any)?.error?.message ?? `OpenAI error: ${response.status}`,
    );
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

// ─── Image Generation ─────────────────────────────────────────────────────────

/**
 * Generate an image from a text prompt using DALL·E.
 * @param prompt - Description of the image to generate
 * @param size - Image dimensions (default: 1024x1024)
 */
export async function generateImage(
  prompt: string,
  size: '256x256' | '512x512' | '1024x1024' = '1024x1024',
): Promise<{url: string; revisedPrompt?: string}> {
  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as any)?.error?.message ?? `OpenAI error: ${response.status}`,
    );
  }

  const data: ImageGenerationResponse = await response.json();
  const item = data.data[0];
  return {url: item.url, revisedPrompt: item.revised_prompt};
}

// ─── Text Completion ──────────────────────────────────────────────────────────

/**
 * Send a single prompt for text completion / summarization.
 * @param prompt - The user's prompt
 * @param systemPrompt - Optional system instruction
 */
export async function completeText(
  prompt: string,
  systemPrompt: string = 'You are a helpful assistant. Be concise and clear.',
): Promise<TextCompletionResponse> {
  const messages: ChatMessage[] = [
    {role: 'system', content: systemPrompt},
    {role: 'user', content: prompt},
  ];

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as any)?.error?.message ?? `OpenAI error: ${response.status}`,
    );
  }

  const data: ChatCompletionResponse = await response.json();
  return {
    text: data.choices[0]?.message?.content ?? '',
    model: 'gpt-4o-mini',
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}
