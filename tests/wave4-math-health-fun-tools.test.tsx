// Wave 4 — Math + Health & Lifestyle + Fun tools (13 dedicated components).
// Unit tests for the exported pure logic plus a component smoke test per tool
// driving the real UI with known inputs and hand-checked expected outputs.
import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// jsdom has no real canvas, so the confetti celebrations in the components
// would crash their requestAnimationFrame loop — stub it out like the other
// component test files do.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
import { ToastProvider } from '../src/components/Toast';
import MatrixCalc, {
  addMatrices,
  determinant,
  formatMatrix,
  invertMatrix,
  multiplyMatrices,
  parseMatrix,
  subtractMatrices,
  transposeMatrix,
} from '../src/components/MatrixCalc';
import BinaryMath, {
  binaryAdd,
  binaryDivide,
  binaryMultiply,
  binarySubtract,
  binaryToDecimal,
  decimalToBinary,
  isBinaryString,
} from '../src/components/BinaryMath';
import FibonacciGen, {
  fibonacciNth,
  fibonacciSequence,
  goldenRatioApprox,
} from '../src/components/FibonacciGen';
import CalorieCounter, {
  dailyCalorieTarget,
  mifflinStJeorBmr,
  sumCalories,
} from '../src/components/CalorieCounter';
import Planner, {
  minutesToTime,
  sortPlannerTasks,
  tasksOverlap,
  timeToMinutes,
  validatePlannerTask,
} from '../src/components/Planner';
import SleepCalculator, {
  bedtimesForWakeTime,
  formatTime12h,
  wakeTimesFromBedtime,
} from '../src/components/SleepCalculator';
import TicTacToe, {
  bestMove,
  calculateWinner,
  isBoardFull,
} from '../src/components/TicTacToe';
import NamePicker, { parseNames, pickWinnerIndex } from '../src/components/NamePicker';
import LoveCalculator, { loveScore, loveVerdict } from '../src/components/LoveCalculator';
import TriviaQuiz, {
  TRIVIA_QUESTIONS,
  scoreQuiz,
  shuffleArray,
} from '../src/components/TriviaQuiz';
import ReactionTest, { averageMs, reactionRating } from '../src/components/ReactionTest';
import AnagramSolver, {
  findExactAnagrams,
  findWordsFromLetters,
  WORD_LIST,
} from '../src/components/AnagramSolver';
import SudokuSolver, {
  SAMPLE_PUZZLE,
  SAMPLE_SOLUTION,
  isSolved,
  isValidGrid,
  isValidPlacement,
  parseSudokuInput,
  solveSudoku,
} from '../src/components/SudokuSolver';

const back = () => undefined;
const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------- MatrixCalc
describe('MatrixCalc', () => {
  it('parses space/comma separated rows and rejects ragged rows', () => {
    expect(parseMatrix('1 2\n3 4')).toEqual([[1, 2], [3, 4]]);
    expect(parseMatrix('1,2,3\n4,5,6')).toEqual([[1, 2, 3], [4, 5, 6]]);
    expect(() => parseMatrix('1 2\n3')).toThrow(/same number of columns/);
    expect(() => parseMatrix('1 x\n3 4')).toThrow(/not a number/);
  });

  it('multiplies [[1,2],[3,4]] x [[5,6],[7,8]] = [[19,22],[43,50]]', () => {
    expect(multiplyMatrices([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]]);
  });

  it('adds, subtracts, transposes, and finds determinants', () => {
    expect(addMatrices([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[6, 8], [10, 12]]);
    expect(subtractMatrices([[5, 6], [7, 8]], [[1, 2], [3, 4]])).toEqual([[4, 4], [4, 4]]);
    expect(transposeMatrix([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
    expect(determinant([[1, 2], [3, 4]])).toBe(-2);
    expect(determinant([[6, 1, 1], [4, -2, 5], [2, 8, 7]])).toBe(-306);
  });

  it('inverts [[4,7],[2,6]] = [[0.6,-0.7],[-0.2,0.4]] and rejects singular matrices', () => {
    const inv = invertMatrix([[4, 7], [2, 6]]);
    expect(inv[0][0]).toBeCloseTo(0.6, 10);
    expect(inv[0][1]).toBeCloseTo(-0.7, 10);
    expect(inv[1][0]).toBeCloseTo(-0.2, 10);
    expect(inv[1][1]).toBeCloseTo(0.4, 10);
    expect(() => invertMatrix([[1, 2], [2, 4]])).toThrow(/singular/);
    expect(() => multiplyMatrices([[1, 2]], [[1], [2], [3]])).toThrow(/columns = B rows/);
  });

  it('component: default A x B produces the 19/22/43/50 product', () => {
    renderTool(<MatrixCalc onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Calculate/ }));
    const result = screen.getByTestId('matrix-result').textContent ?? '';
    expect(result).toContain('19');
    expect(result).toContain('22');
    expect(result).toContain('43');
    expect(result).toContain('50');
    expect(formatMatrix([[19, 22], [43, 50]])).toContain('19');
  });
});

// ---------------------------------------------------------------- BinaryMath
describe('BinaryMath', () => {
  it('converts both ways and validates input', () => {
    expect(isBinaryString('1010')).toBe(true);
    expect(isBinaryString('102')).toBe(false);
    expect(binaryToDecimal('1010')).toBe(10n);
    expect(decimalToBinary(22n)).toBe('10110');
    expect(decimalToBinary(-3n)).toBe('-11');
  });

  it('computes 1010+1100=10110, 1100-1010=10, 1010x11=11110, 1010/11=11 r 1', () => {
    expect(binaryAdd('1010', '1100')).toBe('10110'); // 10 + 12 = 22
    expect(binarySubtract('1100', '1010')).toBe('10'); // 12 - 10 = 2
    expect(binaryMultiply('1010', '11')).toBe('11110'); // 10 * 3 = 30
    expect(binaryDivide('1010', '11')).toEqual({ quotient: '11', remainder: '1' }); // 10 / 3 = 3 r 1
    expect(() => binaryDivide('1010', '0')).toThrow(/zero/);
    expect(() => binaryAdd('102', '1')).toThrow(/not a binary/);
  });

  it('component: default 1010 + 1100 shows 10110 with decimal 22', () => {
    renderTool(<BinaryMath onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Calculate/ }));
    expect(screen.getByTestId('binary-result').textContent).toBe('10110');
    expect(screen.getByText(/22 in decimal/)).toBeInTheDocument();
  });
});

