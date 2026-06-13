import 'dotenv/config';
import { generate, getGenerationConfig, ClaudeError } from '../src/services/claude.js';

const { model } = getGenerationConfig('free');

console.log(`Smoke-testing with model: ${model}`);

try {
  const response = await generate({
    model,
    system: 'You are a helpful assistant.',
    messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
    maxTokens: 16,
  });

  const text = response.content[0]?.text ?? '';
  console.log(`Response: ${text}`);
  console.log('Smoke test passed.');
} catch (err) {
  if (err instanceof ClaudeError) {
    console.error('ClaudeError (expected type for failed calls):', err.message);
  } else {
    console.error('Unexpected error:', err);
  }
  process.exit(1);
}
