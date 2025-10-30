// ⚠️ DEPRECATED: This REST API client is being replaced by tRPC
// Use useTrpc() hook from '../trpc/TrpcProvider.jsx' instead for new code
// This file is kept temporarily for backward compatibility only

import axios from 'axios';

// DEPRECATED: Use tRPC instead
const apiClient = axios.create({
  baseURL: 'http://localhost:3002/api', // Backend URL (matches backend server PORT)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// DEPRECATED: Use tRPC procedures instead
export default apiClient;
