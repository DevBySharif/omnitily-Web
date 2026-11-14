import React, { useEffect, useState } from 'react';
import {
  ArrowsCounterClockwise,
  Circle,
  GridFour,
  Trophy,
  Users,
  X
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[];

const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** The winning player, or null when nobody has won yet. */
export function calculateWinner(board: Board): Player | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function emptyCells(board: Board): number[] {
  return board.map((cell, i) => (cell === null ? i : -1)).filter((i) => i >= 0);
}

function minimaxScore(board: Board, isMaximizing: boolean, ai: Player): number {
  const winner = calculateWinner(board);
  if (winner === ai) return 10;
  if (winner !== null) return -10;
  if (isBoardFull(board)) return 0;
  const current: Player = isMaximizing ? ai : ai === 'X' ? 'O' : 'X';
  const scores = emptyCells(board).map((i) => {
    const next = [...board];
    next[i] = current;
    return minimaxScore(next, !isMaximizing, ai);
  });
  return isMaximizing ? Math.max(...scores) : Math.min(...scores);
}

/**
 * Best move for `player` by minimax (wins when possible, blocks otherwise,
 * never loses). Returns -1 when the board is full.
 */
export function bestMove(board: Board, player: Player): number {
  const cells = emptyCells(board);
  if (cells.length === 0) return -1;
  let bestScore = -Infinity;
  let best = cells[0];
  for (const i of cells) {
    const next = [...board];
    next[i] = player;
    const score = minimaxScore(next, false, player);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

type Mode = 'computer' | 'two-player';

const EMPTY_BOARD: Board = Array(9).fill(null);

export default function TicTacToe({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('computer');
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [turn, setTurn] = useState<Player>('X');
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [announced, setAnnounced] = useState(false);

  const winner = calculateWinner(board);
  const draw = !winner && isBoardFull(board);

  // Computer (O) answers instantly after the player's move.
  useEffect(() => {
    if (mode !== 'computer' || gameOver || turn !== 'O' || winner || draw) return;
    const move = bestMove(board, 'O');
    if (move < 0) return;
    const next = [...board];
    next[move] = 'O';
    setBoard(next);
    setTurn('X');
  }, [board, turn, mode, gameOver, winner, draw]);

  // Announce the result once per game.
  useEffect(() => {
    if (!winner && !draw) return;
    if (announced) return;
    setAnnounced(true);
    setGameOver(true);
    if (winner) {
      setScore((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
      try { confetti({ particleCount: 80, spread: 70 }); } catch (e) {}
      toast.success(winner === 'X' ? 'You Win!' : 'Computer Wins', `${winner} takes this round.`);
    } else {
      setScore((prev) => ({ ...prev, draws: prev.draws + 1 }));
      toast.info("It's a Draw", 'Nobody wins this round.');
    }
  }, [winner, draw, announced, toast]);

  const handleCell = (index: number) => {
    if (gameOver || board[index] !== null) return;
    if (mode === 'computer' && turn !== 'X') return;
    const next = [...board];
    next[index] = turn;
    setBoard(next);
    setTurn(turn === 'X' ? 'O' : 'X');
  };

  const resetBoard = () => {
    setBoard(EMPTY_BOARD);
    setTurn('X');
    setGameOver(false);
    setAnnounced(false);
  };

  const resetAll = () => {
    resetBoard();
    setScore({ X: 0, O: 0, draws: 0 });
  };

  const status = winner
    ? `${winner} wins!`
    : draw
      ? "It's a draw!"
      : mode === 'computer'
        ? turn === 'X' ? 'Your turn (X)' : 'Computer is thinking…'
        : `Player ${turn}'s turn`;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="tic-tac-toe-tool">
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
            Tic-Tac-Toe Board
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Play against an unbeatable computer opponent, or pass the device and play a friend. You are X.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6 items-center">
          <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
            {([
              { id: 'computer', label: 'Vs Computer' },
              { id: 'two-player', label: '2 Players' },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); resetBoard(); }}
                className={`py-2 px-3 text-xs font-semibold rounded border transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  mode === m.id
                    ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]'
                    : 'border-[#2a2a2a] hover:border-gray-700 text-gray-400 bg-transparent'
                }`}
              >
                {m.id === 'two-player' ? <Users className="w-4 h-4" /> : <GridFour className="w-4 h-4" />}
                {m.label}
              </button>
            ))}
          </div>

          <div data-testid="tic-tac-toe-status" className="text-base font-semibold text-white flex items-center gap-2">
            {winner && <Trophy className="w-5 h-5 text-emerald-400" />}
            {status}
          </div>

          <div className="grid grid-cols-3 gap-2" role="grid" aria-label="Tic-tac-toe board">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => handleCell(i)}
                disabled={gameOver || cell !== null}
                aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-[#2a2a2a] bg-[#151515] hover:border-[#10b981]/50 transition-all cursor-pointer flex items-center justify-center disabled:cursor-default"
              >
                {cell === 'X' ? (
                  <X className="w-12 h-12 text-emerald-400" weight="bold" />
                ) : cell === 'O' ? (
                  <Circle className="w-12 h-12 text-rose-400" weight="bold" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetBoard}
              className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowsCounterClockwise className="w-4 h-4" /> New Game
            </button>
            <button
              onClick={resetAll}
              className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              Reset Score
            </button>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Scoreboard</span>
          <div data-testid="tic-tac-toe-score" className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">X (You)</div>
              <div className="text-2xl font-bold text-emerald-300">{score.X}</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Draws</div>
              <div className="text-2xl font-bold text-white">{score.draws}</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">O {mode === 'computer' ? '(CPU)' : ''}</div>
              <div className="text-2xl font-bold text-rose-400">{score.O}</div>
            </div>
          </div>
          <h2 className="font-sans text-lg text-white mb-2">How to win</h2>
          <p className="text-sm text-gray-400">
            Get three of your marks in a row — across, down, or diagonally — before your opponent does. The computer plays perfectly (minimax), so the best you can do against it is a draw. Play perfectly and it can never beat you.
          </p>
          <p className="text-[10px] text-gray-500 mt-4">
            No randomness in the computer&apos;s play: it always picks a move that wins if it can, blocks your win otherwise, and never loses.
          </p>
        </div>
      </div>
    </div>
  );
}
