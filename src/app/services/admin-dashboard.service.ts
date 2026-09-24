import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import { CatalogService } from './catalog.service';
import { CustomerProfileService } from './customer-profile.service';
import { DeliveryDashboardService } from './delivery-dashboard.service';
import { OrderService } from './order.service';
import { AdminUserResponse, Order } from '../core/app.models';

const ADMIN_SETTINGS_KEY = 'quickbite.admin.settings';
const ADMIN_AGENTS_KEY = 'quickbite.admin.agents';
const ADMIN_REFUNDS_KEY = 'quickbite.admin.refunds';
const ADMIN_SUPPORT_KEY = 'quickbite.admin.support_tickets';
const ADMIN_REVIEWS_KEY = 'quickbite.admin.reviews';
const ADMIN_AUDIT_KEY = 'quickbite.admin.audit_logs';

export interface AdminSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  deliveryFee: number;
  commission: number;
  gst: number;
  toggles: Array<{ label: string; on: boolean }>;
  notifications: Array<{ label: string; on: boolean }>;
}

export interface AdminDeliveryAgent {
  id?: string;
  name: string;
  phone: string;
  zone: string;
  rating: string;
  deliveries: string;
  earnings: string;
  status: 'available' | 'offline' | 'busy' | 'suspended';
  initial: string;
  vehicleType?: string;
  joinedDate?: string;
  pendingVerification?: boolean;
}

export interface AdminRefund {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  restaurantName: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  notes?: string;
}

export interface AdminSupportTicket {
  id: string;
  ticketNumber: string;
  userType: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY';
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  messages: Array<{ sender: string; text: string; timestamp: string; isStaff: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReview {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  rating: number;
  comment: string;
  status: 'VISIBLE' | 'HIDDEN';
  date: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  category: 'AUTH' | 'RESTAURANT' | 'DELIVERY' | 'REFUND' | 'SUPPORT' | 'SETTINGS' | 'ORDER';
  details: string;
}

// Known seed restaurant owner accounts that are already approved and active.
// These must never appear in the pending approvals list.
const SEED_APPROVED_OWNER_EMAILS = new Set([
  'owner.urbanbites@quickbite.com',
  'owner.crustco@quickbite.com',
  'owner.royaltadka@quickbite.com',
  'owner.wokbowl@quickbite.com',
  'owner.greenspoon@quickbite.com',
  'owner.foodyard@quickbite.com',
]);

// Known seed delivery agent accounts that are already approved and active.
const SEED_APPROVED_AGENT_EMAILS = new Set([
  'agent1@quickbite.com',
  'agent2@quickbite.com',
  'agent3@quickbite.com',
  'agent4@quickbite.com',
]);

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
  private readonly allUsersSignal = signal<AdminUserResponse[]>([]);
  private readonly refundsSignal = signal<AdminRefund[]>(this.readRefunds());
  private readonly supportSignal = signal<AdminSupportTicket[]>(this.readSupport());
  private readonly reviewsSignal = signal<AdminReview[]>(this.readReviews());
  private readonly auditLogsSignal = signal<AdminAuditLog[]>(this.readAuditLogs());

  constructor() {
    this.refreshApprovalUsers();
    this.refreshAllUsers();
  }

  // --- Core Computed Metrics ---
  readonly activeOrdersCount = computed(() => {
    return this.orders.orders().filter(
      (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
    ).length;
  });

  readonly pendingRefundsCount = computed(() => {
    return this.refundsSignal().filter((r) => r.status === 'PENDING').length;
  });

  readonly openTicketsCount = computed(() => {
    return this.supportSignal().filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  });

  readonly todayRevenueValue = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.orders.orders()
      .filter((o) => (o.createdAt && o.createdAt.startsWith(today)) || (!o.createdAt && o.status !== 'CANCELLED'))
      .reduce((sum, order) => sum + (order.total || 0), 0);
  });