// -------------------------------------------------------------- FibonacciGen
describe('FibonacciGen', () => {
  it('F(10) = 55 and the first 10 terms are 0,1,1,2,3,5,8,13,21,34', () => {
    expect(fibonacciNth(10)).toBe(55n);
    expect(fibonacciNth(0)).toBe(0n);
    expect(fibonacciNth(1)).toBe(1n);
    expect(fibonacciNth(50)).toBe(12586269025n);
    expect(fibonacciSequence(10)).toEqual([0n, 1n, 1n, 2n, 3n, 5n, 8n, 13n, 21n, 34n]);
    expect(() => fibonacciSequence(0)).toThrow();
    expect(() => fibonacciSequence(501)).toThrow();
  });

  it('the ratio F(n)/F(n-1) converges toward the golden ratio 1.618...', () => {
    const ratio = goldenRatioApprox(20);
    expect(ratio).toBeCloseTo(1.6180339887, 6);
  });

  it('component: 10 terms end at 34 and F(10) reports 55', () => {
    renderTool(<FibonacciGen onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const seq = screen.getByTestId('fib-sequence').textContent ?? '';
    expect(seq).toContain('F(9)');
    expect(seq).toContain('34');
    fireEvent.click(screen.getByRole('button', { name: 'Find F(n)' }));
    expect(screen.getByTestId('fib-nth-result').textContent).toBe('F(10) = 55');
  });
});

// ------------------------------------------------------------- CalorieCounter
describe('CalorieCounter', () => {
  it('Mifflin-St Jeor: man 30y/70kg/175cm = 1648.75, woman = 1482.75', () => {
    expect(mifflinStJeorBmr('male', 70, 175, 30)).toBeCloseTo(1648.75, 6);
    expect(mifflinStJeorBmr('female', 70, 175, 30)).toBeCloseTo(1482.75, 6);
    expect(() => mifflinStJeorBmr('male', 0, 175, 30)).toThrow();
  });

  it('moderate activity (x1.55) turns 1648.75 BMR into a 2555.56 target', () => {
    expect(dailyCalorieTarget(1648.75, 'moderate')).toBeCloseTo(2555.5625, 4);
    expect(sumCalories([
      { id: 'a', name: 'Apple', calories: 95, servings: 1 },
      { id: 'b', name: 'Rice', calories: 205, servings: 2 },
    ])).toBe(505);
  });

  it('component: default profile gives BMR 1,649 and target 2,556; logging an apple totals 95 kcal', () => {
    renderTool(<CalorieCounter onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Target' }));
    const target = screen.getByTestId('calorie-target').textContent ?? '';
    expect(target).toContain('1,649');
    expect(target).toContain('2,556');
    fireEvent.click(screen.getByRole('button', { name: /Add Food/ }));
    const total = screen.getByTestId('calorie-total').textContent ?? '';
    expect(total).toContain('95');
    // "Apple (1 medium)" appears both in the food <select> and in the diary entry.
    expect(screen.getAllByText(/Apple \(1 medium\)/).length).toBeGreaterThanOrEqual(2);
  });
});

// -------------------------------------------------------------------- Planner
describe('Planner', () => {
  it('converts times and detects overlaps (touching ends do not overlap)', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
    const a = { id: 'a', title: 'A', start: '09:00', end: '10:00' };
    const b = { id: 'b', title: 'B', start: '09:30', end: '10:30' };
    const c = { id: 'c', title: 'C', start: '10:00', end: '11:00' };
    expect(tasksOverlap(a, b)).toBe(true);
    expect(tasksOverlap(a, c)).toBe(false);
    expect(validatePlannerTask('X', '10:00', '09:00')).toMatch(/after the start/);
    expect(validatePlannerTask('', '09:00', '10:00')).toMatch(/title/);
    expect(validatePlannerTask('X', '09:00', '10:00')).toBeNull();
    expect(sortPlannerTasks([c, a]).map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('component: adding tasks lists them sorted and flags an overlap', () => {
    renderTool(<Planner onBack={back} />);
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'Deep work' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Task/ }));
    // "Deep work" appears both in the task list and on the day timeline.
    expect(screen.getAllByText('Deep work').length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'Call' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '10:30' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Task/ }));
    // Both tasks overlap each other, so both carry the badge.
    expect(screen.getAllByText('Overlaps')).toHaveLength(2);
    const list = screen.getByTestId('planner-task-list').textContent ?? '';
    expect(list.indexOf('Deep work')).toBeLessThan(list.indexOf('Call'));
  });
});

