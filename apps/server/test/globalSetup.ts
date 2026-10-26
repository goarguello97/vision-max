import { execSync } from 'node:child_process';
import { testEnv } from './testEnv';

// Recrea el esquema con las mismas migraciones que producción, una vez por corrida.
export default function setup() {
  const cli = 'npx sequelize-cli --config src/db/config.cjs --migrations-path src/db/migrations';
  execSync(`${cli} db:migrate:undo:all && ${cli} db:migrate`, {
    env: { ...process.env, ...testEnv },
    stdio: 'pipe',
  });
}
