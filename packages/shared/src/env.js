"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
// Load environment variables from .env file at project root
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Find the root .env file (two levels up from packages/shared)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
exports.env = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
};
// Simple validation to catch missing variables early
function validateEnv() {
    const missing = [];
    for (const [key, value] of Object.entries(exports.env)) {
        if (!value && key !== 'OPENROUTER_API_KEY') {
            // Only OPENROUTER_API_KEY is optional in early stages
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    console.log('✅ Environment variables loaded');
}
//# sourceMappingURL=env.js.map