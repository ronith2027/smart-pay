import { httpBatchLink, createTRPCProxyClient } from '@trpc/client';

export function createClient(getToken) {
  const url = `${window.location.protocol}//${window.location.hostname}:3002/trpc`;
  return createTRPCProxyClient({
    links: [
      httpBatchLink({
        url,
        headers() {
          const token = getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}