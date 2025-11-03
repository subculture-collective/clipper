import Constants from 'expo-constants';

interface EnvConfig {
  apiBaseUrl: string;
  environment: string;
}

const getEnvConfig = (): EnvConfig => {
  // Get from app.json extra or environment variables
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    apiBaseUrl: extra.apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:8080',
    environment: extra.environment || process.env.ENV || 'development',
  };
};

export const env = getEnvConfig();

export default env;
