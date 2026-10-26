// Entorno de los tests de integración. La base es el Postgres efímero del servicio db-test
// (docker compose run --rm test); nunca la de Supabase.
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:test@db-test:5432/visionmax_test';
  if (/supabase/i.test(url)) {
    throw new Error('TEST_DATABASE_URL apunta a Supabase: los tests vacían las tablas. Usá el servicio db-test.');
  }
  return url;
}

export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl(),
  DATABASE_SSL: 'false',
  APP_URL: 'http://localhost:5173',
  SUPABASE_URL: 'https://proyecto-test.supabase.co',
  SUPABASE_AVATARS_BUCKET: 'avatars',
  JWT_ACCESS_SECRET: 'test-access-secret-que-solo-existe-en-los-tests-0001',
  ONBOARDING_JWT_SECRET: 'test-onboarding-secret-que-solo-existe-en-los-tests-02',
  COOKIE_SECURE: 'false',
  // Costo mínimo de bcrypt: la suite crea muchas cuentas.
  BCRYPT_COST: '4',
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  SMTP_HOST: '',
};
