import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "goal-calendar-black-gray-v1";

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

function monthName(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function humanDate(key) {
  return fromKey(key).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function shortDate(key) {
  return fromKey(key).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
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
  return {
    id: goal.id || createId(),
    title: goal.title || "Без названия",
    color: goal.color || "Цель",
    target: goal.target || "1 раз",
    type: goal.type || "always",
    startDate: goal.startDate || today,
    endDate: goal.endDate || goal.startDate || today,
  };
}

function isGoalActiveOnDate(goal, dateKey) {
  const normalized = normalizeGoal(goal);
  if (normalized.type === "always") return true;
  return dateKey >= normalized.startDate && dateKey <= normalized.endDate;
}

function activeGoalsForDate(goals, dateKey) {
  return goals.filter((goal) => isGoalActiveOnDate(goal, dateKey));
}

function displayDateRange(goal) {
  const normalized = normalizeGoal(goal);
  if (normalized.type === "always") return "каждый день";
  if (normalized.startDate === normalized.endDate) return shortDate(normalized.startDate);
  return `${shortDate(normalized.startDate)} — ${shortDate(normalized.endDate)}`;
}

function goalIcon(goal) {
  const text = `${goal.title} ${goal.color}`.toLowerCase();
  if (text.includes("сон") || text.includes("режим")) return "🌙";
  if (text.includes("трен") || text.includes("растяж") || text.includes("спорт")) return "🏋️";
  if (text.includes("вода")) return "💧";
  if (text.includes("книг") || text.includes("читать")) return "📖";
  if (text.includes("контроль") || text.includes("учё") || text.includes("учеб") || text.includes("задач")) return "🎓";
  return "🎯";
}

function defaultData() {
  const today = toKey(new Date());
  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toKey(weekEndDate);

  return {
    goals: [
      {
        id: createId(),
        title: "Подготовка к контрольной",
        color: "Учёба",
        target: "60 минут",
        type: "range",
        startDate: today,
        endDate: weekEnd,
      },
      {
        id: createId(),
        title: "Сон до 00:30",
        color: "Режим",
        target: "1 раз",
        type: "always",
        startDate: today,
        endDate: today,
      },
      {
        id: createId(),
        title: "Тренировка / растяжка",
        color: "Здоровье",
        target: "15 минут",
        type: "range",
        startDate: today,
        endDate: weekEnd,
      },
    ],
    completions: {},
    notes: { [today]: "Начни с 1–2 целей, не перегружай календарь." },
  };
}

function safeLoadData() {
  try {
    if (typeof localStorage === "undefined") return defaultData();

    const keys = [
      STORAGE_KEY,
      "goal-calendar-theme-photo-v1",
      "goal-calendar-minimal-v1",
      "goal-calendar-mobile-v5",
      "goal-calendar-prototype-v4-mobile",
      "goal-calendar-prototype-v3",
      "goal-calendar-prototype-v2",
      "goal-calendar-prototype-v1",
    ];

    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved);
      return {
        goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : [],
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
    // ignore storage errors
  }
}

function runSelfTests() {
  const jan2024 = getMonthDays(new Date(2024, 0, 1));
  console.assert(jan2024.filter(Boolean).length === 31, "January 2024 should have 31 days");
  console.assert(jan2024[0]?.getDate() === 1, "January 2024 starts on Monday");

  const feb2024 = getMonthDays(new Date(2024, 1, 1));
  console.assert(feb2024.filter(Boolean).length === 29, "February 2024 should have 29 days");

  console.assert(toKey(new Date(2026, 4, 2)) === "2026-05-02", "toKey should format date");
  console.assert(fromKey("2026-05-02").getMonth() === 4, "fromKey should parse month");

  const rangeGoal = { type: "range", startDate: "2026-05-02", endDate: "2026-05-05" };
  console.assert(isGoalActiveOnDate(rangeGoal, "2026-05-03") === true, "Range active inside interval");
  console.assert(isGoalActiveOnDate(rangeGoal, "2026-05-06") === false, "Range inactive after end");
}

if (typeof console !== "undefined") runSelfTests();

function StatCard({ value, label, icon = null }) {
  return (
    <div className="rounded-[1.55rem] border border-white/7 bg-[#1a1a1f] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[28px] font-black leading-none text-white">{value}</div>
          <div className="mt-2 text-[11px] leading-tight text-white/45">{label}</div>
        </div>
        {icon ? <div className="text-xl">{icon}</div> : null}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(safeLoadData);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(toKey(new Date()));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newGoalType, setNewGoalType] = useState("range");
  const [newStartDate, setNewStartDate] = useState(toKey(new Date()));
  const [newEndDate, setNewEndDate] = useState(toKey(new Date()));
  const [noteDraft, setNoteDraft] = useState(() => safeLoadData().notes?.[toKey(new Date())] || "");

  useEffect(() => safeSaveData(data), [data]);

  useEffect(() => {
    setNoteDraft(data.notes?.[selectedKey] || "");
  }, [selectedKey, data.notes]);

  const days = useMemo(() => getMonthDays(viewDate), [viewDate]);
  const todayKey = toKey(new Date());
  const selectedDate = fromKey(selectedKey);
  const activeGoals = useMemo(() => activeGoalsForDate(data.goals, selectedKey), [data.goals, selectedKey]);
  const selectedCompletions = data.completions[selectedKey] || {};
  const completedToday = activeGoals.filter((goal) => selectedCompletions[goal.id]).length;
  const progress = activeGoals.length ? Math.round((completedToday / activeGoals.length) * 100) : 0;

  const monthStats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const day of days.filter(Boolean)) {
      const key = toKey(day);
      const active = activeGoalsForDate(data.goals, key);
      const completed = data.completions[key] || {};
      total += active.length;
      done += active.filter((goal) => completed[goal.id]).length;
    }
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [days, data.goals, data.completions]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      const key = toKey(cursor);
      const active = activeGoalsForDate(data.goals, key);
      const completed = data.completions[key] || {};
      const allDone = active.length > 0 && active.every((goal) => completed[goal.id]);
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
      .filter((goal) => goal.type === "always" || goal.endDate >= today)
      .slice(0, 4);
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
    const completed = data.completions[key] || {};
    const done = active.filter((goal) => completed[goal.id]).length;
    return {
      active: active.length,
      done,
      progress: active.length ? Math.round((done / active.length) * 100) : 0,
    };
  }

  function toggleGoal(goalId) {
    setData((previous) => {
      const day = previous.completions[selectedKey] || {};
      return {
        ...previous,
        completions: {
          ...previous.completions,
          [selectedKey]: { ...day, [goalId]: !day[goalId] },
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

    if (newGoalType === "today") {
      startDate = selectedKey;
      endDate = selectedKey;
    }

    if (newGoalType === "range" && endDate < startDate) {
      [startDate, endDate] = [endDate, startDate];
    }

    setData((previous) => ({
      ...previous,
      goals: [
        ...previous.goals,
        {
          id: createId(),
          title,
          target: newTarget.trim() || "1 раз",
          color: newGoalType === "always" ? "Привычка" : "Цель",
          type: newGoalType === "today" ? "range" : newGoalType,
          startDate,
          endDate,
        },
      ],
    }));

    setNewGoal("");
    setNewTarget("");
    setShowAddForm(false);
  }

  return (
    <div className="min-h-screen bg-[#0f1013] text-white">
      <main className="mx-auto max-w-[1320px] px-4 pb-10 pt-5 sm:px-6">
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-white/8 bg-[#1a1a1f] px-3 py-1 text-xs text-white/70">
              Календарь целей
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-black leading-[0.95] tracking-[-0.03em] text-white">
                  Планируй день и отмечай
                  <br />
                  выполнение
                </h1>
                <p className="mt-3 text-sm text-white/50 sm:text-base">
                  Теперь цели можно ставить на один день, на диапазон дат или как постоянную привычку.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddForm}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/8 bg-[#252830] text-[34px] leading-none text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] transition hover:bg-[#2a2d36] active:scale-95"
                aria-label="Добавить цель"
              >
                <span className="block -translate-y-[2px]">+</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 xl:w-[370px]">
            <StatCard value={`${progress}%`} label={`выбранный\nдень`} />
            <StatCard value={`${monthStats.percent}%`} label={`месяц`} />
            <StatCard value={String(streak)} label={`серия дней`} icon="🔥" />
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/7 bg-[#17181d] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#272a31] text-2xl text-white/90 transition hover:bg-[#2d3039]"
                aria-label="Предыдущий месяц"
              >
                ‹
              </button>

              <div className="text-center">
                <div className="text-[30px] font-black capitalize leading-none tracking-[-0.02em]">{monthName(viewDate)}</div>
                <button type="button" onClick={goToday} className="mt-2 text-sm text-white/45">
                  Сегодня
                </button>
              </div>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#272a31] text-2xl text-white/90 transition hover:bg-[#2d3039]"
                aria-label="Следующий месяц"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/38 sm:text-sm">
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
                    className={`rounded-[1.15rem] px-1 py-2 text-center transition active:scale-[0.98] sm:min-h-[5.1rem] ${
                      !day
                        ? "pointer-events-none opacity-0"
                        : isSelected
                          ? "bg-[#f0f0f2] text-[#101014]"
                          : "border border-white/7 bg-[#0d0e12] text-white hover:bg-[#13151a]"
                    } ${isToday && !isSelected ? "ring-1 ring-white/18" : ""}`}
                  >
                    {day && (
                      <>
                        <div className="text-[clamp(1rem,3.7vw,1.42rem)] font-black leading-none tracking-[-0.02em]">{day.getDate()}</div>
                        <div className={`mx-auto mt-2 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[#101014]/60" : "bg-white/52"}`} />
                        <div className={`mt-1 text-[10.5px] font-semibold ${isSelected ? "text-[#101014]/65" : "text-white/60"}`}>
                          {stats.done}/{stats.active}
                        </div>
                        <div className={`mx-auto mt-1 h-1 w-[70%] overflow-hidden rounded-full ${isSelected ? "bg-black/15" : "bg-white/10"}`}>
                          <div className={`h-full rounded-full ${isSelected ? "bg-[#101014]/70" : "bg-white/54"}`} style={{ width: `${stats.progress}%` }} />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-white/7 bg-[#17181d] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[34px] font-black leading-none tracking-[-0.02em]">
                    {selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </h2>
                  <p className="mt-1 text-sm text-white/48">Выполнено: {completedToday} из {activeGoals.length}</p>
                </div>
                <div className="rounded-2xl bg-[#0d0e12] px-4 py-2 text-lg font-black">
                  {progress}%
                </div>
              </div>

              <div className="space-y-3">
                {activeGoals.length === 0 && (
                  <div className="rounded-[1.4rem] border border-white/7 bg-[#0d0e12] p-4 text-sm text-white/45">
                    На этот день целей пока нет.
                  </div>
                )}

                {activeGoals.map((goal) => {
                  const done = Boolean(selectedCompletions[goal.id]);
                  return (
                    <div key={goal.id} className="flex items-center gap-3 rounded-[1.35rem] bg-[#0d0e12] px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition ${
                          done ? "border-white bg-white text-[#101014]" : "border-white/18 text-white/30"
                        }`}
                        aria-label="Отметить цель"
                      >
                        {done ? "✓" : ""}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[17px] font-bold ${done ? "text-white/45 line-through" : "text-white"}`}>{goal.title}</div>
                        <div className="truncate text-xs text-white/38 sm:text-sm">
                          {goal.color} • {goal.target} • {displayDateRange(goal)}
                        </div>
                      </div>

                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1b1d23] text-lg">
                        {goalIcon(goal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="rounded-xl px-2 py-1 text-xs text-white/35 transition hover:bg-white/5 hover:text-white/70"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/7 bg-[#17181d] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5">
              <h2 className="mb-3 text-[30px] font-black leading-none tracking-[-0.02em]">Ближайшие цели</h2>
              <div className="space-y-3">
                {upcomingGoals.length === 0 && (
                  <div className="rounded-[1.35rem] bg-[#0d0e12] px-4 py-3 text-sm text-white/45">
                    Пока нет ближайших целей.
                  </div>
                )}

                {upcomingGoals.map((goal) => (
                  <div key={goal.id} className="rounded-[1.35rem] bg-[#0d0e12] px-4 py-3">
                    <div className="text-sm font-bold text-white">{goal.title}</div>
                    <div className="mt-1 text-xs text-white/40">
                      {displayDateRange(goal)} • {goal.target}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/7 bg-[#17181d] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-5">
              <h2 className="mb-3 text-[30px] font-black leading-none tracking-[-0.02em]">Заметка дня</h2>
              <textarea
                value={noteDraft}
                onChange={(event) => saveNote(event.target.value)}
                placeholder="Что важно сделать сегодня? Что помешало?"
                rows={5}
                className="w-full resize-none rounded-[1.35rem] border border-white/8 bg-[#0d0e12] px-4 py-3 text-white outline-none placeholder:text-white/26 focus:border-white/18"
              />
            </section>
          </aside>
        </div>
      </main>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <section className="w-full rounded-[2rem] border border-white/8 bg-[#17181d] p-4 shadow-2xl sm:max-w-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Новая цель</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-full bg-white/8 px-3 py-1 text-white/60 transition hover:bg-white/12"
              >
                закрыть
              </button>
            </div>

            <form onSubmit={addGoal} className="space-y-3">
              <input
                value={newGoal}
                onChange={(event) => setNewGoal(event.target.value)}
                placeholder="Например: решить 5 задач"
                className="w-full rounded-2xl border border-white/10 bg-[#0d0e12] px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-white/18"
              />

              <input
                value={newTarget}
                onChange={(event) => setNewTarget(event.target.value)}
                placeholder="Норма: 30 минут / 10 повторов / 1 раз"
                className="w-full rounded-2xl border border-white/10 bg-[#0d0e12] px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-white/18"
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
                      newGoalType === type ? "bg-white text-[#101014]" : "border border-white/10 bg-[#0d0e12] text-white/60"
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
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-[#0d0e12] px-3 py-3 text-white outline-none focus:border-white/18"
                    />
                  </label>
                  <label className="text-sm text-white/45">
                    По дату
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(event) => setNewEndDate(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-[#0d0e12] px-3 py-3 text-white outline-none focus:border-white/18"
                    />
                  </label>
                </div>
              )}

              {newGoalType === "today" && (
                <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-3 text-sm text-white/45">
                  Цель появится только на дату: {shortDate(selectedKey)}.
                </div>
              )}

              {newGoalType === "always" && (
                <div className="rounded-2xl border border-white/10 bg-[#0d0e12] p-3 text-sm text-white/45">
                  Цель будет появляться каждый день как постоянная привычка.
                </div>
              )}

              <button className="w-full rounded-2xl bg-white px-4 py-3 font-black text-[#101014] transition hover:bg-white/92">
                Добавить цель
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
