// Tablas del módulo 01 (Auth): users, refresh_tokens, password_reset_tokens y rate_limits.
// Todas con RLS activo y sin políticas: solo el backend (rol postgres) las lee; la anon key no.
const AUTH_TABLES = ['users', 'refresh_tokens', 'password_reset_tokens', 'rate_limits'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const uuidPk = {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    };
    const now = { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') };
    const userFk = {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    };

    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'users',
        {
          id: uuidPk,
          username: { type: 'CITEXT', allowNull: false, unique: true },
          email: { type: 'CITEXT', allowNull: false, unique: true },
          first_name: { type: DataTypes.STRING(50), allowNull: false },
          last_name: { type: DataTypes.STRING(50), allowNull: false },
          password_hash: { type: DataTypes.STRING(60), allowNull: true },
          google_sub: { type: DataTypes.STRING(255), allowNull: true, unique: true },
          email_verified_at: { type: DataTypes.DATE, allowNull: true },
          password_changed_at: { type: DataTypes.DATE, allowNull: true },
          last_login_at: { type: DataTypes.DATE, allowNull: true },
          avatar_key: { type: DataTypes.STRING(255), allowNull: true },
          avatar_updated_at: { type: DataTypes.DATE, allowNull: true },
          created_at: now,
          updated_at: now,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE users ADD CONSTRAINT users_has_credential CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);',
        { transaction },
      );

      await queryInterface.createTable(
        'refresh_tokens',
        {
          id: uuidPk,
          user_id: userFk,
          family_id: { type: DataTypes.UUID, allowNull: false },
          token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
          expires_at: { type: DataTypes.DATE, allowNull: false },
          rotated_at: { type: DataTypes.DATE, allowNull: true },
          replaced_by_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'refresh_tokens', key: 'id' },
            onDelete: 'SET NULL',
          },
          revoked_at: { type: DataTypes.DATE, allowNull: true },
          user_agent: { type: DataTypes.STRING(255), allowNull: true },
          ip: { type: DataTypes.INET, allowNull: true },
          created_at: now,
        },
        { transaction },
      );
      await queryInterface.addIndex('refresh_tokens', ['user_id'], { transaction });
      await queryInterface.addIndex('refresh_tokens', ['family_id'], { transaction });
      await queryInterface.addIndex('refresh_tokens', ['expires_at'], { transaction });

      await queryInterface.createTable(
        'password_reset_tokens',
        {
          id: uuidPk,
          user_id: userFk,
          token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
          expires_at: { type: DataTypes.DATE, allowNull: false },
          used_at: { type: DataTypes.DATE, allowNull: true },
          invalidated_at: { type: DataTypes.DATE, allowNull: true },
          requested_ip: { type: DataTypes.INET, allowNull: true },
          created_at: now,
        },
        { transaction },
      );
      await queryInterface.addIndex('password_reset_tokens', ['user_id'], { transaction });

      // Esquema exacto que espera rate-limiter-flexible (RateLimiterPostgres con tableCreated: true).
      await queryInterface.createTable(
        'rate_limits',
        {
          key: { type: DataTypes.STRING(255), primaryKey: true },
          points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
          expire: { type: DataTypes.BIGINT, allowNull: true },
        },
        { transaction },
      );

      for (const table of AUTH_TABLES) {
        await queryInterface.sequelize.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`, {
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of [...AUTH_TABLES].reverse()) {
        await queryInterface.dropTable(table, { transaction });
      }
    });
  },
};
