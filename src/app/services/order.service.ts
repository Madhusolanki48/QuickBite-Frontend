import { Injectable, computed, inject, signal } from '@angular/core';

import { GeoPoint, Order } from '../core/app.models';
import { DeliveryAgentDirectoryService } from './delivery-agent-directory.service';
import { RealtimeSyncService } from './realtime-sync.service';

const ORDERS_KEY = 'quickbite.orders.v2';

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
  private readonly sync = inject(RealtimeSyncService);
  private readonly agents = inject(DeliveryAgentDirectoryService);
  private readonly ordersSignal = signal<Order[]>(this.readOrders());

  readonly orders = computed(() => this.ordersSignal());

  constructor() {
    this.sync.on(ORDERS_KEY, () => this.refresh());
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

    const pickupLocation = payload.pickupLocation ?? this.restaurantPoint(payload.restaurantId);
    const deliveryLocation =
      payload.deliveryLocation ?? this.offsetPoint(pickupLocation, 0.015, 0.016);
    const distanceKm = this.distanceKm(pickupLocation, deliveryLocation);
    const customerDistanceKm = this.distanceKm(pickupLocation, deliveryLocation);

    const order: Order = {
      id: `ORD-${1005 + this.ordersSignal().length}`,
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

    this.ordersSignal.update((orders) => [order, ...orders]);
    this.persistOrders();
    return order;
  }

  updateOrderStatus(orderId: string, status: Order['status'], agent?: string): void {
    this.ordersSignal.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              agent: agent ?? order.agent,
              deliveryAgentStatus:
                status === 'READY'
                  ? 'ASSIGNED'
                  : status === 'ON_THE_WAY'
                    ? 'PICKED_UP'
                    : status === 'DELIVERED'
                      ? 'DELIVERED'
                      : order.deliveryAgentStatus,
            }
          : order,
      ),
    );
    this.persistOrders();
  }

  assignDeliveryAgent(orderId: string, agentEmail: string): void {
    const agent = this.agents.findAgent(agentEmail);
    if (!agent) {
      throw new Error('Selected delivery agent is not available');
    }

    this.ordersSignal.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: order.status === 'PLACED' ? 'CONFIRMED' : order.status,
              deliveryAgentName: agent.name,
              deliveryAgentEmail: agent.email,
              deliveryAgentPhone: agent.phone,
              deliveryAgentStatus: 'ASSIGNED',
              deliveryAgentLocation: agent.location,
              deliveryAgentEtaMinutes: Math.max(
                12,
                Math.round(
                  this.distanceKm(
                    agent.location,
                    order.pickupLocation ?? this.restaurantPoint(order.restaurantId),
                  ) *
                    4 +
                    8,
                ),
              ),
              deliveryAgentDistanceKm: Number(
                this.distanceKm(
                  agent.location,
                  order.pickupLocation ?? this.restaurantPoint(order.restaurantId),
                ).toFixed(1),
              ),
              deliveryAgentEarnings: Math.max(39, Math.round(order.total * 0.12)),
            }
          : order,
      ),
    );
    this.persistOrders();
  }

  deleteOrder(orderId: string): void {
    const order = this.ordersSignal().find((item) => item.id === orderId);
    if (!order || order.status !== 'PLACED') {
      return;
    }

    this.ordersSignal.update((orders) => orders.filter((order) => order.id !== orderId));
    this.persistOrders();
  }

  recordOrders(orders: Order[]): void {
    this.ordersSignal.set(orders);
    this.persistOrders();
  }

  activeOrders() {
    return this.ordersSignal().filter(
      (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
    );
  }

  pastOrders() {
    return this.ordersSignal().filter(
      (order) => order.status === 'DELIVERED' || order.status === 'CANCELLED',
    );
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

  private readOrders(): Order[] {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Order[];
    } catch {
      return [];
    }
  }

  private persistOrders(): void {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(this.ordersSignal()));
    this.sync.publish(ORDERS_KEY);
  }

  private refresh(): void {
    this.ordersSignal.set(this.readOrders());
  }

  private currentTime(): string {
    return new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
  }
}
