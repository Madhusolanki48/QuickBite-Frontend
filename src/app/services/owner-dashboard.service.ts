import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { CatalogService } from './catalog.service';
import { NotificationService } from './notification.service';
import { OrderService } from './order.service';
import { SessionService } from './session.service';
import { DeliveryAgentDirectoryService } from './delivery-agent-directory.service';
import {
  AnalyticsPeriod,
  OperatingHour,
  OwnerAnalytics,
  OwnerMenuItem,
  RestaurantProfile,
} from '../core/app.models';

const ANALYTICS_PERIOD_KEY = 'quickbite.owner.analyticsPeriod';
const ANALYTICS_CUSTOM_RANGE_KEY = 'quickbite.owner.analyticsCustomRange';
const PROFILE_KEY = 'quickbite.owner.restaurantProfile';
const SCHEDULE_KEY = 'quickbite.owner.schedule';
const OWNER_RESTAURANT_IDS: Record<string, string> = {
  'burger-palace-owner@quickbite.dev': 'burger-palace',
  'pizza-hut-owner@quickbite.dev': 'pizza-hut-express',
  'sushi-zen-owner@quickbite.dev': 'sushi-zen',
  'spice-garden-owner@quickbite.dev': 'spice-garden',
  'taco-fiesta-owner@quickbite.dev': 'taco-fiesta',
  'noodle-house-owner@quickbite.dev': 'noodle-house',
};

@Injectable({ providedIn: 'root' })
export class OwnerDashboardService {
  private readonly catalog = inject(CatalogService);
  private readonly orderService = inject(OrderService);
  private readonly notifications = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly agents = inject(DeliveryAgentDirectoryService);

  private readonly scheduleSignal = signal<OperatingHour[]>(
    this.readSchedule(this.currentRestaurantId()),
  );
  private readonly restaurantProfileSignal = signal<RestaurantProfile>(
    this.readRestaurantProfile(this.currentRestaurantId()),
  );
  private readonly analyticsPeriodSignal = signal<AnalyticsPeriod>(this.readAnalyticsPeriod());
  private readonly customRangeSignal = signal<{ start: string; end: string }>(
    this.readCustomRange(),
  );
  private readonly customAnalyticsSignal = signal<OwnerAnalytics>(this.buildCustomAnalytics());
  private readonly syncActiveRestaurantContext = effect(() => {
    const restaurantId = this.currentRestaurantId();
    this.restaurantProfileSignal.set(this.readRestaurantProfile(restaurantId));
    this.scheduleSignal.set(this.readSchedule(restaurantId));
  });

  readonly liveOrders = computed(() => this.buildLiveOrders());
  readonly menuItems = computed(() =>
    this.catalog
      .menuForRestaurant(this.restaurantProfile().restaurantId)
      .map((item) => this.toOwnerMenuItem(item)),
  );
  readonly analytics = computed(() =>
    this.analyticsPeriodSignal() === 'custom'
      ? this.customAnalyticsSignal()
      : this.buildAnalytics(this.analyticsPeriodSignal()),
  );
  readonly analyticsPeriod = computed(() => this.analyticsPeriodSignal());
  readonly customAnalyticsRange = computed(() => this.customRangeSignal());
  readonly schedule = computed(() => this.scheduleSignal());
  readonly restaurantProfile = computed(() => this.restaurantProfileSignal());

  toggleAvailability(itemId: string): void {
    this.catalog.toggleMenuItemAvailability(itemId);
  }

  setAvailability(itemId: string, available: boolean): void {
    this.catalog.setMenuItemAvailability(itemId, available);
  }

