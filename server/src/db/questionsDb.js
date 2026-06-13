import db from './index.js';

const insert = db.prepare(
  `INSERT INTO questions
   (id, quiz_id, position, type, topic, prompt, options_json,
    correct_answer, rubric, explanation, source_ref, difficulty, is_review)
   VALUES
   (@id, @quiz_id, @position, @type, @topic, @prompt, @options_json,
    @correct_answer, @rubric, @explanation, @source_ref, @difficulty, @is_review)`
);

// Wrap multi-insert in a transaction for atomic batch writes
export const bulkCreateQuestions = db.transaction((questions) => {
  for (const q of questions) {
    insert.run(q);
  }
});

const stmts = {
  findById: db.prepare('SELECT * FROM questions WHERE id = ?'),
  listByQuiz: db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY position'
  ),
};

export function getQuestionById(id) {
  return stmts.findById.get(id);
}

export function listQuestionsByQuiz(quizId) {
  return stmts.listByQuiz.all(quizId);
}
