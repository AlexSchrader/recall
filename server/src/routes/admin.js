import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getUsageSummary, getMonthlyByUser } from '../db/usageLogDb.js';
import { listFeedback } from '../db/feedbackDb.js';
import db from '../db/index.js';

const router = Router();

// Cost per million tokens (input / output) — update if Anthropic changes pricing
const PRICING = {
  'claude-haiku-4-5':          { in: 0.80,  out: 4.00 },
  'claude-haiku-4-5-20251001': { in: 0.80,  out: 4.00 },
  'claude-sonnet-4-6':         { in: 3.00,  out: 15.00 },
  'claude-opus-4-8':           { in: 15.00, out: 75.00 },
};

function estimateCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] ?? { in: 3.00, out: 15.00 };
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

// GET /api/admin/usage  — detailed daily breakdown + monthly totals
router.get('/admin/usage', requireAuth, requireAdmin, (req, res) => {
  const month = req.query.month ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const rows     = getUsageSummary();
  const monthly  = getMonthlyByUser(month);
  const allUsers = db.prepare('SELECT id, display_name, tier, created_at FROM users ORDER BY created_at').all();

  // Attach estimated cost to each row
  const detail = rows.map(r => ({
    ...r,
    est_cost_usd: estimateCost(r.model, r.input_tokens, r.output_tokens),
  }));

  const monthlyWithCost = monthly.map(r => ({
    ...r,
    est_cost_usd: rows
      .filter(d => d.user_id === r.user_id && d.day?.startsWith(month))
      .reduce((sum, d) => sum + estimateCost(d.model, d.input_tokens, d.output_tokens), 0),
  }));

  const totalCostAllTime = detail.reduce((s, r) => s + r.est_cost_usd, 0);

  res.json({
    month,
    totalCostAllTime,
    allUsers,
    monthly: monthlyWithCost,
    detail,
  });
});

// GET /api/admin/feedback
router.get('/admin/feedback', requireAuth, requireAdmin, (req, res) => {
  res.json(listFeedback());
});

export default router;
