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
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(75,90,120,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(71,78,94,0.12),transparent_30%)]" />

      <main className="relative mx-auto max-w-[1240px] px-4 pb-10 pt-5 sm:px-6">
        <div className="mx-auto w-full max-w-[760px] lg:max-w-none">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex items-center rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1 text-xs text-white/80 backdrop-blur-xl">
                Календарь целей
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-[clamp(2.05rem,8vw,3.9rem)] font-black leading-[0.92] tracking-[-0.04em] text-white">
                    {formatLongDate(selectedDate)}
                  </h1>
                  <button type="button" onClick={goToday} className="mt-3 text-left text-base text-white/55">
                    Сегодня
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openAddForm}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.07] text-[32px] leading-none text-white backdrop-blur-xl shadow-[0_10px_28px_rgba(0,0,0,0.25)] transition hover:bg-white/[0.10] active:scale-95"
                  aria-label="Добавить цель"
                >
                  <span className="block -translate-y-[2px]">+</span>
                </button>
              </div>
            </div>
          </header>

          <section className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard value={`${progress}%`} label="выбранный день" />
            <StatCard value={`${monthStats.percent}%`} label="месяц" />
            <StatCard value={String(streak)} label="серия дней" icon="🔥" />
          </section>

          <div className="grid w-full gap-4 lg:grid-cols-[1.36fr_0.74fr]">
            <SectionCard>
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.08] text-2xl text-white transition hover:bg-white/[0.11]"
                  aria-label="Предыдущий месяц"
                >
                  ‹
                </button>

                <div className="text-center">
                  <div className="text-[28px] font-black leading-none tracking-[-0.03em] capitalize text-white">{formatMonth(viewDate)}</div>
                  <button type="button" onClick={goToday} className="mt-2 text-sm text-white/48">
                    Сегодня
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.08] text-2xl text-white transition hover:bg-white/[0.11]"
                  aria-label="Следующий месяц"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/42 sm:text-sm">
                {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((name) => (
                  <div key={name} className="pb-1">{name}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
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
                      className={`rounded-[16px] px-1 py-2 text-center transition active:scale-[0.98] sm:min-h-[4.6rem] ${
                        !day
                          ? "pointer-events-none opacity-0"
                          : isSelected
                            ? "bg-white text-[#111317] shadow-[0_8px_20px_rgba(255,255,255,0.10)]"
                            : "border border-white/[0.06] bg-[#0b0c11]/70 text-white hover:bg-white/[0.06]"
                      } ${isToday && !isSelected ? "ring-1 ring-[#7ba3ff]/45" : ""}`}
                    >
                      {day && (
                        <>
                          <div className="text-[clamp(0.98rem,3.3vw,1.3rem)] font-black leading-none tracking-[-0.02em]">{day.getDate()}</div>
                          <div className={`mx-auto mt-2 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[#111317]/65" : "bg-white/50"}`} />
                          <div className={`mt-1 text-[10px] font-semibold ${isSelected ? "text-[#111317]/65" : "text-white/58"}`}>
                            {stats.done}/{stats.active}
                          </div>
                          <div className={`mx-auto mt-1 h-1 w-[68%] overflow-hidden rounded-full ${isSelected ? "bg-black/12" : "bg-white/[0.08]"}`}>
                            <div className={`h-full rounded-full ${isSelected ? "bg-[#111317]/72" : "bg-[#7ba3ff]"}`} style={{ width: `${stats.progress}%` }} />
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <aside className="w-full space-y-4">
              <SectionCard>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[32px] font-black leading-none tracking-[-0.03em] text-white">
                      {selectedDate.getDate()} {MONTHS_SHORT[selectedDate.getMonth()]}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">Выполнено: {completedToday} из {activeGoals.length}</p>
                  </div>
                  <div className="rounded-2xl bg-[#0b0d13]/85 px-4 py-2 text-lg font-black text-white">
                    {progress}%
                  </div>
                </div>

                <div className="space-y-2.5">
                  {activeGoals.length === 0 && (
                    <div className="rounded-[18px] border border-white/[0.06] bg-[#0b0d13]/80 p-4 text-sm text-white/50">
                      На этот день целей пока нет.
                    </div>
                  )}

                  {activeGoals.map((goal) => {
                    const done = isGoalDone(goal, selectedCompletions);
                    const countMode = goal.measureType === "count";
                    const countValue = getGoalStoredValue(goal, selectedCompletions);

                    return (
                      <div key={goal.id} className="flex items-center gap-3 rounded-[18px] bg-[#0b0d13]/85 px-3 py-3">
                        {countMode ? (
                          <div className="flex shrink-0 items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              value={countValue}
                              onChange={(event) => setCountGoal(goal.id, event.target.value)}
                              className="w-[56px] rounded-lg border border-white/[0.08] bg-[#161820] px-2 py-1 text-center text-sm font-bold text-white outline-none focus:border-[#7ba3ff]"
                            />
                            <div className={`text-sm font-bold ${done ? "text-white/58" : "text-white"}`}>
                              / {goal.targetValue}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleCheckGoal(goal.id)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition ${
                              done ? "border-white bg-white text-[#111317]" : "border-white/[0.18] text-white/30"
                            }`}
                            aria-label="Отметить цель"
                          >
                            {done ? "✓" : ""}
                          </button>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-[16px] font-bold ${done ? "text-white/45 line-through" : "text-white"}`}>{goal.title}</div>
                          <div className="truncate text-[12px] text-white/42">
                            {goal.category} • {countMode ? countProgressLabel(goal, selectedCompletions) : goal.targetText} • {displayDateRange(goal)}
                          </div>
                        </div>

                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-base">
                          {goalIcon(goal)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeGoal(goal.id)}
                          className="rounded-xl px-2 py-1 text-xs text-white/38 transition hover:bg-white/5 hover:text-white/78"
                          aria-label="Удалить цель"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard>
                <h2 className="mb-3 text-[26px] font-black leading-none tracking-[-0.03em] text-white">Ближайшие цели</h2>
                <div className="space-y-2.5">
                  {upcomingGoals.map((goal) => (
                    <div key={goal.id} className="rounded-[18px] bg-[#0b0d13]/85 px-4 py-3">
                      <div className="text-sm font-bold text-white">{goal.title}</div>
                      <div className="mt-1 text-xs text-white/42">
                        {goal.measureType === "count" ? `${goal.targetValue} ${goal.unitLabel}` : goal.targetText} • {displayDateRange(goal)}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard>
                <h2 className="mb-3 text-[26px] font-black leading-none tracking-[-0.03em] text-white">Заметка дня</h2>
                <textarea
                  value={noteDraft}
                  onChange={(event) => saveNote(event.target.value)}
                  placeholder="Что важно сделать сегодня? Что помешало?"
                  rows={5}
                  className="w-full resize-none rounded-[18px] border border-white/[0.08] bg-[#0b0d13]/85 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-[#7ba3ff]"
                />
              </SectionCard>
            </aside>
          </div>
        </div>
      </main>

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
