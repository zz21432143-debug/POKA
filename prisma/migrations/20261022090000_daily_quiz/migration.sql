-- 오늘의 퀴즈: 하루 한 문제(자동 또는 관리자) · 회원 답(한 문제에 한 번)
CREATE TABLE IF NOT EXISTS "DailyQuiz" (
  "id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "choicesJson" TEXT NOT NULL,
  "answer" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'auto',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyQuiz_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyQuiz_day_key" ON "DailyQuiz"("day");

CREATE TABLE IF NOT EXISTS "QuizAnswer" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "choice" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuizAnswer_quizId_userId_key" ON "QuizAnswer"("quizId", "userId");
CREATE INDEX IF NOT EXISTS "QuizAnswer_userId_createdAt_idx" ON "QuizAnswer"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "QuizAnswer_quizId_idx" ON "QuizAnswer"("quizId");
