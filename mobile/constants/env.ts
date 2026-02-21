import Constants from 'expo-constants';

const ENV = {
  API_URL: Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8080',
  API_VERSION: 'v1',
};

export default ENV;