  addMenuItem(item: Omit<OwnerMenuItem, 'id'>): void {
    const restaurantId = this.restaurantProfile().restaurantId;
    this.catalog.addMenuItem({
      id: `${this.slugify(item.name)}-${Date.now().toString(36)}`,
      restaurantId,
      name: item.name.trim(),
      description: item.description.trim(),
      price: item.price,
      rating: 4.5,
      icon: item.emoji.trim() || '🍽️',
      category: item.category.trim() || 'General',
      available: item.available !== false,
      imageUrl: item.imageUrl,
      discountPercent: item.discountPercent,
      prepTimeMinutes: item.prepTimeMinutes,
      ingredients: item.ingredients,
      addons: item.addons,
      variants: item.variants,
      flags: item.flags,
    });
  }

  updateMenuItem(id: string, patch: Partial<Omit<OwnerMenuItem, 'id'>>): void {
    this.catalog.updateMenuItem(id, {
      name: patch.name?.trim(),
      description: patch.description?.trim(),
      price: patch.price,
      icon: patch.emoji?.trim(),
      category: patch.category?.trim(),
      available: patch.available,
      imageUrl: patch.imageUrl,
      discountPercent: patch.discountPercent,
      prepTimeMinutes: patch.prepTimeMinutes,
      ingredients: patch.ingredients,
      addons: patch.addons,
      variants: patch.variants,
      flags: patch.flags,
    });
  }

  deleteMenuItem(id: string): void {
    this.catalog.deleteMenuItem(id);
  }

  acceptOrder(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    this.orderService.updateOrderStatus(orderId, 'CONFIRMED');
    this.notifyOrderUpdate(order, 'CONFIRMED');
  }

  markReady(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    this.orderService.updateOrderStatus(orderId, 'READY');
    this.notifyOrderUpdate(order, 'READY');
  }

  assignDeliveryAgent(orderId: string, agentEmail: string): void {
    const agent = this.agents.findAgent(agentEmail);
    this.orderService.assignDeliveryAgent(
      orderId,
      agentEmail,
      agent ? { name: agent.name, phone: agent.phone } : undefined,
    );
    const order = this.orderService.orders().find((item) => item.id === orderId);
    if (order?.customerEmail) {
      this.notifications
        .create({
          recipientEmail: order.customerEmail,
          title: 'Delivery partner assigned',
          message: `${order.restaurantName} assigned ${agent?.name ?? 'a delivery partner'} to your order.`,
          category: 'ORDER',
        })
        .subscribe();
    }
    if (agent?.email) {
      this.notifications
        .create({
          recipientEmail: agent.email,
          recipientRole: 'DELIVERY_PARTNER',
          title: 'New delivery assigned',
          message: `${order?.restaurantName ?? 'An order'} has been assigned to you.`,
          category: 'DELIVERY',
        })
        .subscribe();
    }
  }

  startPreparing(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    this.orderService.updateOrderStatus(orderId, 'PREPARING');
    this.notifyOrderUpdate(order, 'PREPARING');
  }

  cancelOrder(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    this.orderService.updateOrderStatus(orderId, 'CANCELLED');
    this.notifyOrderUpdate(order, 'CANCELLED');
  }

  updateRestaurantOpen(open: boolean): void {
    const next = { ...this.restaurantProfileSignal(), open };
    this.restaurantProfileSignal.set(next);
    this.persistRestaurantProfile(next);
    this.catalog.updateRestaurant(next.restaurantId, {
      name: next.name,
      cuisine: next.cuisine,
      description: next.description,
      minOrder: next.minOrder,
      status: open ? 'OPEN' : 'CLOSED',
    });
  }

  updateRestaurantProfile(patch: Partial<RestaurantProfile>): void {
    const next = { ...this.restaurantProfileSignal(), ...patch };
    this.restaurantProfileSignal.set(next);
    this.persistRestaurantProfile(next);
    this.catalog.updateRestaurant(next.restaurantId, {
      name: next.name,
      cuisine: next.cuisine,
      description: next.description,
      minOrder: next.minOrder,
      status: next.open ? 'OPEN' : 'CLOSED',
    });
  }

  updateHours(day: string, patch: Partial<OperatingHour>): void {
    this.scheduleSignal.update((schedule) =>
      schedule.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    );
  }

