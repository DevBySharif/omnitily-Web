import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Play,
  Question,
  Trophy,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface TriviaQuestion {
  question: string;
  options: string[];
  /** Index of the correct option (0–3). */
  answerIndex: number;
  category: string;
  fact: string;
}

/** Built-in offline question bank — no network needed. */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    answerIndex: 1,
    category: 'Science',
    fact: 'Mars looks red because its surface is rich in iron oxide — rust.',
  },
  {
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    answerIndex: 3,
    category: 'Geography',
    fact: 'The Pacific covers about 63 million square miles — more than all land on Earth combined.',
  },
  {
    question: 'How many sides does a hexagon have?',
    options: ['5', '6', '7', '8'],
    answerIndex: 1,
    category: 'Math',
    fact: 'Hexa- means six: a hexagon has six sides and six angles.',
  },
  {
    question: 'Which gas do plants absorb from the air?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    answerIndex: 2,
    category: 'Science',
    fact: 'Plants take in carbon dioxide and release oxygen during photosynthesis.',
  },
  {
    question: 'What is the capital city of Japan?',
    options: ['Seoul', 'Beijing', 'Bangkok', 'Tokyo'],
    answerIndex: 3,
    category: 'Geography',
    fact: 'Tokyo has been Japan’s capital since 1868.',
  },
  {
    question: 'Which animal is the largest land mammal?',
    options: ['Hippopotamus', 'Giraffe', 'African elephant', 'Polar bear'],
    answerIndex: 2,
    category: 'Nature',
    fact: 'An African elephant can weigh up to 6 tonnes.',
  },
  {
    question: 'What is 15 × 4?',
    options: ['45', '50', '60', '75'],
    answerIndex: 2,
    category: 'Math',
    fact: '15 × 4 = 60.',
  },
  {
    question: 'Who wrote the play "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    answerIndex: 1,
    category: 'Literature',
    fact: 'Shakespeare wrote Romeo and Juliet around 1595.',
  },
  {
    question: 'Which instrument has 88 keys?',
    options: ['Guitar', 'Violin', 'Piano', 'Harp'],
    answerIndex: 2,
    category: 'Music',
    fact: 'A standard piano has 52 white keys and 36 black keys — 88 in total.',
  },
  {
    question: 'What is the chemical symbol for gold?',
    options: ['Gd', 'Go', 'Au', 'Ag'],
    answerIndex: 2,
    category: 'Science',
    fact: 'Au comes from "aurum", the Latin word for gold. Ag is silver.',
  },
  {
    question: 'Which country is home to the kangaroo?',
    options: ['New Zealand', 'South Africa', 'India', 'Australia'],
    answerIndex: 3,
    category: 'Geography',
    fact: 'Kangaroos are native to Australia and appear on its coat of arms.',
  },
  {
    question: 'How many minutes are in 2.5 hours?',
    options: ['120', '130', '150', '180'],
    answerIndex: 2,
    category: 'Math',
    fact: '2.5 × 60 = 150 minutes.',
  },
];

/** Count correct answers; `answers` holds the chosen option index per question (or -1 for skipped). */
export function scoreQuiz(answers: number[]): number {
  return answers.reduce((total, chosen, i) => {
    const question = TRIVIA_QUESTIONS[i];
    return total + (question && chosen === question.answerIndex ? 1 : 0);
  }, 0);
}

/** Non-mutating Fisher–Yates shuffle with an injectable random source. */
export function shuffleArray<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Phase = 'intro' | 'playing' | 'done';

