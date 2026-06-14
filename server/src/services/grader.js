import { generate, GRADING_MODEL } from './claude.js';

// Grade MCQ / true-false locally; grade short answers via Claude (haiku).

export function gradeAuto(question, answer) {
  const correct = (question.correct_answer ?? '').trim().toLowerCase();
  const given = (answer ?? '').trim().toLowerCase();
  return correct === given;
}

export async function gradeShort(question, answer) {
  if (!answer?.trim()) return false;

  const system = 'You are a grader. Assess whether the student answer is correct given the question and rubric. Reply with exactly one word: correct or incorrect.';
  const userText = `Question: ${question.prompt}\nRubric: ${question.rubric ?? 'Match the correct answer closely.'}\nCorrect answer: ${question.correct_answer}\nStudent answer: ${answer}`;

  try {
    const response = await generate({
      model: GRADING_MODEL,
      system,
      messages: [{ role: 'user', content: userText }],
      maxTokens: 8,
    });
    const verdict = (response.content[0]?.text ?? '').trim().toLowerCase();
    return verdict.startsWith('correct');
  } catch {
    // On grading failure, fall back to exact-match
    return gradeAuto(question, answer);
  }
}