  saveSchedule(): void {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(this.scheduleSignal()));
  }

  setAnalyticsPeriod(period: AnalyticsPeriod): void {
    this.analyticsPeriodSignal.set(period);
    localStorage.setItem(ANALYTICS_PERIOD_KEY, period);

    if (period === 'custom') {
      this.customAnalyticsSignal.set(this.buildCustomAnalytics());
      return;
    }

    localStorage.removeItem(ANALYTICS_CUSTOM_RANGE_KEY);
  }

  updateAnalyticsCustomRange(start: string, end: string): void {
    this.customRangeSignal.set({ start, end });
    localStorage.setItem(ANALYTICS_CUSTOM_RANGE_KEY, JSON.stringify({ start, end }));
  }

  applyCustomAnalytics(): void {
    this.customAnalyticsSignal.set(this.buildCustomAnalytics());
    this.setAnalyticsPeriod('custom');
  }

  private buildAnalytics(period: AnalyticsPeriod): OwnerAnalytics {
    const orders = this.orderService.orders();
    const filtered = orders.filter((order) => this.isWithinPeriod(order.createdAt, period));
    const validOrders = filtered.filter((order) => order.status !== 'CANCELLED');
    const totalRevenue = validOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filtered.length;
    const delivered = filtered.filter((order) => order.status === 'DELIVERED').length;
    const cancelled = filtered.filter((order) => order.status === 'CANCELLED').length;
    const trend = this.buildTrendSeries(filtered, period);
    const peak = trend.reduce(
      (best, item) => (item.value > best.value ? item : best),
      trend[0] ?? { label: '12pm', value: 0 },
    );

    return {
      revenueToday: this.money(totalRevenue),
      ordersToday: totalOrders,
      avgRating: 4.8,
      avgPrepTime: period === 'today' ? '28m' : period === 'week' ? '31m' : '29m',
      conversionRate: totalOrders ? `${Math.round((delivered / totalOrders) * 100)}%` : '0%',
      cancellationRate: totalOrders ? `${Math.round((cancelled / totalOrders) * 100)}%` : '0%',
      peakHour: peak.label,
      topSellers: this.topSellerRows(filtered),
      statusBreakdown: [
        {
          label: 'Delivered',
          value: filtered.filter((order) => order.status === 'DELIVERED').length,
          tone: 'success',
        },
        {
          label: 'Placed',
          value: filtered.filter((order) => order.status === 'PLACED').length,
          tone: 'warning',
        },
        {
          label: 'Preparing',
          value: filtered.filter((order) => order.status === 'PREPARING').length,
          tone: 'warning',
        },
        {
          label: 'Ready',
          value: filtered.filter((order) => order.status === 'READY').length,
          tone: 'warning',
        },
        {
          label: 'On the way',
          value: filtered.filter((order) => order.status === 'ON_THE_WAY').length,
          tone: 'success',
        },
        {
          label: 'Cancelled',
          value: filtered.filter((order) => order.status === 'CANCELLED').length,
          tone: 'danger',
        },
      ],
      revenueByHour: trend.map((item) => ({
        hour: item.label,
        height: `${Math.max(item.value * 18, 8)}%`,
      })),
      ordersByHour: trend.map((item) => ({ hour: item.label, value: item.value })),
      revenueTrend: this.buildRevenueTrend(filtered, period),
    };
  }

  private buildLiveOrders() {
    const restaurantId = this.currentRestaurantId();
    return this.orderService
      .activeOrders()
      .filter((order) => (restaurantId ? order.restaurantId === restaurantId : false))
      .map((order) => ({
        id: order.id,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        customerName: order.customerName ?? 'Customer',
        customerPhone: order.customerPhone,
        customerDistanceKm: order.customerDistanceKm,
        customerEmail: order.customerEmail,
        deliveryAgentName: order.deliveryAgentName,
        deliveryAgentPhone: order.deliveryAgentPhone,
        deliveryAgentEmail: order.deliveryAgentEmail,
        deliveryAgentEtaMinutes: order.deliveryAgentEtaMinutes,
        deliveryAgentDistanceKm: order.deliveryAgentDistanceKm,
        deliveryAgentEarnings: order.deliveryAgentEarnings,
        deliveryAgentStatus: order.deliveryAgentStatus,
        note: order.note,
        items: order.items,
        total: order.total,
        status: order.status,
        time: order.time ?? '',
        createdAt: order.createdAt,
        deliveryAddressLine: order.deliveryAddressLine,
        pickupLocation: order.pickupLocation,
        deliveryLocation: order.deliveryLocation,
      }));
  }

  private buildCustomAnalytics(): OwnerAnalytics {
    const { start, end } = this.customRangeSignal();
    const rangeScore = Math.max(this.daySpan(start, end), 1);
    const revenue = rangeScore * 1850;
    const orders = rangeScore * 28;

    return {
      revenueToday: `₹${this.formatCompactNumber(revenue)}`,
      ordersToday: orders,
      avgRating: 4.8,
      avgPrepTime: `${26 + Math.min(rangeScore, 6)}m`,
      conversionRate: `${74 + Math.min(rangeScore, 8)}%`,
      cancellationRate: `${Math.max(4, 12 - Math.min(rangeScore, 6))}%`,
      peakHour: '7pm',
      topSellers: [
        { name: 'Classic Cheeseburger', sold: rangeScore * 96, width: '91%' },
        { name: 'BBQ Bacon Burger', sold: rangeScore * 72, width: '74%' },
        { name: 'Loaded Fries', sold: rangeScore * 58, width: '62%' },
        { name: 'Chocolate Shake', sold: rangeScore * 44, width: '47%' },
      ],
      statusBreakdown: [
        { label: 'Delivered', value: Math.round(orders * 0.74), tone: 'success' },
        { label: 'Preparing', value: Math.round(orders * 0.16), tone: 'warning' },
        { label: 'Ready', value: Math.round(orders * 0.08), tone: 'warning' },
        { label: 'Cancelled', value: Math.round(orders * 0.1), tone: 'danger' },
      ],
      revenueByHour: [
        { hour: 'Start', height: '28%' },
        { hour: 'Middle', height: '64%' },
        { hour: 'End', height: '82%' },
      ],
      ordersByHour: [
        { hour: 'Start', value: Math.round(orders * 0.22) },
        { hour: 'Middle', value: Math.round(orders * 0.44) },
        { hour: 'End', value: Math.round(orders * 0.34) },
      ],
      revenueTrend: [
        { label: 'Start', value: Math.round(revenue * 0.22) },
        { label: 'Middle', value: Math.round(revenue * 0.44) },
        { label: 'End', value: Math.round(revenue * 0.34) },
      ],
    };
  }

  private notifyOrderUpdate(
    order: { customerEmail?: string; restaurantName: string } | undefined,
    status: 'PLACED' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED',
  ): void {
    if (!order?.customerEmail) {
      return;
    }

    const title =
      status === 'PLACED'
        ? 'Order placed'
        : status === 'CONFIRMED'
          ? 'Order accepted'
          : status === 'PREPARING'
            ? 'Order preparing'
            : status === 'READY'
              ? 'Order ready'
              : status === 'ON_THE_WAY'
                ? 'Out for delivery'
                : status === 'DELIVERED'
                  ? 'Order delivered'
                  : status === 'CANCELLED'
                    ? 'Order cancelled'
                    : 'Order confirmed';
    const message =
      status === 'PLACED'
        ? `${order.restaurantName} has received your order and is finding a delivery partner.`
        : status === 'CONFIRMED'
          ? `${order.restaurantName} has accepted your order.`
          : status === 'PREPARING'
            ? `${order.restaurantName} is preparing your order.`
            : status === 'READY'
              ? `${order.restaurantName} has marked your order ready for pickup.`
              : status === 'ON_THE_WAY'
                ? `${order.restaurantName} has handed your order to the delivery partner.`
                : status === 'DELIVERED'
                  ? `${order.restaurantName} order has been delivered.`
                  : status === 'CANCELLED'
                    ? `${order.restaurantName} has cancelled your order.`
                    : `${order.restaurantName} has confirmed your order.`;

    this.notifications
      .create({
        recipientEmail: order.customerEmail,
        title,
        message,
        category: 'ORDER',
      })
      .subscribe();
  }

  private topSellerRows(
    orders: Array<{ items: string; total: number }>,
  ): Array<{ name: string; sold: number; width: string }> {
    const base = ['Classic Cheeseburger', 'BBQ Bacon Burger', 'Loaded Fries', 'Chocolate Shake'];
    return base.map((name, index) => ({
      name,
      sold: Math.max(orders.length - index, 0) * (index + 3),
      width: `${Math.max(90 - index * 14, 12)}%`,
    }));
  }

  private buildTrend(
    orders: Array<{ createdAt: string }>,
    period: AnalyticsPeriod,
  ): Array<{ hour: string; height: string }> {
    return this.buildTrendSeries(orders, period).map((item) => ({
      hour: item.label,
      height: `${Math.max(item.value * 18, 8)}%`,
    }));
  }

  private buildRevenueTrend(
    orders: Array<{ createdAt: string; total: number; status: string }>,
    period: AnalyticsPeriod,
  ): Array<{ label: string; value: number }> {
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const series = this.buildTrendSeries(validOrders, period);
    const total = Math.max(
      validOrders.reduce((sum, order) => sum + order.total, 0),
      1,
    );
    const maxCount = Math.max(...series.map((item) => item.value), 1);
    return series.map((item) => ({
      label: item.label,
      value: Math.round((item.value / maxCount) * (total * 0.35)),
    }));
  }

  private buildTrendSeries(
    orders: Array<{ createdAt: string }>,
    period: AnalyticsPeriod,
  ): Array<{ label: string; value: number }> {
    if (period === 'today') {
      const buckets = [0, 0, 0, 0, 0, 0];
      orders.forEach((order) => {
        const hour = new Date(order.createdAt).getHours();
        const bucket = Math.min(Math.floor(hour / 4), 5);
        buckets[bucket] += 1;
      });

      return ['12am', '4am', '8am', '12pm', '4pm', '8pm'].map((label, index) => ({
        label,
        value: buckets[index],
      }));
    }

    if (period === 'week') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const buckets = labels.map(() => 0);
      orders.forEach((order) => {
        const day = new Date(order.createdAt).getDay();
        buckets[(day + 6) % 7] += 1;
      });
      return labels.map((label, index) => ({ label, value: buckets[index] }));
    }

    const labels = ['W1', 'W2', 'W3', 'W4'];
    const buckets = labels.map(() => 0);
    orders.forEach((order) => {
      const day = new Date(order.createdAt).getDate();
      const bucket = Math.min(Math.floor((day - 1) / 7), 3);
      buckets[bucket] += 1;
    });
    return labels.map((label, index) => ({ label, value: buckets[index] }));
  }

  private isWithinPeriod(createdAt: string, period: AnalyticsPeriod): boolean {
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

  private daySpan(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 1;
    }

    return (
      Math.floor(Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }

  private formatCompactNumber(value: number): string {
    if (value >= 100000) {
      return `${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return `${value}`;
  }

  private persistRestaurantProfile(profile: RestaurantProfile): void {
    localStorage.setItem(this.profileKey(profile.restaurantId), JSON.stringify(profile));
  }

  private readRestaurantProfile(restaurantId: string): RestaurantProfile {
    const fallback: RestaurantProfile = {
      restaurantId: restaurantId || 'burger-palace',
      name: this.restaurantNameFor(restaurantId),
      cuisine: 'American, Burgers, Fast Food',
      description:
        "Delhi's favorite burger joint since 2018. Premium beef patties, fresh ingredients.",
      phone: '+91 11 4567 8900',
      email: 'contact@burgerpalace.in',
      address: '12, Connaught Place, New Delhi - 110001',
      radiusKm: 8,
      minOrder: 150,
      deliveryCharge: 49,
      gstin: '07AABCP1234A1Z1',
      fssai: '11224067000035',
      open: true,
    };

    const raw = localStorage.getItem(this.profileKey(restaurantId));
    if (!raw) {
      return fallback;
    }

    try {
      return { ...fallback, ...(JSON.parse(raw) as Partial<RestaurantProfile>) };
    } catch {
      return fallback;
    }
  }

  private readSchedule(restaurantId: string): OperatingHour[] {
    const fallback: OperatingHour[] = [
      { day: 'Monday', open: '10:00', close: '23:00', openToday: true },
      { day: 'Tuesday', open: '10:00', close: '23:00', openToday: true },
      { day: 'Wednesday', open: '10:00', close: '23:00', openToday: true },
      { day: 'Thursday', open: '10:00', close: '23:00', openToday: true },
      { day: 'Friday', open: '10:00', close: '23:00', openToday: true },
      { day: 'Saturday', open: '10:00', close: '23:59', openToday: true },
      { day: 'Sunday', open: '11:00', close: '22:00', openToday: false },
    ];

    const raw = localStorage.getItem(this.scheduleKey(restaurantId));
    if (!raw) {
      return fallback;
    }

    try {
      const saved = JSON.parse(raw) as Partial<OperatingHour>[];
      return fallback.map((entry) => {
        const patch = saved.find((item) => item.day === entry.day);
        return patch ? { ...entry, ...patch } : entry;
      });
    } catch {
      return fallback;
    }
  }

  private readAnalyticsPeriod(): AnalyticsPeriod {
    return (localStorage.getItem(ANALYTICS_PERIOD_KEY) as AnalyticsPeriod | null) ?? 'today';
  }

  private readCustomRange(): { start: string; end: string } {
    const raw = localStorage.getItem(ANALYTICS_CUSTOM_RANGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as { start: string; end: string };
      } catch {
        // Ignore malformed saved ranges.
      }
    }

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      start: start.toISOString().slice(0, 10),
      end: today.toISOString().slice(0, 10),
    };
  }

  private toOwnerMenuItem(item: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    icon: string;
    imageUrl?: string;
    available?: boolean;
    discountPercent?: number;
    prepTimeMinutes?: number;
    ingredients?: string[];
    addons?: Array<{ name: string; price: number }>;
    variants?: Array<{ label: string; price: number }>;
    flags?: Array<'Bestseller' | 'Top Rated' | 'Low Selling'>;
  }): OwnerMenuItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      available: item.available !== false,
      category: item.category,
      emoji: item.icon,
      imageUrl: item.imageUrl,
      discountPercent: item.discountPercent,
      prepTimeMinutes: item.prepTimeMinutes,
      ingredients: item.ingredients,
      addons: item.addons,
      variants: item.variants,
      flags: item.flags,
    };
  }

  private slugify(value: string): string {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || `menu-${Date.now()}`;
  }

  private currentRestaurantId(): string {
    const user = this.session.user();
    const email = user?.email?.toLowerCase() ?? '';
    return user?.restaurantId ?? OWNER_RESTAURANT_IDS[email] ?? '';
  }

  private profileKey(restaurantId: string): string {
    return `${PROFILE_KEY}.${restaurantId}`;
  }

  private scheduleKey(restaurantId: string): string {
    return `${SCHEDULE_KEY}.${restaurantId || 'default'}`;
  }

  private restaurantNameFor(restaurantId: string): string {
    switch (restaurantId) {
      case 'pizza-hut-express':
        return 'Pizza Hut Express';
      case 'sushi-zen':
        return 'Sushi Zen';
      case 'spice-garden':
        return 'Spice Garden';
      case 'taco-fiesta':
        return 'Taco Fiesta';
      case 'noodle-house':
        return 'Noodle House';
      case 'burger-palace':
      default:
        return 'Burger Palace';
    }
  }
}
