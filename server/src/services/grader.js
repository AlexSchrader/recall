import { generate, GRADING_MODEL } from './claude.js';

export function gradeAuto(question, answer) {
  const correct = (question.correct_answer ?? '').trim().toLowerCase();
  const given = (answer ?? '').trim().toLowerCase();
  return correct === given ? 1 : 0;
}

// Parse a comma-separated letter answer ("A,C") into a normalised Set {A,C}.
function parseLetters(str) {
  return new Set(
    (str ?? '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  );
}

// Multiple-answer ("select all that apply") grading with partial credit.
// correct_answer and the student answer are both comma-separated letters.
// Score = (correct picks − wrong picks) / total correct, clamped to [0,1],
// then bucketed to 1 / 0.5 / 0 to match the rest of the grading pipeline.
// Selecting everything nets zero (wrong picks cancel the right ones), so it
// can't be gamed.
export function gradeMulti(question, answer) {
  const correctSet = parseLetters(question.correct_answer);
  const givenSet = parseLetters(answer);
  if (correctSet.size === 0 || givenSet.size === 0) return 0;

  let right = 0, wrong = 0;
  for (const letter of givenSet) {
    if (correctSet.has(letter)) right += 1;
    else wrong += 1;
  }

  const fraction = Math.max(0, (right - wrong) / correctSet.size);
  if (fraction >= 1) return 1;
  return fraction > 0 ? 0.5 : 0;
}

// Fill-in-the-blank grading. Deterministic (no AI cost): normalise case,
// surrounding punctuation and whitespace, and forgive a leading article so
// "the mitochondria" matches "mitochondria".
function normalizeCloze(s) {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"()]/g, '')
    .replace(/\s+/g, ' ');
}

export function gradeCloze(question, answer) {
  const given = normalizeCloze(answer);
  if (!given) return 0;
  const correct = normalizeCloze(question.correct_answer);
  if (given === correct) return 1;
  const stripArticle = s => s.replace(/^(the|a|an)\s+/, '');
  return stripArticle(given) === stripArticle(correct) ? 1 : 0;
}

export async function gradeShort(question, answer, userId = null) {
  if (!answer?.trim()) return 0;

  const system = `You are a lenient, fair grader for a student quiz.
Reply with ONLY one of three words: correct, partial, or incorrect.
- correct: student clearly understands the concept, even if phrasing or wording differs from the model answer
- partial: student shows some understanding but misses key details, is too vague, or gets part of a multi-part answer
- incorrect: fundamentally wrong, unrelated, or blank
Be generous — reward understanding, not memorized wording.`;

  const userText = `Question: ${question.prompt}
Rubric: ${question.rubric ?? 'Credit the core concept. Accept paraphrasing and minor inaccuracies.'}
Model answer: ${question.correct_answer}
Student answer: ${answer}`;

  try {
    const response = await generate({
      model: GRADING_MODEL,
      system,
      messages: [{ role: 'user', content: userText }],
      maxTokens: 8,
      _meta: { userId, feature: 'grading' },
    });
    const verdict = (response.content[0]?.text ?? '').trim().toLowerCase();
    if (verdict.startsWith('correct')) return 1;
    if (verdict.startsWith('partial')) return 0.5;
    return 0;
  } catch {
    return gradeAuto(question, answer);
  }
}
