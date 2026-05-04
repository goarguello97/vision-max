"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_SIZES = exports.TMDB_CONFIG = void 0;
exports.getImageUrl = getImageUrl;
const index_1 = __importDefault(require("./index"));
exports.TMDB_CONFIG = {
    apiKey: index_1.default.tmdb.apiKey,
    baseUrl: index_1.default.tmdb.baseUrl,
    imageUrl: index_1.default.tmdb.imageUrl,
    language: 'es-ES',
    mockMode: index_1.default.mockMode,
};
exports.IMAGE_SIZES = {
    poster: {
        small: 'w185',
        medium: 'w342',
        large: 'w500',
        original: 'original',
    },
    backdrop: {
        small: 'w300',
        medium: 'w780',
        large: 'w1280',
        original: 'original',
    },
};
function getImageUrl(path, size = exports.IMAGE_SIZES.poster.medium) {
    if (!path)
        return '';
    return `${exports.TMDB_CONFIG.imageUrl}/${size}${path}`;
}
//# sourceMappingURL=tmdb.js.map