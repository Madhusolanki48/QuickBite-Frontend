import { Injectable, computed, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { AppRole, NotificationItem } from '../core/app.models';

const NOTIFICATIONS_KEY = 'quickbite.notifications';

export interface NotificationCreateRequest {
  recipientEmail?: string;
  recipientRole?: AppRole;
  title: string;
  message: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly changeSignal = signal(0);
  private readonly notificationsSignal = signal<NotificationItem[]>(this.readNotifications());

  readonly changes = computed(() => this.changeSignal());

  list(): Observable<NotificationItem[]> {
    return of(this.readNotifications());
  }

  markRead(id: number): Observable<NotificationItem> {
    return this.patchRead(id, true);
  }

  create(request: NotificationCreateRequest): Observable<NotificationItem> {
    const next: NotificationItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      recipientEmail: request.recipientEmail ?? null,
      recipientRole: request.recipientRole ?? null,
      title: request.title,
      message: request.message,
      category: request.category,
      read: false,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    this.notificationsSignal.update((items) => [next, ...items]);
    this.persist();
    this.bump();
    return of(next);
  }

  markAllRead(ids: number[]): Observable<NotificationItem[]> {
    if (!ids.length) {
      return of([]);
    }

    const updates = this.notificationsSignal().map((item) =>
      ids.includes(item.id) && !item.read
        ? { ...item, read: true, readAt: new Date().toISOString() }
        : item,
    );

    this.notificationsSignal.set(updates);
    this.persist();
    this.bump();
    return of(updates.filter((item) => ids.includes(item.id)));
  }

  bump(): void {
    this.changeSignal.update((value) => value + 1);
  }

  private patchRead(id: number, refresh: boolean): Observable<NotificationItem> {
    const existing = this.notificationsSignal().find((item) => item.id === id);
    const updated: NotificationItem = existing
      ? { ...existing, read: true, readAt: new Date().toISOString() }
      : {
          id,
          recipientEmail: null,
          recipientRole: null,
          title: 'Notification',
          message: '',
          category: 'GENERAL',
          read: true,
          createdAt: new Date().toISOString(),
          readAt: new Date().toISOString(),
        };

    this.notificationsSignal.update((items) =>
      items.map((item) => (item.id === id ? updated : item)),
    );
    this.persist();

    if (refresh) {
      this.bump();
    }

    return of(updated);
  }

  private persist(): void {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notificationsSignal()));
  }

  private readNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) {
      return [
        {
          id: 1001,
          recipientEmail: null,
          recipientRole: null,
          title: 'Welcome to QuickBite',
          message: 'Your frontend demo is running in mock mode.',
          category: 'SYSTEM',
          read: false,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];
    }

    try {
      return JSON.parse(raw) as NotificationItem[];
    } catch {
      return [];
    }
  }
}
