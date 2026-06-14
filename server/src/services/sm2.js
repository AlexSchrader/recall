// SM-2 spaced-repetition algorithm.
// quality: 0–5 (we use 4 for correct, 1 for incorrect)

export function sm2Next(current, quality) {
  let { ease, interval_days, repetitions } = current;

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease);

    ease = ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    ease = Math.max(1.3, ease);
    repetitions += 1;
  } else {
    // Incorrect: restart interval, keep ease
    repetitions = 0;
    interval_days = 1;
  }

  // mastery: smooth approach to 1.0 based on repetitions and ease
  const mastery = Math.min(1.0, 1 - Math.exp(-repetitions * 0.3));
  const due_at = new Date(Date.now() + interval_days * 86_400_000).toISOString();

  return { ease, interval_days, repetitions, mastery, due_at };
}
