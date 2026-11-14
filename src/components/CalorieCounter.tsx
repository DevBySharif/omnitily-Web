import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  ForkKnife,
  Heart,
  Plus,
  Trash,
  WarningCircle
} from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export interface FoodItem {
  name: string;
  calories: number; // kcal per serving
  serving: string;
}

/** Common foods with standard per-serving calories (USDA-style reference values). */
export const FOOD_DATABASE: FoodItem[] = [
  { name: 'Apple (1 medium)', calories: 95, serving: '1 medium (182 g)' },
  { name: 'Banana (1 medium)', calories: 105, serving: '1 medium (118 g)' },
  { name: 'White rice, cooked (1 cup)', calories: 205, serving: '1 cup (158 g)' },
  { name: 'Brown rice, cooked (1 cup)', calories: 216, serving: '1 cup (195 g)' },
  { name: 'Whole wheat bread (1 slice)', calories: 81, serving: '1 slice (28 g)' },
  { name: 'Egg, boiled (1 large)', calories: 78, serving: '1 large (50 g)' },
  { name: 'Chicken breast, cooked (100 g)', calories: 165, serving: '100 g' },
  { name: 'Salmon, cooked (100 g)', calories: 206, serving: '100 g' },
  { name: 'Ground beef 85%, cooked (100 g)', calories: 250, serving: '100 g' },
  { name: 'Milk, whole (1 cup)', calories: 149, serving: '1 cup (244 ml)' },
  { name: 'Greek yogurt, plain (170 g)', calories: 100, serving: '170 g cup' },
  { name: 'Cheddar cheese (30 g)', calories: 120, serving: '30 g slice' },
  { name: 'Peanut butter (2 tbsp)', calories: 188, serving: '2 tbsp (32 g)' },
  { name: 'Almonds (30 g)', calories: 164, serving: '30 g (~23 nuts)' },
  { name: 'Oats, dry (40 g)', calories: 154, serving: '40 g (1/2 cup)' },
  { name: 'Pasta, cooked (1 cup)', calories: 220, serving: '1 cup (140 g)' },
  { name: 'Potato, boiled (1 medium)', calories: 154, serving: '1 medium (173 g)' },
  { name: 'Broccoli, cooked (1 cup)', calories: 55, serving: '1 cup (156 g)' },
  { name: 'Orange (1 medium)', calories: 62, serving: '1 medium (131 g)' },
  { name: 'Orange juice (1 cup)', calories: 112, serving: '1 cup (248 ml)' },
  { name: 'Cola (1 can, 330 ml)', calories: 139, serving: '1 can (330 ml)' },
  { name: 'Coffee, black (1 cup)', calories: 2, serving: '1 cup (240 ml)' },
  { name: 'Chocolate bar (45 g)', calories: 235, serving: '45 g bar' },
  { name: 'Potato chips (30 g)', calories: 152, serving: '30 g handful' },
];

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentary (little or no exercise)' },
  light: { factor: 1.375, label: 'Lightly active (1–3 days/week)' },
  moderate: { factor: 1.55, label: 'Moderately active (3–5 days/week)' },
  active: { factor: 1.725, label: 'Very active (6–7 days/week)' },
  'very-active': { factor: 1.9, label: 'Extra active (physical job + training)' },
};

/**
 * Mifflin-St Jeor basal metabolic rate (kcal/day):
 * men: 10*kg + 6.25*cm - 5*age + 5; women: ... - 161.
 */
export function mifflinStJeorBmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new Error('Weight, height and age must all be greater than zero.');
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

export function dailyCalorieTarget(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity].factor;
}

export interface LoggedFood {
  id: string;
  name: string;
  calories: number;
  servings: number;
}

export function sumCalories(log: LoggedFood[]): number {
  return log.reduce((total, entry) => total + entry.calories * entry.servings, 0);
}

const STORAGE_KEY = 'omnitily:calorie-counter';

