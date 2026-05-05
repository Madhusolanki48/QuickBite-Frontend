import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CartService } from '../../services/cart.service';
import { LocationService } from '../../services/location.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { RazorpayService } from '../../services/razorpay.service';
import { SessionService } from '../../services/session.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-page',
  imports: [NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Secure Payment</h1>
        <p>Pay with Razorpay first, then QuickBite will create your order automatically.</p>
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
            <strong>Rs {{ item.price * item.quantity }}</strong>
            <button type="button" class="ghost small danger" (click)="cart.removeItem(item.id)">
              Remove
            </button>
          </div>
        </div>

        <div class="payment-card__line muted">
          <span>Total</span>
          <strong>Rs {{ cart.total() }}</strong>
        </div>

        <div class="methods">
          <button
            type="button"
            [class.active]="selectedMethod() === 'UPI'"
            (click)="setMethod('UPI')"
          >
            UPI
          </button>
          <button
            type="button"
            [class.active]="selectedMethod() === 'CARD'"
            (click)="setMethod('CARD')"
          >
            Cards
          </button>
          <button
            type="button"
            [class.active]="selectedMethod() === 'NETBANKING'"
            (click)="setMethod('NETBANKING')"
          >
            Netbanking
          </button>
          <button
            type="button"
            [class.active]="selectedMethod() === 'WALLET'"
            (click)="setMethod('WALLET')"
          >
            Wallets
          </button>
        </div>

        <p class="pay-note">
          Razorpay checkout will open with UPI, cards, netbanking, and wallets enabled.
        </p>
        <p *ngIf="errorMessage()" class="pay-error">{{ errorMessage() }}</p>

        <button type="button" class="pay" [disabled]="!canPay()" (click)="startPayment()">
          <span *ngIf="processing(); else payLabel">Processing...</span>
          <ng-template #payLabel>Pay Rs {{ cart.total() }} and Create Order</ng-template>
        </button>
      </div>

      <div class="card receipt">
        <h2>Payment Summary</h2>
        <p>Address: {{ formatAddress(cart.selectedAddress()) }}</p>
        <p>Method: {{ selectedMethod() }}</p>
        <p>Promo: {{ cart.promoCode() || 'None' }}</p>
        <p class="receipt-note">
          After successful payment, you will be redirected to the order success page.
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
  private readonly razorpay = inject(RazorpayService);
  protected readonly errorMessage = signal('');
  protected readonly processing = signal(false);
  protected readonly selectedMethod = signal<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');

  protected readonly canPay = computed(
    () => this.cart.itemCount() > 0 && this.cart.total() > 0 && !this.processing(),
  );

  setMethod(method: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'): void {
    this.selectedMethod.set(method);
    this.cart.setPaymentMethod(method);
  }

  async startPayment(): Promise<void> {
    if (!this.canPay()) {
      this.errorMessage.set('Add at least one item before paying.');
      return;
    }

    const restaurant = this.cart.items()[0];
    if (!restaurant) {
      this.errorMessage.set('Your cart is empty.');
      return;
    }

    const customer = this.session.user();
    const selectedAddress = this.cart.selectedAddress();
    const formattedAddress = selectedAddress ? this.cart.formatAddress(selectedAddress) : undefined;
    const customerName = customer?.firstName
      ? `${customer.firstName} ${customer.lastName ?? ''}`.trim()
      : 'Customer';
    const orderSummary = this.cart
      .items()
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ');

    this.processing.set(true);
    this.errorMessage.set('');

    try {
      await this.razorpay.loadCheckoutScript();

      const createResponse = await firstValueFrom(
        this.razorpay.createOrder({
          amount: this.cart.total() * 100,
          currency: 'INR',
          receipt: `qb-${Date.now()}`,
          notes: {
            restaurant: restaurant.restaurantName,
            items: orderSummary,
            customerEmail: customer?.email ?? '',
          },
        }),
      );

      const checkoutResult = await this.razorpay.openCheckout({
        key: createResponse.keyId || environment.razorpayKeyId,
        amount: createResponse.amountInPaise ?? createResponse.amount ?? this.cart.total() * 100,
        currency: createResponse.currency || 'INR',
        name: 'QuickBite',
        description: `${restaurant.restaurantName} order`,
        order_id: createResponse.orderId || createResponse.razorpayOrderId || createResponse.id || '',
        prefill: {
          name: customerName,
          email: customer?.email,
          contact: customer?.phoneNumber,
        },
        notes: {
          restaurant: restaurant.restaurantName,
          method: this.selectedMethod(),
          address: formattedAddress ?? '',
        },
        config: {
          display: {
            sequence: ['upi', 'card', 'netbanking', 'wallet'],
          },
        },
        theme: {
          color: '#ff5a00',
        },
      });

      const verifyResponse = await firstValueFrom(
        this.razorpay.verifyPayment({
          razorpayOrderId: checkoutResult.razorpay_order_id,
          razorpayPaymentId: checkoutResult.razorpay_payment_id,
          razorpaySignature: checkoutResult.razorpay_signature,
        }),
      );

      if (!verifyResponse.success && !verifyResponse.verified) {
        throw new Error(verifyResponse.message || 'Payment verification failed.');
      }

      const orderTotal = this.cart.total();
      const order = await firstValueFrom(
        this.orders.placeOrderAfterPayment({
          restaurantId: restaurant.restaurantId,
          restaurantName: restaurant.restaurantName,
          items: orderSummary,
          total: orderTotal,
          customerName,
          customerEmail: customer?.email,
          customerPhone: customer?.phoneNumber,
          deliveryAddressLine: formattedAddress,
          deliveryLocation: selectedAddress
            ? this.locations.addressLocation(selectedAddress)
            : undefined,
          pickupLocation: restaurant.restaurantId
            ? this.locations.restaurantLocation(restaurant.restaurantId)
            : undefined,
          paymentMethod: this.selectedMethod(),
          paymentId: checkoutResult.razorpay_payment_id,
          paymentOrderId: checkoutResult.razorpay_order_id,
          paymentSignature: checkoutResult.razorpay_signature,
          paymentStatus: 'SUCCESS',
        }),
      );

      if (customer?.email) {
        this.notifications
          .create({
            recipientEmail: customer.email,
            title: 'Payment successful',
            message: `Your payment for ${order.restaurantName} was verified successfully.`,
            category: 'PAYMENT',
          })
          .subscribe();
      }

      this.cart.clear();
      await this.router.navigate(['/order-success'], {
        queryParams: {
          orderId: order.backendId ?? order.id,
          paymentId: checkoutResult.razorpay_payment_id,
          paymentOrderId: checkoutResult.razorpay_order_id,
          total: orderTotal,
          restaurant: order.restaurantName,
        },
      });
    } catch (error) {
      this.errorMessage.set(this.razorpay.describeError(error));
    } finally {
      this.processing.set(false);
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
