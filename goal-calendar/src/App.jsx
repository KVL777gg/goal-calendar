import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "goal-calendar-prototype-v4-mobile";

function pad(n) {
  return String(n).padStart(2, "0");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthName(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function shortHumanDate(key) {
  try {
    return fromKey(key).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  } catch {
    return key;
  }
}

function formatShortDate(key) {
  try {
    return fromKey(key).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  } catch {
    return key;
  }
}

function displayDateRange(goal) {
  const normalized = normalizeGoal(goal);
  if (normalized.type === "always") return "каждый день";
  if (normalized.startDate && normalized.endDate && normalized.startDate !== normalized.endDate) {
    return `${formatShortDate(normalized.startDate)} — ${formatShortDate(normalized.endDate)}`;
  }
  if (normalized.startDate) return formatShortDate(normalized.startDate);
  return "без даты";
}

function getMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = (first.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < firstDay; i += 1) days.push(null);
  for (let d = 1; d <= last.getDate(); d += 1) days.push(new Date(year, month, d));
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

function goalIcon(goal) {
  const text = `${goal.title} ${goal.color}`.toLowerCase();
  if (text.includes("сон") || text.includes("режим")) return "🌙";
  if (text.includes("трен") || text.includes("растяж") || text.includes("спорт") || text.includes("здоров")) return "🏋️";
  if (text.includes("вода")) return "💧";
  if (text.includes("книг") || text.includes("читать")) return "📖";
  if (text.includes("контроль") || text.includes("учё") || text.includes("учеб") || text.includes("задач")) return "🎓";
  return "🎯";
}

function defaultData() {
  const today = toKey(new Date());
  const inSevenDays = new Date();
  inSevenDays.setDate(inSevenDays.getDate() + 6);
  const weekEnd = toKey(inSevenDays);

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
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const previousKeys = ["goal-calendar-prototype-v3", "goal-calendar-prototype-v2", "goal-calendar-prototype-v1"];
      for (const key of previousKeys) {
        const oldSaved = localStorage.getItem(key);
        if (oldSaved) {
          const oldParsed = JSON.parse(oldSaved);
          return {
            goals: Array.isArray(oldParsed.goals) ? oldParsed.goals.map(normalizeGoal) : [],
            completions: oldParsed.completions && typeof oldParsed.completions === "object" ? oldParsed.completions : {},
            notes: oldParsed.notes && typeof oldParsed.notes === "object" ? oldParsed.notes : {},
          };
        }
      }
      return defaultData();
    }

    const parsed = JSON.parse(saved);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : [],
      completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {},
      notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
    };
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
    // В некоторых песочницах localStorage может быть заблокирован.
  }
}

function runSelfTests() {
  const jan2024 = getMonthDays(new Date(2024, 0, 1));
  console.assert(jan2024.filter(Boolean).length === 31, "January 2024 should have 31 days");
  console.assert(jan2024[0] instanceof Date && jan2024[0].getDate() === 1, "January 2024 starts on Monday");

  const feb2024 = getMonthDays(new Date(2024, 1, 1));
  console.assert(feb2024.filter(Boolean).length === 29, "February 2024 should have 29 days");
  console.assert(toKey(new Date(2026, 4, 2)) === "2026-05-02", "toKey should format date as YYYY-MM-DD");
  console.assert(fromKey("2026-05-02").getMonth() === 4, "fromKey should restore month correctly");

  const rangeGoal = { title: "Test", type: "range", startDate: "2026-05-02", endDate: "2026-05-05" };
  console.assert(isGoalActiveOnDate(rangeGoal, "2026-05-02") === true, "Range goal should start on startDate");
  console.assert(isGoalActiveOnDate(rangeGoal, "2026-05-04") === true, "Range goal should be active inside range");
  console.assert(isGoalActiveOnDate(rangeGoal, "2026-05-06") === false, "Range goal should stop after endDate");

  const alwaysGoal = { title: "Always", type: "always", startDate: "2026-05-02", endDate: "2026-05-02" };
  console.assert(isGoalActiveOnDate(alwaysGoal, "2030-01-01") === true, "Always goal should be active every day");

  const oldGoal = { title: "Old" };
  const normalized = normalizeGoal(oldGoal);
  console.assert(Boolean(normalized.id), "normalizeGoal should add id");
  console.assert(normalized.type === "always", "normalizeGoal should default to always");
}