// ------------------------------------------------------------ SleepCalculator
describe('SleepCalculator', () => {
  it('formats 12-hour times and computes 90-minute cycle bedtimes', () => {
    expect(formatTime12h(1305)).toBe('9:45 PM');
    expect(formatTime12h(45)).toBe('12:45 AM');
    expect(formatTime12h(720)).toBe('12:00 PM');
    // Wake 07:00 (420): 6 cycles -> 9:45 PM, 5 cycles -> 11:15 PM, 4 -> 12:45 AM.
    const options = bedtimesForWakeTime(420);
    expect(options).toHaveLength(6);
    expect(options[0]).toMatchObject({ cycles: 6, bedtimeLabel: '9:45 PM', totalMinutes: 555 });
    expect(options[1]).toMatchObject({ cycles: 5, bedtimeLabel: '11:15 PM' });
    expect(options[2]).toMatchObject({ cycles: 4, bedtimeLabel: '12:45 AM' });
    // Bed 23:00 (1380): 1 cycle -> 12:45 AM, 6 cycles -> 8:15 AM.
    const fromNow = wakeTimesFromBedtime(1380);
    expect(fromNow[0]).toMatchObject({ cycles: 1, wakeLabel: '12:45 AM' });
    expect(fromNow[5]).toMatchObject({ cycles: 6, wakeLabel: '8:15 AM' });
  });

  it('component: wake 07:00 lists 9:45 PM (6 cycles) and 11:15 PM (5 cycles)', () => {
    renderTool(<SleepCalculator onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Calculate Bedtimes/ }));
    const options = screen.getByTestId('sleep-options').textContent ?? '';
    expect(options).toContain('9:45 PM');
    expect(options).toContain('11:15 PM');
    expect(options).toContain('6 cycles');
  });
});

