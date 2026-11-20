try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile('.env'); } catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const integer = (value, fallback) => {
  const number = Number(value ?? fallback);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
};
export const config = {
  port: integer(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: integer(process.env.DB_PORT, 5433),
    database: process.env.DB_NAME ?? 'pilamanager_demo',
    user: process.env.DB_USER ?? 'pilamanager_demo',
    password: process.env.DB_PASSWORD ?? '',
  },
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  production: process.env.NODE_ENV === 'production',
};
