import { Injectable } from '@angular/core';

type SyncHandler = () => void;

const SYNC_EVENT_KEY = 'quickbite.sync.event';
const CHANNEL_NAME = 'quickbite-sync-channel';

interface SyncPayload {
  channel: string;
  stamp: number;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSyncService {
  private readonly listeners = new Map<string, Set<SyncHandler>>();
  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    this.channel?.addEventListener('message', (event) => {
      const payload = event.data as SyncPayload | null;
      if (!payload?.channel) {
        return;
      }
      this.emit(payload.channel, false);
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== SYNC_EVENT_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as SyncPayload;
        if (payload.channel) {
          this.emit(payload.channel, false);
        }
      } catch {
        // Ignore malformed sync payloads.
      }
    });
  }

  on(channel: string, handler: SyncHandler): () => void {
    const handlers = this.listeners.get(channel) ?? new Set<SyncHandler>();
    handlers.add(handler);
    this.listeners.set(channel, handlers);

    return () => {
      const current = this.listeners.get(channel);
      current?.delete(handler);
      if (current && current.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string): void {
    this.emit(channel, true);
  }

  private emit(channel: string, broadcast: boolean): void {
    this.listeners.get(channel)?.forEach((handler) => handler());

    if (!broadcast || typeof window === 'undefined') {
      return;
    }

    const payload: SyncPayload = { channel, stamp: Date.now() };
    try {
      this.channel?.postMessage(payload);
    } catch {
      // Ignore broadcast failures and fall back to storage sync below.
    }

    try {
      localStorage.setItem(SYNC_EVENT_KEY, JSON.stringify(payload));
      localStorage.removeItem(SYNC_EVENT_KEY);
    } catch {
      // Ignore localStorage failures in private/locked-down modes.
    }
  }
}
