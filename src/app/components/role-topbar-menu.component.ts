import { NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface RoleMenuItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-role-topbar-menu',
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <div class="role-menu" [class.open]="open()">
      <button class="avatar" type="button" (click)="toggleOpen()" [attr.aria-expanded]="open()">
        <img
          *ngIf="avatarSrc; else fallbackAvatar"
          [src]="avatarSrc"
          [alt]="displayName || roleLabel"
        />
        <ng-template #fallbackAvatar>{{ avatarInitial }}</ng-template>
      </button>

      <div class="role-menu__panel card" *ngIf="open()">
        <div class="role-menu__header">
          <strong>{{ displayName }}</strong>
          <small>{{ roleLabel }}</small>
        </div>

        <a *ngFor="let item of items" [routerLink]="item.route" class="role-menu__item">{{
          item.label
        }}</a>
        <button
          class="role-menu__item buttonlike danger"
          type="button"
          (click)="logoutClick.emit()"
        >
          Logout
        </button>
      </div>
    </div>
  `,
  styleUrl: './role-topbar-menu.component.scss',
})
export class RoleTopbarMenuComponent {
  @Input({ required: true }) displayName = '';
  @Input({ required: true }) roleLabel = '';
  @Input() avatarSrc = '';
  @Input({ required: true }) avatarInitial = '';
  @Input({ required: true }) items: RoleMenuItem[] = [];
  @Output() logoutClick = new EventEmitter<void>();

  protected readonly open = signal(false);

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.role-menu')) {
      this.open.set(false);
    }
  }
}
