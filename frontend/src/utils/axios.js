import axios from 'axios';

// Determine the base URL based on the environment
const getBaseUrl = () => {
  // In production (HF Space), use the current origin
  if (import.meta.env.PROD) {
    // If we're on HF Space, the backend is served from the same origin
    return window.location.origin;
  }
  // In development, use localhost
  return 'http://localhost:8000';
};

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
axiosInstance.interceptors.request.use(
  (config) => {
    // Log the full URL being requested
    console.log('Making request to:', config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default axiosInstance; 