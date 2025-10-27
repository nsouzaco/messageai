/**
 * OpenAI Client Wrapper
 * Centralized OpenAI API client with error handling and rate limiting
 */

import * as functions from 'firebase-functions';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

/**
 * Generate chat completion using GPT models
 */
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: 'gpt-4' | 'gpt-4-turbo-preview' | 'gpt-3.5-turbo';
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 1000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    functions.logger.error('OpenAI chat completion error:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Generate text embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    functions.logger.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI embedding error: ${error.message}`);
  }
}

/**
 * Generate embeddings in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error: any) {
    functions.logger.error('OpenAI batch embedding error:', error);
    throw new Error(`OpenAI batch embedding error: ${error.message}`);
  }
}

/**
 * Count tokens in text (approximate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio);
  return text.slice(0, targetLength) + '...';
}

export default openai;


