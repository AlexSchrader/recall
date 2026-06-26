// SM-2 spaced-repetition algorithm.
// quality: 0–5 (we use 4 for correct, 1 for incorrect)

// Map an answer's correctness + the student's stated confidence to an SM-2
// quality (0–5). Confidence sharpens the signal: getting something right while
// guessing shouldn't reinforce as strongly (lower quality → ease drops → it
// comes back sooner), while a confident-correct earns the full boost. Confidence
// is optional — `null`/unknown falls back to neutral defaults so older clients
// keep working unchanged.
export function qualityFromAnswer(score, confidence) {
  if (score >= 1) { // correct
    if (confidence === 'confident') return 5;
    if (confidence === 'guess')     return 3;
    return 4; // unsure / unspecified
  }
  if (score >= 0.5) { // partial
    return confidence === 'guess' ? 2 : 3;
  }
  return confidence === 'confident' ? 0 : 2; // wrong (confidently wrong = hardest)
}

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
