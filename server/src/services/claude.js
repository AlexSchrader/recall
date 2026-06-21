import Anthropic from '@anthropic-ai/sdk';
import { getTierConfig, GRADING_MODEL } from '../config/tiers.js';
import { logUsage } from '../db/usageLogDb.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export { client };

export class ClaudeError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ClaudeError';
    this.cause = cause;
  }
}

// Pass _meta: { userId, feature } to get token usage logged automatically.
export async function generate({ model, system, messages, maxTokens = 4096, _meta }) {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });
    if (_meta?.feature) {
      logUsage({
        userId: _meta.userId ?? null,
        feature: _meta.feature,
        model,
        inputTokens:  response.usage?.input_tokens  ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      });
    }
    return response;
  } catch (err) {
    throw new ClaudeError(`Claude API call failed: ${err.message}`, err);
  }
}

export function getGenerationConfig(tier) {
  const { generationModel, dailyCap, sourceTokenBudget } = getTierConfig(tier);
  return { model: generationModel, dailyCap, sourceTokenBudget };
}

export { GRADING_MODEL };
