import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

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
import { RealtimeOrderSocketService } from './realtime-order-socket.service';
import { DeliveryAgentDirectoryService } from './delivery-agent-directory.service';
import { environment } from '../../environments/environment';
import { DELIVERY_AGENT_SEEDS } from './delivery-agents.data';

const ORDER_OVERRIDES_KEY = 'quickbite.order.overrides';
const HIDDEN_ORDERS_KEY = 'quickbite.order.hidden';
const ORDER_REFRESH_INTERVAL_MS = 10000;
const NUMERIC_RESTAURANT_IDS: Record<string, number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  'urban-bites': 1,
  'crust-and-co': 2,
  'royal-tadka': 3,
  'wok-and-bowl': 4,
  'green-spoon': 5,
  'the-food-yard': 6,
};

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
  'urban-bites': { lat: 28.5434, lng: 77.2476 },
};

const ORDER_DATA_VERSION_KEY = 'quickbite.order.version';
const CURRENT_ORDER_DATA_VERSION = '2026-09-25-order-reset-v2';

function purgeLegacyOrderStorage(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(ORDER_DATA_VERSION_KEY) !== CURRENT_ORDER_DATA_VERSION) {
    localStorage.removeItem('quickbite.orders.local');
    localStorage.removeItem(ORDER_OVERRIDES_KEY);
    localStorage.removeItem(HIDDEN_ORDERS_KEY);
    localStorage.removeItem('quickbite.admin.refunds');
    localStorage.setItem(ORDER_DATA_VERSION_KEY, CURRENT_ORDER_DATA_VERSION);
  }
}

purgeLegacyOrderStorage();

