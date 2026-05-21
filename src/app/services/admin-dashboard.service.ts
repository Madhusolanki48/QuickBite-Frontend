import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import { CatalogService } from './catalog.service';
import { CustomerProfileService } from './customer-profile.service';
import { DeliveryDashboardService } from './delivery-dashboard.service';
import { OrderService } from './order.service';
import { AdminUserResponse } from '../core/app.models';

const ADMIN_SETTINGS_KEY = 'quickbite.admin.settings';
const ADMIN_AGENTS_KEY = 'quickbite.admin.agents';

interface AdminSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  deliveryFee: number;
  commission: number;
  gst: number;
  toggles: Array<{ label: string; on: boolean }>;
  notifications: Array<{ label: string; on: boolean }>;
}

interface AdminDeliveryAgent {
  name: string;
  phone: string;
  zone: string;
  rating: string;
  deliveries: string;
  earnings: string;
  status: 'available' | 'offline' | 'busy';
  initial: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly auth = inject(AuthApiService);
  private readonly catalog = inject(CatalogService);
  private readonly orders = inject(OrderService);
  private readonly customerProfile = inject(CustomerProfileService);
  private readonly delivery = inject(DeliveryDashboardService);
  private readonly settingsSignal = signal<AdminSettings>(this.readSettings());
  private readonly agentsSignal = signal<AdminDeliveryAgent[]>(this.readAgents());
  private readonly approvalUsersSignal = signal<AdminUserResponse[]>([]);

  constructor() {
    this.refreshApprovalUsers();
  }

