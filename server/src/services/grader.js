import { generate, GRADING_MODEL } from './claude.js';

export function gradeAuto(question, answer) {
  const correct = (question.correct_answer ?? '').trim().toLowerCase();
  const given = (answer ?? '').trim().toLowerCase();
  return correct === given ? 1 : 0;
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
