import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../db/sequelize';

// Modelos del módulo 01. El esquema lo crean las migraciones (sin sync).

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare username: string;
  declare email: string;
  declare firstName: string;
  declare lastName: string;
  declare passwordHash: string | null;
  declare googleSub: string | null;
  declare emailVerifiedAt: Date | null;
  declare passwordChangedAt: Date | null;
  declare lastLoginAt: Date | null;
  declare avatarKey: CreationOptional<string | null>;
  declare avatarUpdatedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    username: { type: 'CITEXT', allowNull: false, unique: true },
    email: { type: 'CITEXT', allowNull: false, unique: true },
    firstName: { type: DataTypes.STRING(50), allowNull: false },
    lastName: { type: DataTypes.STRING(50), allowNull: false },
    passwordHash: { type: DataTypes.STRING(60), allowNull: true },
    googleSub: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    avatarKey: { type: DataTypes.STRING(255), allowNull: true },
    avatarUpdatedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
    // El hash nunca sale del modelo salvo que se pida explícitamente (login, reset).
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  },
);

export class RefreshToken extends Model<
  InferAttributes<RefreshToken>,
  InferCreationAttributes<RefreshToken>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare familyId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare rotatedAt: CreationOptional<Date | null>;
  declare replacedById: CreationOptional<string | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare userAgent: string | null;
  declare ip: string | null;
  declare createdAt: CreationOptional<Date>;
}

RefreshToken.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    familyId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    rotatedAt: { type: DataTypes.DATE, allowNull: true },
    replacedById: { type: DataTypes.UUID, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    userAgent: { type: DataTypes.STRING(255), allowNull: true },
    ip: { type: DataTypes.INET, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'refresh_tokens', updatedAt: false },
);

export class PasswordResetToken extends Model<
  InferAttributes<PasswordResetToken>,
  InferCreationAttributes<PasswordResetToken>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
  declare invalidatedAt: CreationOptional<Date | null>;
  declare requestedIp: string | null;
  declare createdAt: CreationOptional<Date>;
}

PasswordResetToken.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
    invalidatedAt: { type: DataTypes.DATE, allowNull: true },
    requestedIp: { type: DataTypes.INET, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'password_reset_tokens', updatedAt: false },
);

User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(PasswordResetToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId' });
