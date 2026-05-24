import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../db/supabase';

let online = true;
let timer: NodeJS.Timeout | null = null;
let listeners: ((online: boolean) => void)[] = [];

export function isOnline(): boolean {
  return online;
}

export function startConnectivityCheck(intervalMs: number = 30000): void {
  stopConnectivityCheck();
  const check = async () => {
    const wasOnline = online;
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(5000),
      });
      online = response.ok || response.status === 401;
    } catch {
      online = false;
    }
    if (wasOnline !== online) {
      for (const fn of listeners) fn(online);
    }
  };
  check();
  timer = setInterval(check, intervalMs);
}

export function stopConnectivityCheck(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function onConnectivityChange(fn: (online: boolean) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}
