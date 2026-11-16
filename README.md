# НИКАКОЙ

Адаптивный абсурдный сайт на React, TypeScript и Vite. Здесь есть семь разделов, локальный бот, достижения, мини-игра, магазин бесполезных вещей и сохранение прогресса в браузере.

## Локальный запуск

Требуются Node.js 22 и npm.

```bash
npm install
npm run dev
```

В Windows PowerShell можно использовать `npm.cmd` вместо `npm`, если запуск `npm.ps1` запрещён настройками системы.

Команды проекта:

```bash
npm run dev      # режим разработки
npm run build    # проверка TypeScript и production-сборка в dist/
npm run preview  # локальный просмотр production-сборки
```

Имя, настройки, достижения, покупки, валюта и время пребывания хранятся только в `localStorage` текущего браузера. Серверная часть и внешние API не используются.

## Публикация через Cloudflare Pages

1. Создайте репозиторий на GitHub и отправьте в него ветку `main` (инструкция ниже).
2. В Cloudflare откройте **Workers & Pages → Create application → Pages → Connect to Git** и выберите репозиторий.
3. Укажите параметры сборки:

   | Параметр | Значение |
   | --- | --- |
   | Framework preset | Vite |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` |

4. В настройках сборки задайте переменную окружения `NODE_VERSION` со значением `22`.
5. Сохраните настройки. Cloudflare соберёт сайт при подключении репозитория и при последующих push в ветку `main`.

Файл `public/_redirects` попадает в `dist` и перенаправляет неизвестные серверу URL на `index.html`. Благодаря этому страницы React Router, например `/shop` и `/secret`, открываются напрямую и работают после обновления.

## GitHub

Git-репозиторий проекта создаётся локально. Так как GitHub CLI не требуется для работы с сайтом и может быть не установлен, приватный удалённый репозиторий можно создать вручную:

1. На GitHub выберите **New repository**, назовите его `nikakoy`, установите видимость **Private** и создайте пустой репозиторий. Не добавляйте на GitHub README, `.gitignore` или лицензию — они уже есть в этом проекте.
2. В терминале из папки проекта добавьте адрес репозитория и отправьте ветку:

   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<ВАШ_ЛОГИН>/nikakoy.git
   git push -u origin main
   ```

Если Git попросит имя и email автора коммита, настройте их на свои данные в соответствии с инструкцией GitHub. В Windows PowerShell для npm используйте `npm.cmd`.
