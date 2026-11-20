// Configuração lida do .env (no computador) ou das variáveis do servidor (na internet).
try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile('.env'); } catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const integer = (value, fallback) => {
  const number = Number(value ?? fallback);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
};
const production = process.env.NODE_ENV === 'production';

export const config = {
  port: integer(process.env.PORT, 3000),
  // Na internet o banco vem por DATABASE_URL (ex.: Neon); no computador, pelos campos DB_*.
  databaseUrl: process.env.DATABASE_URL || null,
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: integer(process.env.DB_PORT, 5434),
    database: process.env.DB_NAME ?? 'pilamanager_demo',
    user: process.env.DB_USER ?? 'pilamanager_demo',
    password: process.env.DB_PASSWORD ?? '',
  },
  // Em produção o cookie de sessão só trafega por HTTPS, a menos que seja desligado de propósito.
  cookieSecure: production ? process.env.COOKIE_SECURE !== 'false' : process.env.COOKIE_SECURE === 'true',
  // Atrás do proxy do Render, o IP real do visitante vem no cabeçalho X-Forwarded-For.
  trustProxy: process.env.TRUST_PROXY === 'true',
  production,
};
