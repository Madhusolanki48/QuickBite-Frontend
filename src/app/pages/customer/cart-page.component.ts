import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart-page',
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <section class="page-head">
      <div>
        <h1>Your Cart <span aria-hidden="true">&#x1F6D2;</span></h1>
        <p>{{ cart.itemCount() }} item(s)</p>
      </div>
      <a routerLink="/home" class="ghost">+ Add More</a>
    </section>

    <section class="checkout-grid">
      <div class="card stack">
        <article *ngFor="let item of cart.items()" class="cart-item">
          <div class="cart-item__media">
            <img
              *ngIf="item.imageUrl && !itemImageError(item.id); else itemIcon"
              [src]="resolveItemImageUrl(item.imageUrl)"
              [alt]="item.name"
              (error)="markItemImageError(item.id)"
            />
            <ng-template #itemIcon><span class="cart-item__icon">&#x1F37D;</span></ng-template>
          </div>

          <div class="cart-item__content">
            <h3>{{ item.name }}</h3>
            <p>{{ item.restaurantName }}</p>
            <strong>Rs {{ item.price }}</strong>
          </div>

          <div class="cart-item__actions">
            <button type="button" (click)="cart.decreaseQuantity(item.id)">-</button>
            <span>{{ item.quantity }}</span>
            <button type="button" (click)="cart.increaseQuantity(item.id)">+</button>
          </div>

          <button
            type="button"
            class="ghost small danger cart-item__remove"
            (click)="cart.removeItem(item.id)"
          >
            Remove
          </button>
          <div class="cart-item__total">Rs {{ item.price * item.quantity }}</div>
        </article>
      </div>

      <div class="card summary">
        <h2>Order Summary</h2>
        <div class="summary__rows">
          <span>Subtotal</span><strong>Rs {{ cart.subtotal() }}</strong> <span>Delivery Fee</span
          ><strong>Rs {{ cart.deliveryFee() }}</strong> <span>GST (5%)</span
          ><strong>Rs {{ cart.gst() }}</strong>
        </div>

        <hr />

        <div class="total-row">
          <span>Total</span>
          <strong>Rs {{ cart.total() }}</strong>
        </div>

        <label>
          Promo Code
          <div class="input-row">
            <input
              [value]="cart.promoCode()"
              (input)="cart.setPromoCode($any($event.target).value)"
              placeholder="Enter code"
            />
            <button type="button">Apply</button>
          </div>
        </label>

        <label>
          Delivery Address
          <select
            [value]="cart.selectedAddress().id"
            (change)="cart.selectAddress($any($event.target).value)"
          >
            <option *ngFor="let address of cart.addresses()" [value]="address.id">
              {{ address.title }} - {{ formatAddress(address) }}
            </option>
          </select>
        </label>

        <label>
          Notes
          <textarea
            rows="3"
            [value]="cart.note()"
            (input)="cart.setNote($any($event.target).value)"
          ></textarea>
        </label>

        <a routerLink="/payment" class="primary-link">Place Order &middot; Rs {{ cart.total() }}</a>
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class CartPageComponent {
  protected readonly cart = inject(CartService);
  protected readonly itemImageErrors = signal<Record<string, boolean>>({});

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

  protected markItemImageError(id: string): void {
    this.itemImageErrors.update((state) => ({ ...state, [id]: true }));
  }

  protected itemImageError(id: string): boolean {
    return this.itemImageErrors()[id] ?? false;
  }
}
