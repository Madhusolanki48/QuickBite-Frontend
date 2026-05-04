import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { LocationService } from '../../services/location.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-payment-page',
  imports: [NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Payment</h1>
        <p>Mock checkout flow only. No live payment gateway is wired in yet.</p>
      </div>
    </section>

    <section class="payment-grid">
      <div class="card payment-card">
        <h2>Review & Pay</h2>
        <div class="payment-card__line payment-card__line--item" *ngFor="let item of cart.items()">
          <div class="payment-card__item">
            <img
              *ngIf="item.imageUrl"
              [src]="resolveItemImageUrl(item.imageUrl)"
              [alt]="item.name"
            />
            <div>
              <span>{{ item.name }} x{{ item.quantity }}</span>
              <small>{{ item.restaurantName }}</small>
            </div>
          </div>
          <div class="payment-card__item-actions">
            <strong>₹{{ item.price * item.quantity }}</strong>
            <button type="button" class="ghost small danger" (click)="cart.removeItem(item.id)">
              Remove
            </button>
          </div>
        </div>
        <div class="payment-card__line muted">
          <span>Total</span>
          <strong>₹{{ cart.total() }}</strong>
        </div>
        <div class="methods">
          <button
            type="button"
            [class.active]="cart.paymentMethod() === 'UPI'"
            (click)="cart.setPaymentMethod('UPI')"
          >
            UPI / Google Pay
          </button>
          <button
            type="button"
            [class.active]="cart.paymentMethod() === 'CARD'"
            (click)="cart.setPaymentMethod('CARD')"
          >
            Credit / Debit Card
          </button>
          <button
            type="button"
            [class.active]="cart.paymentMethod() === 'COD'"
            (click)="cart.setPaymentMethod('COD')"
          >
            Cash on Delivery
          </button>
        </div>
        <p *ngIf="errorMessage()" class="pay-error">{{ errorMessage() }}</p>
        <button type="button" class="pay" [disabled]="!canPlaceOrder()" (click)="placeOrder()">
          Place Order · ₹{{ cart.total() }}
        </button>
      </div>

      <div class="card receipt">
        <h2>Payment Summary</h2>
        <p>Address: {{ formatAddress(cart.selectedAddress()) }}</p>
        <p>Method: {{ cart.paymentMethod() }}</p>
        <p>Promo: {{ cart.promoCode() || 'None' }}</p>
        <p class="receipt-note">
          Restaurant owner will assign a delivery partner after the order is placed.
        </p>
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class PaymentPageComponent {
  private readonly router = inject(Router);
  protected readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly session = inject(SessionService);
  private readonly locations = inject(LocationService);
  private readonly notifications = inject(NotificationService);
  protected readonly errorMessage = signal('');

  protected readonly canPlaceOrder = computed(
    () => this.cart.itemCount() > 0 && this.cart.total() > 0,
  );

  placeOrder(): void {
    if (!this.canPlaceOrder()) {
      this.errorMessage.set('Add at least one item before placing the order.');
      return;
    }

    const restaurantName = this.cart.items()[0]?.restaurantName ?? 'QuickBite';
    const restaurantId = this.cart.items()[0]?.restaurantId;
    const items = this.cart
      .items()
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ');
    const selectedAddress = this.cart.selectedAddress();
    const formattedAddress = selectedAddress ? this.cart.formatAddress(selectedAddress) : undefined;
    const customerEmail = this.session.user()?.email;
    const customerPhone = this.session.user()?.phoneNumber;
    const customerName = this.session.user()?.firstName
      ? `${this.session.user()?.firstName} ${this.session.user()?.lastName ?? ''}`.trim()
      : 'Customer';

    try {
      const order = this.orders.placeOrder({
        restaurantId,
        restaurantName,
        items,
        total: this.cart.total(),
        customerName,
        customerEmail,
        customerPhone,
        deliveryAddressLine: formattedAddress,
        deliveryLocation: selectedAddress
          ? this.locations.addressLocation(selectedAddress)
          : undefined,
        pickupLocation: restaurantId ? this.locations.restaurantLocation(restaurantId) : undefined,
      });

      if (customerEmail) {
        this.notifications
          .create({
            recipientEmail: customerEmail,
            title: 'Order placed',
            message: `${order.restaurantName} has received your order. Delivery partner ${order.deliveryAgentName ?? 'will be assigned shortly'} is on the way.`,
            category: 'ORDER',
          })
          .subscribe();
      }

      this.notifications
        .create({
          recipientRole: 'RESTAURANT_OWNER',
          title: 'New order received',
          message: `A new order has been placed for ${restaurantName}.`,
          category: 'ORDER',
        })
        .subscribe();

      if (order.deliveryAgentEmail) {
        this.notifications
          .create({
            recipientEmail: order.deliveryAgentEmail,
            recipientRole: 'DELIVERY_PARTNER',
            title: 'New delivery request',
            message: `${order.restaurantName} -> ${formattedAddress ?? 'customer address'} | ETA ${order.deliveryAgentEtaMinutes ?? '10'} min | Earnings ₹${order.deliveryAgentEarnings ?? 0}`,
            category: 'DELIVERY',
          })
          .subscribe();
      }

      this.cart.clear();
      this.errorMessage.set('');
      void this.router.navigate(['/orders'], { queryParams: { placed: '1' } });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to place order.');
    }
  }

  formatAddress(address?: {
    addressLine: string;
    street?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }): string {
    return this.cart.formatAddress(address);
  }

  resolveItemImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('/assets/food-items/')) {
      return imageUrl.replace('/assets/food-items/', '/assets/images/food-items/');
    }
    return imageUrl;
  }
}
