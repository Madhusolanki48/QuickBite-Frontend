import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { GeoPoint, Order } from '../core/app.models';
import { DeliveryAgentDirectoryService } from './delivery-agent-directory.service';
import { OrderService } from './order.service';
import { SessionService } from './session.service';

const HISTORY_PERIOD_KEY = 'quickbite.delivery.historyPeriod';
const PROFILE_KEY = 'quickbite.delivery.profile';

interface DeliveryProfile {
  name: string;
  role: string;
  email: string;
  phone: string;
  zone: string;
  rating: string;
  initial: string;
  vehicleType: string;
  vehicleNumber: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  documents: Array<{ label: string; status: 'Verified' | 'Pending' }>;
}

interface DeliverySummary {
  id: string;
  restaurantName: string;
  restaurantShort: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  dropAddress: string;
  payment: string;
  amount: number;
  status: Order['status'];
  eta: string;
  routeLabel: string;
  pickupLocation: GeoPoint | null;
  dropLocation: GeoPoint | null;
  agentLocation: GeoPoint | null;
  routeStart: GeoPoint | null;
  routeEnd: GeoPoint | null;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class DeliveryDashboardService {
  private readonly http = inject(HttpClient);
  private readonly orderService = inject(OrderService);
  private readonly session = inject(SessionService);
  private readonly agents = inject(DeliveryAgentDirectoryService);
  private readonly historyPeriodSignal = signal<'today' | 'week' | 'month'>(
    this.readHistoryPeriod(),
  );
  private readonly onlineSignal = signal<boolean>(false);
  private readonly currentLocationSignal = signal<GeoPoint | null>(null);
  private readonly profileRevisionSignal = signal(0);

  readonly historyPeriod = computed(() => this.historyPeriodSignal());
  readonly currentLocation = computed(() => this.currentLocationSignal());
  readonly isOnline = computed(() => this.onlineSignal());
  readonly profile = computed(() => {
    this.profileRevisionSignal();
    return this.buildProfile();
  });
  readonly activeDeliveries = computed(() => this.buildActiveDeliveries());
  readonly history = computed(() => this.buildHistory());
  readonly earnings = computed(() => this.buildEarnings());

  constructor() {
    const currentAgent = this.agents.currentAgent();
    this.onlineSignal.set(currentAgent?.available ?? false);
    this.currentLocationSignal.set(currentAgent?.available ? currentAgent.location : null);
  }

  startTracking(): void {
    const currentAgent = this.agents.currentAgent();
    if (currentAgent?.location) {
      this.currentLocationSignal.set(currentAgent.location);
    }
  }

  toggleOnline(): void {
    const next = !this.onlineSignal();
    this.onlineSignal.set(next);
    this.agents.setCurrentAvailability(next);
    if (next) {
      this.startTracking();
    }
    this.saveProfile();
  }

  setHistoryPeriod(period: 'today' | 'week' | 'month'): void {
    this.historyPeriodSignal.set(period);
    localStorage.setItem(HISTORY_PERIOD_KEY, period);
  }

  markPickedUp(orderId: string): void {
    const order = this.assignedOrder(orderId);
    if (!order || order.status !== 'READY') {
      return;
    }

    this.orderService.updateOrderStatus(orderId, 'ON_THE_WAY');
  }

  markDelivered(orderId: string): void {
    const order = this.assignedOrder(orderId);
    if (!order || order.status !== 'ON_THE_WAY') {
      return;
    }

    this.orderService.updateOrderStatus(orderId, 'DELIVERED');
  }

  updateProfile(profile: Partial<DeliveryProfile>): void {
    const next = { ...this.buildProfile(), ...profile };
    localStorage.setItem(this.profileKey(), JSON.stringify(next));
    this.profileRevisionSignal.update((value) => value + 1);
  }

  saveProfile(): void {
    const profile = this.buildProfile();
    localStorage.setItem(this.profileKey(), JSON.stringify(profile));

    const user = this.session.user();
    if (user && user.id) {
      const payload = {
        userId: user.id,
        fullName: profile.name,
        email: profile.email,
        phoneNumber: profile.phone || 'N/A',
        vehicleType: profile.vehicleType || 'Bike',
        vehicleNumber: profile.vehicleNumber || 'DL-00-0000',
        vehicleModel: 'Standard',
        licenseNumber: 'DL-LIC-STANDARD',
        serviceArea: profile.zone || 'General',
        active: this.onlineSignal()
      };

      this.http.put(`${environment.apiBaseUrl}/delivery-agents/${user.id}`, payload).subscribe({
        next: () => {
          this.agents.refreshFromBackend();
        },
        error: (err) => console.error('Failed to sync delivery agent status with backend database', err)
      });
    }
  }

  private buildActiveDeliveries(): DeliverySummary[] {
    const agentEmail = this.currentAgentEmail();
    return this.orderService
      .orders()
      .filter((order) => this.isAssignedToCurrentAgent(order, agentEmail))
      .filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => this.toDeliverySummary(order));
  }

