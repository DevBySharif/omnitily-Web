// BMR Calculator — rebuilt (Wave 5a).
//
// The previous implementation displayed a fabricated health calculation, so
// the tool was disabled. This version uses the Mifflin-St Jeor equation —
// the standard, peer-reviewed BMR formula — and labels the result as a
// general estimate, explicitly not medical advice.

import React, { useState } from 'react';
import { CheckCircle, Gauge, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export type Sex = 'male' | 'female';

export interface BmrInputs {
  ageYears: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
}

export interface ActivityLevel {
  key: string;
  label: string;
  multiplier: number;
  description: string;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { key: 'sedentary', label: 'Sedentary', multiplier: 1.2, description: 'Little or no exercise, desk job.' },
  { key: 'light', label: 'Lightly active', multiplier: 1.375, description: 'Light exercise 1–3 days a week.' },
  { key: 'moderate', label: 'Moderately active', multiplier: 1.55, description: 'Moderate exercise 3–5 days a week.' },
  { key: 'very', label: 'Very active', multiplier: 1.725, description: 'Hard exercise 6–7 days a week.' },
  { key: 'extreme', label: 'Extremely active', multiplier: 1.9, description: 'Very hard exercise, physical job or double training.' },
];

/**
 * Mifflin-St Jeor equation (1990):
 *   men:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 *   women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 * Result is kcal/day at complete rest.
 */
export function calculateBmr(inputs: BmrInputs): number {
  const { ageYears, sex, weightKg, heightCm } = inputs;
  if (!Number.isFinite(ageYears) || ageYears < 10 || ageYears > 120) {
    throw new Error('Age must be between 10 and 120 years.');
  }
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
    throw new Error('Weight must be between 20 and 500 kg.');
  }
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    throw new Error('Height must be between 100 and 250 cm.');
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return base + (sex === 'male' ? 5 : -161);
}

/** Daily maintenance calories = BMR × activity multiplier. */
export function maintenanceCalories(bmr: number, multiplier: number): number {
  return bmr * multiplier;
}

export function kgFromLb(lb: number): number {
  return lb * 0.45359237;
}

export function cmFromFeetInches(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function roundKcal(value: number): number {
  return Math.round(value);
}

export default function BmrCalc({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('male');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState('70');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('9');
  const [activityKey, setActivityKey] = useState('moderate');
  const [bmr, setBmr] = useState<number | null>(null);
  const [error, setError] = useState('');

  const activity = ACTIVITY_LEVELS.find((a) => a.key === activityKey) ?? ACTIVITY_LEVELS[2];

  const calculate = () => {
    setError('');
    try {
      const weightKg = weightUnit === 'kg' ? Number(weight) : kgFromLb(Number(weight));
      const height =
        heightUnit === 'cm'
          ? Number(heightCm)
          : cmFromFeetInches(Number(heightFeet), Number(heightInches));
      const value = calculateBmr({ ageYears: Number(age), sex, weightKg, heightCm: height });
      setBmr(value);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('BMR Estimated', `Your basal metabolic rate is about ${roundKcal(value)} kcal/day.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate BMR.';
      setBmr(null);
      setError(message);
      toast.error('Cannot Calculate', message);
    }
  };

  const clearAll = () => {
    setBmr(null);
    setError('');
  };

  const inputClass =
    'text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] w-full';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="bmr-calc-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Gauge className="w-8 h-8 text-[#10b981]" />
            BMR Energy Estimator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Basal metabolic rate from the Mifflin-St Jeor equation. A general estimate — not medical advice.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="bmr-age" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age (years)</label>
              <input id="bmr-age" type="number" min={10} max={120} step={1} value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sex</span>
              <div className="flex gap-2">
                {(['male', 'female'] as Sex[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSex(option)}
                    aria-pressed={sex === option}
                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all cursor-pointer capitalize ${
                      sex === option ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="bmr-weight" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weight</label>
              <div className="flex gap-1">
                {(['kg', 'lb'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setWeightUnit(unit)}
                    aria-pressed={weightUnit === unit}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                      weightUnit === unit ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
            <input id="bmr-weight" type="number" min={1} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Height</span>
              <div className="flex gap-1">
                {(['cm', 'ft'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setHeightUnit(unit)}
                    aria-pressed={heightUnit === unit}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                      heightUnit === unit ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-500'
                    }`}
                  >
                    {unit === 'cm' ? 'cm' : 'ft / in'}
                  </button>
                ))}
              </div>
            </div>
            {heightUnit === 'cm' ? (
              <input id="bmr-height-cm" type="number" min={1} step={0.1} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputClass} placeholder="e.g. 175" />
            ) : (
              <div className="flex gap-2">
                <input id="bmr-height-ft" aria-label="Height in feet" type="number" min={2} max={8} step={1} value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} className={inputClass} placeholder="ft" />
                <input id="bmr-height-in" aria-label="Height in inches" type="number" min={0} max={11} step={1} value={heightInches} onChange={(e) => setHeightInches(e.target.value)} className={inputClass} placeholder="in" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity level</span>
            <div className="flex flex-col gap-2">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => setActivityKey(level.key)}
                  aria-pressed={activityKey === level.key}
                  className={`p-2.5 rounded text-left border transition-all cursor-pointer ${
                    activityKey === level.key ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]' : 'bg-black border-[#222] text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <span className="text-xs font-bold block">{level.label} — ×{level.multiplier}</span>
                  <span className="text-[11px] opacity-80">{level.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={calculate}
              className="flex-1 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer"
            >
              Estimate BMR
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
              <span data-testid="bmr-error">{error}</span>
            </div>
          )}
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Your estimate</span>
          {bmr !== null ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Mifflin-St Jeor result</span>
              </div>
              <div className="bg-black border border-[#222] p-4 rounded-lg">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Basal metabolic rate (at rest)</div>
                <div data-testid="bmr-result" className="font-mono text-2xl text-emerald-300 font-bold">{roundKcal(bmr).toLocaleString()} kcal/day</div>
              </div>
              <div className="bg-black border border-[#222] p-4 rounded-lg mt-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Maintenance at &ldquo;{activity.label}&rdquo; (×{activity.multiplier})</div>
                <div data-testid="bmr-maintenance" className="font-mono text-2xl text-emerald-300 font-bold">{roundKcal(maintenanceCalories(bmr, activity.multiplier)).toLocaleString()} kcal/day</div>
                <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                Formula — men: 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5; women: same with −161 instead of +5.
                Maintenance multiplies BMR by the standard Harris-Benedict activity factors. This is a population-average estimate for healthy
                adults; it is not medical advice and does not account for body composition, illness, or medication. Consult a clinician for
                personal guidance.
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              Enter your details and press Estimate BMR. Example: a 30-year-old man, 70 kg, 175 cm → BMR ≈ 1,649 kcal/day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