if (typeof console !== "undefined") {
  runSelfTests();
}

function RingStat({ label, value, sublabel, icon, accent = "from-violet-500 to-blue-500" }) {
  return (
    <div className="min-w-0 rounded-[1.55rem] border border-white/10 bg-white/[0.055] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${accent} p-[2px] shadow-lg shadow-violet-950/30 sm:h-14 sm:w-14`}>
          <div className="grid h-full w-full place-items-center rounded-full bg-[#151520] text-sm font-black text-white">
            {icon || value}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-white/50 sm:text-sm">{label}</p>
          <p className="truncate text-base font-black text-white sm:text-lg">{value}</p>
          <p className="truncate text-xs text-white/45 sm:text-sm">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090912]/85 px-4 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 backdrop-blur-2xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 text-center text-[11px] text-white/45">
        <button className="rounded-2xl bg-violet-500/20 px-2 py-2 font-semibold text-violet-200">
          <span className="block text-xl">⌂</span>
          Главная
        </button>
        <button className="rounded-2xl px-2 py-2">
          <span className="block text-xl">◎</span>
          Цели
        </button>
        <button className="rounded-2xl px-2 py-2">
          <span className="block text-xl">▥</span>
          Статистика
        </button>
        <button className="rounded-2xl px-2 py-2">
          <span className="block text-xl">☻</span>
          Профиль
        </button>
      </div>
    </nav>
  );
}

