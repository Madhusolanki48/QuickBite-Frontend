import { Injectable, inject, effect, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { SessionService } from './session.service';
import { environment } from '../../environments/environment';

export interface RealtimeOrderEvent {
  eventType: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_ASSIGNED' | 'ORDER_DELIVERED';
  orderId: number;
  restaurantId: number;
  restaurantName?: string;
  customerEmail?: string;
  deliveryAgentEmail?: string;
  orderStatus: string;
  deliveryAgentStatus?: string;
  order?: any;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeOrderSocketService implements OnDestroy {
  private readonly session = inject(SessionService);
  private client: Client | null = null;
  private readonly eventSubject = new Subject<RealtimeOrderEvent>();
  readonly events$ = this.eventSubject.asObservable();

  private activeSubscriptions: any[] = [];
  private isConnected = false;

  constructor() {
    this.initStompClient();

    // Whenever user session or role changes, update subscriptions
    effect(() => {
      const user = this.session.user();
      if (this.isConnected) {
        this.subscribeTopics(user);
      }
    });
  }

  private initStompClient(): void {
    if (typeof window === 'undefined') return;

    let brokerURL: string;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      brokerURL = `ws://localhost:8080/api/orders/ws`;
    } else if (environment.apiBaseUrl && environment.apiBaseUrl.startsWith('https://')) {
      const url = new URL(environment.apiBaseUrl);
      brokerURL = `wss://${url.host}/api/orders/ws`;
    } else if (environment.apiBaseUrl && environment.apiBaseUrl.startsWith('http://')) {
      const url = new URL(environment.apiBaseUrl);
      brokerURL = `ws://${url.host}/api/orders/ws`;
    } else {
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8080';
      brokerURL = `${protocol}//${host}/api/orders/ws`;
    }

    this.client = new Client({
      brokerURL,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg: string) => {
        // Uncomment for verbose socket debugging
        // console.debug('[STOMP]', msg);
      },
      onConnect: () => {
        console.log('[STOMP] Connected to order real-time WebSocket broker at', brokerURL);
        this.isConnected = true;
        this.subscribeTopics(this.session.user());
      },
      onDisconnect: () => {
        console.log('[STOMP] Disconnected from WebSocket broker');
        this.isConnected = false;
        this.clearSubscriptions();
      },
      onStompError: (frame) => {
        console.warn('[STOMP] Error from broker:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (event) => {
        console.warn('[STOMP] WebSocket transport error (falling back to polling reconciliation):', event);
      },
    });

    try {
      this.client.activate();
    } catch (err) {
      console.warn('[STOMP] Could not activate STOMP client:', err);
    }
  }

  private subscribeTopics(user: any): void {
    if (!this.client || !this.isConnected) return;

    this.clearSubscriptions();

    // 1. General topic: all live order updates (Admin, live orders list)
    const generalSub = this.client.subscribe('/topic/orders', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.activeSubscriptions.push(generalSub);

    // 2. Role-specific topic: Restaurant Owner
    if (user && user.role === 'RESTAURANT_OWNER') {
      const restId = user.restaurantId || '1';
      const restSub = this.client.subscribe(`/topic/restaurants/${restId}`, (message: IMessage) => {
        this.handleIncomingMessage(message);
      });
      this.activeSubscriptions.push(restSub);

      // If restaurant has numeric ID 1..6, also subscribe
      for (let i = 1; i <= 6; i++) {
        const numericSub = this.client.subscribe(`/topic/restaurants/${i}`, (message: IMessage) => {
          this.handleIncomingMessage(message);
        });
        this.activeSubscriptions.push(numericSub);
      }
    }

    // 3. Role-specific topic: Delivery Agent
    if (user && (user.role === 'DELIVERY_PARTNER' || user.email?.includes('agent'))) {
      const email = user.email?.trim().toLowerCase();
      if (email) {
        const agentSub = this.client.subscribe(`/topic/riders/${email}`, (message: IMessage) => {
          this.handleIncomingMessage(message);
        });
        this.activeSubscriptions.push(agentSub);
      }
    }

    // 4. Role-specific topic: Customer
    if (user && user.email) {
      const customerEmail = user.email.trim().toLowerCase();
      const customerSub = this.client.subscribe(`/topic/customers/${customerEmail}`, (message: IMessage) => {
        this.handleIncomingMessage(message);
      });
      this.activeSubscriptions.push(customerSub);
    }
  }

  private handleIncomingMessage(message: IMessage): void {
    try {
      const event: RealtimeOrderEvent = JSON.parse(message.body);
      console.log('[STOMP] Real-time event received:', event.eventType, 'for order', event.orderId, 'status:', event.orderStatus);
      this.eventSubject.next(event);
    } catch (err) {
      console.error('[STOMP] Failed to parse message body:', message.body, err);
    }
  }

  private clearSubscriptions(): void {
    for (const sub of this.activeSubscriptions) {
      try {
        sub.unsubscribe();
      } catch {}
    }
    this.activeSubscriptions = [];
  }

  ngOnDestroy(): void {
    this.clearSubscriptions();
    if (this.client) {
      this.client.deactivate();
    }
  }
}
