// Extensiones base (spec 01, sección 2): citext para email/username y pgcrypto para gen_random_uuid().
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS citext;');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  },

  // Supabase las administra a nivel proyecto: no se eliminan al revertir.
  async down() {},
};
