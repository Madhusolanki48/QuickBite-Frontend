import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { OwnerMenuItem } from '../../core/app.models';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';

type MenuDraft = {
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  available: boolean;
  imageUrl: string;
  discountPercent: number;
  prepTimeMinutes: number;
  ingredientsText: string;
  addonsText: string;
  variantsText: string;
};

const blankDraft = (): MenuDraft => ({
  name: '',
  description: '',
  price: 0,
  category: 'Burgers',
  emoji: '🍔',
  available: true,
  imageUrl: '',
  discountPercent: 0,
  prepTimeMinutes: 20,
  ingredientsText: '',
  addonsText: '',
  variantsText: '',
});

@Component({
  selector: 'app-menu-manager-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Menu Manager</h1>
        <p>Editing menu for {{ dashboard.restaurantProfile().name }}</p>
      </div>
      <div class="owner-toolbar">
        <button class="ghost-btn" type="button" (click)="clearFilters()">Reset Filters</button>
        <button class="action-btn primary" type="button" (click)="startAdd()">+ Add Item</button>
      </div>
    </section>

    <section
      *ngIf="editorMode() !== 'idle'"
      class="card panel menu-editor"
      style="margin-bottom:1rem;"
    >
      <div class="section-head">
        <div>
          <h2>{{ editorMode() === 'edit' ? 'Edit Menu Item' : 'Add Menu Item' }}</h2>
          <p>Add pricing, category, discounts, prep time, and menu details.</p>
        </div>
        <div class="section-actions">
          <button class="ghost-btn" type="button" (click)="cancelEditor()">Cancel</button>
          <button class="action-btn primary" type="button" (click)="save()">
            {{ editorMode() === 'edit' ? 'Save Changes' : 'Add Item' }}
          </button>
        </div>
      </div>

      <div class="form-grid restaurant-form">
        <label
          >Item Name<input
            [value]="draft().name"
            (input)="patch('name', $any($event.target).value)"
        /></label>
        <label
          >Category
          <select
            [value]="draft().category"
            (change)="patch('category', $any($event.target).value)"
          >
            <option *ngFor="let category of categories()" [value]="category">{{ category }}</option>
          </select>
        </label>
        <label
          >Price<input
            type="number"
            [value]="draft().price"
            (input)="patchNumber('price', $any($event.target).value)"
        /></label>
        <label
          >Discount %<input
            type="number"
            min="0"
            max="90"
            [value]="draft().discountPercent"
            (input)="patchNumber('discountPercent', $any($event.target).value)"
        /></label>
        <label
          >Prep Time (mins)<input
            type="number"
            min="1"
            [value]="draft().prepTimeMinutes"
            (input)="patchNumber('prepTimeMinutes', $any($event.target).value)"
        /></label>
        <label
          >Emoji<input [value]="draft().emoji" (input)="patch('emoji', $any($event.target).value)"
        /></label>
        <label class="full"
          >Description<textarea
            rows="3"
            [value]="draft().description"
            (input)="patch('description', $any($event.target).value)"
          ></textarea>
        </label>
        <label class="full"
          >Ingredients<textarea
            rows="2"
            [value]="draft().ingredientsText"
            (input)="patch('ingredientsText', $any($event.target).value)"
            placeholder="Cheddar, tomato, lettuce"
          ></textarea>
        </label>
        <label class="full"
          >Add-ons<textarea
            rows="2"
            [value]="draft().addonsText"
            (input)="patch('addonsText', $any($event.target).value)"
            placeholder="Cheese +30, Coke +50"
          ></textarea>
        </label>
        <label class="full"
          >Variants<textarea
            rows="2"
            [value]="draft().variantsText"
            (input)="patch('variantsText', $any($event.target).value)"
            placeholder="Small +0, Medium +40, Large +80"
          ></textarea>
        </label>
        <label
          >Available
          <select
            [value]="draft().available ? 'true' : 'false'"
            (change)="patchBoolean($any($event.target).value)"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label class="full"
          >Item Image<input type="file" accept="image/*" (change)="uploadImage($event)"
        /></label>
        <div class="full media-preview" *ngIf="draft().imageUrl">
          <img [src]="draft().imageUrl" [alt]="draft().name || 'Menu item preview'" />
        </div>
      </div>
    </section>

    <section class="menu-toolbar card section-card">
      <div class="menu-toolbar__row">
        <input
          class="search-input"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
          placeholder="Search menu items"
        />
        <select
          class="search-input"
          [value]="selectedCategory()"
          (change)="selectedCategory.set($any($event.target).value)"
        >
          <option value="all">All categories</option>
          <option *ngFor="let category of categories()" [value]="category">{{ category }}</option>
        </select>
        <select
          class="search-input"
          [value]="availabilityFilter()"
          (change)="availabilityFilter.set($any($event.target).value)"
        >
          <option value="all">All items</option>
          <option value="available">Available only</option>
          <option value="hidden">Hidden only</option>
        </select>
      </div>
      <div class="menu-toolbar__row">
        <label class="menu-toolbar__bulk">
          <span>Change price</span>
          <input
            type="number"
            [value]="bulkPrice()"
            (input)="setBulkPrice($any($event.target).value)"
          />
        </label>
        <button
          class="ghost-btn"
          type="button"
          [disabled]="selectedIds().length === 0"
          (click)="markSelectedUnavailable()"
        >
          Mark unavailable
        </button>
        <button
          class="ghost-btn"
          type="button"
          [disabled]="selectedIds().length === 0"
          (click)="markSelectedAvailable()"
        >
          Mark available
        </button>
        <button
          class="ghost-btn danger"
          type="button"
          [disabled]="selectedIds().length === 0"
          (click)="deleteSelected()"
        >
          Delete selected
        </button>
        <button
          class="action-btn primary"
          type="button"
          [disabled]="selectedIds().length === 0"
          (click)="applyBulkPrice()"
        >
          Apply price
        </button>
      </div>
      <p class="save-note">{{ selectedIds().length }} item(s) selected</p>
    </section>

    <p *ngIf="notice()" class="save-note">{{ notice() }}</p>

    <section class="menu-grid">
      <article
        class="card menu-card"
        *ngFor="let item of filteredItems()"
        [ngClass]="priorityClass(item)"
        (click)="toggleDetails(item.id)"
      >
        <div class="menu-card__visual">
          <img
            *ngIf="item.imageUrl && !imageError(item.id); else ownerItemEmoji"
            [src]="item.imageUrl"
            [alt]="item.name"
            (error)="markImageError(item.id)"
          />
          <ng-template #ownerItemEmoji>{{ item.emoji }}</ng-template>
        </div>
        <div class="menu-card__body">
          <div class="menu-card__head">
            <label class="menu-select" (click)="$event.stopPropagation()">
              <input
                type="checkbox"
                [checked]="isSelected(item.id)"
                (change)="toggleSelected(item.id)"
              />
            </label>
            <div class="menu-badges">
              <span class="status-chip status-new">{{ item.category }}</span>
              <span class="status-chip status-ready" *ngIf="item.available">Available</span>
              <span class="status-chip status-danger" *ngIf="!item.available">Hidden</span>
            </div>
          </div>
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
          <div class="menu-card__footer">
            <strong>
              <span *ngIf="item.discountPercent && item.discountPercent > 0" class="price-old"
                >Rs {{ item.price }}</span
              >
              Rs {{ finalPrice(item) }}
            </strong>
            <div class="row-actions">
              <button
                class="ghost-btn"
                type="button"
                (click)="edit(item); $event.stopPropagation()"
              >
                Edit
              </button>
              <button
                class="ghost-btn"
                type="button"
                (click)="
                  dashboard.setAvailability(item.id, !item.available); $event.stopPropagation()
                "
              >
                {{ item.available ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <div class="owner-toolbar" style="margin-top:0.9rem;">
            <span>Available</span>
            <button
              class="small-switch"
              type="button"
              [class.off]="!item.available"
              (click)="
                dashboard.setAvailability(item.id, !item.available); $event.stopPropagation()
              "
            ></button>
          </div>
          <div class="menu-card__details" *ngIf="isExpanded(item.id)">
            <div class="detail-pills">
              <span>Prep: {{ item.prepTimeMinutes || 20 }} mins</span>
              <span *ngIf="item.discountPercent">Offer: {{ item.discountPercent }}%</span>
              <span *ngIf="item.flags?.length">{{ (item.flags || []).join(' • ') }}</span>
            </div>
            <div class="detail-block" *ngIf="item.ingredients?.length">
              <strong>Ingredients</strong>
              <p>{{ (item.ingredients || []).join(', ') }}</p>
            </div>
            <div class="detail-block" *ngIf="item.addons?.length">
              <strong>Add-ons</strong>
              <p *ngFor="let addon of item.addons">{{ addon.name }} +Rs {{ addon.price }}</p>
            </div>
            <div class="detail-block" *ngIf="item.variants?.length">
              <strong>Variants</strong>
              <p *ngFor="let variant of item.variants">
                {{ variant.label }} +Rs {{ variant.price }}
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="card section-card empty-state" *ngIf="!filteredItems().length">
      <h2>No items match your filters</h2>
      <p>Try a different category, search term, or availability filter.</p>
    </section>
  `,
  styleUrl: './owner-pages.scss',
})
export class MenuManagerPageComponent {
  protected readonly dashboard = inject(OwnerDashboardService);
  protected readonly editorMode = signal<'idle' | 'create' | 'edit'>('idle');
  protected readonly editingId = signal('');
  protected readonly draft = signal<MenuDraft>(blankDraft());
  protected readonly notice = signal('');
  protected readonly imageErrors = signal<Record<string, boolean>>({});
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly selectedCategory = signal('all');
  protected readonly availabilityFilter = signal('all');
  protected readonly searchTerm = signal('');
  protected readonly bulkPrice = signal(0);
  protected readonly expandedId = signal('');

  readonly categories = computed(() =>
    Array.from(new Set(this.dashboard.menuItems().map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.dashboard.menuItems().filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      const matchesCategory =
        this.selectedCategory() === 'all' || item.category === this.selectedCategory();
      const matchesAvailability =
        this.availabilityFilter() === 'all'
          ? true
          : this.availabilityFilter() === 'available'
            ? item.available
            : !item.available;
      return matchesSearch && matchesCategory && matchesAvailability;
    });
  });

  startAdd(): void {
    this.editorMode.set('create');
    this.editingId.set('');
    this.draft.set(blankDraft());
    this.notice.set('');
  }

  cancelEditor(): void {
    this.editorMode.set('idle');
    this.editingId.set('');
    this.draft.set(blankDraft());
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
    this.availabilityFilter.set('all');
  }

  patch(
    field: keyof Omit<MenuDraft, 'price' | 'available' | 'discountPercent' | 'prepTimeMinutes'>,
    value: string,
  ): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  patchNumber(field: 'price' | 'discountPercent' | 'prepTimeMinutes', value: string): void {
    const parsed = Number(value);
    this.draft.update((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : current[field],
    }));
  }

  patchBoolean(value: string): void {
    this.draft.update((current) => ({ ...current, available: value === 'true' }));
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.draft.update((current) => ({ ...current, imageUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    const current = this.draft();
    if (!current.name.trim()) {
      return;
    }

    const payload = {
      name: current.name.trim(),
      description: current.description.trim(),
      price: current.price,
      category: current.category.trim() || 'General',
      emoji: current.emoji.trim() || '🍽️',
      available: current.available,
      imageUrl: current.imageUrl || undefined,
      discountPercent: Math.max(0, Math.min(90, current.discountPercent || 0)) || undefined,
      prepTimeMinutes: Math.max(1, current.prepTimeMinutes || 20),
      ingredients: this.splitList(current.ingredientsText),
      addons: this.splitAddonList(current.addonsText),
      variants: this.splitVariantList(current.variantsText),
      flags: this.buildFlags(current),
    };

    if (this.editorMode() === 'edit' && this.editingId()) {
      this.dashboard.updateMenuItem(this.editingId(), payload);
    } else {
      this.dashboard.addMenuItem(payload);
    }

    this.notice.set('Menu item saved.');
    this.cancelEditor();
    window.setTimeout(() => this.notice.set(''), 1800);
  }

  edit(item: OwnerMenuItem): void {
    this.editorMode.set('edit');
    this.editingId.set(item.id);
    this.expandedId.set(item.id);
    this.draft.set({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      emoji: item.emoji,
      available: item.available !== false,
      imageUrl: item.imageUrl ?? '',
      discountPercent: item.discountPercent ?? 0,
      prepTimeMinutes: item.prepTimeMinutes ?? 20,
      ingredientsText: item.ingredients?.join(', ') ?? '',
      addonsText: item.addons?.map((addon) => `${addon.name} +${addon.price}`).join(', ') ?? '',
      variantsText:
        item.variants?.map((variant) => `${variant.label} +${variant.price}`).join(', ') ?? '',
    });
    this.notice.set('');
  }

  toggleDetails(id: string): void {
    this.expandedId.set(this.expandedId() === id ? '' : id);
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  priorityClass(item: OwnerMenuItem): string {
    if (item.flags?.includes('Low Selling')) {
      return 'priority-late';
    }
    if (item.discountPercent && item.discountPercent > 0) {
      return 'priority-new';
    }
    return '';
  }

  finalPrice(item: OwnerMenuItem): number {
    if (!item.discountPercent) {
      return item.price;
    }
    return Math.max(Math.round(item.price - (item.price * item.discountPercent) / 100), 0);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelected(id: string): void {
    this.selectedIds.update((state) =>
      state.includes(id) ? state.filter((entry) => entry !== id) : [...state, id],
    );
  }

  setBulkPrice(value: string): void {
    const parsed = Number(value);
    this.bulkPrice.set(Number.isFinite(parsed) ? parsed : 0);
  }

  markSelectedUnavailable(): void {
    this.selectedIds().forEach((id) => this.dashboard.setAvailability(id, false));
    this.notice.set('Selected items marked unavailable.');
  }

  markSelectedAvailable(): void {
    this.selectedIds().forEach((id) => this.dashboard.setAvailability(id, true));
    this.notice.set('Selected items marked available.');
  }

  applyBulkPrice(): void {
    const price = this.bulkPrice();
    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    this.selectedIds().forEach((id) => {
      const item = this.dashboard.menuItems().find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      this.dashboard.updateMenuItem(id, { price });
    });
    this.notice.set(`Updated ${this.selectedIds().length} item(s).`);
  }

  deleteSelected(): void {
    this.selectedIds().forEach((id) => this.dashboard.deleteMenuItem(id));
    this.selectedIds.set([]);
    this.notice.set('Selected items deleted.');
  }

  markImageError(id: string): void {
    this.imageErrors.update((state) => ({ ...state, [id]: true }));
  }

  imageError(id: string): boolean {
    return this.imageErrors()[id] ?? false;
  }

  private splitList(value: string): string[] | undefined {
    const items = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  private splitAddonList(value: string): Array<{ name: string; price: number }> | undefined {
    const items = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, rawPrice] = entry.split('+').map((part) => part.trim());
        return { name, price: Number(rawPrice) || 0 };
      })
      .filter((entry) => !!entry.name);
    return items.length ? items : undefined;
  }

  private splitVariantList(value: string): Array<{ label: string; price: number }> | undefined {
    const items = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [label, rawPrice] = entry.split('+').map((part) => part.trim());
        return { label, price: Number(rawPrice) || 0 };
      })
      .filter((entry) => !!entry.label);
    return items.length ? items : undefined;
  }

  private buildFlags(
    current: MenuDraft,
  ): Array<'Bestseller' | 'Top Rated' | 'Low Selling'> | undefined {
    const flags: Array<'Bestseller' | 'Top Rated' | 'Low Selling'> = [];
    if (current.discountPercent >= 20) {
      flags.push('Bestseller');
    }
    if (current.price >= 400) {
      flags.push('Top Rated');
    }
    if (!current.available) {
      flags.push('Low Selling');
    }
    return flags.length ? flags : undefined;
  }
}
