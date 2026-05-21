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
      <div class="card stack cart-items-list">
        <h2>Your Items</h2>
        <div class="empty-cart-state" *ngIf="cart.items().length === 0">
           <div class="icon">🛒</div>
           <h3>Your cart is empty</h3>
           <p>Looks like you haven't added anything yet.</p>
           <a routerLink="/home" class="primary-link">Explore Restaurants</a>
        </div>
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
            <div class="cart-item__title-row">
              <span class="diet-indicator veg"><div class="circle"></div></span>
              <h3>{{ item.name }}</h3>
            </div>
            <p>{{ item.restaurantName }}</p>
            <strong>₹{{ item.price }}</strong>
          </div>

          <div class="cart-item__actions-group">
            <div class="stepper">
              <button type="button" (click)="cart.decreaseQuantity(item.id)">-</button>
              <span>{{ item.quantity }}</span>
              <button type="button" (click)="cart.increaseQuantity(item.id)">+</button>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="cart-item__total">₹{{ item.price * item.quantity }}</div>
              <button 
                type="button" 
                class="ghost" 
                style="color: #ef4444; border-color: rgba(239, 68, 68, 0.25); padding: 0.35rem 0.6rem; font-size: 0.85rem;" 
                (click)="cart.removeItem(item.id)"
                title="Remove item"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        </article>
      </div>

      <div class="card summary">
        <h2>Order Summary</h2>
        <div class="delivery-estimate">
           <span class="icon">⏱</span>
           <div>
             <strong>Delivery in 30-40 mins</strong>
             <p>To your selected address</p>
           </div>
        </div>

        <div class="summary__rows">
          <span>Item Total</span><strong>₹{{ cart.subtotal() }}</strong> 
          <span>Delivery Fee</span><strong>₹{{ cart.deliveryFee() }}</strong> 
          <span>Taxes & Charges</span><strong>₹{{ cart.gst() }}</strong>
        </div>

        <hr class="divider" />

        <div class="total-row">
          <span>To Pay</span>
          <strong>₹{{ cart.total() }}</strong>
        </div>



        <div class="address-box">
          <label>Delivery Address</label>
          <select
            [value]="cart.selectedAddress().id"
            (change)="cart.selectAddress($any($event.target).value)"
          >
            <option *ngFor="let address of cart.addresses()" [value]="address.id">
              {{ address.title }} - {{ formatAddress(address) }}
            </option>
          </select>
        </div>

        <div class="notes-box">
          <label>Any restaurant requests?</label>
          <textarea
            rows="2"
            placeholder="e.g. Don't send cutlery, less spicy"
            [value]="cart.note()"
            (input)="cart.setNote($any($event.target).value)"
          ></textarea>
        </div>

        <a routerLink="/payment" class="primary-link block-btn">
          Proceed to Pay &nbsp;&middot;&nbsp; ₹{{ cart.total() }}
        </a>
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
