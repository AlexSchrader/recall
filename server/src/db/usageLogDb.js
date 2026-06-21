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

// Per-day, per-user, per-feature summary with display names
export function getUsageSummary() {
  return db.prepare(
    `SELECT ul.user_id,
            COALESCE(u.display_name, ul.user_id) AS display_name,
            ul.feature,
            ul.model,
            SUM(ul.input_tokens)  AS input_tokens,
            SUM(ul.output_tokens) AS output_tokens,
            COUNT(*)              AS calls,
            DATE(ul.created_at)   AS day
     FROM usage_log ul
     LEFT JOIN users u ON u.id = ul.user_id
     GROUP BY ul.user_id, ul.feature, ul.model, day
     ORDER BY day DESC, output_tokens DESC`
  ).all();
}

// Aggregate totals per user for a given month (YYYY-MM)
export function getMonthlyByUser(month) {
  return db.prepare(
    `SELECT ul.user_id,
            COALESCE(u.display_name, ul.user_id) AS display_name,
            SUM(ul.input_tokens)  AS input_tokens,
            SUM(ul.output_tokens) AS output_tokens,
            COUNT(*)              AS calls
     FROM usage_log ul
     LEFT JOIN users u ON u.id = ul.user_id
     WHERE strftime('%Y-%m', ul.created_at) = ?
     GROUP BY ul.user_id
     ORDER BY output_tokens DESC`
  ).all(month);
}
