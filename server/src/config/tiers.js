const GRADING_MODEL = 'claude-haiku-4-5';

export const TIERS = {
  free: {
    generationModel: 'claude-haiku-4-5',
    dailyCap: 5,
    sourceTokenBudget: 50_000,
  },
  plus: {
    generationModel: 'claude-sonnet-4-6',
    dailyCap: 20,
    sourceTokenBudget: 150_000,
  },
  pro: {
    generationModel: 'claude-opus-4-8',
    dailyCap: 50,
    sourceTokenBudget: 500_000,
  },
};

export function getTierConfig(tier) {
  const config = TIERS[tier];
  if (!config) throw new Error(`Unknown tier: ${tier}`);
  return config;
}

export { GRADING_MODEL };
