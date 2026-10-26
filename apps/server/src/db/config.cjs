// Configuración de sequelize-cli. Lee las mismas variables que la app.
const ssl = process.env.DATABASE_SSL !== 'false';

const base = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  define: { underscored: true, timestamps: true },
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
