// Exam countdown helpers. exam_date is a 'YYYY-MM-DD' string (or null).

// Whole days from local midnight today to the exam date.
// Negative = past, 0 = today, positive = future. null/invalid → null.
export function daysUntilExam(examDate) {
  if (!examDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate);
  if (!m) return null;
  const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(exam.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exam - today) / 86_400_000);
}

// Short human label for a countdown badge. null → null (no badge).
export function examCountdownLabel(examDate) {
  const d = daysUntilExam(examDate);
  if (d === null) return null;
  if (d < 0)  return 'Exam passed';
  if (d === 0) return 'Exam today';
  if (d === 1) return 'Exam tomorrow';
  return `${d} days to exam`;
}

// Urgency tier for color: 'past' | 'urgent' (≤3) | 'soon' (≤7) | 'far'. null → null.
export function examUrgency(examDate) {
  const d = daysUntilExam(examDate);
  if (d === null) return null;
  if (d < 0)  return 'past';
  if (d <= 3) return 'urgent';
  if (d <= 7) return 'soon';
  return 'far';
}
