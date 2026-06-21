import db from './index.js';
import { v4 as uuidv4 } from 'uuid';

const insert = db.prepare(
  `INSERT INTO usage_log (id, user_id, feature, model, input_tokens, output_tokens, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

export function logUsage({ userId = null, feature, model, inputTokens = 0, outputTokens = 0 }) {
  try {
    insert.run(uuidv4(), userId, feature, model, inputTokens, outputTokens, new Date().toISOString());
  } catch (err) {
    console.error('[usage_log] failed to log:', err.message);
  }
}

export function getUsageSummary() {
  return db.prepare(
    `SELECT user_id, feature, model,
            SUM(input_tokens) AS input_tokens,
            SUM(output_tokens) AS output_tokens,
            COUNT(*) AS calls,
            DATE(created_at) AS day
     FROM usage_log
     GROUP BY user_id, feature, model, day
     ORDER BY day DESC, calls DESC`
  ).all();
}
