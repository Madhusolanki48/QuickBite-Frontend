import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';

import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-cart-conflict-modal',
  standalone: true,
  imports: [NgIf],
  template: `
    <div
      *ngIf="cart.conflictPromptSignal() as prompt"
      class="conflict-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      <div class="conflict-dialog">
        <div class="conflict-header">
          <div class="conflict-icon">🍽️</div>
          <div>
            <h3 id="conflict-title">Replace cart items?</h3>
            <p class="conflict-sub">Different restaurant selected</p>
          </div>
        </div>

        <div class="conflict-body">
          <p>
            Your cart contains items from <strong>{{ prompt.currentRestaurantName }}</strong>.
          </p>
          <p class="conflict-explanation">
            Would you like to clear your current cart and start a fresh order from
            <strong class="highlight-restaurant">{{ prompt.newRestaurantName }}</strong>?
          </p>
        </div>

        <div class="conflict-actions">
          <button
            type="button"
            class="conflict-btn conflict-btn--cancel"
            (click)="cart.resolveConflict('CANCEL')"
          >
            Keep Existing Cart
          </button>
          <button
            type="button"
            class="conflict-btn conflict-btn--confirm"
            (click)="cart.resolveConflict('REPLACE')"
          >
            Start New Order
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .conflict-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        animation: fadeIn 0.2s ease-out;
      }

      .conflict-dialog {
        background: #ffffff;
        width: 100%;
        max-width: 440px;
        border-radius: 24px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
        padding: 1.75rem;
        animation: popUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(226, 232, 240, 0.8);
      }

      .conflict-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }

      .conflict-icon {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: #fff7ed;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        box-shadow: inset 0 0 0 1px #ffedd5;
      }

      .conflict-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.2;
      }

      .conflict-sub {
        margin: 0.2rem 0 0;
        font-size: 0.82rem;
        color: #64748b;
        font-weight: 500;
      }

      .conflict-body {
        font-size: 0.95rem;
        color: #334155;
        line-height: 1.55;
        padding: 0.75rem 0 1.5rem;
        border-top: 1px solid #f1f5f9;
        border-bottom: 1px solid #f1f5f9;
      }

      .conflict-body p {
        margin: 0 0 0.5rem;
      }

      .conflict-body p:last-child {
        margin-bottom: 0;
      }

      .conflict-explanation {
        font-size: 0.9rem;
        color: #64748b;
      }

      .highlight-restaurant {
        color: #ea580c;
        font-weight: 700;
      }

      .conflict-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }

      .conflict-btn {
        flex: 1;
        padding: 0.85rem 1rem;
        border-radius: 14px;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
        border: none;
      }

      .conflict-btn--cancel {
        background: #f1f5f9;
        color: #475569;
      }

      .conflict-btn--cancel:hover {
        background: #e2e8f0;
        color: #1e293b;
      }

      .conflict-btn--confirm {
        background: #ea580c;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
      }

      .conflict-btn--confirm:hover {
        background: #c2410c;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(234, 88, 12, 0.45);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes popUp {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
  ],
})
export class CartConflictModalComponent {
  protected readonly cart = inject(CartService);
}
