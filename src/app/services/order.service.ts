import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { map, Observable } from 'rxjs';

import { GeoPoint, Order, PaymentMethod } from '../core/app.models';
import { CartService } from './cart.service';
import {
  BackendOrderResponse,
  orderStatusFromBackend,
  orderStatusToBackend,
  paymentMethodToBackend,
  slugify,
} from './backend-mappers';
import { CatalogService } from './catalog.service';
import { SessionService } from './session.service';
import { RealtimeSyncService } from './realtime-sync.service';
import { DeliveryAgentDirectoryService } from './delivery-agent-directory.service';
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
  private readonly sync = inject(RealtimeSyncService);
  private readonly agents = inject(DeliveryAgentDirectoryService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly ordersSignal = signal<Order[]>(this.readLocalOrders());
  private readonly overridesSignal = signal<OrderOverrides>(this.readOverrides());
  private readonly hiddenOrdersSignal = signal<string[]>(this.readHiddenOrders());
  private readonly deliveriesSignal = signal<any[]>([]);

  readonly orders = computed(() => this.mergeOrders(this.ordersSignal(), this.overridesSignal()));

  constructor() {
    this.refreshFromBackend();
    this.setupSyncAndPolling();
  }

  private setupSyncAndPolling(): void {
    // Listen to cross-tab updates
    this.sync.on('orders', () => {
      this.ordersSignal.set(this.readLocalOrders());
      this.overridesSignal.set(this.readOverrides());
      this.hiddenOrdersSignal.set(this.readHiddenOrders());
    });

    // Periodic database polling (every 5 seconds)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.refreshFromBackend();
      }, 5000);
    }
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
    paymentMethod?: PaymentMethod;
  }): Observable<Order> {
    return this.createOrderRecord(
      {
        ...payload,
        paymentMethod: payload.paymentMethod ?? 'UPI',
      },
      undefined,
    );
  }

  placeOrderAfterPayment(payload: {
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
    paymentMethod: PaymentMethod;
    paymentId: string;
    paymentOrderId: string;
    paymentSignature: string;
    paymentStatus?: 'SUCCESS' | 'PENDING' | 'FAILED';
  }): Observable<Order> {
    return this.createOrderRecord(payload, {
      paymentId: payload.paymentId,
      paymentOrderId: payload.paymentOrderId,
      paymentSignature: payload.paymentSignature,
      paymentStatus: payload.paymentStatus ?? 'SUCCESS',
      paymentMethod: payload.paymentMethod,
    });
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

    const delivery = this.deliveriesSignal().find((d) => String(d.orderId) === String(order.backendId));
    if (delivery) {
      const deliveryStatus = status === 'ON_THE_WAY' ? 'PICKED_UP' : status === 'DELIVERED' ? 'DELIVERED' : 'ASSIGNED';
      this.http.patch(`${this.baseUrl}/deliveries/${delivery.id}/status`, null, {
        params: { status: deliveryStatus }
      }).subscribe({
        next: () => {
          this.refreshFromBackend();
        },
        error: (err) => console.error('Failed to update delivery assignment status in DB', err)
      });
    }
  }

  assignDeliveryAgent(orderId: string, agentEmail: string, agentDetails?: { name: string; phone: string }): void {
    const agent = this.agents.agents().find((a) => a.email.toLowerCase() === agentEmail.toLowerCase());
    const name = agentDetails?.name ?? agent?.name ?? this.currentAgentName(agentEmail) ?? 'Delivery Partner';
    const phone = agentDetails?.phone ?? agent?.phone ?? '+91 98765 43210';
    this.overridesSignal.update((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        agent: name,
        deliveryAgentName: name,
        deliveryAgentEmail: agentEmail,
        deliveryAgentPhone: phone,
        deliveryAgentStatus: 'ASSIGNED',
        deliveryAgentEtaMinutes: 12,
        deliveryAgentDistanceKm: 2.4,
        deliveryAgentEarnings: 45,
      },
    }));
    this.persistLocalState();

    const order = this.orders().find((o) => o.id === orderId);
    if (order) {
      const backendOrderId = order.backendId || Number(orderId.replace('ORD-', ''));
      const payload = {
        orderId: backendOrderId,
        riderId: agent?.id || 1,
        riderName: name,
        riderPhone: phone,
        deliveryAddress: order.deliveryAddressLine || 'Customer address pending'
      };

      this.http.post(`${this.baseUrl}/deliveries`, payload).subscribe({
        next: () => {
          this.refreshFromBackend();
        },
        error: (err) => console.error('Failed to save delivery assignment on backend', err)
      });
    }
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

    this.http.get<any[]>(`${this.baseUrl}/deliveries`).subscribe({
      next: (deliveries) => {
        this.deliveriesSignal.set(deliveries);
      },
      error: (err) => console.error('Failed to load deliveries from backend', err)
    });
  }

  private fromBackendOrder(response: BackendOrderResponse, fallback?: Order): Order {
    let restaurant = this.catalog
      .restaurantList()
      .find((entry) => entry.backendId === response.restaurantId);

    // Robust Fallback: If restaurant is not registered in backend (e.g. backendId is 0 or empty DB)
    // search catalog menu items to map the order to the correct local restaurant
    if (!restaurant && response.items && response.items.length > 0) {
      for (const item of response.items) {
        const catalogItem = this.catalog
          .menuItemsSignal()
          .find((entry) => entry.name.toLowerCase() === item.itemName.toLowerCase());
        if (catalogItem) {
          restaurant = this.catalog.restaurantById(catalogItem.restaurantId);
          if (restaurant) {
            break;
          }
        }
      }
    }

    const restaurantName = fallback?.restaurantName ?? restaurant?.name ?? `Restaurant ${response.restaurantId}`;
    return {
      id: `ORD-${response.id}`,
      backendId: response.id,
      restaurantId: fallback?.restaurantId ?? restaurant?.id ?? slugify(restaurantName),
      backendRestaurantId: response.restaurantId,
      restaurantName,
      items: response.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
      total: response.totalAmount,
      status: orderStatusFromBackend(response.orderStatus),
      paymentStatus: response.paymentStatus === 'PAID' ? 'SUCCESS' : response.paymentStatus,
      paymentId: response.paymentId ?? fallback?.paymentId,
      paymentOrderId: response.razorpayOrderId ?? fallback?.paymentOrderId,
      paymentSignature: response.razorpaySignature ?? fallback?.paymentSignature,
      paymentMethod: (response.paymentMethod as PaymentMethod | undefined) ?? fallback?.paymentMethod,
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

  private createOrderRecord(
    payload: {
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
      paymentMethod: PaymentMethod;
    },
    payment?: {
      paymentId?: string;
      paymentOrderId?: string;
      paymentSignature?: string;
      paymentStatus?: 'SUCCESS' | 'PENDING' | 'FAILED';
      paymentMethod?: PaymentMethod;
    },
  ): Observable<Order> {
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
      paymentStatus: payment?.paymentStatus ?? 'SUCCESS',
      paymentMethod: payment?.paymentMethod ?? payload.paymentMethod,
      paymentId: payment?.paymentId,
      paymentOrderId: payment?.paymentOrderId,
      paymentSignature: payment?.paymentSignature,
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

    return this.http
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
        paymentMethod: paymentMethodToBackend(payload.paymentMethod),
        paymentStatus: payment?.paymentStatus ?? 'SUCCESS',
        razorpayPaymentId: payment?.paymentId,
        razorpayOrderId: payment?.paymentOrderId,
        razorpaySignature: payment?.paymentSignature,
      })
      .pipe(
        map((response) => {
          const next = this.fromBackendOrder(response, optimistic);
          this.upsertOrder(next);
          this.persistLocalState();
          return next;
        }),
      );
  }

  private upsertOrder(order: Order): void {
    this.ordersSignal.update((orders) => {
      const filtered = orders.filter((item) => item.id !== order.id);
      return [order, ...filtered];
    });
  }

  private mergeOrders(base: Order[], overrides: OrderOverrides): Order[] {
    const hidden = this.hiddenOrdersSignal();
    const deliveries = this.deliveriesSignal();
    const agentsList = this.agents.agents();

    return base
      .filter((order) => !hidden.includes(order.id))
      .map((order) => {
        const delivery = deliveries.find((d) => String(d.orderId) === String(order.backendId));
        
        let dbOverrides = {};
        if (delivery) {
          const agentEntry = agentsList.find((a) => 
            String(a.id) === String(delivery.riderId) || 
            a.name.toLowerCase() === delivery.riderName.toLowerCase() ||
            a.phone === delivery.riderPhone
          );
          dbOverrides = {
            deliveryAgentName: delivery.riderName,
            deliveryAgentPhone: delivery.riderPhone,
            deliveryAgentEmail: agentEntry?.email || '',
            deliveryAgentStatus: delivery.deliveryStatus,
            agent: delivery.riderName,
            deliveryAgentEtaMinutes: 12,
            deliveryAgentDistanceKm: 2.4,
            deliveryAgentEarnings: 45,
          };
        }

        const itemOverride = overrides[order.id] || {};
        let merged: Order = { 
          ...order, 
          ...itemOverride,
          ...dbOverrides 
        } as Order;

        if (delivery) {
          if (delivery.deliveryStatus === 'PICKED_UP' && (merged.status === 'READY' || merged.status === 'PREPARING')) {
            merged.status = 'ON_THE_WAY';
          } else if (delivery.deliveryStatus === 'DELIVERED' && merged.status !== 'DELIVERED') {
            merged.status = 'DELIVERED';
          }
        }

        return merged;
      })
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
    this.sync.publish('orders');
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

  findByBackendId(backendId: number): Order | undefined {
    return this.orders().find((order) => order.backendId === backendId);
  }
}