function loadLog(): LoggedFood[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoggedFood[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.name === 'string' && Number.isFinite(e.calories) && Number.isFinite(e.servings));
  } catch (e) {
    return [];
  }
}

export default function CalorieCounter({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('30');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [bmr, setBmr] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [selectedFood, setSelectedFood] = useState(FOOD_DATABASE[0].name);
  const [servings, setServings] = useState('1');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [log, setLog] = useState<LoggedFood[]>(() => loadLog());
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch (e) {}
  }, [log]);

  const calculateTarget = () => {
    setError('');
    const ageNum = Number(age);
    const weightNum = Number(weight);
    const heightNum = Number(height);
    if (!Number.isFinite(ageNum) || !Number.isFinite(weightNum) || !Number.isFinite(heightNum)) {
      const message = 'Enter numbers for age, weight and height.';
      setError(message);
      toast.error('Cannot Calculate', message);
      return;
    }
    try {
      const computed = mifflinStJeorBmr(sex, weightNum, heightNum, ageNum);
      setBmr(computed);
      setTarget(dailyCalorieTarget(computed, activity));
      toast.success('Target Calculated', 'Your daily calorie target is set.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not calculate.';
      setError(message);
      toast.error('Cannot Calculate', message);
    }
  };

  const addFood = () => {
    const food = FOOD_DATABASE.find((f) => f.name === selectedFood);
    if (!food) return;
    const servingsNum = Number(servings);
    if (!Number.isFinite(servingsNum) || servingsNum <= 0) {
      toast.error('Invalid Servings', 'Servings must be a number greater than zero.');
      return;
    }
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: food.name, calories: food.calories, servings: servingsNum },
    ]);
    try { confetti({ particleCount: 30, spread: 40 }); } catch (e) {}
    toast.success('Food Added', `${food.name} x ${servingsNum} logged.`);
  };

  const addCustomFood = () => {
    const name = customName.trim();
    const calories = Number(customCalories);
    if (!name) {
      toast.error('Missing Name', 'Give the custom food a name.');
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      toast.error('Invalid Calories', 'Enter calories per serving as a number greater than zero.');
      return;
    }
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, calories, servings: 1 },
    ]);
    setCustomName('');
    setCustomCalories('');
    toast.success('Food Added', `${name} logged.`);
  };

  const removeEntry = (id: string) => setLog((prev) => prev.filter((e) => e.id !== id));
  const clearLog = () => setLog([]);

  const total = sumCalories(log);
  const remaining = target !== null ? target - total : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6" id="calorie-counter-tool">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2a2a2a]">
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-400 hover:text-[#10b981] mb-2 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-3xl font-sans text-white tracking-tight flex items-center gap-3">
            <Heart className="w-8 h-8 text-[#10b981]" />
            Calorie Tracker &amp; Food Diary
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Estimate your daily calorie target from the Mifflin-St Jeor formula, then log meals against it. Your diary is saved on this device only.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          {/* Target calculator */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="font-sans text-lg text-white">Your Daily Target</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="cal-sex" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sex</label>
                <select
                  id="cal-sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="cal-age" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age (years)</label>
                <input id="cal-age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="cal-weight" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weight (kg)</label>
                <input id="cal-weight" type="number" min={1} max={500} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="cal-height" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Height (cm)</label>
                <input id="cal-height" type="number" min={1} max={300} value={height} onChange={(e) => setHeight(e.target.value)} className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cal-activity" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity level</label>
              <select
                id="cal-activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((key) => (
                  <option key={key} value={key}>{ACTIVITY_MULTIPLIERS[key].label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={calculateTarget}
              className="w-full py-3 px-4 rounded font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#10b981] hover:bg-[#059669] text-[#0a0a0a] hover:shadow-md"
            >
              Calculate Target
            </button>
            {error && (
              <div className="flex items-start gap-2 text-rose-400 text-sm bg-rose-950/20 border border-rose-900/40 rounded-xl px-4 py-3">
                <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {bmr !== null && target !== null && (
              <div data-testid="calorie-target" className="text-sm text-gray-300 bg-[#151515] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="flex justify-between"><span>BMR (Mifflin-St Jeor)</span><span className="font-mono font-bold text-white">{Math.round(bmr).toLocaleString()} kcal/day</span></div>
                <div className="flex justify-between mt-1"><span>Daily target ({ACTIVITY_MULTIPLIERS[activity].label.split(' (')[0].toLowerCase()})</span><span className="font-mono font-bold text-emerald-300">{Math.round(target).toLocaleString()} kcal/day</span></div>
              </div>
            )}
            <p className="text-[10px] text-gray-500">This is a general estimate for healthy adults, not medical advice. Food calories are standard reference values per serving.</p>
          </div>

          {/* Add food */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="font-sans text-lg text-white flex items-center gap-2"><ForkKnife className="w-5 h-5 text-[#10b981]" /> Log Food</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="cal-food" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Food (standard values)</label>
              <select
                id="cal-food"
                value={selectedFood}
                onChange={(e) => setSelectedFood(e.target.value)}
                className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                {FOOD_DATABASE.map((food) => (
                  <option key={food.name} value={food.name}>{food.name} — {food.calories} kcal</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 w-24">
                <label htmlFor="cal-servings" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Servings</label>
                <input id="cal-servings" type="number" min={0.25} step={0.25} value={servings} onChange={(e) => setServings(e.target.value)} className="w-full text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]" />
              </div>
              <button
                onClick={addFood}
                className="flex-1 mt-4 py-2 px-4 rounded font-bold text-xs uppercase tracking-widest border border-emerald-900/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Food
              </button>
            </div>
            <div className="border-t border-[#2a2a2a] pt-4 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or add a custom food</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Custom food name"
                  placeholder="Food name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 min-w-0 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
                />
                <input
                  type="number"
                  aria-label="Custom food calories per serving"
                  placeholder="kcal"
                  min={1}
                  value={customCalories}
                  onChange={(e) => setCustomCalories(e.target.value)}
                  className="w-24 text-sm border border-[#2a2a2a] rounded px-3 py-2 bg-[#151515] text-white focus:outline-none focus:border-[#10b981]"
                />
                <button
                  onClick={addCustomFood}
                  className="py-2 px-3 rounded font-bold text-xs uppercase tracking-widest border border-[#2a2a2a] text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Diary */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-lg text-white">Today&apos;s Diary</h2>
            {log.length > 0 && (
              <button onClick={clearLog} className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                Clear diary
              </button>
            )}
          </div>
          <div data-testid="calorie-total" className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Eaten</div>
              <div className="text-lg font-bold text-white">{total.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">kcal</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target</div>
              <div className="text-lg font-bold text-white">{target !== null ? Math.round(target).toLocaleString() : '—'}</div>
              <div className="text-[10px] text-gray-500">kcal</div>
            </div>
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Remaining</div>
              <div className={`text-lg font-bold ${remaining !== null && remaining < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
                {remaining !== null ? Math.round(remaining).toLocaleString() : '—'}
              </div>
              <div className="text-[10px] text-gray-500">kcal</div>
            </div>
          </div>
          {log.length === 0 ? (
            <p className="text-gray-500 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Nothing logged yet. Add a food from the list or a custom entry.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 border border-[#2a2a2a] rounded-lg px-3 py-2 bg-[#151515]">
                  <span className="text-sm text-gray-200 min-w-0">
                    {entry.name}
                    <span className="text-gray-500"> × {entry.servings}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono font-bold text-emerald-300">{(entry.calories * entry.servings).toLocaleString()} kcal</span>
                    <button onClick={() => removeEntry(entry.id)} aria-label={`Remove ${entry.name}`} className="p-1 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer">
                      <Trash className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
