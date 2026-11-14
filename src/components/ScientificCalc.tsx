// Scientific Calculator — rebuilt (Wave 5a).
//
// The previous calculator executed user input as JavaScript and was unsafe,
// so the tool was disabled. This version evaluates expressions with a
// hand-written tokenizer + recursive-descent parser. eval() and Function()
// are never used — there is no way for input text to become code.
//
// Grammar (precedence, loosest to tightest):
//   expression := term (('+' | '-') term)*
//   term       := factor (('*' | '/' | '%') factor)*
//   factor     := unary ('^' factor)?            // ^ is right-associative
//   unary      := ('+' | '-') unary | primary
//   primary    := number | constant | function '(' expression ')' | '(' expression ')'
// Functions: sqrt sin cos tan asin acos atan log ln exp abs
//   (log = base 10, ln = natural log; trig uses the selected angle mode)
// Constants: pi, e. '%' is the modulo operator. 'x' and '×' are accepted
// as aliases for '*', '÷' for '/'.

import React, { useState } from 'react';
import { Backspace, Calculator, Divide, Equals, Minus, Plus, WarningCircle, X } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type AngleMode = 'degrees' | 'radians';

export const FUNCTIONS: Record<string, (x: number, angleMode: AngleMode) => number> = {
  sqrt: (x) => {
    if (x < 0) throw new Error('sqrt() is not defined for negative numbers.');
    return Math.sqrt(x);
  },
  sin: (x, mode) => Math.sin(mode === 'degrees' ? (x * Math.PI) / 180 : x),
  cos: (x, mode) => Math.cos(mode === 'degrees' ? (x * Math.PI) / 180 : x),
  tan: (x, mode) => {
    const rad = mode === 'degrees' ? (x * Math.PI) / 180 : x;
    const result = Math.tan(rad);
    if (!Number.isFinite(result) || Math.abs(result) > 1e15) {
      throw new Error('tan() is undefined at this angle (near 90° + k·180°).');
    }
    return result;
  },
  asin: (x, mode) => {
    if (x < -1 || x > 1) throw new Error('asin() needs an argument between -1 and 1.');
    const r = Math.asin(x);
    return mode === 'degrees' ? (r * 180) / Math.PI : r;
  },
  acos: (x, mode) => {
    if (x < -1 || x > 1) throw new Error('acos() needs an argument between -1 and 1.');
    const r = Math.acos(x);
    return mode === 'degrees' ? (r * 180) / Math.PI : r;
  },
  atan: (x, mode) => {
    const r = Math.atan(x);
    return mode === 'degrees' ? (r * 180) / Math.PI : r;
  },
  log: (x) => {
    if (x <= 0) throw new Error('log() needs a positive argument.');
    return Math.log10(x);
  },
  ln: (x) => {
    if (x <= 0) throw new Error('ln() needs a positive argument.');
    return Math.log(x);
  },
  exp: (x) => {
    const r = Math.exp(x);
    if (!Number.isFinite(r)) throw new Error('exp() overflowed.');
    return r;
  },
  abs: (x) => Math.abs(x),
};

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

