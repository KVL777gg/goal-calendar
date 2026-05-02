import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "goal-calendar-mobile-plus-inline-v1";
const MONTHS_RU = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря"
];
const MONTHS_SHORT = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return `${date.getDate()} ${MONTHS_RU[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonth(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function shortDate(key) {
  const d = fromKey(key);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

function getMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < firstWeekday; i += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) days.push(new Date(year, month, day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function normalizeGoal(goal) {
  const today = toKey(new Date());
  const measureType = goal.measureType === "count" ? "count" : "check";
  const targetValue = measureType === "count" ? Math.max(1, Number(goal.targetValue) || 100) : 1;

  return {
    id: goal.id || createId(),
    title: goal.title || "Без названия",
    category: goal.category || "Цель",
    scheduleType: goal.scheduleType || "always",
    startDate: goal.startDate || today,
    endDate: goal.endDate || goal.startDate || today,
    measureType,
    targetValue,
    unitLabel: goal.unitLabel || (measureType === "count" ? "раз" : ""),
    targetText: goal.targetText || (measureType === "count" ? `${targetValue} ${goal.unitLabel || "раз"}` : "1 раз"),
  };
}

function isGoalActiveOnDate(goal, dateKey) {
  const g = normalizeGoal(goal);
  if (g.scheduleType === "always") return true;
  return dateKey >= g.startDate && dateKey <= g.endDate;
}

function activeGoalsForDate(goals, dateKey) {
  return goals.map(normalizeGoal).filter((goal) => isGoalActiveOnDate(goal, dateKey));
}

function displayDateRange(goal) {
  const g = normalizeGoal(goal);
  if (g.scheduleType === "always") return "каждый день";
  if (g.startDate === g.endDate) return shortDate(g.startDate);
  return `${shortDate(g.startDate)} — ${shortDate(g.endDate)}`;
}

function goalIcon(goal) {
  const text = `${goal.title} ${goal.category}`.toLowerCase();
  if (text.includes("сон") || text.includes("режим")) return "🌙";
  if (text.includes("трен") || text.includes("растяж") || text.includes("спорт")) return "🏋️";
  if (text.includes("подтяг")) return "💪";
  if (text.includes("контроль") || text.includes("учё") || text.includes("учеб") || text.includes("задач")) return "📚";
  return "🎯";
}

function getGoalStoredValue(goal, dayState) {
  const raw = dayState?.[goal.id];
  if (goal.measureType === "count") return Math.max(0, Number(raw) || 0);
  return Boolean(raw);
}

function isGoalDone(goal, dayState) {
  const value = getGoalStoredValue(goal, dayState);
  return goal.measureType === "count" ? value >= goal.targetValue : Boolean(value);
}

function countProgressLabel(goal, dayState) {
  const value = getGoalStoredValue(goal, dayState);
  return `${value}/${goal.targetValue}${goal.unitLabel ? ` ${goal.unitLabel}` : ""}`;
}

function defaultData() {
  const today = toKey(new Date());
  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toKey(weekEndDate);
  const monthEndDate = new Date();
  monthEndDate.setMonth(monthEndDate.getMonth() + 1);
  const monthEnd = toKey(monthEndDate);

  return {
    goals: [
      {
        id: createId(),
        title: "Подготовка к контрольной",
        category: "Учёба",
        scheduleType: "range",
        startDate: today,
        endDate: weekEnd,
        measureType: "count",
        targetValue: 60,
        unitLabel: "мин",
      },
      {
        id: createId(),
        title: "Сон до 00:30",
        category: "Режим",
        scheduleType: "always",
        startDate: today,
        endDate: today,
        measureType: "check",
      },
      {
        id: createId(),
        title: "Тренировка / растяжка",
        category: "Здоровье",
        scheduleType: "range",
        startDate: today,
        endDate: weekEnd,
        measureType: "count",
        targetValue: 15,
        unitLabel: "мин",
      },
      {
        id: createId(),
        title: "Подтягивания",
        category: "Спорт",
        scheduleType: "range",
        startDate: today,
        endDate: monthEnd,
        measureType: "count",
        targetValue: 100,
        unitLabel: "подтягиваний",
      },
    ],
    completions: { [today]: {} },
    notes: { [today]: "Начни с 1–2 целей, не перегружай календарь." },
  };
}

function safeLoadData() {
  try {
    if (typeof localStorage === "undefined") return defaultData();
    const keys = [
      STORAGE_KEY,
      "goal-calendar-mobile-width-fix-v1",
      "goal-calendar-apple-narrow-cards-v1",
      "goal-calendar-apple-edge-plus-v1",
      "goal-calendar-graphite-manual-v1",
      "goal-calendar-charcoal-date-v1",
      "goal-calendar-black-gray-v1",
      "goal-calendar-theme-photo-v1",
      "goal-calendar-minimal-v1",
    ];
    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved);
      return {
        goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : defaultData().goals,
        completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {},
        notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
      };
    }
    return defaultData();
  } catch {
    return defaultData();
  }
}

function safeSaveData(data) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // ignore
  }
}

function runSelfTests() {
  const jan2024 = getMonthDays(new Date(2024, 0, 1));
  console.assert(jan2024.filter(Boolean).length === 31, "January 2024 should have 31 days");
  console.assert(jan2024[0]?.getDate() === 1, "January 2024 starts on Monday");
  const goal = normalizeGoal({ measureType: "count", targetValue: 100, unitLabel: "подтягиваний" });
  console.assert(countProgressLabel(goal, { [goal.id]: 25 }).includes("25/100"), "Manual count should work");
}
if (typeof console !== "undefined") runSelfTests();

function StatCard({ value, label, icon = null }) {
  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-4 py-4 backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[28px] font-black leading-none text-white">{value}</div>
          <div className="mt-2 text-[11px] leading-tight text-white/52">{label}</div>
        </div>
        {icon ? <div className="text-lg">{icon}</div> : null}
      </div>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <section className={`w-full rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export default function App() {
  const [data, setData] = useState(safeLoadData);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(toKey(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);

  const [newGoal, setNewGoal] = useState("");
  const [newCategory, setNewCategory] = useState("Цель");
  const [newGoalType, setNewGoalType] = useState("check");
  const [newTargetValue, setNewTargetValue] = useState("100");
  const [newUnitLabel, setNewUnitLabel] = useState("раз");
  const [newScheduleType, setNewScheduleType] = useState("range");
  const [newStartDate, setNewStartDate] = useState(toKey(new Date()));
  const [newEndDate, setNewEndDate] = useState(toKey(new Date()));
  const [noteDraft, setNoteDraft] = useState(() => safeLoadData().notes?.[toKey(new Date())] || "");

  useEffect(() => safeSaveData(data), [data]);
  useEffect(() => {
    setNoteDraft(data.notes?.[selectedKey] || "");
  }, [selectedKey, data.notes]);

  const todayKey = toKey(new Date());
  const days = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const selectedDate = fromKey(selectedKey);
  const activeGoals = useMemo(() => activeGoalsForDate(data.goals, selectedKey), [data.goals, selectedKey]);
  const selectedCompletions = data.completions[selectedKey] || {};
  const completedToday = activeGoals.filter((goal) => isGoalDone(goal, selectedCompletions)).length;
  const progress = activeGoals.length ? Math.round((completedToday / activeGoals.length) * 100) : 0;

  const monthStats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const day of days.filter(Boolean)) {
      const key = toKey(day);
      const active = activeGoalsForDate(data.goals, key);
      const completions = data.completions[key] || {};
      total += active.length;
      done += active.filter((goal) => isGoalDone(goal, completions)).length;
    }
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [days, data.goals, data.completions]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      const key = toKey(cursor);
      const active = activeGoalsForDate(data.goals, key);
      const completions = data.completions[key] || {};
      const allDone = active.length > 0 && active.every((goal) => isGoalDone(goal, completions));
      if (!allDone) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [data.goals, data.completions]);

  const upcomingGoals = useMemo(() => {
    const today = toKey(new Date());
    return data.goals
      .map(normalizeGoal)
      .filter((goal) => goal.scheduleType === "always" || goal.endDate >= today)
      .slice(0, 5);
  }, [data.goals]);

  function moveMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function goToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toKey(today));
  }

  function getDayStats(day) {
    if (!day) return { active: 0, done: 0, progress: 0 };
    const key = toKey(day);
    const active = activeGoalsForDate(data.goals, key);
    const completions = data.completions[key] || {};
    const done = active.filter((goal) => isGoalDone(goal, completions)).length;
    return { active: active.length, done, progress: active.length ? Math.round((done / active.length) * 100) : 0 };
  }

  function toggleCheckGoal(goalId) {
    setData((previous) => {
      const currentDay = previous.completions[selectedKey] || {};
      return {
        ...previous,
        completions: {
          ...previous.completions,
          [selectedKey]: {
            ...currentDay,
            [goalId]: !Boolean(currentDay[goalId]),
          },
        },
      };
    });
  }

  function setCountGoal(goalId, nextValue) {
    const safeValue = Math.max(0, Number(nextValue) || 0);
    setData((previous) => {
      const currentDay = previous.completions[selectedKey] || {};
      return {
        ...previous,
        completions: {
          ...previous.completions,
          [selectedKey]: {
            ...currentDay,
            [goalId]: safeValue,
          },
        },
      };
    });
  }

  function removeGoal(goalId) {
    setData((previous) => {
      const nextCompletions = {};
      for (const [day, values] of Object.entries(previous.completions)) {
        const copy = { ...values };
        delete copy[goalId];
        nextCompletions[day] = copy;
      }
      return {
        ...previous,
        goals: previous.goals.filter((goal) => goal.id !== goalId),
        completions: nextCompletions,
      };
    });
  }

  function saveNote(value) {
    setNoteDraft(value);
    setData((previous) => ({
      ...previous,
      notes: { ...previous.notes, [selectedKey]: value },
    }));
  }

  function openAddForm() {
    setNewStartDate(selectedKey);
    setNewEndDate(selectedKey);
    setShowAddForm(true);
  }

  function addGoal(event) {
    event.preventDefault();
    const title = newGoal.trim();
    if (!title) return;

    let startDate = newStartDate || selectedKey;
    let endDate = newEndDate || startDate;

    if (newScheduleType === "range" && endDate < startDate) {
      [startDate, endDate] = [endDate, startDate];
    }
    if (newScheduleType === "today") {
      startDate = selectedKey;
      endDate = selectedKey;
    }

    setData((previous) => ({
      ...previous,
      goals: [
        ...previous.goals,
        normalizeGoal({
          id: createId(),
          title,
          category: newCategory.trim() || "Цель",
          scheduleType: newScheduleType === "today" ? "range" : newScheduleType,
          startDate,
          endDate,
          measureType: newGoalType,
          targetValue: newGoalType === "count" ? Math.max(1, Number(newTargetValue) || 100) : 1,
          unitLabel: newGoalType === "count" ? (newUnitLabel.trim() || "раз") : "",
        }),
      ],
    }));

    setNewGoal("");
    setNewCategory("Цель");
    setNewGoalType("check");
    setNewTargetValue("100");
    setNewUnitLabel("раз");
    setNewScheduleType("range");
    setShowAddForm(false);
  }

  return (
  <div className="min-h-screen overflow-x-hidden bg-[#070711] text-white selection:bg-violet-400/30">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.30),transparent_30%),radial-gradient(circle_at_100%_15%,rgba(56,189,248,0.17),transparent_35%),linear-gradient(180deg,#070711_0%,#11101b_54%,#08080f_100%)]" />
    <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:40px_40px]" />

    <main className="relative z-10 mx-auto w-full max-w-6xl px-3 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-5 md:pt-8">
      <div className="mx-auto w-full max-w-[720px] lg:max-w-none">
        <header className="mb-5">
          <div className="mb-3 inline-flex items-center rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
            Календарь целей
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-[clamp(2.05rem,8vw,3.9rem)] font-black capitalize leading-[0.92] tracking-[-0.04em] text-white">
                  {monthName(viewDate)}
                </h1>
                <span className="hidden text-2xl text-white/45 sm:inline">⌄</span>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="mt-3 text-left text-base font-semibold text-white/48"
              >
                Сегодня, {humanDate(todayKey)}
              </button>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-[32px] leading-none text-white shadow-2xl shadow-black/35 backdrop-blur-xl transition hover:bg-white/[0.10] active:scale-95 sm:h-16 sm:w-16"
              aria-label="Добавить цель"
            >
              <span className="block -translate-y-[2px]">+</span>
            </button>
          </div>
        </header>

        <section className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            title="Сегодня"
            value={`${completedToday} из ${activeGoals.length}`}
            hint="целей"
            icon={`${progress}%`}
          />

          <StatCard
            title="Месяц"
            value={`${monthStats.done} из ${monthStats.total}`}
            hint="целей"
            icon={`${monthStats.percent}%`}
            accent="from-sky-400 to-cyan-300"
          />

          <StatCard
            title="Серия"
            value={streak}
            hint="дней"
            icon="🔥"
            accent="from-orange-500 to-rose-500"
          />
        </section>

        <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-3xl text-white/90 active:scale-95"
                aria-label="Предыдущий месяц"
              >
                ‹
              </button>

              <div className="min-w-0 text-center">
                <p className="truncate text-base font-black capitalize text-white/80 sm:text-lg">
                  {monthName(viewDate)}
                </p>
                <button type="button" onClick={goToday} className="text-sm text-white/38">
                  Сегодня
                </button>
              </div>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.07] text-3xl text-white/90 active:scale-95"
                aria-label="Следующий месяц"
              >
                ›
              </button>
            </div>

            <div className="grid min-w-0 grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-wide text-white/55 sm:gap-2 sm:text-sm">
              {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((name) => (
                <div key={name} className="min-w-0 pb-2">
                  {name}
                </div>
              ))}
            </div>

            <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-2">
              {days.map((day, index) => {
                const key = day ? toKey(day) : `empty-${index}`;
                const stats = getDayStats(day);
                const isSelected = day && key === selectedKey;
                const isToday = day && key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedKey(key)}
                    className={`min-w-0 rounded-2xl px-1 py-2 text-center transition active:scale-[0.97] ${
                      !day
                        ? "pointer-events-none opacity-0"
                        : isSelected
                          ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 text-white shadow-[0_12px_30px_rgba(99,102,241,0.45)]"
                          : "border border-white/[0.075] bg-black/24 text-white"
                    } ${isToday && !isSelected ? "ring-2 ring-violet-300/55" : ""}`}
                    aria-label={day ? `${day.getDate()} число` : undefined}
                  >
                    {day && (
                      <>
                        <div className="text-[clamp(1rem,5.1vw,1.55rem)] font-black leading-none">
                          {day.getDate()}
                        </div>

                        <div className="mx-auto mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-200/85" />

                        <div className="mt-1 text-[11px] font-bold text-white/72">
                          {stats.done}/{stats.active}
                        </div>

                        <div
                          className={`mx-auto mt-1 h-1 w-[70%] max-w-8 overflow-hidden rounded-full ${
                            isSelected ? "bg-white/25" : "bg-white/10"
                          }`}
                        >
                          <div className="h-full rounded-full bg-white" style={{ width: `${stats.progress}%` }} />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="w-full min-w-0 space-y-5">
            <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-3xl font-black">
                    {selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {completedToday} из {activeGoals.length} целей выполнено
                  </p>
                </div>

                <div className="shrink-0 rounded-full bg-gradient-to-r from-violet-500/35 to-blue-500/35 px-4 py-2 text-lg font-black text-violet-100 ring-1 ring-white/10">
                  {progress}%
                </div>
              </div>

              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-2">
                {activeGoals.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
                    На этот день целей пока нет. Нажми плюс сверху.
                  </div>
                )}

                {activeGoals.map((goal) => {
                  const done = Boolean(selectedCompletions[goal.id]);

                  return (
                    <div key={goal.id} className="flex min-w-0 items-center gap-3 rounded-3xl bg-black/10 p-3">
                      <button
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-lg transition ${
                          done
                            ? "border-violet-300 bg-violet-400/25 text-violet-100"
                            : "border-white/20 bg-black/10 text-white/30"
                        }`}
                        aria-label="Отметить цель"
                      >
                        {done ? "✓" : ""}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-base font-bold ${done ? "text-white/40 line-through" : "text-white"}`}>
                          {goal.title}
                        </div>
                        <div className="truncate text-xs text-white/42 sm:text-sm">
                          {goal.color} • {goal.target} • {displayDateRange(goal)}
                        </div>
                      </div>

                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.055] text-xl">
                        {goalIcon(goal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="rounded-2xl px-2 py-1 text-xs text-white/35 hover:bg-rose-500/10 hover:text-rose-200"
                        aria-label="Удалить цель"
                      >
                        удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <h2 className="mb-3 text-2xl font-black">Заметка дня</h2>

              <textarea
                value={noteDraft}
                onChange={(event) => saveNote(event.target.value)}
                placeholder="Что важно сделать сегодня? Что помешало?"
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-violet-300/50"
              />
            </section>
          </aside>
        </div>
      </div>
    </main>

    {showAddForm && (
      <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-[#151522] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.6)] sm:max-w-lg sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Новая цель</h2>

            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-full bg-white/8 px-3 py-1 text-white/60"
            >
              закрыть
            </button>
          </div>

          <form onSubmit={addGoal} className="space-y-3">
            <input
              value={newGoal}
              onChange={(event) => setNewGoal(event.target.value)}
              placeholder="Например: решить 5 задач"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-violet-300/50"
            />

            <input
              value={newTarget}
              onChange={(event) => setNewTarget(event.target.value)}
              placeholder="Норма: 30 минут / 10 повторов / 1 раз"
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-violet-300/50"
            />

            <div className="grid grid-cols-3 gap-2">
              {[
                ["today", "День"],
                ["range", "Период"],
                ["always", "Всегда"],
              ].map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewGoalType(type)}
                  className={`rounded-2xl px-2 py-2 text-sm font-bold transition ${
                    newGoalType === type
                      ? "bg-white text-[#11101b]"
                      : "bg-black/22 text-white/55 ring-1 ring-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {newGoalType === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-white/45">
                  С даты
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(event) => setNewStartDate(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-violet-300/50"
                  />
                </label>

                <label className="text-sm text-white/45">
                  По дату
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(event) => setNewEndDate(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-violet-300/50"
                  />
                </label>
              </div>
            )}

            {newGoalType === "today" && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                Цель появится только на дату: {shortDate(selectedKey)}.
              </div>
            )}

            {newGoalType === "always" && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                Цель будет появляться каждый день как постоянная привычка.
              </div>
            )}

            <button className="w-full rounded-2xl bg-gradient-to-r from-violet-400 to-sky-400 px-4 py-3 font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99]">
              Добавить цель
            </button>
          </form>
        </section>
      </div>
    )}
  </div>
);

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <section className="w-full rounded-[28px] border border-white/[0.08] bg-[#13151a]/95 p-4 shadow-2xl backdrop-blur-2xl sm:max-w-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-white">Новая цель</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-full bg-white/8 px-3 py-1 text-white/65 transition hover:bg-white/12"
              >
                закрыть
              </button>
            </div>

            <form onSubmit={addGoal} className="space-y-3">
              <input
                value={newGoal}
                onChange={(event) => setNewGoal(event.target.value)}
                placeholder="Например: подтягивания"
                className="w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-[#7ba3ff]"
              />

              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Категория: Учёба / Спорт"
                className="w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-[#7ba3ff]"
              />

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["check", "Отметка"],
                  ["count", "С количеством"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewGoalType(type)}
                    className={`rounded-2xl px-2 py-3 text-sm font-bold transition ${
                      newGoalType === type ? "bg-white text-[#111317]" : "border border-white/[0.10] bg-[#0b0d13]/90 text-white/65"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {newGoalType === "count" && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newTargetValue}
                    onChange={(event) => setNewTargetValue(event.target.value)}
                    type="number"
                    min="1"
                    placeholder="100"
                    className="w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-[#7ba3ff]"
                  />
                  <input
                    value={newUnitLabel}
                    onChange={(event) => setNewUnitLabel(event.target.value)}
                    placeholder="подтягиваний / мин"
                    className="w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-[#7ba3ff]"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["today", "День"],
                  ["range", "Период"],
                  ["always", "Всегда"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewScheduleType(type)}
                    className={`rounded-2xl px-2 py-2 text-sm font-bold transition ${
                      newScheduleType === type ? "bg-white text-[#111317]" : "border border-white/[0.10] bg-[#0b0d13]/90 text-white/65"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {newScheduleType === "range" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-white/58">
                    С даты
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(event) => setNewStartDate(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-3 py-3 text-white outline-none focus:border-[#7ba3ff]"
                    />
                  </label>
                  <label className="text-sm text-white/58">
                    По дату
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(event) => setNewEndDate(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-white/[0.10] bg-[#0b0d13]/90 px-3 py-3 text-white outline-none focus:border-[#7ba3ff]"
                    />
                  </label>
                </div>
              )}

              <button className="w-full rounded-2xl bg-white px-4 py-3 font-black text-[#111317] transition hover:bg-white/92">
                Добавить цель
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
