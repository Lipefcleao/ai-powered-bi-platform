import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega o .env normal
dotenv.config();

// Fallback: Parser para o formato customizado do .env legado
if (!process.env.DB_HOST) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        if (line.includes('Server:')) process.env.DB_HOST = line.split('Server:')[1].trim();
        if (line.includes('Username:')) process.env.DB_USER = line.split('Username:')[1].trim();
        if (line.includes('Password:')) process.env.DB_PASSWORD = line.split('Password:')[1].trim();
      });
      // DB_NAME padrão
      process.env.DB_NAME = 'demoagencia';
    }
  } catch (err) {
    console.warn('[Env Fallback Warning] Falha ao ler .env legado:', err.message);
  }
}

const isDemo = process.env.DEMO_MODE === 'true';

const requiredEnvVars = isDemo ? [] : [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

/**
 * Valida o carregamento de variáveis de ambiente.
 * Aplica o princípio fail-closed: interrompe a execução caso falte configuração essencial.
 */
export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[CRITICAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[CRITICAL] Please check your .env file or container environment settings.');
    process.exit(1);
  }

  return {
    demoMode: isDemo,
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
      host: isDemo ? 'localhost' : process.env.DB_HOST,
      port: parseInt(isDemo ? '3306' : (process.env.DB_PORT || '3306'), 10),
      user: isDemo ? 'demo_user' : process.env.DB_USER,
      password: isDemo ? 'demo_password' : process.env.DB_PASSWORD,
      database: isDemo ? 'demo_db' : process.env.DB_NAME,
      ssl: isDemo ? false : process.env.DB_SSL === 'true'
    },
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
    azureOpenAiKey: process.env.AZURE_OPENAI_KEY || '',
    azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    auth: {
      accessPassword: process.env.ACCESS_PASSWORD || (isDemo ? 'demo_access_password' : 'flowup_cs_test'),
      jwtSecret: process.env.JWT_SECRET || (isDemo ? 'local_demo_development_jwt_secret_key_9988' : 'flowup_default_secret_key_change_in_production_123')
    }
  };
}

export const env = validateEnv();
