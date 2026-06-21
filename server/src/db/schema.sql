CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  passphrase_hash TEXT NOT NULL,
  tier            TEXT NOT NULL DEFAULT 'free',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id             TEXT PRIMARY KEY,
  unit_id        TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  kind           TEXT NOT NULL,
  extracted_text TEXT,
  image_data     BLOB,
  parse_status   TEXT NOT NULL DEFAULT 'pending',
  token_estimate INTEGER,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  source_unit_ids TEXT NOT NULL,
  config_json     TEXT NOT NULL,
  score           REAL,
  status          TEXT NOT NULL DEFAULT 'generated',
  model           TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id             TEXT PRIMARY KEY,
  quiz_id        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  type           TEXT NOT NULL,
  topic          TEXT NOT NULL,
  prompt         TEXT NOT NULL,
  options_json   TEXT,
  correct_answer TEXT,
  rubric         TEXT,
  explanation    TEXT NOT NULL,
  source_ref     TEXT,
  difficulty     TEXT NOT NULL,
  is_review      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
  id           TEXT PRIMARY KEY,
  question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  given_answer TEXT,
  is_correct   INTEGER NOT NULL,
  answered_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_mastery (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  ease          REAL    NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions   INTEGER NOT NULL DEFAULT 0,
  mastery       REAL    NOT NULL DEFAULT 0.0,
  due_at        TEXT NOT NULL,
  last_seen_at  TEXT,
  UNIQUE(user_id, topic, course_id)
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT PRIMARY KEY,
  sess       TEXT NOT NULL,
  expired_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               TEXT PRIMARY KEY,
  thread_id        TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  attachments_json TEXT,
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_user    ON chat_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS flashcard_decks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id    TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id               TEXT PRIMARY KEY,
  deck_id          TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  front            TEXT NOT NULL,
  back             TEXT NOT NULL,
  topic            TEXT NOT NULL,
  ease             REAL    NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  due_at           TEXT NOT NULL,
  last_reviewed_at TEXT,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_guides (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id    TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  model      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_decks_unit    ON flashcard_decks(unit_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck    ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_due     ON flashcards(user_id, due_at);

-- Query-path indexes
CREATE TABLE IF NOT EXISTS feedback (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  type           TEXT NOT NULL,
  message        TEXT NOT NULL,
  has_screenshot INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_user      ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_units_course      ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_docs_unit         ON documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user      ON quizzes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_quiz    ON questions(quiz_id, position);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user     ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_due       ON topic_mastery(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_mastery_score     ON topic_mastery(user_id, mastery);
