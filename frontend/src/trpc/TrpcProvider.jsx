import React, { createContext, useContext } from 'react';

const TrpcContext = createContext(null);

export function TrpcProvider({ client, children }) {
  return <TrpcContext.Provider value={client}>{children}</TrpcContext.Provider>;
}

export function useTrpc() {
  const ctx = useContext(TrpcContext);
  if (!ctx) throw new Error('useTrpc must be used within TrpcProvider');
  return ctx;
}