// ------------------------------------------------------------------ TicTacToe
describe('TicTacToe', () => {
  it('detects row/column/diagonal wins and full boards', () => {
    expect(calculateWinner(['X', 'X', 'X', null, null, null, null, null, null])).toBe('X');
    expect(calculateWinner([null, null, null, 'O', 'O', 'O', null, null, null])).toBe('O');
    expect(calculateWinner(['X', null, null, null, 'X', null, null, null, 'X'])).toBe('X');
    expect(calculateWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBeNull();
    expect(isBoardFull(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBe(true);
    expect(isBoardFull(['X', null, 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBe(false);
  });

  it('minimax blocks a winning line and takes a win when available', () => {
    // X threatens the top row; O must block at index 2.
    expect(bestMove(['X', 'X', null, 'O', null, null, null, null, null], 'O')).toBe(2);
    // O can win the top row at index 2.
    expect(bestMove(['O', 'O', null, 'X', 'X', null, null, null, null], 'O')).toBe(2);
    expect(bestMove(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'], 'X')).toBe(-1);
  });

  it('component: computer answers a center X with an O, and 2-player mode detects an X win', () => {
    renderTool(<TicTacToe onBack={back} />);
    fireEvent.click(screen.getByLabelText('Cell 5, empty'));
    expect(screen.getByLabelText(/, O/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2 Players' }));
    fireEvent.click(screen.getByLabelText('Cell 1, empty'));
    fireEvent.click(screen.getByLabelText('Cell 4, empty'));
    fireEvent.click(screen.getByLabelText('Cell 2, empty'));
    fireEvent.click(screen.getByLabelText('Cell 5, empty'));
    fireEvent.click(screen.getByLabelText('Cell 3, empty'));
    expect(screen.getByTestId('tic-tac-toe-status').textContent).toContain('X wins!');
    expect(screen.getByTestId('tic-tac-toe-score').textContent).toContain('1');
  });
});

// ----------------------------------------------------------------- NamePicker
describe('NamePicker', () => {
  it('parses one name per line, trims, and dedupes case-insensitively', () => {
    expect(parseNames('Alice\nBob\n  \n alice\nCAROL')).toEqual(['Alice', 'Bob', 'CAROL']);
    expect(parseNames('')).toEqual([]);
  });

  it('pickWinnerIndex maps a 0–1 random value onto the list', () => {
    expect(pickWinnerIndex(4, 0)).toBe(0);
    expect(pickWinnerIndex(4, 0.5)).toBe(2);
    expect(pickWinnerIndex(4, 0.99)).toBe(3);
    expect(() => pickWinnerIndex(0, 0.5)).toThrow();
  });

  it('component: spinning lands on a winner banner naming one of the four names', () => {
    vi.useFakeTimers();
    renderTool(<NamePicker onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Pick a Winner/ }));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const winner = screen.getByTestId('name-picker-winner').textContent ?? '';
    expect(['Alice', 'Bob', 'Carol', 'Dave'].some((name) => winner.includes(name))).toBe(true);
  });
});

// -------------------------------------------------------------- LoveCalculator
describe('LoveCalculator', () => {
  it('is deterministic, order-independent, and always 30–100', () => {
    const a = loveScore('Alex', 'Sam');
    expect(loveScore('Alex', 'Sam')).toBe(a);
    expect(loveScore('Sam', 'Alex')).toBe(a);
    expect(loveScore('Romeo', 'Juliet')).toBeGreaterThanOrEqual(30);
    expect(loveScore('Romeo', 'Juliet')).toBeLessThanOrEqual(100);
    expect(() => loveScore('', 'Sam')).toThrow();
    expect(loveVerdict(95)).toMatch(/legendary/i);
    expect(loveVerdict(50)).toMatch(/friendly spark/i);
    expect(loveVerdict(35)).toMatch(/friendship/i);
  });

  it('component: two names produce a visible percentage and the for-fun label', () => {
    renderTool(<LoveCalculator onBack={back} />);
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Second name'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /Calculate Compatibility/ }));
    const scoreText = screen.getByTestId('love-score').textContent ?? '';
    expect(scoreText).toMatch(/^\d+%$/);
    expect(Number(scoreText.replace('%', ''))).toBe(loveScore('Alex', 'Sam'));
    expect(screen.getByText(/For entertainment only/)).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------- TriviaQuiz
describe('TriviaQuiz', () => {
  it('the bank is well-formed: 12 questions, 4 options each, valid answer index', () => {
    expect(TRIVIA_QUESTIONS).toHaveLength(12);
    for (const q of TRIVIA_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(new Set(q.options).size).toBe(4);
    }
    const allCorrect = TRIVIA_QUESTIONS.map((q) => q.answerIndex);
    expect(scoreQuiz(allCorrect)).toBe(12);
    expect(scoreQuiz(allCorrect.map((i) => (i + 1) % 4))).toBe(0);
    expect(shuffleArray([1, 2, 3], () => 0.999)).toEqual([1, 2, 3]);
    const shuffled = shuffleArray([1, 2, 3, 4, 5], () => 0.1);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('component: starting, answering the shown question correctly shows "Correct!"', () => {
    renderTool(<TriviaQuiz onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/ }));
    const heading = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    const question = TRIVIA_QUESTIONS.find((q) => q.question === heading);
    expect(question).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: question!.options[question!.answerIndex] }));
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next Question/ })).toBeInTheDocument();
  });
});

// --------------------------------------------------------------- ReactionTest
describe('ReactionTest', () => {
  it('rates times: <200 elite, ~250 average, >500 slow; averages a list', () => {
    expect(reactionRating(180)).toMatch(/Lightning fast/);
    expect(reactionRating(240)).toMatch(/Excellent/);
    expect(reactionRating(300)).toMatch(/average/);
    expect(reactionRating(600)).toMatch(/Slow/);
    expect(averageMs([200, 300, 400])).toBe(300);
    expect(averageMs([])).toBe(0);
  });

  it('component: start -> wait -> green -> click measures ~250 ms', () => {
    vi.useFakeTimers();
    // Pin Math.random to 0 so the green delay is exactly MIN_WAIT_MS (1000 ms).
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    renderTool(<ReactionTest onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Test' }));
    expect(screen.getByTestId('reaction-panel').textContent).toContain('Wait for green');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('reaction-panel').textContent).toContain('CLICK NOW!');
    act(() => {
      vi.advanceTimersByTime(250);
    });
    fireEvent.click(screen.getByTestId('reaction-panel'));
    expect(screen.getByTestId('reaction-result').textContent).toBe('250 ms');
    randomSpy.mockRestore();
  });

  it('component: clicking before green reports a false start', () => {
    vi.useFakeTimers();
    renderTool(<ReactionTest onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Test' }));
    fireEvent.click(screen.getByTestId('reaction-panel'));
    expect(screen.getByTestId('reaction-panel').textContent).toContain('Too soon!');
  });
});

// -------------------------------------------------------------- AnagramSolver
describe('AnagramSolver', () => {
  it('the bundled list has no duplicates', () => {
    expect(new Set(WORD_LIST).size).toBe(WORD_LIST.length);
  });

  it('"listen" unscrambles to enlist, listen, silent, tinsel', () => {
    expect(findExactAnagrams('listen')).toEqual(['enlist', 'listen', 'silent', 'tinsel']);
    expect(findExactAnagrams('race')).toEqual(['care', 'race']);
    expect(findExactAnagrams('dusty')).toEqual(['dusty', 'study']);
    expect(findExactAnagrams('zzz')).toEqual([]);
    expect(findExactAnagrams('a')).toEqual([]);
  });

  it('"stop" yields stop/tops/pots/spot/post plus shorter words like top and pot', () => {
    const words = findWordsFromLetters('stop');
    for (const w of ['stop', 'tops', 'pots', 'spot', 'post', 'top', 'pot']) {
      expect(words).toContain(w);
    }
    expect(words[0].length).toBe(4);
  });

  it('component: solving "listen" lists silent and tinsel', () => {
    renderTool(<AnagramSolver onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Solve Anagram/ }));
    const results = screen.getByTestId('anagram-results').textContent ?? '';
    expect(results).toContain('silent');
    expect(results).toContain('tinsel');
    expect(results).toContain('enlist');
  });
});

// --------------------------------------------------------------- SudokuSolver
describe('SudokuSolver', () => {
  it('solves the sample puzzle to the known solution', () => {
    const solved = solveSudoku(SAMPLE_PUZZLE);
    expect(solved).not.toBeNull();
    expect(solved).toEqual(SAMPLE_SOLUTION);
    expect(isSolved(SAMPLE_SOLUTION)).toBe(true);
    expect(isSolved(SAMPLE_PUZZLE)).toBe(false);
  });

  it('validates placements and rejects contradictory puzzles', () => {
    expect(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 4)).toBe(true);
    expect(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 5)).toBe(false); // 5 already in row 0
    expect(isValidPlacement(SAMPLE_PUZZLE, 0, 2, 3)).toBe(false); // 3 already in box
    const bad = SAMPLE_PUZZLE.map((row) => [...row]);
    bad[0][1] = 5; // duplicates the 5 at (0,0)
    expect(isValidGrid(bad)).toBe(false);
    expect(solveSudoku(bad)).toBeNull();
    expect(parseSudokuInput('530070000600195000098000060800060003400803001700020006060000280000419005000080079')).toEqual(SAMPLE_PUZZLE);
    expect(() => parseSudokuInput('123')).toThrow(/81/);
  });

  it('component: Solve Puzzle completes the sample grid (row 1 becomes 5 3 4 6 7 8 9 1 2)', () => {
    renderTool(<SudokuSolver onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /Solve Puzzle/ }));
    const cell = screen.getByLabelText('Cell row 1 column 3') as HTMLInputElement;
    expect(cell.value).toBe('4');
    const cell2 = screen.getByLabelText('Cell row 9 column 9') as HTMLInputElement;
    expect(cell2.value).toBe('9');
    expect(screen.getByText(/Solved — every row, column and 3x3 box/)).toBeInTheDocument();
  });
});
