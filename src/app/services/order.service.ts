import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { GeoPoint, Order } from '../core/app.models';
import { CartService } from './cart.service';
import {
  BackendOrderResponse,
  paymentMethodToBackend,
  orderStatusFromBackend,
  orderStatusToBackend,
} from './backend-mappers';
import { CatalogService } from './catalog.service';
import { SessionService } from './session.service';
import { environment } from '../../environments/environment';

const ORDER_OVERRIDES_KEY = 'quickbite.order.overrides';
const HIDDEN_ORDERS_KEY = 'quickbite.order.hidden';

interface OrderOverrides {
  [orderId: string]: Partial<Order>;
}

const RESTAURANT_LOCATIONS: Record<string, GeoPoint> = {
  'burger-palace': { lat: 28.5434, lng: 77.2476 },
  'pizza-hut-express': { lat: 28.5543, lng: 77.2177 },
  'sushi-zen': { lat: 28.5672, lng: 77.2365 },
  'spice-garden': { lat: 28.5463, lng: 77.1988 },
  'taco-fiesta': { lat: 28.4972, lng: 77.0826 },
  'noodle-house': { lat: 28.4676, lng: 77.0249 },
};

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly ordersSignal = signal<Order[]>(this.readLocalOrders());
  private readonly overridesSignal = signal<OrderOverrides>(this.readOverrides());
  private readonly hiddenOrdersSignal = signal<string[]>(this.readHiddenOrders());

  readonly orders = computed(() => this.mergeOrders(this.ordersSignal(), this.overridesSignal()));

  constructor() {
    this.refreshFromBackend();
  }

  placeOrder(payload: {
    restaurantId?: string;
    restaurantName: string;
    items: string;
    total: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    note?: string;
    deliveryAddressLine?: string;
    deliveryLocation?: GeoPoint;
    pickupLocation?: GeoPoint;
  }): Order {
    if (!payload.items.trim()) {
      throw new Error('Cannot place an empty order');
    }
    if (payload.total <= 0) {
      throw new Error('Order total must be greater than zero');
    }

    const customer = this.session.user();
    if (!customer?.id) {
      throw new Error('Please log in before placing an order.');
    }

    const restaurant = payload.restaurantId ? this.catalog.restaurantById(payload.restaurantId) : undefined;
    const pickupLocation = payload.pickupLocation ?? this.restaurantPoint(payload.restaurantId);
    const deliveryLocation =
      payload.deliveryLocation ?? this.offsetPoint(pickupLocation, 0.015, 0.016);
    const backendItems = this.cart.items().map((item) => {
      const menuItem =
        this.catalog.menuForRestaurant(item.restaurantId).find((entry) => entry.name === item.name) ??
        this.catalog.menuForRestaurant(item.restaurantId).find((entry) => entry.id === item.id);
      const restaurantEntry = this.catalog.restaurantById(item.restaurantId) ?? restaurant;
      return {
        menuItemId: item.backendMenuItemId ?? menuItem?.backendId ?? 0,
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        restaurantId: item.backendRestaurantId ?? restaurantEntry?.backendId ?? 0,
        restaurantName: item.restaurantName,
      };
    });
    const customerDistanceKm = this.distanceKm(pickupLocation, deliveryLocation);
    const distanceKm = this.distanceKm(pickupLocation, deliveryLocation);

    const optimistic: Order = {
      id: `ORD-${Date.now()}`,
      restaurantId: payload.restaurantId,
      restaurantName: payload.restaurantName,
      items: payload.items,
      total: payload.total,
      status: 'PLACED',
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      note: payload.note,
      time: this.currentTime(),
      createdAt: new Date().toISOString(),
      customerDistanceKm: Number(customerDistanceKm.toFixed(1)),
      deliveryAddressLine: payload.deliveryAddressLine,
      deliveryLocation,
      pickupLocation,
      deliveryAgentStatus: 'REQUESTED',
      deliveryAgentDistanceKm: Number(distanceKm.toFixed(1)),
    };

    this.ordersSignal.update((orders) => [optimistic, ...orders]);
    this.persistLocalState();

    this.http
      .post<BackendOrderResponse>(`${this.baseUrl}/orders`, {
        customerId: customer.id,
        restaurantId: restaurant?.backendId ?? 0,
        customerEmail: customer.email,
        items: backendItems.map((item) => ({
          menuItemId: item.menuItemId || 0,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        promoCode: this.cart.promoCode() || undefined,
        discountAmount: this.cart.discount() || undefined,
      })
      .subscribe({
        next: (response) => {
          const next = this.fromBackendOrder(response, optimistic);
          this.upsertOrder(next);
          this.persistLocalState();
          this.http.post(`${this.baseUrl}/payments`, {
            orderId: response.id,
            customerId: customer.id,
            amount: payload.total,
            paymentMethod: paymentMethodToBackend(this.cart.paymentMethod()),
          }).subscribe();
        },
      });

    return optimistic;
  }

  updateOrderStatus(orderId: string, status: Order['status'], agent?: string): void {
    this.overridesSignal.update((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        status,
        agent: agent ?? current[orderId]?.agent,
      },
    }));
    this.persistLocalState();

    const order = this.orders().find((item) => item.id === orderId);
    if (!order?.backendId) {
      return;
    }

    this.http
      .patch<BackendOrderResponse>(`${this.baseUrl}/orders/${order.backendId}/status`, null, {
        params: { status: orderStatusToBackend(status) },
      })
      .subscribe({
        next: (response) => {
          this.upsertOrder(this.fromBackendOrder(response, order));
          this.persistLocalState();
        },
      });
  }

  assignDeliveryAgent(orderId: string, agentEmail: string): void {
    this.overridesSignal.update((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        agent: this.currentAgentName(agentEmail) ?? current[orderId]?.agent,
        deliveryAgentEmail: agentEmail,
      },
    }));
    this.persistLocalState();
  }

  deleteOrder(orderId: string): void {
    const order = this.orders().find((item) => item.id === orderId);
    if (!order || order.status !== 'PLACED') {
      return;
    }

    this.hiddenOrdersSignal.update((items) => Array.from(new Set([orderId, ...items])));
    this.persistLocalState();
  }

  recordOrders(orders: Order[]): void {
    this.ordersSignal.set(orders);
    this.persistLocalState();
  }

  activeOrders() {
    return this.orders().filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
  }

  pastOrders() {
    return this.orders().filter((order) => order.status === 'DELIVERED' || order.status === 'CANCELLED');
  }

  private refreshFromBackend(): void {
    this.http.get<BackendOrderResponse[]>(`${this.baseUrl}/orders`).subscribe({
      next: (orders) => {
        const next = orders.map((order) => this.fromBackendOrder(order));
        this.ordersSignal.set(next);
        this.persistLocalState();
      },
    });
  }

  private fromBackendOrder(response: BackendOrderResponse, fallback?: Order): Order {
    const restaurant = this.catalog
      .restaurantList()
      .find((entry) => entry.backendId === response.restaurantId);
    const restaurantName = fallback?.restaurantName ?? restaurant?.name ?? `Restaurant ${response.restaurantId}`;
    return {
      id: `ORD-${response.id}`,
      backendId: response.id,
      restaurantId: fallback?.restaurantId ?? restaurant?.id,
      backendRestaurantId: response.restaurantId,
      restaurantName,
      items: response.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
      total: response.totalAmount,
      status: orderStatusFromBackend(response.orderStatus),
      customerName: fallback?.customerName ?? undefined,
      customerEmail: response.customerEmail,
      customerPhone: fallback?.customerPhone,
      time: fallback?.time ?? this.currentTime(),
      createdAt: response.createdAt,
      note: fallback?.note,
      customerDistanceKm: fallback?.customerDistanceKm,
      deliveryAddressLine: fallback?.deliveryAddressLine,
      deliveryLocation: fallback?.deliveryLocation,
      pickupLocation: fallback?.pickupLocation ?? this.restaurantPoint(fallback?.restaurantId ?? restaurant?.id),
      deliveryAgentName: fallback?.deliveryAgentName,
      deliveryAgentEmail: fallback?.deliveryAgentEmail,
      deliveryAgentPhone: fallback?.deliveryAgentPhone,
      deliveryAgentStatus: fallback?.deliveryAgentStatus,
      deliveryAgentEtaMinutes: fallback?.deliveryAgentEtaMinutes,
      deliveryAgentDistanceKm: fallback?.deliveryAgentDistanceKm,
      deliveryAgentEarnings: fallback?.deliveryAgentEarnings,
      deliveryAgentLocation: fallback?.deliveryAgentLocation,
      agent: fallback?.agent,
    };
  }

  private upsertOrder(order: Order): void {
    this.ordersSignal.update((orders) => {
      const filtered = orders.filter((item) => item.id !== order.id);
      return [order, ...filtered];
    });
  }

  private mergeOrders(base: Order[], overrides: OrderOverrides): Order[] {
    return base
      .filter((order) => !this.hiddenOrdersSignal().includes(order.id))
      .map((order) => ({ ...order, ...(overrides[order.id] ?? {}) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private restaurantPoint(restaurantId?: string): GeoPoint {
    if (!restaurantId) {
      return { lat: 28.6139, lng: 77.209 };
    }
    return RESTAURANT_LOCATIONS[restaurantId] ?? { lat: 28.6139, lng: 77.209 };
  }

  private offsetPoint(point: GeoPoint, latOffset: number, lngOffset: number): GeoPoint {
    return {
      lat: Number((point.lat + latOffset).toFixed(6)),
      lng: Number((point.lng + lngOffset).toFixed(6)),
    };
  }

  private distanceKm(a: GeoPoint, b: GeoPoint): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const haversine = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private readLocalOrders(): Order[] {
    const raw = localStorage.getItem('quickbite.orders.local');
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Order[];
    } catch {
      return [];
    }
  }

  private readOverrides(): OrderOverrides {
    const raw = localStorage.getItem(ORDER_OVERRIDES_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as OrderOverrides;
    } catch {
      return {};
    }
  }

  private readHiddenOrders(): string[] {
    const raw = localStorage.getItem(HIDDEN_ORDERS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private persistLocalState(): void {
    localStorage.setItem('quickbite.orders.local', JSON.stringify(this.ordersSignal()));
    localStorage.setItem(ORDER_OVERRIDES_KEY, JSON.stringify(this.overridesSignal()));
    localStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify(this.hiddenOrdersSignal()));
  }

  private currentTime(): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
  }

  private currentAgentName(email: string): string | undefined {
    const localPart = email.split('@')[0] ?? '';
    if (!localPart) {
      return undefined;
    }
    return localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
