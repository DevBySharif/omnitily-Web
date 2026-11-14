import React, { useState } from 'react';
import {
  ArrowsCounterClockwise,
  CheckCircle,
  Eraser,
  GridFour,
  Lightbulb,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type SudokuGrid = number[][]; // 9x9, 0 = empty

/** Classic easy puzzle with a unique solution (used by "Load Sample"). */
export const SAMPLE_PUZZLE: SudokuGrid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

export const SAMPLE_SOLUTION: SudokuGrid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

export function emptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map((row) => [...row]);
}

export function gridsEqual(a: SudokuGrid, b: SudokuGrid): boolean {
  return a.every((row, r) => row.every((v, c) => v === b[r][c]));
}

export function isValidPlacement(grid: SudokuGrid, row: number, col: number, value: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === value) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === value) return false;
    }
  }
  return true;
}

/** Full-grid validity: every filled cell obeys row/column/box rules. */
export function isValidGrid(grid: SudokuGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = grid[r][c];
      if (value === 0) continue;
      if (value < 1 || value > 9) return false;
      if (!isValidPlacement(grid, r, c, value)) return false;
    }
  }
  return true;
}

export function isSolved(grid: SudokuGrid): boolean {
  return grid.every((row) => row.every((v) => v !== 0)) && isValidGrid(grid);
}

function findEmptyCell(grid: SudokuGrid): [number, number] | null {
  let best: [number, number] | null = null;
  let bestCount = 10;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      let options = 0;
      for (let v = 1; v <= 9; v++) {
        if (isValidPlacement(grid, r, c, v)) options++;
      }
      if (options === 0) return [r, c];
      if (options < bestCount) {
        bestCount = options;
        best = [r, c];
        if (options === 1) return best;
      }
    }
  }
  return best;
}

/**
 * Solve by backtracking with a most-constrained-cell heuristic.
 * Returns a solved copy, or null when the puzzle has no solution.
 */
export function solveSudoku(grid: SudokuGrid): SudokuGrid | null {
  if (!isValidGrid(grid)) return null;
  const working = cloneGrid(grid);
  const solve = (): boolean => {
    const empty = findEmptyCell(working);
    if (!empty) return true;
    const [row, col] = empty;
    for (let v = 1; v <= 9; v++) {
      if (!isValidPlacement(working, row, col, v)) continue;
      working[row][col] = v;
      if (solve()) return true;
      working[row][col] = 0;
    }
    return false;
  };
  return solve() ? working : null;
}

/** Parse 81 characters (digits, '.' or '0' for empty) from pasted text. Throws on bad input. */
export function parseSudokuInput(text: string): SudokuGrid {
  const chars = text.replace(/[^0-9.]/g, '');
  if (chars.length !== 81) {
    throw new Error(`Need exactly 81 cells (digits, 0 or . for empty) — got ${chars.length}.`);
  }
  const grid = emptyGrid();
  for (let i = 0; i < 81; i++) {
    const ch = chars[i];
    grid[Math.floor(i / 9)][i % 9] = ch === '.' ? 0 : Number(ch);
  }
  return grid;
}

export function gridToText(grid: SudokuGrid): string {
  return grid.map((row) => row.map((v) => (v === 0 ? '.' : String(v))).join('')).join('\n');
}