  private buildHistory(): Array<{
    id: string;
    restaurant: string;
    customer: string;
    amount: number;
    status: Order['status'];
    time: string;
  }> {
    const agentEmail = this.currentAgentEmail();
    return this.orderService
      .orders()
      .filter((order) => this.isAssignedToCurrentAgent(order, agentEmail))
      .filter((order) => order.status === 'DELIVERED' || order.status === 'ON_THE_WAY')
      .filter((order) => this.matchesHistoryPeriod(order.createdAt))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((order) => ({
        id: order.id,
        restaurant: order.restaurantName,
        customer: order.customerName ?? 'Customer',
        amount: order.total,
        status: order.status,
        time: order.time ?? this.formatTime(order.createdAt),
      }));
  }

  private buildEarnings(): {
    today: string;
    week: string;
    month: string;
    total: string;
    breakdown: Array<{ label: string; amount: string }>;
    performance: Array<{ label: string; value: string }>;
  } {
    const agentEmail = this.currentAgentEmail();
    const deliveries = this.orderService
      .orders()
      .filter((order) => this.isAssignedToCurrentAgent(order, agentEmail))
      .filter((order) => order.status === 'DELIVERED');

    const earningsFor = (period: 'today' | 'week' | 'month'): number =>
      deliveries
        .filter((order) => this.matchesPeriod(order.createdAt, period))
        .reduce(
          (sum, order) =>
            sum + (order.deliveryAgentEarnings ?? Math.max(39, Math.round(order.total * 0.12))),
          0,
        );

    const today = earningsFor('today');
    const week = earningsFor('week');
    const month = earningsFor('month');
    const total = deliveries.reduce(
      (sum, order) =>
        sum + (order.deliveryAgentEarnings ?? Math.max(39, Math.round(order.total * 0.12))),
      0,
    );
    const completedOrders = deliveries.length;
    const avgOrderValue = completedOrders ? total / completedOrders : 0;

    return {
      today: this.money(today),
      week: this.money(week),
      month: this.money(month),
      total: this.money(total),
      breakdown: [
        { label: 'Base pay', amount: this.money(Math.round(total * 0.72)) },
        { label: 'Peak bonus', amount: this.money(Math.round(total * 0.18)) },
        { label: 'Tips', amount: this.money(Math.round(total * 0.1)) },
        { label: 'Total', amount: this.money(total) },
      ],
      performance: [
        { label: 'Completed deliveries', value: String(completedOrders) },
        { label: 'Avg earnings per drop', value: this.money(Math.round(avgOrderValue)) },
        { label: 'Availability', value: this.onlineSignal() ? 'Online' : 'Offline' },
        { label: 'Current zone', value: this.buildProfile().zone },
      ],
    };
  }

  private toDeliverySummary(order: Order): DeliverySummary {
    const pickup = order.pickupLocation ?? null;
    const drop = order.deliveryLocation ?? null;
    const agent = this.currentAgent();
    const customerAddress = order.deliveryAddressLine ?? 'Customer address pending';
    const customerName = order.customerName ?? 'Customer';
    return {
      id: order.id,
      restaurantName: order.restaurantName,
      restaurantShort: order.restaurantName,
      customerName,
      customerPhone: order.customerPhone ?? order.customerEmail ?? 'Not provided',
      customerAddress,
      dropAddress: customerAddress,
      payment: 'Order total',
      amount: order.total,
      status: order.status,
      eta: order.deliveryAgentEtaMinutes ? `${order.deliveryAgentEtaMinutes} min` : 'Pending',
      routeLabel: `${order.restaurantName} -> ${customerName}`,
      pickupLocation: pickup,
      dropLocation: drop,
      agentLocation: agent?.location ?? null,
      routeStart: pickup,
      routeEnd: drop,
      time: order.time ?? this.formatTime(order.createdAt),
    };
  }

