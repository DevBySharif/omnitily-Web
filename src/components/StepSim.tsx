// Step & Cardio Estimator — rebuilt (Wave 5a).
//
// The previous implementation displayed fabricated health estimates, so the
// tool was disabled. This version is a real estimator whose formulas are
// shown in the UI, so every number can be checked by hand:
//
//   stride length  = height × 0.414 (average adult stride), or your own
//                    measured stride if you enter one
//   distance       = steps × stride length
//   walk time      = steps ÷ cadence (steps per minute)
//   average speed  = distance ÷ walk time
//   calories       = MET × weight (kg) × hours, with the MET value picked
//                    from the average walking speed:
//                    < 3.2 km/h → 2.8 MET · 3.2–4.8 km/h → 3.5 MET
//                    4.8–6.4 km/h → 4.3 MET · faster → 5.0 MET
// These are population-average estimates, labelled as such — not medical
// advice and not a measurement of any real walk.

import React, { useState } from 'react';
import { CheckCircle, Lightning, WarningCircle } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export const STRIDE_FACTOR = 0.414;
export const DEFAULT_STEP_GOAL = 10000;

export interface StepInputs {
  steps: number;
  heightCm: number;
  weightKg: number;
  /** Steps per minute while walking. */
  cadenceSpm: number;
  /** Measured stride in cm; when omitted it is estimated from height. */
  strideCm?: number;
  stepGoal?: number;
}

export interface StepEstimate {
  strideCm: number;
  strideEstimated: boolean;
  distanceKm: number;
  distanceMiles: number;
  durationMin: number;
  avgSpeedKmh: number;
  met: number;
  caloriesKcal: number;
  goalPct: number;
}

/** Pick the walking MET value from the average speed (Compendium of Physical Activities). */
export function metForSpeedKmh(speedKmh: number): number {
  if (speedKmh < 3.2) return 2.8;
  if (speedKmh < 4.8) return 3.5;
  if (speedKmh < 6.4) return 4.3;
  return 5.0;
}

export function estimateSteps(inputs: StepInputs): StepEstimate {
  const { steps, heightCm, weightKg, cadenceSpm } = inputs;
  if (!Number.isFinite(steps) || steps < 0 || steps > 200000) {
    throw new Error('Steps must be between 0 and 200,000.');
  }
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    throw new Error('Height must be between 100 and 250 cm.');
  }
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
    throw new Error('Weight must be between 20 and 500 kg.');
  }
  if (!Number.isFinite(cadenceSpm) || cadenceSpm < 30 || cadenceSpm > 250) {
    throw new Error('Cadence must be between 30 and 250 steps per minute.');
  }
  const strideCm = inputs.strideCm != null && Number.isFinite(inputs.strideCm) && inputs.strideCm > 0
    ? inputs.strideCm
    : heightCm * STRIDE_FACTOR;
  const strideEstimated = !(inputs.strideCm != null && Number.isFinite(inputs.strideCm) && inputs.strideCm > 0);
  const distanceKm = (steps * strideCm) / 100000;
  const distanceMiles = distanceKm * 0.621371;
  const durationMin = steps / cadenceSpm;
  const hours = durationMin / 60;
  const avgSpeedKmh = hours > 0 ? distanceKm / hours : 0;
  const met = metForSpeedKmh(avgSpeedKmh);
  const caloriesKcal = met * weightKg * hours;
  const goal = inputs.stepGoal && inputs.stepGoal > 0 ? inputs.stepGoal : DEFAULT_STEP_GOAL;
  return {
    strideCm,
    strideEstimated,
    distanceKm,
    distanceMiles,
    durationMin,
    avgSpeedKmh,
    met,
    caloriesKcal,
    goalPct: (steps / goal) * 100,
  };
}

