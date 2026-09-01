# KITSUN mini app

## Local development

1. Use Node.js 22 (the project was verified with 22.14.0) and pnpm 10 or later.
2. Install dependencies: `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` and set the Telegram, admin, database, and Blob credentials used by the app.
4. Start the development server: `pnpm dev`.

## Checks

Run `pnpm lint` and `pnpm build` before committing. The app can load outside Telegram, but Telegram sign-in requires opening it as a Telegram Mini App with a valid bot token configured.