type Token =
  | { type: 'number'; value: number; pos: number }
  | { type: 'ident'; name: string; pos: number }
  | { type: 'op'; op: string; pos: number }
  | { type: 'lparen'; pos: number }
  | { type: 'rparen'; pos: number };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const match = /^[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?|^[0-9]+\.?[0-9]*(?:[eE][-+]?[0-9]+)?/.exec(input.slice(i));
      if (!match) throw new Error(`Unexpected character "${ch}" at position ${i + 1}.`);
      const text = match[0];
      if (text === '.' || text.endsWith('e') || text.endsWith('E') || /[eE][-+]?$/.test(text)) {
        throw new Error(`Malformed number "${text}" at position ${i + 1}.`);
      }
      tokens.push({ type: 'number', value: Number(text), pos: i });
      i += text.length;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const match = /^[A-Za-z]+/.exec(input.slice(i))!;
      tokens.push({ type: 'ident', name: match[0].toLowerCase(), pos: i });
      i += match[0].length;
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'lparen', pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', pos: i }); i++; continue; }
    if ('+-*/^%'.includes(ch)) { tokens.push({ type: 'op', op: ch, pos: i }); i++; continue; }
    if (ch === '×' || ch === 'x') { tokens.push({ type: 'op', op: '*', pos: i }); i++; continue; }
    if (ch === '÷') { tokens.push({ type: 'op', op: '/', pos: i }); i++; continue; }
    throw new Error(`Unexpected character "${ch}" at position ${i + 1}. Only numbers, + - * / ^ % ( ) and named functions are allowed.`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private angleMode: AngleMode) {}

  parse(): number {
    if (this.tokens.length === 0) throw new Error('Enter an expression to evaluate.');
    const value = this.expression();
    if (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      throw new Error(`Unexpected "${describeToken(tok)}" at position ${tok.pos + 1}.`);
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expression(): number {
    let value = this.term();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.op === '+' || tok.op === '-')) {
        this.pos++;
        const rhs = this.term();
        value = tok.op === '+' ? value + rhs : value - rhs;
      } else {
        return value;
      }
    }
  }

  private term(): number {
    let value = this.factor();
    for (;;) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.op === '*' || tok.op === '/' || tok.op === '%')) {
        this.pos++;
        const rhs = this.factor();
        if (tok.op === '*') value *= rhs;
        else if (tok.op === '/') {
          if (rhs === 0) throw new Error('Division by zero.');
          value /= rhs;
        } else {
          if (rhs === 0) throw new Error('Modulo by zero.');
          value %= rhs;
        }
      } else {
        return value;
      }
    }
  }

  private factor(): number {
    const base = this.unary();
    const tok = this.peek();
    if (tok?.type === 'op' && tok.op === '^') {
      this.pos++;
      const exponent = this.factor(); // right-associative
      const result = Math.pow(base, exponent);
      if (!Number.isFinite(result)) throw new Error('That power is too large to represent.');
      if (Number.isNaN(result)) throw new Error('That power is not a real number (e.g. a negative base with a fractional exponent).');
      return result;
    }
    return base;
  }

  private unary(): number {
    const tok = this.peek();
    if (tok?.type === 'op' && tok.op === '-') {
      this.pos++;
      return -this.unary();
    }
    if (tok?.type === 'op' && tok.op === '+') {
      this.pos++;
      return this.unary();
    }
    return this.primary();
  }

  private primary(): number {
    const tok = this.peek();
    if (!tok) throw new Error('The expression ends unexpectedly — a number, function or "(" was expected.');
    if (tok.type === 'number') {
      this.pos++;
      return tok.value;
    }
    if (tok.type === 'lparen') {
      this.pos++;
      const value = this.expression();
      const close = this.peek();
      if (!close || close.type !== 'rparen') {
        throw new Error(`Missing closing ")" for the "(" at position ${tok.pos + 1}.`);
      }
      this.pos++;
      return value;
    }
    if (tok.type === 'ident') {
      this.pos++;
      if (tok.name in CONSTANTS) return CONSTANTS[tok.name];
      const fn = FUNCTIONS[tok.name];
      if (!fn) {
        throw new Error(`Unknown name "${tok.name}" at position ${tok.pos + 1}. Use pi, e, or a function such as sqrt, sin, cos, tan, log, ln.`);
      }
      const open = this.peek();
      if (!open || open.type !== 'lparen') {
        throw new Error(`"${tok.name}" must be followed by parentheses, e.g. ${tok.name}(x).`);
      }
      this.pos++;
      const arg = this.expression();
      const close = this.peek();
      if (!close || close.type !== 'rparen') {
        throw new Error(`Missing closing ")" for ${tok.name}( at position ${tok.pos + 1}.`);
      }
      this.pos++;
      return fn(arg, this.angleMode);
    }
    throw new Error(`Unexpected "${describeToken(tok)}" at position ${tok.pos + 1} — a number, function or "(" was expected.`);
  }
}

function describeToken(tok: Token): string {
  if (tok.type === 'number') return String(tok.value);
  if (tok.type === 'ident') return tok.name;
  if (tok.type === 'op') return tok.op;
  if (tok.type === 'lparen') return '(';
  return ')';
}

/**
 * Evaluate a mathematical expression safely (tokenizer + recursive descent).
 * Never eval() / Function(). Throws a readable Error on invalid input.
 */
export function evaluateExpression(input: string, angleMode: AngleMode = 'degrees'): number {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter an expression to evaluate.');
  const value = new Parser(tokenize(trimmed), angleMode).parse();
  if (Number.isNaN(value)) throw new Error('The expression does not evaluate to a real number.');
  if (!Number.isFinite(value)) throw new Error('The result is too large to represent.');
  return value;
}

/** Format a result: integers stay whole, other values get up to 10 significant digits. */
export function formatResult(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  const rounded = Number(value.toPrecision(10));
  return String(rounded);
}

