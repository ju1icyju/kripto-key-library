# Инструкция по деплою на GitHub Pages

Этот гайд поможет вам бесплатно опубликовать проект в интернете с помощью GitHub Pages.

## Шаг 1: Подготовка
1.  Убедитесь, что у вас есть аккаунт на [GitHub](https://github.com/).
2.  Установите [Git](https://git-scm.com/downloads), если еще не установлен.
3.  Откройте терминал в папке проекта.

## Шаг 2: Создание репозитория
1.  Перейдите на https://github.com/new
2.  Назовите репозиторий, например: `universal-key-library`.
3.  Сделайте его **Public** (это важно для бесплатного хостинга).
4.  Нажмите **Create repository**.

## Шаг 3: Загрузка кода
В терминале выполните следующие команды (замените `YOUR_USERNAME` на ваш логин):

```bash
# Инициализация (если не делали)
git init
git branch -M main

# Добавление файлов
git add .
git commit -m "Initial commit of UKL v2.0"

# Привязка к GitHub
git remote add origin https://github.com/YOUR_USERNAME/universal-key-library.git

# Отправка кода
git push -u origin main
```

## Шаг 4: Настройка деплоя (Самый простой способ)
Мы уже настроили проект (`base: './'` в `vite.config.ts`), чтобы он работал из любой папки.

1.  В репозитории на GitHub перейдите в **Settings** -> **Pages** (в меню слева).
2.  В разделе **Build and deployment**:
    *   Source: **GitHub Actions**
3.  GitHub автоматически предложит "Static HTML" или "Vite".
    *   Если видите **Vite**, нажмите **Configure**.
    *   Если ничего не видите, вернитесь на вкладку **Code** и создайте файл:

**.github/workflows/deploy.yml**

```yaml
name: Deploy to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

4.  Сохраните (Commit changes).
5.  Через 1-2 минуты во вкладке **Actions** загорится зеленый кружок.
6.  Сайт будет доступен по ссылке: `https://YOUR_USERNAME.github.io/universal-key-library/`

## Решение проблем

### 1. Ошибки CORS (Blocked by CORS policy)
Мы уже заменили публичные ноды на `llamarpc`, которые обычно работают на GitHub Pages.
Если ошибка вернется, попробуйте найти другие RPC с поддержкой CORS (например, Ankr Protocol) и заменить их в `src/utils/api.ts`.

### 2. Ошибки CSP (Content Security Policy)
В `index.html` добавлен тег `<meta>` разрешающий `unsafe-eval`. Это необходимо для работы WebAssembly (криптография).
Если GitHub Pages все равно блокирует скрипты:
*   Убедитесь, что в репозитории нет файла `_headers` с строгими правилами.
*   Попробуйте отключить "Enforce HTTPS" (не рекомендуется) или проверьте настройки организации.

## Готово!
Теперь ваш проект живет в интернете. Любые изменения в коде (`git push`) будут автоматически обновлять сайт.