export default function TriviaQuiz({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('intro');
  const [order, setOrder] = useState<TriviaQuestion[]>(TRIVIA_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [best, setBest] = useState<number>(() => {
    try {
      return Number(window.localStorage.getItem('omnitily:trivia-best') ?? 0) || 0;
    } catch (e) {
      return 0;
    }
  });

  const startQuiz = () => {
    setOrder(shuffleArray(TRIVIA_QUESTIONS));
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setPhase('playing');
  };

  const choose = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const question = order[current];
    setAnswers((prev) => [...prev, index]);
    if (index === question.answerIndex) {
      toast.success('Correct!', question.fact);
    } else {
      toast.error('Not quite', `${question.fact} The correct answer was "${question.options[question.answerIndex]}".`);
    }
  };

  const nextQuestion = () => {
    if (current + 1 >= order.length) {
      const shuffledScore = answers.reduce((total, chosen, i) => total + (chosen === order[i].answerIndex ? 1 : 0), 0);
      setPhase('done');
      if (shuffledScore > best) {
        setBest(shuffledScore);
        try {
          window.localStorage.setItem('omnitily:trivia-best', String(shuffledScore));
        } catch (e) {}
      }
      if (shuffledScore >= 9) {
        try { confetti({ particleCount: 120, spread: 80 }); } catch (e) {}
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setPhase('intro');
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
  };

  const finalScore = phase === 'done'
    ? answers.reduce((total, chosen, i) => total + (chosen === order[i].answerIndex ? 1 : 0), 0)
    : 0;
  const question = order[current];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="trivia-quiz-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Question className="w-8 h-8 text-[#10b981]" />
            Offline General Trivia
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {TRIVIA_QUESTIONS.length} general-knowledge questions, shuffled every round. No internet needed — everything is built in.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
        {phase === 'intro' && (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <Question className="w-12 h-12 text-[#10b981]" />
            <h2 className="font-sans text-xl text-white">Ready to test yourself?</h2>
            <p className="text-sm text-gray-400">
              Answer {TRIVIA_QUESTIONS.length} multiple-choice questions covering science, geography, math, nature, literature and music.
              Each answer shows a quick fact, so you learn as you play.
            </p>
            {best > 0 && (
              <p className="text-sm text-emerald-300 font-semibold flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> Best score on this device: {best} / {TRIVIA_QUESTIONS.length}
              </p>
            )}
            <button
              onClick={startQuiz}
              className="py-3 px-6 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              <Play className="w-4 h-4" /> Start Quiz
            </button>
          </div>
        )}

        {phase === 'playing' && question && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Question {current + 1} of {order.length}</span>
              <span className="font-bold text-[#10b981] uppercase tracking-widest">{question.category}</span>
              <span>Score so far: {answers.filter((a, i) => a === order[i].answerIndex).length}</span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10b981] transition-all"
                style={{ width: `${((current + (selected !== null ? 1 : 0)) / order.length) * 100}%` }}
              />
            </div>
            <h2 className="font-sans text-xl text-white">{question.question}</h2>
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((option, i) => {
                const isCorrect = i === question.answerIndex;
                const isChosen = selected === i;
                let classes = 'border-[#2a2a2a] hover:border-[#10b981]/50 text-gray-200 bg-[#151515]';
                if (selected !== null) {
                  if (isCorrect) classes = 'border-emerald-500 bg-emerald-950/30 text-emerald-300';
                  else if (isChosen) classes = 'border-rose-500 bg-rose-950/30 text-rose-300';
                  else classes = 'border-[#2a2a2a] text-gray-500 bg-[#151515]';
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={selected !== null}
                    className={`text-left py-3 px-4 rounded-lg border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${classes}`}
                  >
                    {selected !== null && isCorrect && <CheckCircle className="w-4 h-4 shrink-0" />}
                    {selected !== null && isChosen && !isCorrect && <WarningCircle className="w-4 h-4 shrink-0" />}
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-400 bg-[#151515] border border-[#2a2a2a] rounded-lg px-4 py-3">
                  {question.fact}
                </p>
                <button
                  onClick={nextQuestion}
                  className="self-end py-2.5 px-5 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer"
                >
                  {current + 1 >= order.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <Trophy className="w-12 h-12 text-[#10b981]" />
            <h2 className="font-sans text-xl text-white">Quiz Complete!</h2>
            <div data-testid="trivia-score" className="text-5xl font-bold text-emerald-300 font-mono">
              {finalScore} / {order.length}
            </div>
            <p className="text-sm text-gray-400">
              {finalScore === order.length
                ? 'A perfect score — outstanding!'
                : finalScore >= 9
                  ? 'Excellent work — you know your stuff.'
                  : finalScore >= 6
                    ? 'A solid score. Play again to beat it.'
                    : 'A good warm-up — the facts stick better the second time around.'}
            </p>
            <p className="text-xs text-gray-500">Best score on this device: {Math.max(best, finalScore)} / {order.length}</p>
            <div className="flex gap-2">
              <button
                onClick={startQuiz}
                className="py-3 px-5 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
              >
                <Play className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={restart}
                className="py-3 px-5 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowsCounterClockwise className="w-4 h-4" /> Back to Start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
