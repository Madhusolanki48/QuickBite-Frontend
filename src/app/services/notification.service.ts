import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, tap } from 'rxjs';

import { AppRole, NotificationItem } from '../core/app.models';
import { environment } from '../../environments/environment';

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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly changeSignal = signal(0);
  private readonly notificationsSignal = signal<NotificationItem[]>(this.readNotifications());

  readonly changes = computed(() => this.changeSignal());

  constructor() {
    this.refresh();
  }

  list(): Observable<NotificationItem[]> {
    return of(this.notificationsSignal());
  }

  markRead(id: number): Observable<NotificationItem> {
    return this.patchRead(id, true);
  }

  delete(id: number): Observable<void> {
    this.notificationsSignal.update((items) => items.filter((item) => item.id !== id));
    this.persist();
    this.bump();
    return this.http.delete<void>(`${this.baseUrl}/auth/notifications/${id}`);
  }

  create(request: NotificationCreateRequest): Observable<NotificationItem> {
    const payload = {
      recipientEmail: request.recipientEmail,
      recipientRole: request.recipientRole,
      title: request.title,
      message: request.message,
      category: request.category,
    };

    return this.http.post<NotificationItem>(`${this.baseUrl}/auth/notifications`, payload).pipe(
      tap((value) => {
        this.notificationsSignal.update((items) => [value, ...items]);
        this.persist();
        this.bump();
      }),
    );
  }

  markAllRead(ids: number[]): Observable<NotificationItem[]> {
    if (!ids.length) {
      return of([]);
    }

    return forkJoin(ids.map((id) => this.patchRead(id, true)));
  }

  bump(): void {
    this.changeSignal.update((value) => value + 1);
  }

  private patchRead(id: number, refresh: boolean): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.baseUrl}/auth/notifications/${id}/read`, {}).pipe(
      tap((value) => {
        this.notificationsSignal.update((items) =>
          items.map((item) => (item.id === id ? value : item)),
        );
        this.persist();
        if (refresh) {
          this.bump();
        }
      }),
    );
  }

  private refresh(): void {
    this.http.get<NotificationItem[]>(`${this.baseUrl}/auth/notifications`).subscribe({
      next: (items) => {
        this.notificationsSignal.set(items);
        this.persist();
      },
    });
  }

  private persist(): void {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notificationsSignal()));
  }

  private readNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as NotificationItem[];
    } catch {
      return [];
    }
  }
}
