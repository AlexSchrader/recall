// Exam-readiness scoring — turns a course's per-topic mastery into a single
// "how ready am I" signal. Pure, so it's easy to reason about and reuse.
//
// Readiness is the mean mastery across the topics we've actually seen for the
// course (0..1). Coverage (how many topics have data) is returned alongside so
// the UI can hedge — "72% across 6 topics" reads differently from "1 topic".

export function courseReadiness(topics = []) {
  const seen = topics.filter(t => (t.mastery ?? 0) > 0 || t.repetitions > 0);
  if (!seen.length) return { score: 0, topicCount: 0, seenCount: 0, ready: false };
  const score = seen.reduce((s, t) => s + (t.mastery ?? 0), 0) / seen.length;
  return { score, topicCount: topics.length, seenCount: seen.length, ready: score >= 0.8 };
}

export function readinessColor(score) {
  return score >= 0.8 ? 'var(--success)' : score >= 0.5 ? 'var(--warning)' : 'var(--danger)';
}

export function readinessLabel(score) {
  if (score >= 0.8) return 'Exam-ready';
  if (score >= 0.6) return 'Almost there';
  if (score >= 0.4) return 'Getting there';
  if (score > 0)    return 'Keep going';
  return 'Not started';
}
