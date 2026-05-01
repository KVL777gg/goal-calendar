import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "goal-calendar-prototype-v3";

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

function displayDateRange(goal) {
  if (goal.type === "always") return "каждый день";
  if (goal.startDate && goal.endDate && goal.startDate !== goal.endDate) {
    return `${formatShortDate(goal.startDate)} — ${formatShortDate(goal.endDate)}`;
  }
  if (goal.startDate) return formatShortDate(goal.startDate);
  return "без даты";
}

function formatShortDate(key) {
  try {
    return fromKey(key).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  } catch {
    return key;
  }
}

function getMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = (first.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
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

  const start = normalized.startDate;
  const end = normalized.endDate || normalized.startDate;

  return dateKey >= start && dateKey <= end;
}

function activeGoalsForDate(goals, dateKey) {
  return goals.filter((goal) => isGoalActiveOnDate(goal, dateKey));
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
      const oldSaved = localStorage.getItem("goal-calendar-prototype-v2");
      if (!oldSaved) return defaultData();
      const oldParsed = JSON.parse(oldSaved);
      return {
        goals: Array.isArray(oldParsed.goals) ? oldParsed.goals.map(normalizeGoal) : [],
        completions: oldParsed.completions && typeof oldParsed.completions === "object" ? oldParsed.completions : {},
        notes: oldParsed.notes && typeof oldParsed.notes === "object" ? oldParsed.notes : {},
      };
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

function Icon({ children, className = "" }) {
  return <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">{children}</span>;
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
}

if (typeof console !== "undefined") {
  runSelfTests();
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

    for (let i = 0; i < 365; i++) {
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
    return data.goals
      .filter((goal) => normalizeGoal(goal).type === "range" && normalizeGoal(goal).endDate >= todayKey)
      .sort((a, b) => normalizeGoal(a).startDate.localeCompare(normalizeGoal(b).startDate))
      .slice(0, 5);
  }, [data.goals, todayKey]);

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
    <div className="min-h-screen bg-neutral-950 p-4 text-neutral-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-sm text-neutral-300 ring-1 ring-neutral-800">
              <Icon>📅</Icon>
              Календарь целей
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Планируй день и отмечай выполнение</h1>
            <p className="mt-3 max-w-2xl text-neutral-400">
              Теперь цели можно ставить на один день, на диапазон дат или как постоянную привычку.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
              <div className="text-2xl font-bold">{progress}%</div>
              <div className="text-xs text-neutral-400">выбранный день</div>
            </div>
            <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
              <div className="text-2xl font-bold">{monthStats.percent}%</div>
              <div className="text-xs text-neutral-400">месяц</div>
            </div>
            <div className="rounded-2xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold"><Icon>🔥</Icon>{streak}</div>
              <div className="text-xs text-neutral-400">серия дней</div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl bg-neutral-900 p-4 shadow-2xl ring-1 ring-neutral-800 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-2xl bg-neutral-800 px-4 py-3 text-xl hover:bg-neutral-700"
                aria-label="Предыдущий месяц"
              >
                ‹
              </button>
              <div className="text-center">
                <h2 className="text-xl font-semibold capitalize md:text-2xl">{monthName(viewDate)}</h2>
                <button type="button" onClick={goToday} className="mt-1 text-sm text-neutral-400 hover:text-neutral-100">
                  Сегодня
                </button>
              </div>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-2xl bg-neutral-800 px-4 py-3 text-xl hover:bg-neutral-700"
                aria-label="Следующий месяц"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((dayName) => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const key = day ? toKey(day) : `empty-${idx}`;
                const dayProgress = getDayProgress(day);
                const activeCount = getDayActiveCount(day);
                const isSelected = day && key === selectedKey;
                const isToday = day && key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedKey(key)}
                    className={`min-h-20 rounded-2xl p-2 text-left transition md:min-h-24 ${
                      !day ? "bg-transparent" : isSelected ? "bg-white text-neutral-950" : "bg-neutral-950 hover:bg-neutral-800"
                    } ${isToday && !isSelected ? "ring-2 ring-neutral-500" : ""}`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{day.getDate()}</span>
                          {dayProgress === 100 && activeCount > 0 && <Icon>✅</Icon>}
                        </div>
                        <div className={`mt-4 h-2 rounded-full ${isSelected ? "bg-neutral-300" : "bg-neutral-800"}`}>
                          <div className="h-2 rounded-full bg-current" style={{ width: `${dayProgress}%` }} />
                        </div>
                        <div className={`mt-1 flex items-center justify-between text-xs ${isSelected ? "text-neutral-700" : "text-neutral-500"}`}>
                          <span>{dayProgress}%</span>
                          <span>{activeCount} ц.</span>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-neutral-900 p-5 shadow-2xl ring-1 ring-neutral-800">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</h2>
                  <p className="text-sm text-neutral-400">Выполнено: {completedToday} из {activeGoals.length}</p>
                </div>
                <div className="rounded-2xl bg-neutral-950 px-3 py-2 text-lg font-bold">{progress}%</div>
              </div>

              <div className="space-y-3">
                {activeGoals.length === 0 && (
                  <div className="rounded-2xl bg-neutral-950 p-4 text-sm text-neutral-400 ring-1 ring-neutral-800">
                    На этот день целей пока нет. Добавь цель ниже и выбери нужный диапазон дат.
                  </div>
                )}

                {activeGoals.map((goal) => {
                  const done = Boolean(selectedCompletions[goal.id]);
                  return (
                    <div key={goal.id} className="flex items-center gap-3 rounded-2xl bg-neutral-950 p-3 ring-1 ring-neutral-800">
                      <button type="button" onClick={() => toggleGoal(goal.id)} className="shrink-0 text-xl" aria-label="Отметить цель">
                        {done ? "✅" : "○"}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${done ? "text-neutral-500 line-through" : ""}`}>{goal.title}</div>
                        <div className="text-xs text-neutral-500">{goal.color} · {goal.target} · {displayDateRange(goal)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-100"
                        aria-label="Удалить цель"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-neutral-900 p-5 shadow-2xl ring-1 ring-neutral-800">
              <div className="mb-4 flex items-center gap-2">
                <Icon>🎯</Icon>
                <h2 className="text-xl font-bold">Новая цель</h2>
              </div>
              <form onSubmit={addGoal} className="space-y-3">
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Например: решить 5 задач"
                  className="w-full rounded-2xl bg-neutral-950 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-500"
                />
                <input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="Норма: 30 минут / 10 повторов / 1 раз"
                  className="w-full rounded-2xl bg-neutral-950 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-500"
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setNewGoalType("today")}
                    className={`rounded-2xl px-3 py-2 text-sm ring-1 ring-neutral-800 ${newGoalType === "today" ? "bg-white text-neutral-950" : "bg-neutral-950 text-neutral-300"}`}
                  >
                    На выбранный день
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGoalType("range")}
                    className={`rounded-2xl px-3 py-2 text-sm ring-1 ring-neutral-800 ${newGoalType === "range" ? "bg-white text-neutral-950" : "bg-neutral-950 text-neutral-300"}`}
                  >
                    На несколько дней
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGoalType("always")}
                    className={`rounded-2xl px-3 py-2 text-sm ring-1 ring-neutral-800 ${newGoalType === "always" ? "bg-white text-neutral-950" : "bg-neutral-950 text-neutral-300"}`}
                  >
                    Каждый день
                  </button>
                </div>

                {newGoalType === "range" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-neutral-400">
                      С даты
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="mt-1 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-neutral-100 outline-none ring-1 ring-neutral-800 focus:ring-neutral-500"
                      />
                    </label>
                    <label className="text-sm text-neutral-400">
                      По дату
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="mt-1 w-full rounded-2xl bg-neutral-950 px-4 py-3 text-neutral-100 outline-none ring-1 ring-neutral-800 focus:ring-neutral-500"
                      />
                    </label>
                  </div>
                )}

                {newGoalType === "today" && (
                  <div className="rounded-2xl bg-neutral-950 p-3 text-sm text-neutral-400 ring-1 ring-neutral-800">
                    Цель появится только на дату: {formatShortDate(selectedKey)}.
                  </div>
                )}

                {newGoalType === "always" && (
                  <div className="rounded-2xl bg-neutral-950 p-3 text-sm text-neutral-400 ring-1 ring-neutral-800">
                    Цель будет появляться каждый день как постоянная привычка.
                  </div>
                )}

                <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-neutral-950 hover:bg-neutral-200">
                  <span aria-hidden="true">＋</span> Добавить
                </button>
              </form>
            </section>

            <section className="rounded-3xl bg-neutral-900 p-5 shadow-2xl ring-1 ring-neutral-800">
              <h2 className="mb-3 text-xl font-bold">Ближайшие цели</h2>
              <div className="space-y-2">
                {upcomingGoals.length === 0 && <p className="text-sm text-neutral-400">Нет целей с диапазоном дат.</p>}
                {upcomingGoals.map((goal) => (
                  <div key={goal.id} className="rounded-2xl bg-neutral-950 p-3 text-sm ring-1 ring-neutral-800">
                    <div className="font-medium">{goal.title}</div>
                    <div className="text-neutral-500">{displayDateRange(goal)} · {goal.target}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-neutral-900 p-5 shadow-2xl ring-1 ring-neutral-800">
              <h2 className="mb-3 text-xl font-bold">Заметка дня</h2>
              <textarea
                value={noteDraft}
                onChange={(e) => saveNote(e.target.value)}
                placeholder="Что важно сделать сегодня? Что помешало?"
                rows={5}
                className="w-full resize-none rounded-2xl bg-neutral-950 px-4 py-3 outline-none ring-1 ring-neutral-800 focus:ring-neutral-500"
              />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
