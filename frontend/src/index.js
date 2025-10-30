import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from './trpc/client';
import { TrpcProvider } from './trpc/TrpcProvider.jsx';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const queryClient = new QueryClient();
const trpc = createClient(() => localStorage.getItem('token'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TrpcProvider client={trpc}>
        <App />
      </TrpcProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