  readonly dashboard = computed(() => {
    const restaurants = this.catalog.restaurantList();
    const activeRestaurants = restaurants.filter((restaurant) => restaurant.status === 'OPEN');
    const orders = this.orders.orders();
    const customer = this.customerProfile.profile();

    return {
      totalOrdersCount: orders.length,
      totalOrders: String(orders.length).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      totalRevenue: this.money(orders.reduce((sum, order) => sum + order.total, 0)),
      activeRestaurants: activeRestaurants.length,
      deliveryAgentsCount: this.agentsSignal().length,
      metrics: [
        {
          label: 'Total Orders',
          value: String(orders.length).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          delta: 'Live',
          tone: 'green',
        },
        {
          label: 'Total Revenue',
          value: this.money(orders.reduce((sum, order) => sum + order.total, 0)),
          delta: 'Live',
          tone: 'green',
        },
        {
          label: 'Active Restaurants',
          value: String(activeRestaurants.length),
          delta: 'Sync',
          tone: 'green',
        },
        {
          label: 'Delivery Agents',
          value: String(this.agentsSignal().length),
          delta: 'Sync',
          tone: 'green',
        },
      ],
      pendingOrders: this.orders
        .activeOrders()
        .filter((order) => order.status === 'CONFIRMED' || order.status === 'PREPARING').length,
      recentOrders: orders.slice(0, 6).map((order) => ({
        id: order.id,
        customer: order.customerName || 'Customer',
        restaurant: order.restaurantName,
        agent: order.deliveryAgentName || order.agent || 'Unassigned',
        total: this.money(order.total),
        status: this.prettyStatus(order.status),
        items: order.items,
        time: order.time ?? '',
      })),
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        owner: 'Owner',
        rating: restaurant.rating.toFixed(1),
        orders: String(
          orders.filter((order) => (order.restaurantId ?? order.restaurantName) === restaurant.id)
            .length,
        ),
        status: restaurant.status === 'OPEN' ? 'Open' : 'Closed',
      })),
      deliveryAgents: this.agentsSignal(),
      customers: [
        {
          name: customer.name,
          email: customer.email,
          orders: String(customer.totalOrders),
          spent: customer.totalSpent,
          joined: customer.memberSince,
          status: 'active',
          initial: customer.name.charAt(0).toUpperCase(),
        },
      ],
      settings: { ...this.settingsSignal() },
    };
  });

  readonly pendingApprovals = computed(() => this.approvalUsersSignal());

  readonly pendingApprovalCount = computed(() => this.approvalUsersSignal().length);

  readonly pendingOwnerApprovals = computed(() =>
    this.approvalUsersSignal().filter((user) => user.role === 'RESTAURANT_OWNER'),
  );

  readonly pendingDeliveryApprovals = computed(() =>
    this.approvalUsersSignal().filter((user) => user.role === 'DELIVERY_PARTNER'),
  );

  updateSettings(
    patch: Partial<
      Pick<
        AdminSettings,
        'platformName' | 'supportEmail' | 'supportPhone' | 'deliveryFee' | 'commission' | 'gst'
      >
    >,
  ): void {
    this.settingsSignal.update((current) => ({ ...current, ...patch }));
    this.persistSettings();
  }

  toggleFeature(index: number): void {
    this.settingsSignal.update((current) => ({
      ...current,
      toggles: current.toggles.map((toggle, toggleIndex) =>
        toggleIndex === index ? { ...toggle, on: !toggle.on } : toggle,
      ),
    }));
    this.persistSettings();
  }

  toggleNotification(index: number): void {
    this.settingsSignal.update((current) => ({
      ...current,
      notifications: current.notifications.map((toggle, toggleIndex) =>
        toggleIndex === index ? { ...toggle, on: !toggle.on } : toggle,
      ),
    }));
    this.persistSettings();
  }

  addDeliveryAgent(agent: Omit<AdminDeliveryAgent, 'deliveries' | 'earnings' | 'initial'>): void {
    const next: AdminDeliveryAgent = {
      ...agent,
      deliveries: '0',
      earnings: '₹0',
      initial: agent.name.charAt(0).toUpperCase(),
    };

    this.agentsSignal.update((current) => [next, ...current]);
    this.persistAgents();
  }

  updateDeliveryAgent(
    name: string,
    patch: Omit<AdminDeliveryAgent, 'deliveries' | 'earnings' | 'initial'>,
  ): void {
    this.agentsSignal.update((current) =>
      current.map((agent) =>
        agent.name === name
          ? { ...agent, ...patch, initial: patch.name.charAt(0).toUpperCase() }
          : agent,
      ),
    );
    this.persistAgents();
  }

  toggleDeliveryAgentStatus(name: string): void {
    this.agentsSignal.update((current) =>
      current.map((agent) =>
        agent.name === name
          ? { ...agent, status: agent.status === 'offline' ? 'available' : 'offline' }
          : agent,
      ),
    );
    this.persistAgents();
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

  private prettyStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'Delivered';
      case 'on_the_way':
        return 'On the Way';
      case 'preparing':
        return 'Preparing';
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  private readSettings(): AdminSettings {
    const fallback: AdminSettings = {
      platformName: 'QuickBite',
      supportEmail: 'support@quickbite.com',
      supportPhone: '+91 1800-123-4567',
      deliveryFee: 49,
      commission: 18,
      gst: 18,
      toggles: [
        { label: 'Live Order Tracking', on: true },
        { label: 'Scheduled Orders', on: true },
        { label: 'Loyalty Program', on: true },
        { label: 'Promo Codes', on: true },
        { label: 'Rating & Reviews', on: true },
        { label: 'Chat Support', on: false },
      ],
      notifications: [
        { label: 'Email Notifications', on: true },
        { label: 'SMS Alerts', on: true },
        { label: 'Push Notifications', on: true },
      ],
    };

    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) {
      return fallback;
    }

    try {
      return { ...fallback, ...(JSON.parse(raw) as Partial<AdminSettings>) };
    } catch {
      return fallback;
    }
  }

  private persistSettings(): void {
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(this.settingsSignal()));
  }

  private readAgents(): AdminDeliveryAgent[] {
    const profile = this.delivery.profile();
    const fallback: AdminDeliveryAgent[] = [
      {
        name: profile.name,
        phone: profile.phone,
        zone: profile.zone,
        rating: profile.rating.split('·')[0].trim(),
        deliveries: String(this.delivery.history().length),
        earnings: this.delivery.earnings().month,
        status: this.delivery.isOnline() ? 'available' : 'offline',
        initial: profile.initial,
      },
    ];

    const raw = localStorage.getItem(ADMIN_AGENTS_KEY);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as AdminDeliveryAgent[];
    } catch {
      return fallback;
    }
  }

  private persistAgents(): void {
    localStorage.setItem(ADMIN_AGENTS_KEY, JSON.stringify(this.agentsSignal()));
  }

  refreshApprovalUsers(): void {
    this.auth.listAdminUsers().subscribe({
      next: (users) => {
        this.approvalUsersSignal.set(
          users.filter(
            (user) =>
              (user.role === 'RESTAURANT_OWNER' || user.role === 'DELIVERY_PARTNER') &&
              (user.approvalStatus === 'PENDING' || user.enabled === false),
          ),
        );
      },
    });
  }
}
