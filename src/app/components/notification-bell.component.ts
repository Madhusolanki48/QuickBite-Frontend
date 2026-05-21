import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, HostListener, effect, inject, signal } from '@angular/core';

import { NotificationItem } from '../core/app.models';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <div class="notification-bell" [class.open]="open()">
      <button
        class="notification-bell__trigger"
        type="button"
        (click)="toggleOpen()"
        [attr.aria-expanded]="open()"
      >
        <span class="icon">🔔</span>
        <span *ngIf="unreadCount() > 0" class="badge">{{ unreadCount() }}</span>
      </button>

      <div class="notification-bell__panel card" *ngIf="open()">
        <div class="notification-bell__header">
          <strong>Notifications</strong>
          <div class="notification-bell__header-actions">
            <small>{{ unreadCount() }} unread</small>
            <button
              *ngIf="unreadCount() > 0"
              type="button"
              class="mark-all"
              (click)="markAllRead()"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div
          class="notification-bell__item"
          *ngFor="let item of notifications()"
        >
          <div class="notification-bell__item-click" (click)="markRead(item)">
            <span class="category-pill" [ngClass]="categoryClass(item.category)">
              {{ categoryIcon(item.category) }}
            </span>
            <span class="body">
              <strong>{{ item.title }}</strong>
              <small>{{ item.message }}</small>
            </span>
          </div>
          <button 
            type="button" 
            class="notification-bell__item-delete"
            (click)="deleteNotification($event, item.id)"
            title="Delete notification"
          >
            &times;
          </button>
        </div>

        <p *ngIf="notifications().length === 0" class="empty">No notifications yet.</p>
      </div>

      <div class="notification-toast" *ngIf="toastMessage()">
        {{ toastMessage() }}
      </div>
    </div>
  `,
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  private readonly notificationService = inject(NotificationService);
  private toastTimer: number | null = null;
  private hasLoadedOnce = false;
  private previousIds = new Set<number>();

  protected readonly open = signal(false);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly toastMessage = signal('');

  private readonly refreshEffect = effect(() => {
    this.notificationService.changes();
    this.refresh();
  });

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  deleteNotification(event: Event, id: number): void {
    event.stopPropagation();
    this.notifications.update((current) => current.filter((item) => item.id !== id));
    this.updateUnreadCount();
    this.notificationService.delete(id).subscribe({
      error: (err) => {
        console.warn('Background delete failed, kept optimistic local delete:', err);
      }
    });
  }

  markRead(item: NotificationItem): void {
    if (item.read) {
      return;
    }

    this.notificationService.markRead(item.id).subscribe({
      next: (updated) => {
        this.notifications.update((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        this.updateUnreadCount();
      },
    });
  }

  markAllRead(): void {
    const unread = this.notifications()
      .filter((item) => !item.read)
      .map((item) => item.id);
    this.notificationService.markAllRead(unread).subscribe({
      next: () => {
        this.notifications.update((current) =>
          current.map((item) => (item.read ? item : { ...item, read: true })),
        );
        this.updateUnreadCount();
      },
    });
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.notification-bell')) {
      this.open.set(false);
    }
  }

  private refresh(): void {
    this.notificationService.list().subscribe({
      next: (items) => {
        const nextItems = items.slice(0, 5);
        const nextIds = new Set(nextItems.map((item) => item.id));
        const newUnread = nextItems.find((item) => !this.previousIds.has(item.id) && !item.read);

        this.notifications.set(nextItems);
        this.updateUnreadCount();
        if (this.hasLoadedOnce && newUnread) {
          this.showToast(`${this.categoryIcon(newUnread.category)} ${newUnread.title}`);
        }
        this.hasLoadedOnce = true;
        this.previousIds = nextIds;
      },
    });
  }

  private updateUnreadCount(): void {
    this.unreadCount.set(this.notifications().filter((item) => !item.read).length);
  }

  protected categoryIcon(category: string): string {
    switch (category.toUpperCase()) {
      case 'ORDER':
        return '🛍️';
      case 'REVIEW':
        return '💬';
      case 'ACCESS':
        return '🔐';
      case 'PAYMENT':
        return '💳';
      case 'DELIVERY':
        return '🚚';
      default:
        return '🔔';
    }
  }

  protected categoryClass(category: string): string {
    switch (category.toUpperCase()) {
      case 'ORDER':
        return 'order';
      case 'REVIEW':
        return 'review';
      case 'ACCESS':
        return 'access';
      case 'PAYMENT':
        return 'payment';
      case 'DELIVERY':
        return 'delivery';
      default:
        return 'default';
    }
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage.set('');
      this.toastTimer = null;
    }, 2500);
  }
}
