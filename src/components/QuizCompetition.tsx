'use client';

export default function QuizCompetition() {
  return (
    <>
      <link rel="stylesheet" href="/quiz/quiz-styles.css" />
      <div dangerouslySetInnerHTML={{ __html: quizContent }} />
      <script dangerouslySetInnerHTML={{ __html: quizScript }} />
    </>
  );
}

const quizContent = `
  <!-- Full quiz HTML here -->
`;

const quizScript = `
  <!-- Full quiz JavaScript here -->
`;