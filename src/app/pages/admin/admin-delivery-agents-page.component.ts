import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AdminDashboardService } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-delivery-agents-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Delivery Agents</h1>
      </div>
      <button class="action-btn primary" type="button" (click)="startAdd()">+ Add Agent</button>
    </section>

    <section class="card panel" style="margin-bottom:1rem;">
      <div class="section-head">
        <div>
          <h2>{{ editingName() ? 'Edit Agent' : 'Add Agent' }}</h2>
          <p>Use the form below to add or update a delivery agent.</p>
        </div>
        <div class="section-actions">
          <button class="ghost-btn" type="button" (click)="clearForm()">Clear</button>
          <button class="action-btn primary" type="button" (click)="save()">
            {{ editingName() ? 'Save Changes' : 'Add Agent' }}
          </button>
        </div>
      </div>

      <div class="form-grid restaurant-form">
        <label
          >Agent Name<input
            [value]="draft().name"
            (input)="patch('name', $any($event.target).value)"
        /></label>
        <label
          >Phone<input [value]="draft().phone" (input)="patch('phone', $any($event.target).value)"
        /></label>
        <label
          >Zone<input [value]="draft().zone" (input)="patch('zone', $any($event.target).value)"
        /></label>
        <label
          >Rating<input
            [value]="draft().rating"
            (input)="patch('rating', $any($event.target).value)"
        /></label>
        <label
          >Status
          <select [value]="draft().status" (change)="patch('status', $any($event.target).value)">
            <option value="available">Available</option>
            <option value="offline">Offline</option>
            <option value="busy">Busy</option>
          </select>
        </label>
      </div>
      <p *ngIf="saved()" class="save-note">Agent saved.</p>
    </section>

    <section class="stats-grid">
      <article class="card stat-card">
        <div class="stat-card__icon green">🟢</div>
        <div class="stat-meta"><strong>38</strong><span>Available</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon">📦</div>
        <div class="stat-meta"><strong>41</strong><span>On Delivery</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon pink">⚫</div>
        <div class="stat-meta"><strong>15</strong><span>Offline</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon gold">⏳</div>
        <div class="stat-meta"><strong>9</strong><span>Pending Verify</span></div>
      </article>
    </section>

    <section class="card panel">
      <table class="card-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Phone</th>
            <th>Zone</th>
            <th>Rating</th>
            <th>Deliveries</th>
            <th>Earnings</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of admin.dashboard().deliveryAgents">
            <td>
              <strong>{{ row.name }}</strong>
            </td>
            <td>{{ row.phone }}</td>
            <td>{{ row.zone }}</td>
            <td>⭐ {{ row.rating }}</td>
            <td>
              <strong>{{ row.deliveries }}</strong>
            </td>
            <td>
              <strong>{{ row.earnings }}</strong>
            </td>
            <td>
              <span class="pill" [ngClass]="agentTone(row.status)">{{ row.status }}</span>
            </td>
            <td class="list-actions">
              <button class="ghost-btn" type="button" (click)="view(row.name)">View</button>
              <button
                class="toolbar-btn"
                type="button"
                style="color:#ef4444;"
                (click)="toggleStatus(row.name)"
              >
                {{ row.status === 'offline' ? 'Activate' : 'Deactivate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminDeliveryAgentsPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  protected readonly editingName = signal('');
  protected readonly draft = signal({
    name: '',
    phone: '',
    zone: '',
    rating: '4.8',
    status: 'available' as 'available' | 'offline' | 'busy',
  });
  protected readonly saved = signal(false);

  agentTone(status: string): string {
    switch (status) {
      case 'busy':
        return 'purple';
      case 'available':
        return 'green';
      case 'offline':
        return 'gray';
      default:
        return 'gray';
    }
  }

  startAdd(): void {
    this.editingName.set('');
    this.draft.set({ name: '', phone: '', zone: '', rating: '4.8', status: 'available' });
    this.saved.set(false);
  }

  patch(field: 'name' | 'phone' | 'zone' | 'rating' | 'status', value: string): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
    this.saved.set(false);
  }

  save(): void {
    const current = this.draft();
    if (!current.name.trim()) {
      return;
    }

    if (this.editingName()) {
      this.admin.updateDeliveryAgent(this.editingName(), {
        name: current.name.trim(),
        phone: current.phone.trim() || '+91 90000 00000',
        zone: current.zone.trim() || 'Central Delhi',
        rating: current.rating.trim() || '4.8',
        status: current.status,
      });
    } else {
      this.admin.addDeliveryAgent({
        name: current.name.trim(),
        phone: current.phone.trim() || '+91 90000 00000',
        zone: current.zone.trim() || 'Central Delhi',
        rating: current.rating.trim() || '4.8',
        status: current.status,
      });
    }

    this.saved.set(true);
  }

  clearForm(): void {
    this.startAdd();
  }

  view(name: string): void {
    const agent = this.admin.dashboard().deliveryAgents.find((row) => row.name === name);
    if (!agent) {
      return;
    }

    this.editingName.set(agent.name);
    this.draft.set({
      name: agent.name,
      phone: agent.phone,
      zone: agent.zone,
      rating: agent.rating,
      status: agent.status as 'available' | 'offline' | 'busy',
    });
    this.saved.set(false);
  }

  toggleStatus(name: string): void {
    this.admin.toggleDeliveryAgentStatus(name);
  }
}
