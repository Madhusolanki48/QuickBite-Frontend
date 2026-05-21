import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Address, CartItem, PaymentMethod } from '../core/app.models';
import { BackendCartSummaryResponse, cartToFrontend } from './backend-mappers';
import { SessionService } from './session.service';
import { environment } from '../../environments/environment';

const CART_ADDRESSES_KEY = 'quickbite.addresses';
const CART_SELECTED_ADDRESS_KEY = 'quickbite.selectedAddressId';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly itemsSignal = signal<CartItem[]>([]);
  private readonly addressesSignal = signal<Address[]>(this.readAddresses());
  private readonly selectedAddressIdSignal = signal<string>(this.readSelectedAddressId());
  private readonly paymentMethodSignal = signal<PaymentMethod>('UPI');
  private readonly promoCodeSignal = signal('FOOD10');
  private readonly noteSignal = signal('Please call on arrival.');

  readonly items = computed(() => this.itemsSignal());
  readonly addresses = computed(() => this.addressesSignal());
  readonly selectedAddress = computed(
    () =>
      this.addressesSignal().find((item) => item.id === this.selectedAddressIdSignal()) ??
      this.addressesSignal()[0],
  );
  readonly paymentMethod = computed(() => this.paymentMethodSignal());
  readonly promoCode = computed(() => this.promoCodeSignal());
  readonly note = computed(() => this.noteSignal());
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  readonly deliveryFee = computed(() => 49);
  readonly gst = computed(() => Math.round(this.subtotal() * 0.05));
  readonly discount = computed(() => (this.promoCodeSignal() ? 50 : 0));
  readonly total = computed(() =>
    Math.max(this.subtotal() + this.deliveryFee() + this.gst() - this.discount(), 0),
  );
  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((count, item) => count + item.quantity, 0),
  );

  constructor() {
    this.refreshFromBackend();
  }

  addItem(next: CartItem): void {
    const current = this.itemsSignal();
    const existing = current.find(
      (item) =>
        (item.backendMenuItemId &&
          item.backendMenuItemId === next.backendMenuItemId &&
          item.backendRestaurantId === next.backendRestaurantId) ||
        item.id === next.id
    );
    if (existing) {
      this.updateQuantityLocal(existing.id, existing.quantity + next.quantity, existing.quantity);
      return;
    }

    this.itemsSignal.set([...current, next]);
    this.persistLocalItems();
    this.addItemRemote(next);
  }

  removeItem(id: string): void {
    const item = this.itemsSignal().find((entry) => entry.id === id);
    this.itemsSignal.update((items) => items.filter((entry) => entry.id !== id));
    this.persistLocalItems();
    if (item?.backendId && this.currentCustomerId()) {
      this.http.delete(`${this.baseUrl}/cart/${this.currentCustomerId()}/items/${item.backendId}`).subscribe();
    }
  }

  increaseQuantity(id: string): void {
    const item = this.itemsSignal().find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    this.updateQuantityLocal(id, item.quantity + 1, item.quantity);
  }

  decreaseQuantity(id: string): void {
    const item = this.itemsSignal().find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    this.updateQuantityLocal(id, Math.max(item.quantity - 1, 1), item.quantity);
  }

  clear(): void {
    this.itemsSignal.set([]);
    this.persistLocalItems();
    const customerId = this.currentCustomerId();
    if (customerId) {
      this.http.delete(`${this.baseUrl}/cart/${customerId}`).subscribe();
    }
  }

  selectAddress(id: string): void {
    this.selectedAddressIdSignal.set(id);
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethodSignal.set(method);
  }

  setPromoCode(value: string): void {
    this.promoCodeSignal.set(value);
  }

  setNote(value: string): void {
    this.noteSignal.set(value);
  }

  addAddress(address: Address): void {
    this.addressesSignal.update((items) => [...items, address]);
    this.persistAddresses();
  }

  updateAddress(id: string, patch: Partial<Address>): void {
    this.addressesSignal.update((items) =>
      items.map((address) => (address.id === id ? { ...address, ...patch } : address)),
    );
    this.persistAddresses();
  }

  setDefaultAddress(id: string): void {
    this.addressesSignal.update((items) =>
      items.map((address) => ({ ...address, isDefault: address.id === id })),
    );
    this.selectedAddressIdSignal.set(id);
    this.persistAddresses();
    localStorage.setItem(CART_SELECTED_ADDRESS_KEY, id);
  }

  deleteAddress(id: string): void {
    this.addressesSignal.update((items) => items.filter((address) => address.id !== id));
    this.persistAddresses();
    if (this.selectedAddressIdSignal() === id) {
      const fallback = this.addressesSignal()[0]?.id ?? '';
      this.selectedAddressIdSignal.set(fallback);
      if (fallback) {
        localStorage.setItem(CART_SELECTED_ADDRESS_KEY, fallback);
      } else {
        localStorage.removeItem(CART_SELECTED_ADDRESS_KEY);
      }
    }
  }

  formatAddress(
    address?:
      | (Pick<Address, 'street' | 'landmark' | 'city' | 'state' | 'pincode'> & {
          addressLine?: string;
        })
      | null,
  ): string {
    if (!address) {
      return 'Address not provided';
    }
    const parts = [
      address.pincode,
      address.street,
      address.landmark,
      address.city,
      address.state,
    ].filter(Boolean);
    return parts.join(', ') || address.addressLine || 'Address not provided';
  }

  private refreshFromBackend(): void {
    const customerId = this.currentCustomerId();
    if (!customerId) {
      this.itemsSignal.set(this.readLocalItems());
      return;
    }

    this.http.get<BackendCartSummaryResponse>(`${this.baseUrl}/cart/${customerId}`).subscribe({
      next: (response) => {
        this.itemsSignal.set(response.items.map((item) => cartToFrontend(item)));
        this.persistLocalItems();
      },
      error: () => {
        this.itemsSignal.set(this.readLocalItems());
      },
    });
  }

  private addItemRemote(next: CartItem): void {
    const customerId = this.currentCustomerId();
    const backendRestaurantId = next.backendRestaurantId;
    const backendMenuItemId = next.backendMenuItemId;
    if (!customerId || !backendRestaurantId || !backendMenuItemId) {
      return;
    }

    this.http.post(`${this.baseUrl}/cart`, {
      customerId,
      restaurantId: backendRestaurantId,
      restaurantName: next.restaurantName,
      menuItemId: backendMenuItemId,
      itemName: next.name,
      unitPrice: next.price,
      quantity: next.quantity,
      imageUrl: next.imageUrl,
      category: next.description,
    }).subscribe({
      next: () => this.refreshFromBackend(),
    });
  }

  private updateQuantityLocal(id: string, quantity: number, previousQuantity: number): void {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
    this.persistLocalItems();
    const item = this.itemsSignal().find((entry) => entry.id === id);
    const customerId = this.currentCustomerId();
    if (item?.backendId && customerId) {
      const delta = quantity - previousQuantity;
      this.http.patch(`${this.baseUrl}/cart/${customerId}/items/${item.backendId}`, null, {
        params: { delta },
      }).subscribe({
        next: () => this.refreshFromBackend(),
      });
    }
  }

  private currentCustomerId(): number | null {
    return this.session.user()?.id ?? null;
  }

  private persistLocalItems(): void {
    localStorage.setItem('quickbite.cart.items', JSON.stringify(this.itemsSignal()));
  }

  private readLocalItems(): CartItem[] {
    const raw = localStorage.getItem('quickbite.cart.items');
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }

  private readAddresses(): Address[] {
    const raw = localStorage.getItem(CART_ADDRESSES_KEY);
    if (!raw) {
      return [
        this.createAddress({
          id: 'addr-1',
          title: 'Home',
          street: '15B, Green Park Extension',
          landmark: 'Near Chaumuhan Bus Stop',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110016',
          isDefault: true,
        }),
        this.createAddress({
          id: 'addr-2',
          title: 'Office',
          street: 'Tower B',
          landmark: 'Cyber City',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
        }),
      ];
    }

    try {
      const parsed = JSON.parse(raw) as Address[];
      return parsed.map((address) => this.createAddress(address));
    } catch {
      return [];
    }
  }

  private readSelectedAddressId(): string {
    return localStorage.getItem(CART_SELECTED_ADDRESS_KEY) ?? this.readAddresses()[0]?.id ?? '';
  }

  private createAddress(address: Partial<Address> & Pick<Address, 'id' | 'title'>): Address {
    const parsed = this.parseAddressLine(address.addressLine);
    const normalized = {
      street: address.street?.trim() || parsed.street,
      landmark: address.landmark?.trim() || parsed.landmark,
      city: address.city?.trim() || parsed.city,
      state: address.state?.trim() || parsed.state,
      pincode: address.pincode?.trim() || parsed.pincode,
    };
    return {
      ...address,
      ...normalized,
      addressLine: address.addressLine || this.formatAddress(normalized),
    };
  }

  private parseAddressLine(
    addressLine?: string,
  ): Pick<Address, 'street' | 'landmark' | 'city' | 'state' | 'pincode'> {
    if (!addressLine) {
      return { street: '', landmark: '', city: '', state: '', pincode: '' };
    }

    const cleaned = addressLine.replace(/,\s*India$/i, '').trim();
    const pincodeMatch = cleaned.match(/\b\d{6}\b/);
    const pincode = pincodeMatch?.[0] ?? '';
    const withoutPincode = cleaned
      .replace(/\s*-\s*\d{6}\b/, '')
      .replace(/\b\d{6}\b/, '')
      .trim();
    const parts = withoutPincode
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    const street = parts[0] ?? '';
    const landmark = parts[1] ?? '';
    const city = parts.length > 3 ? parts[parts.length - 2] : (parts[2] ?? '');
    const state = parts.length > 3 ? parts[parts.length - 1] : (parts[3] ?? '');

    return { street, landmark, city, state, pincode };
  }

  private persistAddresses(): void {
    localStorage.setItem(CART_ADDRESSES_KEY, JSON.stringify(this.addressesSignal()));
  }
}