const PAD_BUTTONS: { label: string; value: string; kind: 'num' | 'op' | 'fn' | 'action' }[] = [
  { label: '7', value: '7', kind: 'num' },
  { label: '8', value: '8', kind: 'num' },
  { label: '9', value: '9', kind: 'num' },
  { label: '÷', value: '/', kind: 'op' },
  { label: '√', value: 'sqrt(', kind: 'fn' },
  { label: '4', value: '4', kind: 'num' },
  { label: '5', value: '5', kind: 'num' },
  { label: '6', value: '6', kind: 'num' },
  { label: '×', value: '*', kind: 'op' },
  { label: 'x²', value: '^2', kind: 'op' },
  { label: '1', value: '1', kind: 'num' },
  { label: '2', value: '2', kind: 'num' },
  { label: '3', value: '3', kind: 'num' },
  { label: '−', value: '-', kind: 'op' },
  { label: 'sin', value: 'sin(', kind: 'fn' },
  { label: '0', value: '0', kind: 'num' },
  { label: '.', value: '.', kind: 'num' },
  { label: 'π', value: 'pi', kind: 'num' },
  { label: '+', value: '+', kind: 'op' },
  { label: 'cos', value: 'cos(', kind: 'fn' },
  { label: '(', value: '(', kind: 'op' },
  { label: ')', value: ')', kind: 'op' },
  { label: '^', value: '^', kind: 'op' },
  { label: '%', value: '%', kind: 'op' },
  { label: 'tan', value: 'tan(', kind: 'fn' },
];

export default function ScientificCalc({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [expression, setExpression] = useState('2*(3+4)^2');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('degrees');
  const [history, setHistory] = useState<{ expr: string; value: string }[]>([]);

  const evaluate = (expr: string = expression) => {
    setError('');
    try {
      const value = evaluateExpression(expr, angleMode);
      const formatted = formatResult(value);
      setResult(formatted);
      setHistory((prev) => [{ expr: expr.trim(), value: formatted }, ...prev].slice(0, 8));
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Calculated', `${expr.trim()} = ${formatted}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not evaluate the expression.';
      setResult('');
      setError(message);
      toast.error('Cannot Evaluate', message);
    }
  };

  const append = (value: string) => {
    setExpression((prev) => prev + value);
    setError('');
  };

  const clearAll = () => {
    setExpression('');
    setResult('');
    setError('');
  };

  const backspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="scientific-calc-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-[#10b981]" />
            Scientific Calculator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            A safe expression evaluator — your input is parsed as math, never run as code. Try 2*(3+4)^2 = 98.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="calc-expr" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expression</label>
            <input
              id="calc-expr"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') evaluate(); }}
              placeholder="e.g. sqrt(16) + sin(30)"
              spellCheck={false}
              className="text-lg font-mono border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Angle mode:</span>
              {(['degrees', 'radians'] as AngleMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAngleMode(mode)}
                  aria-pressed={angleMode === mode}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border cursor-pointer ${
                    angleMode === mode ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
              <span className="text-[10px] text-gray-500 ml-1">% is modulo · ^ is power (right-associative) · log is base 10</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PAD_BUTTONS.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => append(btn.value)}
                className={`py-2 rounded text-sm font-bold border transition-all cursor-pointer ${
                  btn.kind === 'fn'
                    ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300 hover:bg-emerald-950/60'
                    : btn.kind === 'op'
                      ? 'bg-[#151515] border-[#2a2a2a] text-[#10b981] hover:border-[#10b981]/50'
                      : 'bg-black border-[#222] text-white hover:border-gray-600'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => evaluate()}
              className="flex-1 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Equals className="w-4 h-4" /> Calculate
            </button>
            <button
              onClick={backspace}
              aria-label="Backspace"
              className="py-2.5 px-3 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <Backspace className="w-4 h-4" />
            </button>
            <button
              onClick={clearAll}
              className="py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span data-testid="calc-error">{error}</span>
            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed">
            Supported: + − × ÷ ^ % ( ) · sqrt sin cos tan asin acos atan log ln exp abs · pi e.
            Functions take one argument in parentheses. Input is tokenized and parsed — eval() and Function() are never used.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Result</span>
          {result !== '' ? (
            <div data-testid="calc-result" className="bg-black border border-[#222] p-4 rounded-lg font-mono text-2xl text-emerald-300 break-all">{result}</div>
          ) : (
            <p className="text-gray-500 text-sm">Press Calculate (or Enter). Examples: 2*(3+4)^2 = 98 · sqrt(144) = 12 · sin(30) = 0.5 in degrees.</p>
          )}
          {history.length > 0 && (
            <div className="mt-6">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">History</span>
              <div className="flex flex-col gap-1">
                {history.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setExpression(item.expr); evaluate(item.expr); }}
                    className="flex justify-between gap-3 text-sm font-mono py-1 px-2 rounded hover:bg-[#151515] cursor-pointer text-left"
                  >
                    <span className="text-gray-400 truncate">{item.expr}</span>
                    <span className="text-emerald-300 shrink-0">= {item.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-gray-500 mt-4 flex items-center gap-2">
            <Plus className="w-3 h-3" /><Minus className="w-3 h-3" /><X className="w-3 h-3" /><Divide className="w-3 h-3" />
            Everything runs locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