  private buildProfile(): DeliveryProfile {
    const user = this.session.user();
    const agent = this.currentAgent();
    const stored = this.readStoredProfile();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return {
      ...stored,
      name: fullName || agent?.name || stored.name,
      role: user?.role === 'DELIVERY_PARTNER' ? 'Delivery Partner' : stored.role,
      email: user?.email ?? stored.email,
      phone: user?.phoneNumber ?? agent?.phone ?? stored.phone,
      zone: agent?.zone ?? stored.zone,
      rating: agent?.rating ?? stored.rating,
      initial: (fullName || agent?.name || stored.name).charAt(0).toUpperCase(),
      documents: stored.documents?.length
        ? stored.documents
        : [
            { label: 'Driving license', status: 'Verified' },
            { label: 'Vehicle registration', status: 'Verified' },
            { label: 'Bank account', status: 'Pending' },
          ],
    };
  }

  private readStoredProfile(): DeliveryProfile {
    const fallback: DeliveryProfile = {
      name: 'Delivery Partner',
      role: 'Delivery Partner',
      email: '',
      phone: '',
      zone: 'Unknown',
      rating: '4.8',
      initial: 'D',
      vehicleType: 'Bike',
      vehicleNumber: 'DL-00-0000',
      accountHolder: 'QuickBite Partner',
      accountNumber: '',
      ifscCode: '',
      documents: [
        { label: 'Driving license', status: 'Verified' },
        { label: 'Vehicle registration', status: 'Verified' },
        { label: 'Bank account', status: 'Pending' },
      ],
    };

    const raw = localStorage.getItem(this.profileKey());
    if (!raw) {
      return fallback;
    }

    try {
      return { ...fallback, ...(JSON.parse(raw) as Partial<DeliveryProfile>) };
    } catch {
      return fallback;
    }
  }

  private assignedOrder(orderId: string): Order | undefined {
    const agentEmail = this.currentAgentEmail();
    return this.orderService
      .orders()
      .find((order) => order.id === orderId && this.isAssignedToCurrentAgent(order, agentEmail));
  }

  private isAssignedToCurrentAgent(order: Order, agentEmail: string): boolean {
    const normalized = agentEmail.toLowerCase();
    const assignedEmail = (order.deliveryAgentEmail ?? '').toLowerCase();
    if (Boolean(normalized) && assignedEmail === normalized) {
      return true;
    }
    const currentName = this.session.user()?.firstName?.toLowerCase() || '';
    const assignedName = (order.deliveryAgentName ?? order.agent ?? '').toLowerCase();
    if (currentName && assignedName.includes(currentName)) {
      return true;
    }
    return false;
  }

  private currentAgentEmail(): string {
    return this.session.user()?.email?.toLowerCase() ?? '';
  }

  private currentAgent() {
    return this.agents.findAgent(this.currentAgentEmail());
  }

  private matchesHistoryPeriod(createdAt: string): boolean {
    return this.matchesPeriod(createdAt, this.historyPeriodSignal());
  }

  private matchesPeriod(createdAt: string, period: 'today' | 'week' | 'month'): boolean {
    const now = new Date();
    const date = new Date(createdAt);
    const diffDays = Math.floor(
      (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
        86400000,
    );

    if (period === 'today') {
      return diffDays === 0;
    }

    if (period === 'week') {
      return diffDays >= 0 && diffDays < 7;
    }

    return diffDays >= 0 && diffDays < 31;
  }

  private money(amount: number): string {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  }

  private formatTime(createdAt: string): string {
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(createdAt),
    );
  }

  private readHistoryPeriod(): 'today' | 'week' | 'month' {
    const stored = localStorage.getItem(HISTORY_PERIOD_KEY);
    if (stored === 'week' || stored === 'month' || stored === 'today') {
      return stored;
    }
    return 'today';
  }

  private profileKey(): string {
    const email = this.currentAgentEmail() || 'guest';
    return `${PROFILE_KEY}.${email}`;
  }
}