  readonly grossRevenueValue = computed(() => {
    return this.orders.orders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, order) => sum + (order.total || 0), 0);
  });

  readonly commissionValue = computed(() => {
    const commPct = this.settingsSignal().commission || 18;
    return Math.round((this.grossRevenueValue() * commPct) / 100);
  });

  readonly restaurantPayoutsValue = computed(() => {
    const gross = this.grossRevenueValue();
    const comm = this.commissionValue();
    const gstPct = this.settingsSignal().gst || 18;
    const taxes = Math.round((gross * gstPct) / 100);
    return Math.max(0, gross - comm - taxes);
  });

  readonly deliveryEarningsValue = computed(() => {
    const deliveredCount = this.orders.orders().filter((o) => o.status === 'DELIVERED').length;
    const fee = this.settingsSignal().deliveryFee || 49;
    return deliveredCount * fee;
  });

  readonly delayedOrders = computed(() => {
    const now = Date.now();
    return this.orders.orders().filter((o) => {
      if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
      if (!o.createdAt) return false;
      const orderTime = new Date(o.createdAt).getTime();
      return (now - orderTime) > 30 * 60 * 1000; // > 30 mins
    });
  });

  readonly allCustomers = computed(() => {
    return this.allUsersSignal().filter((u) => {
      if (u.role !== 'CUSTOMER') return false;
      const email = (u.email || '').toLowerCase().trim();
      return !email.includes('@deleted.quickbite.local') && u.firstName !== 'Deleted';
    });
  });

  readonly allRestaurantOwners = computed(() => {
    return this.allUsersSignal().filter((u) => u.role === 'RESTAURANT_OWNER');
  });

  readonly allDeliveryPartners = computed(() => {
    return this.allUsersSignal().filter((u) => u.role === 'DELIVERY_PARTNER');
  });

  readonly dashboard = computed(() => {
    const restaurants = this.catalog.restaurantList();
    const activeRestaurants = restaurants.filter((restaurant) => restaurant.status === 'OPEN');
    const orders = this.orders.orders();
    const customer = this.customerProfile.profile();
    const todayRev = this.todayRevenueValue();
    const grossRev = this.grossRevenueValue();

    return {
      totalOrdersCount: orders.length,
      totalOrders: String(orders.length).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      todayRevenue: `₹${todayRev.toLocaleString('en-IN')}`,
      totalRevenue: this.money(grossRev),
      grossRevenueNum: grossRev,
      activeRestaurants: activeRestaurants.length,
      totalRestaurants: restaurants.length,
      deliveryAgentsCount: this.agentsSignal().length,
      activeDeliveryAgents: this.agentsSignal().filter((a) => a.status === 'available' || a.status === 'busy').length,
      totalCustomers: Math.max(this.allCustomers().length, 1),
      pendingApprovalsCount: this.approvalUsersSignal().length,
      pendingRefundsCount: this.pendingRefundsCount(),
      delayedOrdersCount: this.delayedOrders().length,
      metrics: [
        {
          label: 'Total Orders',
          value: String(orders.length).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          delta: 'Live',
          tone: 'green',
        },
        {
          label: "Today's Revenue",
          value: `₹${todayRev.toLocaleString('en-IN')}`,
          delta: 'Today',
          tone: 'green',
        },
        {
          label: 'Active Orders',
          value: String(this.activeOrdersCount()),
          delta: 'Live ops',
          tone: 'orange',
        },
        {
          label: 'Online Restaurants',
          value: `${activeRestaurants.length}/${restaurants.length}`,
          delta: 'Live',
          tone: 'green',
        },
        {
          label: 'Active Agents',
          value: String(this.agentsSignal().filter((a) => a.status === 'available' || a.status === 'busy').length),
          delta: 'On duty',
          tone: 'blue',
        },
        {
          label: 'Total Customers',
          value: String(Math.max(this.allCustomers().length, 1)),
          delta: 'Platform users',
          tone: 'purple',
        },
      ],
      pendingOrders: this.activeOrdersCount(),
      recentOrders: orders.slice(0, 8).map((order) => ({
        id: order.id,
        customer: order.customerName || 'Customer',
        restaurant: order.restaurantName,
        agent: order.deliveryAgentName || order.agent || 'Unassigned',
        total: `₹${order.total}`,
        totalNum: order.total,
        status: this.prettyStatus(order.status),
        rawStatus: order.status,
        paymentStatus: order.paymentStatus || (order.paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS'),
        paymentMethod: order.paymentMethod || 'UPI',
        items: order.items,
        time: order.time ?? '',
        createdAt: order.createdAt,
      })),
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        backendId: restaurant.backendId,
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
      customers: this.allCustomers().map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim() || c.username || c.email,
        email: c.email,
        phone: c.phoneNumber || 'Not provided',
        orders: String(orders.filter((o) => o.customerEmail === c.email).length),
        spent: `₹${orders.filter((o) => o.customerEmail === c.email).reduce((s, o) => s + o.total, 0)}`,
        joined: '2026',
        status: c.enabled ? 'active' : 'suspended',
        initial: c.firstName.charAt(0).toUpperCase(),
      })),
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

  readonly refunds = computed(() => this.refundsSignal());
  readonly supportTickets = computed(() => this.supportSignal());
  readonly reviews = computed(() => this.reviewsSignal());
  readonly auditLogs = computed(() => this.auditLogsSignal());
  readonly deliveryAgents = computed(() => this.agentsSignal());
  readonly settings = computed(() => this.settingsSignal());

  // --- Refresh Methods ---
  refreshApprovalUsers(): void {
    this.auth.listAdminUsers().subscribe({
      next: (users) => {
        this.allUsersSignal.set(users);
        this.approvalUsersSignal.set(
          users.filter((user) => {
            // Never show known seed/demo accounts as pending — they are already active
            const email = user.email.toLowerCase().trim();
            if (SEED_APPROVED_OWNER_EMAILS.has(email)) return false;
            if (SEED_APPROVED_AGENT_EMAILS.has(email)) return false;

            // Only show applicants who actually submitted their kitchen/fleet onboarding!
            // Users who merely registered (onboardingStatus === 'NOT_STARTED') must NOT show up.
            return (
              (user.role === 'RESTAURANT_OWNER' || user.role === 'DELIVERY_PARTNER') &&
              user.onboardingStatus === 'SUBMITTED' &&
              user.approvalStatus === 'PENDING'
            );
          }),
        );
      },
      error: () => {},
    });
  }

  refreshAllUsers(): void {
    this.auth.listAdminUsers().subscribe({
      next: (users) => {
        this.allUsersSignal.set(users);
      },
      error: () => {},
    });
  }

  // --- Approval & User Management ---
  approveUser(userId: number, userName?: string): void {
    this.auth.updateUserApproval(userId, 'APPROVED').subscribe({
      next: (res) => {
        this.refreshApprovalUsers();
        this.refreshAllUsers();
        this.addAuditEntry(
          'Approved User Application',
          'AUTH',
          `Approved account ID #${userId} (${userName || res.email}) with role ${res.role}`,
        );
      },
      error: (err) => console.error('Failed to approve user', err),
    });
  }

  rejectUser(userId: number, reason: string): void {
    this.auth.updateUserApproval(userId, 'REJECTED', reason).subscribe({
      next: () => {
        this.refreshApprovalUsers();
        this.refreshAllUsers();
        this.addAuditEntry(
          'Rejected User Application',
          'AUTH',
          `Rejected application for account ID #${userId}. Reason: ${reason}`,
        );
      },
      error: (err) => console.error('Failed to reject user', err),
    });
  }

  toggleCustomerStatus(userId: number, currentEnabled: boolean, customerName: string): void {
    const nextState = !currentEnabled;
    this.auth.setUserEnabled(userId, nextState).subscribe({
      next: () => {
        this.refreshAllUsers();
        this.addAuditEntry(
          nextState ? 'Reactivated Customer' : 'Suspended Customer',
          'AUTH',
          `${nextState ? 'Reactivated' : 'Suspended'} customer ${customerName} (ID #${userId})`,
        );
      },
      error: (err) => console.error('Failed to update customer status', err),
    });
  }

  // --- Restaurant Management ---
  toggleRestaurantStatus(restaurantId: string): void {
    const restaurant = this.catalog.restaurantList().find((r) => r.id === restaurantId);
    if (!restaurant) return;
    const newStatus = restaurant.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.catalog.updateRestaurantAvailability(restaurantId, newStatus);
    this.addAuditEntry(
      newStatus === 'OPEN' ? 'Reactivated Restaurant' : 'Suspended Restaurant',
      'RESTAURANT',
      `Changed restaurant status of ${restaurant.name} to ${newStatus}`,
    );
  }

  // --- Delivery Agent Management ---
  addDeliveryAgent(agent: Omit<AdminDeliveryAgent, 'deliveries' | 'earnings' | 'initial'>): void {
    const next: AdminDeliveryAgent = {
      ...agent,
      deliveries: '0',
      earnings: '₹0',
      initial: agent.name.charAt(0).toUpperCase(),
    };
    this.agentsSignal.update((current) => [next, ...current]);
    this.persistAgents();
    this.addAuditEntry('Added Delivery Agent', 'DELIVERY', `Registered agent ${agent.name} in zone ${agent.zone}`);
  }

  updateDeliveryAgent(
    name: string,
    patch: Partial<AdminDeliveryAgent>,
  ): void {
    this.agentsSignal.update((current) =>
      current.map((agent) =>
        agent.name === name
          ? { ...agent, ...patch, initial: (patch.name ?? agent.name).charAt(0).toUpperCase() }
          : agent,
      ),
    );
    this.persistAgents();
    this.addAuditEntry('Updated Delivery Agent', 'DELIVERY', `Updated profile/details for agent ${name}`);
  }

  toggleDeliveryAgentStatus(name: string): void {
    this.agentsSignal.update((current) =>
      current.map((agent) => {
        if (agent.name !== name) return agent;
        const nextStatus = agent.status === 'offline' ? 'available' : 'offline';
        return { ...agent, status: nextStatus };
      }),
    );
    this.persistAgents();
  }

  toggleDeliveryAgentSuspension(name: string): void {
    this.agentsSignal.update((current) =>
      current.map((agent) => {
        if (agent.name !== name) return agent;
        const nextStatus = agent.status === 'suspended' ? 'available' : 'suspended';
        return { ...agent, status: nextStatus };
      }),
    );
    this.persistAgents();
    this.addAuditEntry('Changed Agent Status', 'DELIVERY', `Toggled suspension state for delivery agent ${name}`);
  }

  // --- Refund Actions ---
  approveRefund(refundId: string, notes?: string): void {
    this.refundsSignal.update((current) =>
      current.map((ref) =>
        ref.id === refundId
          ? {
              ...ref,
              status: 'APPROVED',
              reviewedAt: new Date().toISOString(),
              notes: notes || 'Approved by administrator',
            }
          : ref,
      ),
    );
    this.persistRefunds();
    const refund = this.refundsSignal().find((r) => r.id === refundId);
    if (refund) {
      this.addAuditEntry(
        'Approved Refund',
        'REFUND',
        `Approved refund #${refund.id} of ₹${refund.amount} for Order ${refund.orderId} (${refund.customerName})`,
      );
    }
  }

  rejectRefund(refundId: string, reason: string): void {
    this.refundsSignal.update((current) =>
      current.map((ref) =>
        ref.id === refundId
          ? {
              ...ref,
              status: 'REJECTED',
              reviewedAt: new Date().toISOString(),
              notes: reason,
            }
          : ref,
      ),
    );
    this.persistRefunds();
    const refund = this.refundsSignal().find((r) => r.id === refundId);
    if (refund) {
      this.addAuditEntry(
        'Rejected Refund',
        'REFUND',
        `Rejected refund #${refund.id} for Order ${refund.orderId}. Reason: ${reason}`,
      );
    }
  }

  // --- Support Ticket Actions ---
  updateTicketStatus(ticketId: string, status: AdminSupportTicket['status']): void {
    this.supportSignal.update((current) =>
      current.map((t) =>
        t.id === ticketId
          ? { ...t, status, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
    this.persistSupport();
    this.addAuditEntry('Updated Support Ticket', 'SUPPORT', `Changed status of Ticket #${ticketId} to ${status}`);
  }

  replyToTicket(ticketId: string, text: string): void {
    if (!text.trim()) return;
    this.supportSignal.update((current) =>
      current.map((t) => {
        if (t.id !== ticketId) return t;
        const msg = {
          sender: 'QuickBite Support',
          text: text.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isStaff: true,
        };
        return {
          ...t,
          status: 'IN_PROGRESS',
          updatedAt: new Date().toISOString(),
          messages: [...t.messages, msg],
        };
      }),
    );
    this.persistSupport();
    this.addAuditEntry('Replied to Ticket', 'SUPPORT', `Admin reply sent on Ticket #${ticketId}`);
  }

  // --- Reviews Moderation ---
  toggleReviewVisibility(reviewId: string): void {
    this.reviewsSignal.update((current) =>
      current.map((r) =>
        r.id === reviewId
          ? { ...r, status: r.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE' }
          : r,
      ),
    );
    this.persistReviews();
    const review = this.reviewsSignal().find((r) => r.id === reviewId);
    if (review) {
      this.addAuditEntry(
        'Review Moderation',
        'SETTINGS',
        `${review.status === 'VISIBLE' ? 'Restored' : 'Hidden'} review #${review.id} by ${review.customerName}`,
      );
    }
  }

  deleteReview(reviewId: string): void {
    this.reviewsSignal.update((current) => current.filter((r) => r.id !== reviewId));
    this.persistReviews();
    this.addAuditEntry('Deleted Review', 'SETTINGS', `Deleted review #${reviewId}`);
  }

  // --- Settings Persistence ---
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
    this.addAuditEntry(
      'Updated Settings',
      'SETTINGS',
      `Updated platform settings: ${Object.keys(patch).join(', ')}`,
    );
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

  // --- Helpers & Audit Logging ---
  addAuditEntry(action: string, category: AdminAuditLog['category'], details: string): void {
    const entry: AdminAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      adminName: 'Admin',
      action,
      category,
      details,
    };
    this.auditLogsSignal.update((logs) => [entry, ...logs.slice(0, 49)]);
    this.persistAuditLogs();
  }

  money(amount: number): string {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  }

  prettyStatus(status: string): string {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return 'Delivered';
      case 'ON_THE_WAY':
        return 'Out for Delivery';
      case 'READY':
        return 'Ready for Pickup';
      case 'PREPARING':
        return 'Preparing';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PLACED':
        return 'New Order';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  // --- Initializers & Local Storage ---
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
        { label: 'Chat Support', on: true },
      ],
      notifications: [
        { label: 'Email Notifications', on: true },
        { label: 'SMS Alerts', on: true },
        { label: 'Push Notifications', on: true },
      ],
    };

    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return fallback;
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
    const fallback: AdminDeliveryAgent[] = [
      {
        id: 'AGT-101',
        name: 'Jackson Ron',
        phone: '+91 98765 00001',
        zone: 'West Delhi / Rajouri Garden',
        rating: '4.9',
        deliveries: '0',
        earnings: '₹0',
        status: 'available',
        initial: 'J',
        vehicleType: 'Bike',
        joinedDate: 'Jan 2026',
      },
      {
        id: 'AGT-102',
        name: 'Paul Weasely',
        phone: '+91 98765 00002',
        zone: 'North Delhi / Pitampura',
        rating: '4.8',
        deliveries: '0',
        earnings: '₹0',
        status: 'available',
        initial: 'P',
        vehicleType: 'Scooter',
        joinedDate: 'Dec 2025',
      },
      {
        id: 'AGT-103',
        name: 'Olive Mandy',
        phone: '+91 98765 00003',
        zone: 'East Delhi / Mayur Vihar',
        rating: '5.0',
        deliveries: '0',
        earnings: '₹0',
        status: 'available',
        initial: 'O',
        vehicleType: 'Electric Bike',
        joinedDate: 'Feb 2026',
      },
      {
        id: 'AGT-104',
        name: 'Edward Ford',
        phone: '+91 98765 00004',
        zone: 'South Delhi / Connaught Place',
        rating: '4.9',
        deliveries: '0',
        earnings: '₹0',
        status: 'available',
        initial: 'E',
        vehicleType: 'Bike',
        joinedDate: 'Mar 2026',
      },
    ];

    const raw = localStorage.getItem(ADMIN_AGENTS_KEY);
    if (!raw) return fallback;
    try {
      const saved = JSON.parse(raw) as AdminDeliveryAgent[];
      if (!Array.isArray(saved) || saved.length === 0) {
        return fallback;
      }
      const legacyFakeDeliveries = new Set(['1150', '620', '490', '840']);
      const sanitized = saved.map((a) => {
        if (legacyFakeDeliveries.has(String(a.deliveries).trim())) {
          return { ...a, deliveries: '0', earnings: '₹0' };
        }
        return a;
      });
      const existingIds = new Set(sanitized.map((a) => a.id).filter(Boolean));
      const missingSeeds = fallback.filter((f) => !existingIds.has(f.id));
      return [...sanitized, ...missingSeeds];
    } catch {
      return fallback;
    }
  }

  private persistAgents(): void {
    localStorage.setItem(ADMIN_AGENTS_KEY, JSON.stringify(this.agentsSignal()));
  }

  private readRefunds(): AdminRefund[] {
    const raw = localStorage.getItem(ADMIN_REFUNDS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AdminRefund[];
    } catch {
      return [];
    }
  }

  private persistRefunds(): void {
    localStorage.setItem(ADMIN_REFUNDS_KEY, JSON.stringify(this.refundsSignal()));
  }

  private readSupport(): AdminSupportTicket[] {
    const raw = localStorage.getItem(ADMIN_SUPPORT_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AdminSupportTicket[];
    } catch {
      return [];
    }
  }

  private persistSupport(): void {
    localStorage.setItem(ADMIN_SUPPORT_KEY, JSON.stringify(this.supportSignal()));
  }

  private readReviews(): AdminReview[] {
    const fallback: AdminReview[] = [
      {
        id: 'REV-101',
        restaurantId: 'urban-bites',
        restaurantName: 'Urban Bites',
        customerName: 'Ananya Roy',
        rating: 5,
        comment: 'The Mexican Loaded Pizza was exceptionally delicious and arrived piping hot in 20 minutes!',
        status: 'VISIBLE',
        date: 'Today, 08:10 PM',
      },
      {
        id: 'REV-102',
        restaurantId: 'crust-and-co',
        restaurantName: 'Crust & Co',
        customerName: 'Sameer Sen',
        rating: 4,
        comment: 'Crispy thin crust pizza, great toppings. Delivery packaging was sturdy.',
        status: 'VISIBLE',
        date: 'Today, 07:30 PM',
      },
      {
        id: 'REV-103',
        restaurantId: 'royal-tadka',
        restaurantName: 'Royal Tadka',
        customerName: 'Deepak Joshi',
        rating: 5,
        comment: 'Best Dal Makhani in town. Generous portion and rich flavor.',
        status: 'VISIBLE',
        date: 'Yesterday',
      },
      {
        id: 'REV-104',
        restaurantId: 'food-yard',
        restaurantName: 'Food Yard',
        customerName: 'Anonymous Troll',
        rating: 1,
        comment: 'SPAM SPAM buy crypto discount codes at scam.xyz',
        status: 'HIDDEN',
        date: '2 days ago',
      },
    ];

    const raw = localStorage.getItem(ADMIN_REVIEWS_KEY);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as AdminReview[];
    } catch {
      return fallback;
    }
  }

  private persistReviews(): void {
    localStorage.setItem(ADMIN_REVIEWS_KEY, JSON.stringify(this.reviewsSignal()));
  }

  private readAuditLogs(): AdminAuditLog[] {
    const fallback: AdminAuditLog[] = [
      {
        id: 'AUD-001',
        timestamp: 'Today, 08:30 PM',
        adminName: 'Admin',
        action: 'System Boot',
        category: 'SETTINGS',
        details: 'Admin Ops command dashboard initialized with real-time sync.',
      },
      {
        id: 'AUD-002',
        timestamp: 'Today, 07:45 PM',
        adminName: 'Admin',
        action: 'Approved Delivery Partner',
        category: 'DELIVERY',
        details: 'Approved KYC verification for delivery partner Rahul Sharma.',
      },
    ];

    const raw = localStorage.getItem(ADMIN_AUDIT_KEY);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as AdminAuditLog[];
    } catch {
      return fallback;
    }
  }

  private persistAuditLogs(): void {
    localStorage.setItem(ADMIN_AUDIT_KEY, JSON.stringify(this.auditLogsSignal()));
  }
}
