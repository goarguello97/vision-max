"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    database: {
        url: process.env.DATABASE_URL || '',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    tmdb: {
        apiKey: process.env.TMDB_API_KEY || '',
        baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
        imageUrl: process.env.TMDB_IMAGE_URL || 'https://image.tmdb.org/t/p',
    },
    mockMode: process.env.MOCK_MODE === 'true',
};
exports.default = config;
//# sourceMappingURL=index.js.map