export default function GoalCalendarPrototype() {
  const [data, setData] = useState(safeLoadData);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedKey, setSelectedKey] = useState(toKey(new Date()));
  const [newGoal, setNewGoal] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newGoalType, setNewGoalType] = useState("range");
  const [newStartDate, setNewStartDate] = useState(toKey(new Date()));
  const [newEndDate, setNewEndDate] = useState(toKey(new Date()));
  const [noteDraft, setNoteDraft] = useState(() => safeLoadData().notes?.[toKey(new Date())] || "");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    safeSaveData(data);
  }, [data]);

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
    const realDays = days.filter(Boolean);
    let totalSlots = 0;
    let done = 0;

    for (const day of realDays) {
      const key = toKey(day);
      const active = activeGoalsForDate(data.goals, key);
      const completed = data.completions[key] || {};
      totalSlots += active.length;
      done += active.filter((goal) => completed[goal.id]).length;
    }

    return {
      done,
      totalSlots,
      percent: totalSlots ? Math.round((done / totalSlots) * 100) : 0,
    };
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

  function toggleGoal(goalId) {
    setData((prev) => {
      const day = prev.completions[selectedKey] || {};
      return {
        ...prev,
        completions: {
          ...prev.completions,
          [selectedKey]: {
            ...day,
            [goalId]: !day[goalId],
          },
        },
      };
    });
  }

  function addGoal(e) {
    e.preventDefault();
    const title = newGoal.trim();
    if (!title) return;

    let startDate = newStartDate || selectedKey;
    let endDate = newEndDate || startDate;

    if (newGoalType === "range" && endDate < startDate) {
      const oldStart = startDate;
      startDate = endDate;
      endDate = oldStart;
    }

    if (newGoalType === "today") {
      startDate = selectedKey;
      endDate = selectedKey;
    }

    setData((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
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

  function removeGoal(goalId) {
    setData((prev) => {
      const nextCompletions = {};
      for (const [day, values] of Object.entries(prev.completions)) {
        const copy = { ...values };
        delete copy[goalId];
        nextCompletions[day] = copy;
      }
      return {
        ...prev,
        goals: prev.goals.filter((goal) => goal.id !== goalId),
        completions: nextCompletions,
      };
    });
  }

  function saveNote(value) {
    setNoteDraft(value);
    setData((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [selectedKey]: value,
      },
    }));
  }

  function moveMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function goToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toKey(today));
  }

  function getDayProgress(day) {
    if (!day) return 0;
    const key = toKey(day);
    const active = activeGoalsForDate(data.goals, key);
    if (active.length === 0) return 0;
    const completed = data.completions[key] || {};
    return Math.round((active.filter((goal) => completed[goal.id]).length / active.length) * 100);
  }

  function getDayActiveCount(day) {
    if (!day) return 0;
    return activeGoalsForDate(data.goals, toKey(day)).length;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070711] text-white selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.30),transparent_33%),radial-gradient(circle_at_95%_18%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,#070711_0%,#11101b_55%,#08080f_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:42px_42px]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 md:pb-10 md:pt-8">
        <header className="mb-5 flex items-start justify-between gap-4 md:mb-7">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-black capitalize tracking-tight sm:text-5xl md:text-6xl">{monthName(viewDate)}</h1>
              <span className="mt-1 text-2xl text-white/55">⌄</span>
            </div>
            <button type="button" onClick={goToday} className="mt-1 text-left text-base font-medium text-white/50 transition hover:text-white md:text-lg">
              Сегодня, {shortHumanDate(todayKey)}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((value) => !value)}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-2xl shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:bg-white/10 md:hidden"
            aria-label="Добавить цель"
          >
            ＋
          </button>
        </header>

        <section className="mb-5 grid grid-cols-3 gap-2 sm:gap-3 md:mb-7">
          <RingStat label="Сегодня" value={`${completedToday} из ${activeGoals.length}`} sublabel="целей" icon={`${progress}%`} />
          <RingStat label="Месяц" value={`${monthStats.done} из ${monthStats.totalSlots}`} sublabel="целей" icon={`${monthStats.percent}%`} accent="from-blue-500 to-cyan-400" />
          <RingStat label="Серия" value={streak} sublabel="дней" icon="🔥" accent="from-orange-500 to-rose-500" />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-3xl leading-none text-white/90 transition hover:bg-white/12"
                aria-label="Предыдущий месяц"
              >
                ‹
              </button>
              <div className="text-center md:hidden">
                <p className="text-sm font-semibold capitalize text-white/70">{monthName(viewDate)}</p>
                <button type="button" onClick={goToday} className="text-xs text-white/40">Сегодня</button>
              </div>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.07] text-3xl leading-none text-white/90 transition hover:bg-white/12"
                aria-label="Следующий месяц"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-white/42 sm:gap-2 sm:text-sm">
              {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((dayName) => (
                <div key={dayName} className="pb-2">{dayName}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {days.map((day, idx) => {
                const key = day ? toKey(day) : `empty-${idx}`;
                const dayProgress = getDayProgress(day);
                const activeCount = getDayActiveCount(day);
                const isSelected = day && key === selectedKey;
                const isToday = day && key === todayKey;
                const completedCount = day
                  ? activeGoalsForDate(data.goals, key).filter((goal) => (data.completions[key] || {})[goal.id]).length
                  : 0;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedKey(key)}
                    className={`relative min-h-[4.65rem] rounded-2xl p-1.5 text-center transition active:scale-[0.98] sm:min-h-[5.8rem] sm:p-2 md:min-h-[6.6rem] ${
                      !day
                        ? "pointer-events-none bg-transparent"
                        : isSelected
                          ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 text-white shadow-[0_14px_32px_rgba(99,102,241,0.45)]"
                          : "border border-white/[0.07] bg-black/24 text-white hover:bg-white/[0.08]"
                    } ${isToday && !isSelected ? "ring-2 ring-violet-300/60" : ""}`}
                  >
                    {day && (
                      <>
                        <div className="text-xl font-black leading-none sm:text-2xl">{day.getDate()}</div>
                        <div className="mx-auto mt-2 h-1.5 w-1.5 rounded-full bg-violet-200/80" />
                        <div className="mt-1 text-[11px] font-semibold text-white/70 sm:text-sm">
                          {completedCount}/{activeCount}
                        </div>
                        <div className={`mx-auto mt-1 h-1 w-8 overflow-hidden rounded-full ${isSelected ? "bg-white/25" : "bg-white/10"}`}>
                          <div className="h-full rounded-full bg-white" style={{ width: `${dayProgress}%` }} />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-black">{selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</h2>
                  <p className="mt-1 text-sm text-white/50">{completedToday} из {activeGoals.length} целей выполнено</p>
                </div>
                <div className="rounded-full bg-gradient-to-r from-violet-500/35 to-blue-500/35 px-5 py-3 text-xl font-black text-violet-100 ring-1 ring-white/10">
                  {progress}%
                </div>
              </div>

              <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400" style={{ width: `${progress}%` }} />
              </div>

              <div className="space-y-1">
                {activeGoals.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
                    На этот день целей пока нет. Нажми плюс сверху и добавь первую цель.
                  </div>
                )}

                {activeGoals.map((goal) => {
                  const done = Boolean(selectedCompletions[goal.id]);
                  return (
                    <div key={goal.id} className="group flex items-center gap-3 rounded-3xl p-3 transition hover:bg-white/[0.045]">
                      <button
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-lg transition ${
                          done ? "border-violet-300 bg-violet-400/25 text-violet-100" : "border-white/20 bg-black/10 text-white/30"
                        }`}
                        aria-label="Отметить цель"
                      >
                        {done ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-base font-bold ${done ? "text-white/40 line-through" : "text-white"}`}>{goal.title}</div>
                        <div className="truncate text-sm text-white/42">{goal.color} • {goal.target} • {displayDateRange(goal)}</div>
                      </div>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.055] text-xl">{goalIcon(goal)}</div>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="hidden rounded-2xl px-2 py-1 text-sm text-white/35 transition hover:bg-rose-500/10 hover:text-rose-200 sm:block"
                        aria-label="Удалить цель"
                      >
                        удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`${showAddForm ? "block" : "hidden md:block"} rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black">Новая цель</h2>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-white/45 md:hidden">закрыть</button>
              </div>

              <form onSubmit={addGoal} className="space-y-3">
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Например: решить 5 задач"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-violet-300/50"
                />
                <input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
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
                      className={`rounded-2xl px-2 py-2 text-sm font-bold transition ${newGoalType === type ? "bg-white text-[#11101b]" : "bg-black/22 text-white/55 ring-1 ring-white/10"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {newGoalType === "range" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-white/45">
                      С даты
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-violet-300/50"
                      />
                    </label>
                    <label className="text-sm text-white/45">
                      По дату
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-violet-300/50"
                      />
                    </label>
                  </div>
                )}

                {newGoalType === "today" && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                    Цель появится только на дату: {formatShortDate(selectedKey)}.
                  </div>
                )}

                {newGoalType === "always" && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                    Цель будет появляться каждый день как постоянная привычка.
                  </div>
                )}

                <button className="w-full rounded-2xl bg-gradient-to-r from-violet-400 to-sky-400 px-4 py-3 font-black text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110">
                  Добавить цель
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <h2 className="mb-3 text-2xl font-black">Заметка дня</h2>
              <textarea
                value={noteDraft}
                onChange={(e) => saveNote(e.target.value)}
                placeholder="Что важно сделать сегодня? Что помешало?"
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/28 focus:border-violet-300/50"
              />
            </section>
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
