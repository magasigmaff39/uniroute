# UniRoute — дизайн-система

Все токены и общие классы лежат в `src/index.css`. Новые экраны собираются из них, без собственных цветов и эффектов.

## Бренд
- Логотип: `public/brand/uniroute-mark.png` (прозрачный фон, работает на светлой и тёмной теме), компоненты `BrandMark` и `BrandLogo` в `src/components/ui/Brand.tsx`.
- Слоган: «Навигация в образовании» / Education Navigation / Білім навигациясы (`header.tagline`).
- Иконки сайта: `public/favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png`.

## Цвета
- `blue-*` — фирменный синий из логотипа, `blue-600` (#0e64d2) — основной цвет действий.
- `slate-*` — нейтральные оттенки светлой темы, `zinc-*` — тёмной (с тёмно-синим подтоном, используются только в `dark:`).
- `emerald` — успех, `amber` — предупреждение, `rose` — ошибка, `violet` — инструменты письма.
- Переменные: `--bg`, `--surface`, `--surface-raised`, `--surface-subtle`, `--ink`, `--muted`, `--line`, `--line-strong`, `--brand`, `--ring`.

## Типографика
- Заголовки — Onest, текст — Inter (оба поддерживают русский и казахский).
- Заголовок раздела: 24–28px, полужирный. Заголовок карточки: 15–16px. Текст: 14px. Подписи: 12px. Меньше 11px не используем.

## Компоненты
- Кнопки: `ar-btn` + `ar-btn-primary` (главное действие, одно на блок) / `ar-btn-secondary` / `ar-btn-quiet` / `ar-btn-danger` / `ar-btn-icon`; размеры `ar-btn-sm` (32px) и `ar-btn-lg` (48px). Загрузка — `aria-busy` и спиннер.
- Карточки: `ar-card` (радиус 16px, тонкая рамка, мягкая тень). Кликабельная карточка (`button.ar-card`) получает hover сама.
- Поля: `ar-input` (ввод, select, textarea), `ar-label`, `ar-hint`, `ar-field-error` + `aria-invalid`. На телефоне текст полей 16px, чтобы iOS не увеличивал страницу.
- Выбор вариантов: `ar-chip` + `aria-pressed`. Статусы: `ar-badge` + `ar-badge-blue|green|amber|rose`.
- Прочее: `ar-icon-tile`, `ar-kicker`, `ar-progress`, `ar-notice`, `ar-notice-error`, `ar-link`, `skeleton`.
- Модальные окна: затемнение `bg-slate-950/40`, панель `rounded-2xl` с `shadow-[var(--shadow-overlay)]`, появление `animate-popIn`.

## Правила
- Никаких декоративных градиентов, светящихся пятен, «стекла» и иконки Sparkles.
- Радиусы: 12px — элементы управления, 16px — карточки, 20px — крупные панели.
- Анимации короткие (150–300 мс), учитывают `prefers-reduced-motion`.
- На телефоне в кабинете снизу есть панель вкладок; плавающие элементы используют классы `ar-fab` и `ar-sticky-actions`, чтобы её не перекрывать.
- Каждый экран проверяется на 375px, 768px и десктопе, в светлой и тёмной теме.
