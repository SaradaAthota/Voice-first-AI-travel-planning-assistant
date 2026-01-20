import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  env: 'development' | 'production' | 'test';
  port: number;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  database: {
    url: string;
  };
  openai?: {
    apiKey: string;
  };
  elevenlabs?: {
    apiKey: string;
  };
  chromadb?: {
    url: string | undefined;
  };
}

function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvMode(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV;
  if (env === 'development' || env === 'production' || env === 'test') {
    return env;
  }
  return 'development';
}

export const config: Config = {
  env: getEnvMode(),
  port: getEnvNumber('PORT', 3000),
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
  },
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  openai: process.env.OPENAI_API_KEY
    ? {
      apiKey: getEnvVar('OPENAI_API_KEY'),
    }
    : undefined,
  elevenlabs: process.env.ELEVENLABS_API_KEY
    ? {
      apiKey: getEnvVar('ELEVENLABS_API_KEY'),
    }
    : undefined,
  chromadb: {
    url: (() => {
      const env = getEnvMode();
      const url = process.env.CHROMADB_URL;
      if (url) {
        return url;
      }
      if (env === 'production') {
        return undefined;
      }
      return 'http://localhost:8000';
    })(),
  },
};

// Validate required config in production
if (config.env === 'production') {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('Supabase configuration is required in production');
  }
  if (!config.database.url) {
    throw new Error('Database URL is required in production');
  }
  if (!config.chromadb?.url) {
    throw new Error('CHROMADB_URL is required in production. RAG is mandatory for this project.');
  }
  if (!process.env.BASE_URL) {
    throw new Error('BASE_URL is required in production');
  }
  if (!process.env.FRONTEND_URL && !process.env.ALLOWED_ORIGINS) {
    throw new Error('FRONTEND_URL or ALLOWED_ORIGINS is required in production for CORS');
  }
}

