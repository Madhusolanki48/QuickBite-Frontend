import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { Address } from '../../core/app.models';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-addresses-page',
  imports: [NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Saved Addresses</h1>
        <p>Manage your home and office delivery locations.</p>
      </div>
      <button type="button" class="ghost" (click)="addAddress()">+ Add New</button>
    </section>

    <section class="address-stack">
      <article class="card address-card" *ngFor="let address of cart.addresses()">
        <div class="address-copy" *ngIf="editingId() !== address.id; else editAddress">
          <h3>{{ address.title }} <span *ngIf="address.isDefault" class="badge">DEFAULT</span></h3>
          <p>{{ formatAddress(address) }}</p>
        </div>
        <ng-template #editAddress>
          <div class="address-edit">
            <label
              >Title<input
                [value]="draftTitle()"
                (input)="draftTitle.set($any($event.target).value)"
            /></label>
            <label
              >Building / Street<input
                [value]="draftStreet()"
                (input)="draftStreet.set($any($event.target).value)"
            /></label>
            <label
              >Nearby / Landmark<input
                [value]="draftLandmark()"
                (input)="draftLandmark.set($any($event.target).value)"
            /></label>
            <label
              >City<input [value]="draftCity()" (input)="draftCity.set($any($event.target).value)"
            /></label>
            <label
              >State<input
                [value]="draftState()"
                (input)="draftState.set($any($event.target).value)"
            /></label>
            <label
              >Pincode<input
                [value]="draftPincode()"
                (input)="draftPincode.set($any($event.target).value)"
            /></label>
          </div>
        </ng-template>

        <div class="address-actions" *ngIf="editingId() !== address.id; else editActions">
          <button type="button" class="ghost small" (click)="startEdit(address)">Edit</button>
          <button
            type="button"
            class="ghost small"
            (click)="cart.setDefaultAddress(address.id)"
            *ngIf="!address.isDefault"
          >
            Set Default
          </button>
          <button
            *ngIf="!address.isDefault"
            type="button"
            class="ghost small danger"
            (click)="cart.deleteAddress(address.id)"
          >
            Delete
          </button>
        </div>

        <ng-template #editActions>
          <div class="address-actions">
            <button type="button" class="ghost small" (click)="save(address.id)">Save</button>
            <button type="button" class="ghost small" (click)="cancel()">Cancel</button>
          </div>
        </ng-template>
      </article>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class AddressesPageComponent {
  protected readonly cart = inject(CartService);

  protected readonly editingId = signal<string | null>(null);
  protected readonly draftTitle = signal('');
  protected readonly draftStreet = signal('');
  protected readonly draftLandmark = signal('');
  protected readonly draftCity = signal('');
  protected readonly draftState = signal('');
  protected readonly draftPincode = signal('');

  addAddress(): void {
    this.cart.addAddress({
      id: `addr-${Date.now()}`,
      title: 'New Address',
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      addressLine: 'Add your address details here',
    });
  }

  startEdit(address: Address): void {
    this.editingId.set(address.id);
    this.draftTitle.set(address.title);
    this.draftStreet.set(address.street ?? '');
    this.draftLandmark.set(address.landmark ?? '');
    this.draftCity.set(address.city ?? '');
    this.draftState.set(address.state ?? '');
    this.draftPincode.set(address.pincode ?? '');
  }

  save(id: string): void {
    const street = this.draftStreet().trim();
    const landmark = this.draftLandmark().trim();
    const city = this.draftCity().trim();
    const state = this.draftState().trim();
    const pincode = this.draftPincode().trim();
    const addressLine = this.formatAddress({
      id,
      title: this.draftTitle().trim() || 'Saved Address',
      street,
      landmark,
      city,
      state,
      pincode,
      addressLine: '',
    });

    this.cart.updateAddress(id, {
      title: this.draftTitle().trim() || 'Saved Address',
      street,
      landmark,
      city,
      state,
      pincode,
      addressLine,
    });
    this.cancel();
  }

  formatAddress(address: Address): string {
    return this.cart.formatAddress(address);
  }

  cancel(): void {
    this.editingId.set(null);
    this.draftTitle.set('');
    this.draftStreet.set('');
    this.draftLandmark.set('');
    this.draftCity.set('');
    this.draftState.set('');
    this.draftPincode.set('');
  }
}
