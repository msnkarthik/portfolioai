import axios from 'axios';

// Determine the base URL based on the environment
const getBaseUrl = () => {
  // In production (HF Space), use the current origin
  if (import.meta.env.PROD) {
    // If we're on HF Space, the backend is served from the same origin
    const baseUrl = window.location.origin;
    console.log('Production environment detected, using base URL:', baseUrl);
    return baseUrl;
  }
  // In development, use localhost
  const devUrl = 'http://localhost:8000';
  console.log('Development environment detected, using base URL:', devUrl);
  return devUrl;
};

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure credentials are sent with requests
  withCredentials: true,
});

// Add request interceptor for logging
axiosInstance.interceptors.request.use(
  (config) => {
    // Log the full URL being requested
    console.log('Making request to:', config.baseURL + config.url);
    console.log('Request headers:', config.headers);
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
    console.log('Response received:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default axiosInstance; 