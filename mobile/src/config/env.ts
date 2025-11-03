import Constants from 'expo-constants';

interface EnvConfig {
  apiBaseUrl: string;
  environment: string;
}

const getEnvConfig = (): EnvConfig => {
  // Get from app.json extra or environment variables
  const extra = Constants.expoConfig?.extra || {};

  // Default to localhost for development, but use HTTPS
  // In production, API_BASE_URL should be explicitly set in environment or app.json
  const defaultApiUrl = __DEV__ ? 'http://localhost:8080' : 'https://api.clipper.app';

  return {
    apiBaseUrl: extra.apiBaseUrl || process.env.API_BASE_URL || defaultApiUrl,
    environment: extra.environment || process.env.ENV || 'development',
  };
};

export const env = getEnvConfig();

export default env;
