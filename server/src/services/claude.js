import Anthropic from '@anthropic-ai/sdk';
import { getTierConfig, GRADING_MODEL } from '../config/tiers.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class ClaudeError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ClaudeError';
    this.cause = cause;
  }
}

export async function generate({ model, system, messages, maxTokens = 4096 }) {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });
    return response;
  } catch (err) {
    // Wrap all SDK / network errors so callers can catch ClaudeError
    // and know not to persist quiz rows or charge the daily cap.
    throw new ClaudeError(`Claude API call failed: ${err.message}`, err);
  }
}

export function getGenerationConfig(tier) {
  const { generationModel, dailyCap, sourceTokenBudget } = getTierConfig(tier);
  return { model: generationModel, dailyCap, sourceTokenBudget };
}

export { GRADING_MODEL };
