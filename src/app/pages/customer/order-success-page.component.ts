import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-success-page',
  imports: [RouterLink],
  template: `
    <section class="page-head">
      <div>
        <h1>Payment Successful</h1>
        <p>Your payment was verified and your QuickBite order has been created.</p>
      </div>
      <a routerLink="/orders" class="ghost">View Orders</a>
    </section>

    <section class="payment-grid">
      <div class="card receipt">
        <h2>Order Details</h2>
        <p><strong>Order:</strong> {{ orderLabel() }}</p>
        <p><strong>Restaurant:</strong> {{ order()?.restaurantName || restaurantName() }}</p>
        <p><strong>Amount:</strong> Rs {{ order()?.total || total() }}</p>
        <p><strong>Payment ID:</strong> {{ paymentId() }}</p>
        <p><strong>Razorpay Order ID:</strong> {{ paymentOrderId() }}</p>
        <p><strong>Status:</strong> {{ order()?.paymentStatus || 'SUCCESS' }}</p>
        <p class="receipt-note">You can track delivery updates from the Orders page.</p>
      </div>

      <div class="card payment-card">
        <h2>Next Steps</h2>
        <p>Your kitchen team has been notified and your order is now in the queue.</p>
        <p>
          If you do not see the order immediately, refresh the Orders page once. The backend sync
          may take a moment.
        </p>
        <div class="methods">
          <a routerLink="/home" class="ghost">Continue Shopping</a>
          <a [routerLink]="['/orders']" [queryParams]="{ orderId: orderId() }" class="pay"
            >Track Order</a
          >
        </div>
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class OrderSuccessPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);

  readonly orderId = computed(() => this.route.snapshot.queryParamMap.get('orderId') ?? '');
  readonly paymentId = computed(() => this.route.snapshot.queryParamMap.get('paymentId') ?? '');
  readonly paymentOrderId = computed(
    () => this.route.snapshot.queryParamMap.get('paymentOrderId') ?? '',
  );
  readonly restaurantName = computed(
    () => this.route.snapshot.queryParamMap.get('restaurant') ?? '',
  );
  readonly total = computed(() => this.route.snapshot.queryParamMap.get('total') ?? '0');

  readonly order = computed(() => {
    const id = this.orderId();
    if (!id) {
      return undefined;
    }

    const backendId = Number(id);
    return Number.isFinite(backendId) ? this.orders.findByBackendId(backendId) : undefined;
  });

  readonly orderLabel = computed(() => this.order()?.id || this.orderId() || 'Pending');
}