export function formatKm(km: number): string {
  return `${km.toFixed(2)} km`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function StepSim({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [steps, setSteps] = useState('10000');
  const [height, setHeight] = useState('175');
  const [weight, setWeight] = useState('70');
  const [cadence, setCadence] = useState('100');
  const [stride, setStride] = useState('');
  const [goal, setGoal] = useState(String(DEFAULT_STEP_GOAL));
  const [estimate, setEstimate] = useState<StepEstimate | null>(null);
  const [error, setError] = useState('');

  const calculate = () => {
    setError('');
    try {
      const result = estimateSteps({
        steps: Number(steps),
        heightCm: Number(height),
        weightKg: Number(weight),
        cadenceSpm: Number(cadence),
        strideCm: stride.trim() === '' ? undefined : Number(stride),
        stepGoal: Number(goal),
      });
      setEstimate(result);
      try { confetti({ particleCount: 40, spread: 40 }); } catch (e) {}
      toast.success('Estimated', `${Number(steps).toLocaleString()} steps ≈ ${formatKm(result.distanceKm)} and ${Math.round(result.caloriesKcal)} kcal.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not estimate the walk.';
      setEstimate(null);
      setError(message);
      toast.error('Cannot Estimate', message);
    }
  };

  const clearAll = () => {
    setEstimate(null);
    setError('');
  };

  const inputClass =
    'text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] w-full';

  const stats: { label: string; value: string; testId: string }[] = estimate
    ? [
        { label: 'Distance', value: `${formatKm(estimate.distanceKm)} (${estimate.distanceMiles.toFixed(2)} mi)`, testId: 'steps-distance' },
        { label: 'Active calories', value: `${Math.round(estimate.caloriesKcal).toLocaleString()} kcal`, testId: 'steps-calories' },
        { label: 'Walking time', value: formatMinutes(estimate.durationMin), testId: 'steps-duration' },
        { label: 'Average speed', value: `${estimate.avgSpeedKmh.toFixed(2)} km/h`, testId: 'steps-speed' },
        { label: 'Stride length', value: `${estimate.strideCm.toFixed(1)} cm${estimate.strideEstimated ? ' (estimated from height)' : ' (your measurement)'}`, testId: 'steps-stride' },
        { label: 'Daily goal', value: `${Math.min(estimate.goalPct, 999).toFixed(0)}% of ${Number(goal).toLocaleString()} steps`, testId: 'steps-goal' },
      ]
    : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="step-sim-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Lightning className="w-8 h-8 text-[#10b981]" />
            Step &amp; Cardio Estimator
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Convert a step count into distance and active calories with stated formulas. An estimate — not a measurement or medical advice.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-count" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Steps</label>
              <input id="steps-count" type="number" min={0} max={200000} step={1} value={steps} onChange={(e) => setSteps(e.target.value)} className={inputClass} placeholder="e.g. 10000" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-goal" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily step goal</label>
              <input id="steps-goal" type="number" min={1000} max={100000} step={500} value={goal} onChange={(e) => setGoal(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-height" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Height (cm)</label>
              <input id="steps-height" type="number" min={100} max={250} step={0.1} value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass} placeholder="e.g. 175" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-weight" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weight (kg)</label>
              <input id="steps-weight" type="number" min={20} max={500} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} placeholder="e.g. 70" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-cadence" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cadence (steps/min)</label>
              <input id="steps-cadence" type="number" min={30} max={250} step={1} value={cadence} onChange={(e) => setCadence(e.target.value)} className={inputClass} />
              <span className="text-[10px] text-gray-500">~100 is a moderate walk; ~120+ is brisk.</span>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="steps-stride" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stride (cm, optional)</label>
              <input id="steps-stride" type="number" min={30} max={150} step={0.1} value={stride} onChange={(e) => setStride(e.target.value)} className={inputClass} placeholder="Leave blank to estimate" />
              <span className="text-[10px] text-gray-500">Blank = height × 0.414.</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={calculate}
              className="flex-1 py-2.5 px-4 rounded font-bold text-xs uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] transition-all cursor-pointer"
            >
              Estimate Walk
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
              <span data-testid="steps-error">{error}</span>
            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed">
            Formulas: stride = height × 0.414 (or your measured stride); distance = steps × stride; time = steps ÷ cadence;
            speed = distance ÷ time; calories = MET × weight(kg) × hours, with MET 2.8 / 3.5 / 4.3 / 5.0 by average speed.
          </p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Your walk, estimated</span>
          {estimate ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">{Number(steps).toLocaleString()} steps</span>
              </div>
              <div className="flex flex-col gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-3 bg-black border border-[#222] px-4 py-3 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
                    <span data-testid={stat.testId} className="font-mono text-sm text-emerald-300 font-bold text-right">{stat.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                At {estimate.avgSpeedKmh.toFixed(2)} km/h the MET value used is {estimate.met.toFixed(1)}.
                These are population-average estimates: real stride, terrain, and fitness change the true numbers.
                Not medical advice.
              </p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              Enter your steps and body details, then press Estimate Walk. Example: 10,000 steps at 175 cm / 70 kg / 100 steps-per-minute
              ≈ 7.25 km and about 408 kcal.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