export default function SudokuSolver({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [grid, setGrid] = useState<SudokuGrid>(() => cloneGrid(SAMPLE_PUZZLE));
  const [given, setGiven] = useState<SudokuGrid>(() => cloneGrid(SAMPLE_PUZZLE));
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState('');
  const [pasteText, setPasteText] = useState('');

  const setCell = (row: number, col: number, raw: string) => {
    setSolved(false);
    setError('');
    const digit = raw.replace(/[^1-9]/g, '').slice(-1);
    const next = cloneGrid(grid);
    next[row][col] = digit === '' ? 0 : Number(digit);
    setGrid(next);
  };

  const handleSolve = () => {
    setError('');
    const solution = solveSudoku(grid);
    if (!solution) {
      const message = 'This puzzle has no solution — check for conflicting numbers (same digit twice in a row, column or box).';
      setError(message);
      toast.error('No Solution', message);
      return;
    }
    setGrid(solution);
    setSolved(true);
    try { confetti({ particleCount: 80, spread: 70 }); } catch (e) {}
    toast.success('Solved!', 'The Sudoku is complete and valid.');
  };

  const handleValidate = () => {
    setError('');
    if (isSolved(grid)) {
      setSolved(true);
      toast.success('Solved!', 'Every row, column and box contains 1–9 exactly once.');
    } else if (isValidGrid(grid)) {
      const remaining = grid.flat().filter((v) => v === 0).length;
      toast.info('Valid So Far', `No conflicts — ${remaining} empty cell${remaining === 1 ? '' : 's'} left.`);
    } else {
      const message = 'There is a conflict: a digit repeats in a row, column or 3x3 box.';
      setError(message);
      toast.error('Invalid Puzzle', message);
    }
  };

  const loadSample = () => {
    setGrid(cloneGrid(SAMPLE_PUZZLE));
    setGiven(cloneGrid(SAMPLE_PUZZLE));
    setSolved(false);
    setError('');
    toast.info('Sample Loaded', 'A classic easy puzzle — press Solve to see it completed.');
  };

  const clearGrid = () => {
    setGrid(emptyGrid());
    setGiven(emptyGrid());
    setSolved(false);
    setError('');
    setPasteText('');
  };

  const loadPasted = () => {
    setError('');
    try {
      const parsed = parseSudokuInput(pasteText);
      setGrid(parsed);
      setGiven(parsed);
      setSolved(false);
      toast.success('Puzzle Loaded', 'Pasted grid loaded — press Solve.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the puzzle.';
      setError(message);
      toast.error('Cannot Load', message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="sudoku-solver-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <GridFour className="w-8 h-8 text-[#10b981]" />
            Mini Sudoku Board
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Type a 9x9 Sudoku, solve it with a real backtracking solver, or check your own solution. A sample puzzle is loaded to start.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col items-center gap-4">
          <div
            className="grid grid-cols-9 gap-0 border-2 border-gray-400 rounded overflow-hidden"
            role="grid"
            aria-label="Sudoku board"
            data-testid="sudoku-board"
          >
            {grid.map((row, r) =>
              row.map((value, c) => {
                const isGiven = given[r][c] !== 0;
                const borderRight = c === 2 || c === 5 ? 'border-r-2 border-r-gray-400' : 'border-r border-r-[#2a2a2a]';
                const borderBottom = r === 2 || r === 5 ? 'border-b-2 border-b-gray-400' : 'border-b border-b-[#2a2a2a]';
                const conflict = value !== 0 && !isValidPlacement(grid, r, c, value);
                return (
                  <input
                    key={`${r}-${c}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value === 0 ? '' : String(value)}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    aria-label={`Cell row ${r + 1} column ${c + 1}`}
                    className={`w-9 h-9 sm:w-11 sm:h-11 text-center text-lg font-bold focus:outline-none focus:bg-emerald-950/40 ${
                      isGiven ? 'text-white bg-[#151515]' : 'text-emerald-300 bg-[#0d0d0d]'
                    } ${borderRight} ${borderBottom} ${conflict ? 'bg-rose-950/50 text-rose-300' : ''}`}
                  />
                );
              })
            )}
          </div>

          {error && (
            <p className="text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3 flex items-start gap-2 w-full">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          {solved && !error && (
            <p className="text-emerald-300 text-sm bg-emerald-950/20 border border-emerald-900/40 rounded-xl px-4 py-3 flex items-center gap-2 w-full">
              <CheckCircle className="w-4 h-4 shrink-0" /> Solved — every row, column and 3x3 box contains 1–9 exactly once.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={handleSolve}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              <Lightbulb className="w-4 h-4" /> Solve Puzzle
            </button>
            <button
              onClick={handleValidate}
              className="py-3 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Check My Solution
            </button>
            <button
              onClick={loadSample}
              className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              Load Sample
            </button>
            <button
              onClick={clearGrid}
              className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Eraser className="w-4 h-4" /> Clear Board
            </button>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="sudoku-paste" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Or paste a puzzle (81 characters: digits, 0 or . for empty)
            </label>
            <textarea
              id="sudoku-paste"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="530070000600195000098000060800060003400803001700020006060000280000419005000080079"
              className="w-full text-sm font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] break-all"
            />
            <button
              onClick={loadPasted}
              className="self-start py-2 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              Load Pasted Puzzle
            </button>
          </div>

          <div>
            <h2 className="font-sans text-lg text-white mb-2">How it works</h2>
            <p className="text-sm text-gray-400">
              The solver uses backtracking: it tries digits in the most constrained empty cell first, backtracks when a choice leads to a dead end, and only stops when every row, column and 3x3 box holds 1–9 exactly once. If the puzzle contradicts itself, it tells you instead of guessing.
            </p>
            <ul className="text-sm text-gray-400 mt-3 flex flex-col gap-1">
              <li><span className="text-white font-semibold">White numbers</span> — the given puzzle clues.</li>
              <li><span className="text-emerald-300 font-semibold">Green numbers</span> — digits you typed or the solver filled in.</li>
              <li><span className="text-rose-300 font-semibold">Red cells</span> — a digit that conflicts with its row, column or box.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