const SEED_ORDERS: Order[] = [];

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly sync = inject(RealtimeSyncService);
  private readonly socket = inject(RealtimeOrderSocketService);
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
    // 1. Listen to real-time STOMP WebSocket push events from RabbitMQ
    this.socket.events$.subscribe((event) => {
      console.log('[OrderService] Live WebSocket order event:', event.eventType, 'for order', event.orderId);
      if (event.order) {
        const mapped = this.fromBackendOrder(event.order);
        this.upsertOrder(mapped);
        this.persistLocalState();
        this.sync.publish('orders');
      } else {
        this.refreshFromBackend();
      }
    });

    // 2. Listen to cross-tab updates within same browser session
    this.sync.on('orders', () => {
      this.ordersSignal.set(this.readLocalOrders());
      this.overridesSignal.set(this.readOverrides());
      this.hiddenOrdersSignal.set(this.readHiddenOrders());
    });

    // 3. Periodic fallback reconciliation polling (every 10s)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.refreshFromBackend();
      }, ORDER_REFRESH_INTERVAL_MS);

      window.addEventListener('focus', () => this.refreshFromBackend());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.refreshFromBackend();
        }
      });
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
      paymentStatus: payload.paymentStatus ?? (payload.paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS'),
      paymentMethod: payload.paymentMethod,
    });
  }

  updateOrderStatus(orderId: string, status: Order['status'], agent?: string, reason?: string): void {
    const effectiveReason = reason || (status === 'CANCELLED' ? 'Kitchen capacity / Ingredients unavailable' : undefined);
    this.overridesSignal.update((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        status,
        agent: agent ?? current[orderId]?.agent,
        cancellationReason: effectiveReason ?? current[orderId]?.cancellationReason,
      },
    }));
    this.ordersSignal.update((orders) =>
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              ...(agent ? { agent, deliveryAgentName: agent } : {}),
              ...(effectiveReason ? { cancellationReason: effectiveReason } : {}),
            }
          : o
      )
    );
    this.persistLocalState();

    const order = this.orders().find((item) => item.id === orderId);
    if (!order?.backendId) {
      return;
    }

    const patchParams: Record<string, string> = { status: orderStatusToBackend(status) };
    if (reason) {
      patchParams['reason'] = reason;
    }

    this.http
      .patch<BackendOrderResponse>(`${this.baseUrl}/orders/${order.backendId}/status`, null, {
        params: patchParams,
      })
      .subscribe({
        next: (response) => {
          this.overridesSignal.update((current) => {
            const copy = { ...current };
            if (copy[orderId]) {
              const { status: _, ...rest } = copy[orderId];
              copy[orderId] = rest;
            }
            return copy;
          });
          this.upsertOrder(this.fromBackendOrder(response, order));
          this.persistLocalState();
          this.sync.publish('orders');
        },
        error: (err) => {
          console.warn('Backend patch order status error, keeping optimistic state:', err);
          this.sync.publish('orders');
        },
      });

    const delivery = this.deliveriesSignal().find((d) =>
      String(d.orderId) === String(order.backendId) ||
      String(d.orderId) === String(order.id).replace('ORD-', '') ||
      String(d.orderId) === String(order.id)
    );
    if (delivery) {
      const deliveryStatus = status === 'ON_THE_WAY'
        ? 'PICKED_UP'
        : status === 'DELIVERED'
          ? 'DELIVERED'
          : status === 'CANCELLED'
            ? 'CANCELLED'
            : 'ASSIGNED';
      this.http.patch(`${this.baseUrl}/deliveries/${delivery.id}/status`, null, {
        params: { status: deliveryStatus }
      }).subscribe({
        next: () => {
          this.refreshFromBackend();
          this.sync.publish('orders');
        },
        error: (err) => {
          console.error('Failed to update delivery assignment status in DB', err);
          this.sync.publish('orders');
        }
      });
    } else {
      this.sync.publish('orders');
    }
  }

  assignDeliveryAgent(orderId: string, agentEmail: string, agentDetails?: { name: string; phone: string }): void {
    const agent = this.agents.agents().find((a) => a.email.toLowerCase() === agentEmail.toLowerCase());
    const seedAgent = DELIVERY_AGENT_SEEDS.find(
      (item) => item.email.toLowerCase() === agentEmail.toLowerCase(),
    );
    const name = seedAgent?.name ?? agentDetails?.name ?? agent?.name ?? this.currentAgentName(agentEmail) ?? 'Delivery Partner';
    const phone = seedAgent?.phone ?? agentDetails?.phone ?? agent?.phone ?? '+91 98765 43210';
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
    this.ordersSignal.update((orders) =>
      orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              agent: name,
              deliveryAgentName: name,
              deliveryAgentEmail: agentEmail,
              deliveryAgentPhone: phone,
              deliveryAgentStatus: 'ASSIGNED',
              deliveryAgentEtaMinutes: 12,
              deliveryAgentDistanceKm: 2.4,
              deliveryAgentEarnings: 45,
            }
          : o
      )
    );
    this.persistLocalState();

    const order = this.orders().find((o) => o.id === orderId);
    if (order) {
      const riderId = seedAgent?.id || agent?.id || 1;
      const backendOrderId = order.backendId || Number(orderId.replace('ORD-', ''));

      if (backendOrderId && !Number.isNaN(backendOrderId) && backendOrderId < 1000000) {
        this.http.put<BackendOrderResponse>(`${this.baseUrl}/orders/${backendOrderId}/assign-delivery`, {
          riderId,
        }).subscribe({
          next: (res) => {
            this.upsertOrder(this.fromBackendOrder(res, order));
            this.persistLocalState();
            this.sync.publish('orders');
          },
          error: (err) => console.warn('Order-service assign-delivery fallback:', err)
        });
      }

      const payload = {
        orderId: backendOrderId,
        riderId,
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

  public refreshFromBackend(): void {
    const user = this.session.user();
    let ordersUrl = `${this.baseUrl}/orders`;
    if (user?.role === 'RESTAURANT_OWNER') {
      const restaurantBackendId = this.resolveBackendRestaurantId(user.restaurantId, user.restaurantName);
      if (restaurantBackendId) {
        ordersUrl = `${this.baseUrl}/orders?restaurantId=${restaurantBackendId}`;
      }
    }

    this.http.get<BackendOrderResponse[]>(ordersUrl).subscribe({
      next: (orders) => {
        const current = this.ordersSignal();
        const mappedBackend = orders.map((order) => {
          const existing = current.find(
            (o) => o.backendId === order.id || o.id === `ORD-${order.id}`,
          );
          return this.fromBackendOrder(order, existing);
        });

        // Retain local orders permanently across refreshes so order history is never lost
        const pendingLocal = current.filter(
          (o) =>
            !orders.some((bo) => bo.id === o.backendId || `ORD-${bo.id}` === o.id) &&
            !['ORD-101', 'ORD-102'].includes(o.id),
        );

        this.ordersSignal.set([...pendingLocal, ...mappedBackend]);
        this.persistLocalState();
      },
      error: (err) => {
        console.warn('Could not refresh orders from backend, keeping local state:', err);
      },
    });

    this.http.get<any[]>(`${this.baseUrl}/deliveries`).subscribe({
      next: (deliveries) => {
        this.deliveriesSignal.set(deliveries);
        // Sync delivery assignment status → order status for all local orders
        // This ensures customer/owner/admin dashboards see the correct status
        // even when the backend order row update failed (e.g. DB inconsistency)
        let changed = false;
        this.ordersSignal.update((orders) =>
          orders.map((order) => {
            const backendNumericId = order.backendId ?? Number(String(order.id).replace('ORD-', ''));
            const delivery = deliveries.find(
              (d) =>
                String(d.orderId) === String(backendNumericId) ||
                String(d.orderId) === String(order.backendId) ||
                String(d.orderId) === String(order.id).replace('ORD-', '')
            );
            if (!delivery) return order;
            const deliveryStatus: string = delivery.deliveryStatus ?? '';
            if (deliveryStatus === 'DELIVERED' && order.status !== 'DELIVERED') {
              changed = true;
              return { ...order, status: 'DELIVERED' as Order['status'] };
            }
            if (deliveryStatus === 'PICKED_UP' && order.status !== 'ON_THE_WAY' && order.status !== 'DELIVERED') {
              changed = true;
              return { ...order, status: 'ON_THE_WAY' as Order['status'] };
            }
            return order;
          })
        );
        if (changed) {
          this.persistLocalState();
          this.sync.publish('orders');
        }
      },
      error: (err) => console.error('Failed to load deliveries from backend', err),
    });
  }


  private fromBackendOrder(response: BackendOrderResponse, fallback?: Order): Order {
    const STATIC_RESTAURANTS: Record<number, { id: string; name: string }> = {
      1: { id: 'urban-bites', name: 'Urban Bites' },
      2: { id: 'crust-and-co', name: 'Crust & Co.' },
      3: { id: 'royal-tadka', name: 'Royal Tadka' },
      4: { id: 'wok-and-bowl', name: 'Wok & Bowl' },
      5: { id: 'green-spoon', name: 'Green Spoon' },
      6: { id: 'the-food-yard', name: 'The Food Yard' },
    };
    const staticInfo = STATIC_RESTAURANTS[response.restaurantId];

    // Map numeric backendRestaurantId -> frontend restaurant entry
    let restaurant = this.catalog
      .restaurantList()
      .find((entry) => entry.backendId === response.restaurantId);

    // Robust Fallback: search catalog menu items to map the order to the correct local restaurant
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

    const restaurantName = fallback?.restaurantName ?? staticInfo?.name ?? restaurant?.name ?? `Restaurant ${response.restaurantId}`;
    // Determine the frontend slug-id — critical for owner dashboard filtering
    const resolvedRestaurantId = staticInfo?.id ?? restaurant?.id ?? fallback?.restaurantId ?? slugify(restaurantName);
    return {
      id: `ORD-${response.id}`,
      backendId: response.id,
      restaurantId: resolvedRestaurantId,
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
      customerName: response.customerName || fallback?.customerName || 'Customer',
      customerEmail: response.customerEmail,
      customerPhone: response.customerPhone || fallback?.customerPhone,
      time: fallback?.time ?? this.currentTime(),
      createdAt: response.createdAt,
      note: response.note || fallback?.note,
      cancellationReason: response.orderStatus === 'CANCELLED'
        ? (response.note ? response.note.replace(/^Cancelled:\s*/i, '') : fallback?.cancellationReason || 'Kitchen capacity / Ingredients unavailable')
        : fallback?.cancellationReason,
      customerDistanceKm: fallback?.customerDistanceKm ?? 2.5,
      deliveryAddressLine: response.deliveryAddress || fallback?.deliveryAddressLine || 'Delivery address registered at checkout',
      deliveryLocation: fallback?.deliveryLocation,
      pickupLocation: fallback?.pickupLocation ?? this.restaurantPoint(resolvedRestaurantId),
      deliveryAgentName: response.deliveryAgentName || fallback?.deliveryAgentName,
      deliveryAgentEmail: response.deliveryAgentEmail || fallback?.deliveryAgentEmail,
      deliveryAgentPhone: response.deliveryAgentPhone || fallback?.deliveryAgentPhone,
      deliveryAgentStatus: (response.deliveryAgentStatus as any) || fallback?.deliveryAgentStatus,
      deliveryAgentEtaMinutes: fallback?.deliveryAgentEtaMinutes ?? 15,
      deliveryAgentDistanceKm: fallback?.deliveryAgentDistanceKm ?? 2.1,
      deliveryAgentEarnings: fallback?.deliveryAgentEarnings ?? 40,
      deliveryAgentLocation: fallback?.deliveryAgentLocation,
      agent: response.deliveryAgentName || fallback?.agent,
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
    const customerId = customer?.id || 1;

    const effectivePayment = {
      paymentStatus: payment?.paymentStatus ?? (payload.paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS'),
      paymentMethod: payment?.paymentMethod ?? payload.paymentMethod,
      paymentId: payment?.paymentId,
      paymentOrderId: payment?.paymentOrderId,
      paymentSignature: payment?.paymentSignature,
    };

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
        menuItemId: item.backendMenuItemId ?? menuItem?.backendId ?? 1,
        itemName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        restaurantId: item.backendRestaurantId ?? restaurantEntry?.backendId ?? 1,
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
      paymentStatus: effectivePayment.paymentStatus,
      paymentMethod: effectivePayment.paymentMethod,
      paymentId: effectivePayment.paymentId,
      paymentOrderId: effectivePayment.paymentOrderId,
      paymentSignature: effectivePayment.paymentSignature,
      customerName: payload.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Guest Customer'),
      customerEmail: payload.customerEmail || customer?.email || 'customer@quickbite.com',
      customerPhone: payload.customerPhone || customer?.phoneNumber,
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
        customerId,
        restaurantId: restaurant?.backendId ?? 1,
        totalAmount: payload.total,
        currency: 'INR',
        customerEmail: payload.customerEmail || customer?.email || 'customer@quickbite.com',
        customerName: payload.customerName || (customer ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Customer'),
        customerPhone: payload.customerPhone || customer?.phoneNumber,
        deliveryAddress: payload.deliveryAddressLine || 'Delivery address registered at checkout',
        note: payload.note,
        items: backendItems.map((item) => ({
          menuItemId: item.menuItemId || 1,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        promoCode: this.cart.promoCode() || undefined,
        discountAmount: this.cart.discount() || undefined,
        paymentMethod: paymentMethodToBackend(effectivePayment.paymentMethod || 'COD'),
        paymentStatus: effectivePayment.paymentStatus,
        razorpayPaymentId: effectivePayment.paymentId,
        razorpayOrderId: effectivePayment.paymentOrderId,
        razorpaySignature: effectivePayment.paymentSignature,
      })
      .pipe(
        map((response) => {
          const next = this.fromBackendOrder(response, optimistic);
          this.ordersSignal.update((orders) => {
            const withoutOptimistic = orders.filter((o) => o.id !== optimistic.id && o.id !== next.id);
            return [next, ...withoutOptimistic];
          });
          this.persistLocalState();
          return next;
        }),
        catchError((err) => {
          console.warn('Backend order creation returned error, proceeding with local optimistic order:', err);
          return of(optimistic);
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
        const orderCleanId = String(order.id).replace('ORD-', '');
        const delivery = deliveries.find(
          (d) =>
            (order.backendId && String(d.orderId) === String(order.backendId)) ||
            String(d.orderId) === orderCleanId ||
            String(d.orderId) === String(order.id)
        );
        
        let dbOverrides: Partial<Order> = {};
        if (delivery) {
          const seedAgent = DELIVERY_AGENT_SEEDS.find((a) =>
            String(a.id) === String(delivery.riderId) ||
            a.name.toLowerCase() === delivery.riderName.toLowerCase() ||
            a.phone === delivery.riderPhone
          );
          const agentEntry = agentsList.find((a) =>
            a.email.toLowerCase() === seedAgent?.email.toLowerCase() ||
            String(a.id) === String(delivery.riderId) ||
            a.name.toLowerCase() === delivery.riderName.toLowerCase() ||
            a.phone === delivery.riderPhone
          );
          const resolvedAgentName = seedAgent?.name ?? delivery.riderName;
          const resolvedAgentEmail = seedAgent?.email ?? agentEntry?.email ?? (delivery.riderName.toLowerCase().includes('jackson') ? 'agent1@quickbite.com' : undefined);
          const resolvedAgentPhone = seedAgent?.phone ?? delivery.riderPhone;
          dbOverrides = {
            deliveryAgentName: resolvedAgentName,
            deliveryAgentPhone: resolvedAgentPhone,
            deliveryAgentEmail: resolvedAgentEmail,
            deliveryAgentStatus: delivery.deliveryStatus,
            agent: resolvedAgentName,
            deliveryAgentEtaMinutes: 12,
            deliveryAgentDistanceKm: 2.4,
            deliveryAgentEarnings: 45,
          };
        }

        const itemOverride = overrides[order.id] || {};
        let effectiveOverride = { ...itemOverride };
        if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
          if (effectiveOverride.status && effectiveOverride.status !== order.status) {
            delete effectiveOverride.status;
          }
        }
        let merged: Order = { 
          ...order, 
          ...effectiveOverride,
          ...dbOverrides 
        } as Order;

        // Ensure deliveryAgentEmail is NEVER lost if it was in itemOverride or order
        if (!merged.deliveryAgentEmail && itemOverride.deliveryAgentEmail) {
          merged.deliveryAgentEmail = itemOverride.deliveryAgentEmail;
        }
        if (!merged.deliveryAgentName && itemOverride.deliveryAgentName) {
          merged.deliveryAgentName = itemOverride.deliveryAgentName;
        }

        if (delivery) {
          if (delivery.deliveryStatus === 'CANCELLED' || order.status === 'CANCELLED') {
            merged.status = 'CANCELLED';
            merged.deliveryAgentStatus = 'CANCELLED';
          } else if (delivery.deliveryStatus === 'DELIVERED') {
            merged.status = 'DELIVERED';
            merged.deliveryAgentStatus = 'DELIVERED';
          } else if (delivery.deliveryStatus === 'PICKED_UP' && (merged.status === 'READY' || merged.status === 'PREPARING' || merged.status === 'CONFIRMED')) {
            merged.status = 'ON_THE_WAY';
            merged.deliveryAgentStatus = 'PICKED_UP';
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
      const parsed = JSON.parse(raw) as Order[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((o) => o && !['ORD-101', 'ORD-102'].includes(o.id));
    } catch {
      return [];
    }
  }

  public clearAllOrderData(): void {
    localStorage.removeItem('quickbite.orders.local');
    localStorage.removeItem(ORDER_OVERRIDES_KEY);
    localStorage.removeItem(HIDDEN_ORDERS_KEY);
    this.ordersSignal.set([]);
    this.overridesSignal.set({});
    this.hiddenOrdersSignal.set([]);
    this.sync.publish('orders');
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

  private resolveBackendRestaurantId(restaurantId?: string, restaurantName?: string): number | undefined {
    const normalizedId = restaurantId?.toLowerCase().trim();
    if (normalizedId && NUMERIC_RESTAURANT_IDS[normalizedId]) {
      return NUMERIC_RESTAURANT_IDS[normalizedId];
    }

    const numeric = Number(restaurantId);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const normalizedName = restaurantName?.toLowerCase().trim();
    const restaurant = this.catalog.restaurantList().find((entry) => {
      const idMatches = normalizedId && entry.id.toLowerCase() === normalizedId;
      const nameMatches = normalizedName && entry.name.toLowerCase().trim() === normalizedName;
      return idMatches || nameMatches;
    });

    return restaurant?.backendId;
  }
}
