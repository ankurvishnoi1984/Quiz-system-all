-- Per-participant shuffled question order for multiple-active-question sessions.
ALTER TABLE sessions
  ADD COLUMN random_question_order_enabled TINYINT(1) NOT NULL DEFAULT 0
  AFTER quiz_total_time_minutes;
