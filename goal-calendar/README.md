# Goal Calendar

Мобильный календарь целей на React + Vite + Tailwind.

## Запуск локально

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Деплой на Vercel

1. Создай репозиторий на GitHub.
2. Загрузи все файлы из этой папки.
3. Зайди на Vercel.
4. Import Project → выбери репозиторий.
5. Framework Preset: Vite.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.

## Важно

Сейчас данные сохраняются в `localStorage`, поэтому они хранятся отдельно на каждом устройстве.
Для синхронизации между устройствами позже нужно подключить Supabase или Firebase.
