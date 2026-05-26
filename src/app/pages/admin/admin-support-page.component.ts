import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminDashboardService, AdminSupportTicket } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-support-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Support & Dispute Desk</h1>
        <p>Triage complaints, manage customer tickets, resolve restaurant issues, and support delivery agents.</p>
      </div>
      <div class="admin-toolbar">
        <span class="status-chip gold" *ngIf="openCount() > 0">
          ● {{ openCount() }} Unresolved Tickets
        </span>
      </div>
    </section>

    <!-- Support Split Layout -->
    <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 1.5rem; align-items: start;">
      <!-- Left Column: Tickets List -->
      <article class="card section-card" style="padding: 1.25rem;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <button
            type="button"
            class="pill"
            [class.active]="tab() === 'ALL'"
            (click)="tab.set('ALL')"
          >
            All ({{ allTickets().length }})
          </button>
          <button
            type="button"
            class="pill"
            [class.active]="tab() === 'OPEN'"
            (click)="tab.set('OPEN')"
          >
            Open ({{ openCount() }})
          </button>
          <button
            type="button"
            class="pill"
            [class.active]="tab() === 'IN_PROGRESS'"
            (click)="tab.set('IN_PROGRESS')"
          >
            In Progress
          </button>
          <button
            type="button"
            class="pill"
            [class.active]="tab() === 'RESOLVED'"
            (click)="tab.set('RESOLVED')"
          >
            Resolved
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Filter tickets or subjects..."
          [(ngModel)]="searchQuery"
          style="width: 100%; margin-bottom: 1rem;"
        />

        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 600px; overflow-y: auto;">
          <div
            *ngFor="let t of filteredTickets()"
            (click)="selectedTicket.set(t)"
            class="card"
            style="padding: 1rem; cursor: pointer; border: 1px solid var(--line); border-radius: 14px; transition: border-color 0.2s;"
            [style.borderColor]="selectedTicket()?.id === t.id ? '#ff5a00' : 'var(--line)'"
            [style.background]="selectedTicket()?.id === t.id ? 'var(--surface-2)' : 'var(--surface)'"
          >
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
              <span style="font-weight: 700; font-size: 0.95rem;">{{ t.ticketNumber }}</span>
              <span
                class="status-chip"
                [class.gold]="t.status === 'OPEN'"
                [class.blue]="t.status === 'IN_PROGRESS'"
                [class.green]="t.status === 'RESOLVED'"
                style="font-size: 0.75rem; padding: 0.2rem 0.5rem;"
              >
                {{ t.status }}
              </span>
            </div>

            <h4 style="margin: 0 0 0.35rem; font-size: 0.92rem; font-weight: 600;">{{ t.subject }}</h4>
            <div style="display: flex; justify-content: space-between; color: var(--muted); font-size: 0.8rem;">
              <span>{{ t.userName }} ({{ t.userType }})</span>
              <span>{{ t.priority }} priority</span>
            </div>
          </div>

          <div *ngIf="filteredTickets().length === 0" style="padding: 2rem; text-align: center; color: var(--muted);">
            No support tickets in this view.
          </div>
        </div>
      </article>

      <!-- Right Column: Conversation Detail View -->
      <article class="card section-card" style="padding: 1.5rem; min-height: 500px; display: flex; flex-direction: column;" *ngIf="selectedTicket() as ticket; else noTicketSelected">
        <!-- Ticket Header -->
        <div style="border-bottom: 1px solid var(--line); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <span style="color: var(--muted); font-size: 0.85rem; font-weight: 700;">{{ ticket.ticketNumber }} · {{ ticket.category }}</span>
              <h2 style="margin: 0.25rem 0 0; font-size: 1.3rem;">{{ ticket.subject }}</h2>
              <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.85rem;">
                Raised by <strong>{{ ticket.userName }}</strong> ({{ ticket.userEmail }}) · Role: {{ ticket.userType }}
              </p>
            </div>

            <!-- Status Dropdown / Action -->
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <select
                class="search-input"
                style="padding: 0.5rem 0.8rem; font-size: 0.85rem;"
                [ngModel]="ticket.status"
                (ngModelChange)="onStatusChange($event)"
              >
                <option value="OPEN">Status: OPEN</option>
                <option value="IN_PROGRESS">Status: IN PROGRESS</option>
                <option value="RESOLVED">Status: RESOLVED</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Messages Flow -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; max-height: 380px; padding-right: 0.5rem; margin-bottom: 1.5rem;">
          <div
            *ngFor="let msg of ticket.messages"
            [style.alignSelf]="msg.isStaff ? 'flex-end' : 'flex-start'"
            style="max-width: 80%; padding: 0.85rem 1.1rem; border-radius: 16px;"
            [style.background]="msg.isStaff ? '#ff5a00' : 'var(--surface-2)'"
            [style.color]="msg.isStaff ? '#fff' : 'var(--text)'"
          >
            <div style="display: flex; justify-content: space-between; gap: 1rem; font-size: 0.75rem; margin-bottom: 0.35rem;" [style.opacity]="msg.isStaff ? '0.9' : '0.6'">
              <strong>{{ msg.sender }}</strong>
              <span>{{ msg.timestamp }}</span>
            </div>
            <p style="margin: 0; font-size: 0.92rem; line-height: 1.45;">{{ msg.text }}</p>
          </div>
        </div>

        <!-- Reply Input -->
        <div style="display: flex; gap: 0.75rem; border-top: 1px solid var(--line); padding-top: 1rem;">
          <input
            type="text"
            class="search-input"
            style="flex: 1;"
            placeholder="Type official admin response to ticket..."
            [(ngModel)]="replyMessage"
            (keyup.enter)="sendReply()"
          />
          <button type="button" class="action-btn primary" (click)="sendReply()">
            Send Reply
          </button>
        </div>
      </article>

      <ng-template #noTicketSelected>
        <article class="card section-card" style="padding: 3rem; text-align: center; color: var(--muted); display: grid; place-items: center; min-height: 400px;">
          <div>
            <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
            <h3>Select a Ticket</h3>
            <p>Select any dispute or support ticket from the list to view conversation history and reply.</p>
          </div>
        </article>
      </ng-template>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminSupportPageComponent {
  private readonly admin = inject(AdminDashboardService);

  readonly tab = signal<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  readonly selectedTicket = signal<AdminSupportTicket | null>(null);
  searchQuery = '';
  replyMessage = '';

  readonly allTickets = computed(() => this.admin.supportTickets());

  readonly openCount = computed(() => this.allTickets().filter((t) => t.status === 'OPEN').length);

  readonly filteredTickets = computed(() => {
    const list = this.allTickets();
    const currentTab = this.tab();
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter((t) => {
      const matchTab = currentTab === 'ALL' || t.status === currentTab;
      const matchQuery =
        !query ||
        t.ticketNumber.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.userName.toLowerCase().includes(query) ||
        t.userType.toLowerCase().includes(query);
      return matchTab && matchQuery;
    });
  });

  constructor() {
    const first = this.allTickets()[0];
    if (first) {
      this.selectedTicket.set(first);
    }
  }

  onStatusChange(newStatus: AdminSupportTicket['status']): void {
    const current = this.selectedTicket();
    if (!current) return;
    this.admin.updateTicketStatus(current.id, newStatus);
    const updated = this.admin.supportTickets().find((t) => t.id === current.id);
    if (updated) {
      this.selectedTicket.set(updated);
    }
  }

  sendReply(): void {
    const current = this.selectedTicket();
    if (!current || !this.replyMessage.trim()) return;
    this.admin.replyToTicket(current.id, this.replyMessage);
    this.replyMessage = '';
    const updated = this.admin.supportTickets().find((t) => t.id === current.id);
    if (updated) {
      this.selectedTicket.set(updated);
    }
  }
}
