import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AdminDashboardService, AdminDeliveryAgent } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-admin-delivery-agents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Delivery Fleet Operations</h1>
        <p>Driver verification, active fleet dispatch, zone assignments, performance ratings, and rider payouts.</p>
      </div>
      <div class="admin-toolbar">
        <button class="action-btn primary" type="button" (click)="showAddModal = true">
          + Onboard New Rider
        </button>
      </div>
    </section>

    <!-- Top Summary KPI Grid -->
    <section class="stats-grid">
      <article class="card stat-card" (click)="tab.set('ALL')" style="cursor: pointer;">
        <div class="stat-card__icon gold">🛵</div>
        <div class="stat-meta">
          <strong>{{ allAgents().length }}</strong>
          <span>Total Fleet</span>
          <small class="delta">Registered Agents</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('ONLINE')" style="cursor: pointer;">
        <div class="stat-card__icon green">🟢</div>
        <div class="stat-meta">
          <strong>{{ onlineCount() }}</strong>
          <span>Online / Active</span>
          <small class="delta">On Duty Now</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('PENDING')" style="cursor: pointer;">
        <div class="stat-card__icon orange">📋</div>
        <div class="stat-meta">
          <strong>{{ pendingApprovals().length }}</strong>
          <span>Pending Verification</span>
          <small class="delta" style="color: #ff5a00;">KYC Submissions</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('SUSPENDED')" style="cursor: pointer;">
        <div class="stat-card__icon pink">🛑</div>
        <div class="stat-meta">
          <strong>{{ suspendedCount() }}</strong>
          <span>Suspended</span>
          <small class="delta" style="color: #ef4444;">Access Blocked</small>
        </div>
      </article>
    </section>

    <!-- Main Panel -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All Fleet ({{ allAgents().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'ONLINE'" (click)="tab.set('ONLINE')">
            Online ({{ onlineCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'OFFLINE'" (click)="tab.set('OFFLINE')">
            Offline ({{ offlineCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'PENDING'" (click)="tab.set('PENDING')">
            Pending Verification ({{ pendingApprovals().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'SUSPENDED'" (click)="tab.set('SUSPENDED')">
            Suspended ({{ suspendedCount() }})
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Search rider name, phone, or zone..."
          [(ngModel)]="searchQuery"
          style="min-width: 280px;"
        />
      </div>

      <!-- Pending Verification Tab View -->
      <div *ngIf="tab() === 'PENDING'" class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Driver Applicant</th>
              <th style="padding: 0.85rem 1rem;">Contact Info</th>
              <th style="padding: 0.85rem 1rem;">Verification Role</th>
              <th style="padding: 0.85rem 1rem;">Document Verification</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Review Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rider of pendingApprovals()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <strong style="display: block; font-size: 0.95rem;">{{ rider.firstName }} {{ rider.lastName }}</strong>
                <small style="color: var(--muted);">&#64;{{ rider.username || rider.email.split('@')[0] }}</small>
              </td>
              <td style="padding: 1rem;">
                <div>{{ rider.email }}</div>
                <small style="color: var(--muted);">{{ rider.phoneNumber || 'Phone not on file' }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">Delivery Partner</td>
              <td style="padding: 1rem;">
                <span class="status-chip gold">Driver License & Aadhaar Submitted</span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn primary"
                    style="padding: 0.45rem 0.9rem; font-size: 0.82rem; background: #10b981; border-color: #10b981;"
                    (click)="approveRider(rider.id, rider.firstName + ' ' + rider.lastName, rider.phoneNumber || undefined)"
                  >
                    ✓ Verify & Activate
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.9rem; font-size: 0.82rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"
                    (click)="rejectRider(rider.id)"
                  >
                    ✕ Reject
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="pendingApprovals().length === 0">
              <td colspan="5" style="padding: 3rem; text-align: center; color: var(--muted);">
                🎉 No pending delivery partner verifications!
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Regular Agents View -->
      <div *ngIf="tab() !== 'PENDING'" class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Delivery Partner</th>
              <th style="padding: 0.85rem 1rem;">Phone & Contact</th>
              <th style="padding: 0.85rem 1rem;">Zone / Vehicle</th>
              <th style="padding: 0.85rem 1rem;">Rating</th>
              <th style="padding: 0.85rem 1rem;">Deliveries & Payout</th>
              <th style="padding: 0.85rem 1rem;">Current Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let agent of filteredAgents()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div
                    style="width: 40px; height: 40px; border-radius: 50%; background: #ff5a00; color: #fff; display: grid; place-items: center; font-weight: 700;"
                  >
                    {{ agent.initial }}
                  </div>
                  <div>
                    <strong style="display: block; font-size: 0.95rem;">{{ agent.name }}</strong>
                    <small style="color: var(--muted);">ID: {{ agent.id || 'AGT' }}</small>
                  </div>
                </div>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ agent.phone }}</strong>
                <small style="display: block; color: #10b981; font-weight: 600;">KYC Verified</small>
              </td>
              <td style="padding: 1rem;">
                <div>{{ agent.zone }}</div>
                <small style="color: var(--muted);">{{ agent.vehicleType || 'Two Wheeler' }}</small>
              </td>
              <td style="padding: 1rem;">
                <span style="color: #f59e0b; font-weight: 700;">★ {{ agent.rating }}</span>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ getAgentDeliveries(agent.name) }} trips</strong>
                <small style="display: block; color: var(--muted);">Earned {{ getAgentEarnings(agent.name) }}</small>
              </td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.green]="agent.status === 'available'"
                  [class.blue]="agent.status === 'busy'"
                  [class.gold]="agent.status === 'offline'"
                  [class.pink]="agent.status === 'suspended'"
                >
                  {{ formatStatus(agent.status) }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    (click)="selectedAgent = agent"
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    [style.color]="agent.status === 'suspended' ? '#10b981' : '#ef4444'"
                    (click)="toggleSuspend(agent)"
                  >
                    {{ agent.status === 'suspended' ? 'Reactivate' : 'Suspend' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredAgents().length === 0">
              <td colspan="7" style="padding: 3rem; text-align: center; color: var(--muted);">
                No delivery agents match this filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Agent Details Drawer / Modal -->
    <div
      *ngIf="selectedAgent as agt"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div class="card modal-card" style="width: min(92%, 520px); padding: 2rem; background: var(--surface);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <span class="status-chip green" style="font-size: 0.75rem;">Driver Profile</span>
            <h2 style="margin: 0.35rem 0 0; font-size: 1.4rem;">{{ agt.name }}</h2>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.85rem;">{{ agt.zone }}</p>
          </div>
          <button type="button" class="action-btn" (click)="selectedAgent = null">✕</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Completed Orders</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem;">{{ getAgentDeliveries(agt.name) }} trips</h3>
          </div>
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Total Payouts</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem; color: #10b981;">{{ getAgentEarnings(agt.name) }}</h3>
          </div>
        </div>

        <div style="background: var(--surface-2); padding: 1.25rem; border-radius: 14px; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.6rem;">
          <div><strong>Phone:</strong> {{ agt.phone }}</div>
          <div><strong>Vehicle:</strong> {{ agt.vehicleType || 'Two Wheeler' }}</div>
          <div><strong>Operating Status:</strong> {{ formatStatus(agt.status) }}</div>
          <div><strong>Customer Rating:</strong> ★ {{ agt.rating }} / 5.0</div>
          <div><strong>Active Order Assignment:</strong> {{ getActiveOrderForAgent(agt.name) }}</div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button
            type="button"
            class="action-btn"
            (click)="toggleDuty(agt)"
          >
            {{ agt.status === 'offline' ? 'Set Online' : 'Set Offline' }}
          </button>
          <button type="button" class="action-btn primary" (click)="selectedAgent = null">Close</button>
        </div>
      </div>
    </div>

    <!-- Onboard Modal -->
    <div
      *ngIf="showAddModal"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div class="card modal-card" style="width: min(92%, 460px); padding: 2rem; background: var(--surface);">
        <h3 style="margin: 0 0 0.5rem;">Onboard Delivery Rider</h3>
        <p style="margin: 0 0 1.25rem; color: var(--muted); font-size: 0.88rem;">Add a verified delivery partner to the fleet roster.</p>

        <form (ngSubmit)="saveRider()" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <label style="font-weight: 700; font-size: 0.88rem;">
            Full Name
            <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newName" name="name" required placeholder="e.g. Deepak Verma" />
          </label>
          <label style="font-weight: 700; font-size: 0.88rem;">
            Phone Number
            <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newPhone" name="phone" required placeholder="+91 98765 12345" />
          </label>
          <label style="font-weight: 700; font-size: 0.88rem;">
            Assigned Zone
            <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newZone" name="zone" required placeholder="e.g. South Delhi / Saket" />
          </label>
          <label style="font-weight: 700; font-size: 0.88rem;">
            Vehicle Type
            <select class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newVehicle" name="vehicle">
              <option value="Electric Scooter">Electric Scooter</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="Scooter">Scooter</option>
              <option value="Bicycle">Bicycle</option>
            </select>
          </label>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button type="button" class="action-btn" (click)="showAddModal = false">Cancel</button>
            <button type="submit" class="action-btn primary" [disabled]="!newName.trim() || !newPhone.trim()">
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminDeliveryAgentsPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);

  readonly tab = signal<'ALL' | 'ONLINE' | 'OFFLINE' | 'PENDING' | 'SUSPENDED'>('ALL');
  searchQuery = '';
  selectedAgent: AdminDeliveryAgent | null = null;
  showAddModal = false;

  newName = '';
  newPhone = '';
  newZone = 'Central Hub';
  newVehicle = 'Electric Scooter';

  readonly allAgents = computed(() => this.admin.deliveryAgents());
  readonly pendingApprovals = computed(() => this.admin.pendingDeliveryApprovals());

  readonly onlineCount = computed(() =>
    this.allAgents().filter((a) => a.status === 'available' || a.status === 'busy').length,
  );
  readonly offlineCount = computed(() =>
    this.allAgents().filter((a) => a.status === 'offline').length,
  );
  readonly suspendedCount = computed(() =>
    this.allAgents().filter((a) => a.status === 'suspended').length,
  );

  readonly filteredAgents = computed(() => {
    const list = this.allAgents();
    const currentTab = this.tab();
    const q = this.searchQuery.toLowerCase().trim();

    return list.filter((agent) => {
      if (currentTab === 'ONLINE' && agent.status !== 'available' && agent.status !== 'busy') {
        return false;
      }
      if (currentTab === 'OFFLINE' && agent.status !== 'offline') {
        return false;
      }
      if (currentTab === 'SUSPENDED' && agent.status !== 'suspended') {
        return false;
      }

      if (q) {
        const matchName = agent.name.toLowerCase().includes(q);
        const matchPhone = agent.phone.toLowerCase().includes(q);
        const matchZone = agent.zone.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchZone) return false;
      }

      return true;
    });
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'PENDING') {
        this.tab.set('PENDING');
      }
    });
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'available': return '🟢 Online & Ready';
      case 'busy': return '🔵 On Active Delivery';
      case 'offline': return '⚫ Offline';
      case 'suspended': return '🔴 Suspended';
      default: return status;
    }
  }

  getAgentDeliveries(agentName: string): number {
    return this.orderService.orders().filter(
      (o) =>
        (o.deliveryAgentName?.toLowerCase() === agentName.toLowerCase() ||
         o.agent?.toLowerCase() === agentName.toLowerCase()) &&
        o.status === 'DELIVERED',
    ).length;
  }

  getAgentEarnings(agentName: string): string {
    const fee = this.admin.settings()?.deliveryFee ?? 49;
    const count = this.getAgentDeliveries(agentName);
    return `₹${(count * fee).toLocaleString('en-IN')}`;
  }

  getActiveOrderForAgent(agentName: string): string {
    const active = this.orderService.orders().find(
      (o) =>
        (o.deliveryAgentName === agentName || o.agent === agentName) &&
        o.status !== 'DELIVERED' &&
        o.status !== 'CANCELLED',
    );
    return active ? `${active.id} (${active.restaurantName})` : 'No active order';
  }

  toggleDuty(agt: AdminDeliveryAgent): void {
    this.admin.toggleDeliveryAgentStatus(agt.name);
  }

  toggleSuspend(agt: AdminDeliveryAgent): void {
    this.admin.toggleDeliveryAgentSuspension(agt.name);
  }

  approveRider(userId: number, name: string, phone?: string): void {
    if (confirm(`Approve KYC and activate delivery partner ${name}?`)) {
      this.admin.approveUser(userId, name);
      this.admin.addDeliveryAgent({
        id: `AGT-${userId}`,
        name,
        phone: phone || '+91 98765 00000',
        zone: 'Central Zone',
        rating: '5.0',
        status: 'available',
        vehicleType: 'Electric Scooter',
      });
    }
  }

  rejectRider(userId: number): void {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      this.admin.rejectUser(userId, reason);
    }
  }

  saveRider(): void {
    this.admin.addDeliveryAgent({
      id: `AGT-${Date.now().toString().slice(-4)}`,
      name: this.newName.trim(),
      phone: this.newPhone.trim(),
      zone: this.newZone.trim(),
      rating: '5.0',
      status: 'available',
      vehicleType: this.newVehicle,
    });
    this.showAddModal = false;
    this.newName = '';
    this.newPhone = '';
  }
}
