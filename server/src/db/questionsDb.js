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
  listGame: db.prepare(
    `SELECT DISTINCT q.id, q.prompt, q.options_json, q.correct_answer, q.topic, q.explanation, q.difficulty
     FROM questions q
     JOIN quizzes qz ON qz.id = q.quiz_id
     JOIN json_each(qz.source_unit_ids) AS unit_ref ON 1=1
     JOIN units u ON u.id = unit_ref.value
     WHERE qz.user_id = ?
       AND qz.status = 'completed'
       AND q.type = 'mcq'
       AND (? IS NULL OR unit_ref.value = ?)
       AND (? IS NULL OR u.course_id = ?)
       AND (? IS NULL OR q.topic = ?)
     ORDER BY RANDOM()
     LIMIT ?`
  ),
  getCourseTopic: db.prepare(
    `SELECT q.topic, u.course_id
     FROM questions q
     JOIN quizzes qz ON qz.id = q.quiz_id
     JOIN json_each(qz.source_unit_ids) AS unit_ref ON 1=1
     JOIN units u ON u.id = unit_ref.value
     WHERE q.id = ? AND qz.user_id = ?
     LIMIT 1`
  ),
};

export function getQuestionById(id) {
  return stmts.findById.get(id);
}

export function listQuestionsByQuiz(quizId) {
  return stmts.listByQuiz.all(quizId);
}

export function listGameQuestions(userId, { unitId = null, courseId = null, topic = null, limit = 10 } = {}) {
  return stmts.listGame.all(userId, unitId, unitId, courseId, courseId, topic, topic, Number(limit));
}

export function getQuestionCourseAndTopic(questionId, userId) {
  return stmts.getCourseTopic.get(questionId, userId) ?? null;
}
