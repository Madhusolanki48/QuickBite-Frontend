import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { Category, MenuItem, Restaurant } from '../core/app.models';
import {
  BackendMenuItemResponse,
  BackendRestaurantResponse,
  cuisineTypeFromText,
  menuToFrontend,
  restaurantStatusToBackend,
  restaurantToFrontend,
  slugify,
} from './backend-mappers';
import { RealtimeSyncService } from './realtime-sync.service';
import { environment as appEnvironment } from '../../environments/environment';

const RESTAURANTS_KEY = 'quickbite.restaurants';
const MENU_ITEMS_KEY = 'quickbite.menuItems';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly sync = inject(RealtimeSyncService);
  private readonly baseUrl = appEnvironment.apiBaseUrl;
  private readonly assetBase = '/assets/images';
  private readonly assetVersion = 'v=20260429';

  private asset(path: string): string {
    return `${encodeURI(path)}?${this.assetVersion}`;
  }

  private readonly categories: Category[] = [
    { id: 'all', label: 'All', icon: '✨' },
    {
      id: 'burgers',
      label: 'Burgers',
      icon: '🍔',
      imageUrl: this.asset(`${this.assetBase}/categories/burger.jpg`),
    },
    {
      id: 'pizza',
      label: 'Pizza',
      icon: '🍕',
      imageUrl: this.asset(`${this.assetBase}/categories/pizza.png`),
    },
    {
      id: 'indian',
      label: 'Indian',
      icon: '🍛',
      imageUrl: this.asset(`${this.assetBase}/categories/indian thali.png`),
    },
    {
      id: 'mexican',
      label: 'Mexican',
      icon: '🌮',
      imageUrl: this.asset(`${this.assetBase}/categories/mexican.jpg`),
    },
    {
      id: 'sushi',
      label: 'Sushi',
      icon: '🍣',
      imageUrl: this.asset(`${this.assetBase}/categories/sushi.jpg`),
    },
    {
      id: 'chinese',
      label: 'Chinese',
      icon: '🥡',
      imageUrl: this.asset(`${this.assetBase}/categories/chinese.jpg`),
    },
  ];

  private readonly defaultRestaurants: Restaurant[] = [
    {
      id: 'burger-palace',
      name: 'Burger Palace',
      cuisine: 'American · Burgers',
      category: 'burgers',
      rating: 4.8,
      deliveryMinutes: '25–35',
      minOrder: 150,
      status: 'OPEN',
      heroEmoji: '🍔',
      description: 'Classic burgers, fries, and shakes.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/Burger palace.jpg`),
    },
    {
      id: 'pizza-hut-express',
      name: 'Pizza Hut Express',
      cuisine: 'Italian · Pizza',
      category: 'pizza',
      rating: 4.6,
      deliveryMinutes: '30–40',
      minOrder: 200,
      status: 'OPEN',
      heroEmoji: '🍕',
      description: 'Fast pizza, bread, and sides.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/Pizza Hut express.jpg`),
    },
    {
      id: 'sushi-zen',
      name: 'Sushi Zen',
      cuisine: 'Japanese · Sushi',
      category: 'sushi',
      rating: 4.9,
      deliveryMinutes: '40–50',
      minOrder: 300,
      status: 'CLOSED',
      heroEmoji: '🍣',
      description: 'Fresh sushi rolls and bowls.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/Sushi zen.jpg`),
    },
    {
      id: 'spice-garden',
      name: 'Spice Garden',
      cuisine: 'Indian · Curry',
      category: 'indian',
      rating: 4.7,
      deliveryMinutes: '30–45',
      minOrder: 180,
      status: 'OPEN',
      heroEmoji: '🍛',
      description: 'Comforting curries and breads.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/spice garden.jpg`),
    },
    {
      id: 'taco-fiesta',
      name: 'Taco Fiesta',
      cuisine: 'Mexican · Tacos',
      category: 'mexican',
      rating: 4.5,
      deliveryMinutes: '20–30',
      minOrder: 120,
      status: 'OPEN',
      heroEmoji: '🌮',
      description: 'Loaded tacos, burritos, and bowls.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/taco fiesta.jpg`),
    },
    {
      id: 'noodle-house',
      name: 'Noodle House',
      cuisine: 'Chinese · Noodles',
      category: 'chinese',
      rating: 4.4,
      deliveryMinutes: '25–35',
      minOrder: 160,
      status: 'OPEN',
      heroEmoji: '🥡',
      description: 'Hot noodle bowls and wok dishes.',
      imageUrl: this.asset(`${this.assetBase}/restaurants/noodles house.jpg`),
    },
  ];

  private readonly defaultMenuItems: MenuItem[] = [
    {
      id: 'burg-1',
      restaurantId: 'burger-palace',
      name: 'Classic Cheeseburger',
      description: 'Beef patty, cheddar, lettuce, tomato',
      price: 249,
      rating: 4.9,
      icon: '🍔',
      category: 'Burgers',
      imageUrl: this.asset(`${this.assetBase}/food-items/classic-cheeseburger.jpg`),
    },
    {
      id: 'burg-2',
      restaurantId: 'burger-palace',
      name: 'BBQ Bacon Burger',
      description: 'Crispy bacon, BBQ sauce, onion rings',
      price: 329,
      rating: 4.7,
      icon: '🥓',
      category: 'Burgers',
      imageUrl: this.asset(`${this.assetBase}/food-items/bbq-bacon-burger.png`),
    },
    {
      id: 'burg-3',
      restaurantId: 'burger-palace',
      name: 'Veggie Burger',
      description: 'Plant-based patty, avocado, sprouts',
      price: 219,
      rating: 4.5,
      icon: '🥑',
      category: 'Burgers',
      imageUrl: this.asset(`${this.assetBase}/food-items/veggie-burger.png`),
    },
    {
      id: 'burg-4',
      restaurantId: 'burger-palace',
      name: 'Loaded Fries',
      description: 'Cheese sauce, jalapeños, sour cream',
      price: 149,
      rating: 4.6,
      icon: '🍟',
      category: 'Sides',
      imageUrl: this.asset(`${this.assetBase}/food-items/loaded-fries.png`),
    },
    {
      id: 'burg-5',
      restaurantId: 'burger-palace',
      name: 'Chocolate Shake',
      description: 'Thick & creamy, 600ml',
      price: 179,
      rating: 4.8,
      icon: '🥤',
      category: 'Drinks',
      imageUrl: this.asset(`${this.assetBase}/food-items/chocolate-shake.png`),
    },
    {
      id: 'pizza-1',
      restaurantId: 'pizza-hut-express',
      name: 'Margherita Pizza',
      description: 'San Marzano tomatoes, fresh mozzarella',
      price: 299,
      rating: 4.8,
      icon: '🍕',
      category: 'Pizza',
      imageUrl: this.asset(`${this.assetBase}/food-items/margherita-pizza.jpg`),
    },
    {
      id: 'pizza-2',
      restaurantId: 'pizza-hut-express',
      name: 'Pepperoni Feast',
      description: 'Double pepperoni, mozzarella',
      price: 349,
      rating: 4.7,
      icon: '🍕',
      category: 'Pizza',
      imageUrl: this.asset(`${this.assetBase}/food-items/pepperoni-feast.jpg`),
    },
    {
      id: 'pizza-3',
      restaurantId: 'pizza-hut-express',
      name: 'Paneer Flame Fusion Pizza',
      description: 'Grilled paneer, spicy sauce, red onion',
      price: 379,
      rating: 4.6,
      icon: '🍕',
      category: 'Pizza',
      imageUrl: this.asset(`${this.assetBase}/food-items/paneer-flame-fusion pizza.png`),
    },
    {
      id: 'pizza-4',
      restaurantId: 'pizza-hut-express',
      name: 'Garlic Bread',
      description: 'Herb butter, parmesan',
      price: 99,
      rating: 4.5,
      icon: '🥖',
      category: 'Sides',
      imageUrl: this.asset(`${this.assetBase}/food-items/garlic-bread.jpg`),
    },
    {
      id: 'ind-1',
      restaurantId: 'spice-garden',
      name: 'Paneer Lababdar',
      description: 'Paneer in a rich tomato and cashew gravy',
      price: 289,
      rating: 4.9,
      icon: '🍛',
      category: 'Curries',
      imageUrl: this.asset(`${this.assetBase}/food-items/paneer-lababdar.jpg`),
    },
    {
      id: 'ind-2',
      restaurantId: 'spice-garden',
      name: 'Dal Makhani',
      description: 'Slow-cooked black lentils, butter, cream',
      price: 199,
      rating: 4.8,
      icon: '🫘',
      category: 'Curries',
      imageUrl: this.asset(`${this.assetBase}/food-items/daal-makhani.jpg`),
    },
    {
      id: 'ind-3',
      restaurantId: 'spice-garden',
      name: 'Paneer Tikka',
      description: 'Marinated cottage cheese, spices',
      price: 249,
      rating: 4.7,
      icon: '🧀',
      category: 'Starters',
      imageUrl: this.asset(`${this.assetBase}/food-items/paneer-tikka.jpg`),
    },
    {
      id: 'ind-4',
      restaurantId: 'spice-garden',
      name: 'Naan Basket',
      description: '4 pieces – butter, garlic, plain',
      price: 129,
      rating: 4.6,
      icon: '🫓',
      category: 'Breads',
      imageUrl: this.asset(`${this.assetBase}/food-items/naan-basket.jpg`),
    },
    {
      id: 'ind-5',
      restaurantId: 'spice-garden',
      name: 'Mango Lassi',
      description: 'Fresh mango, yogurt, cardamom',
      price: 89,
      rating: 4.9,
      icon: '🥭',
      category: 'Drinks',
      imageUrl: this.asset(`${this.assetBase}/food-items/mango-lassi.jpg`),
    },
    {
      id: 'mex-1',
      restaurantId: 'taco-fiesta',
      name: 'Nacho Cheese Melt',
      description: 'Grilled fillings, pico de gallo, lime',
      price: 229,
      rating: 4.7,
      icon: '🌮',
      category: 'Tacos',
      imageUrl: this.asset(`${this.assetBase}/food-items/nacho-cheese-melt.jpg`),
    },
    {
      id: 'mex-2',
      restaurantId: 'taco-fiesta',
      name: 'Onion Ring Crunch',
      description: 'Seasoned onions, rice, beans, salsa',
      price: 279,
      rating: 4.6,
      icon: '🌯',
      category: 'Burritos',
      imageUrl: this.asset(`${this.assetBase}/food-items/onion-ring-crunch.png`),
    },
    {
      id: 'mex-3',
      restaurantId: 'taco-fiesta',
      name: 'Crispy Fried Momos',
      description: 'Loaded with cheese, guac, jalapeños',
      price: 199,
      rating: 4.5,
      icon: '🥟',
      category: 'Sides',
      imageUrl: this.asset(`${this.assetBase}/food-items/crispy-fried-momos.jpg`),
    },
    {
      id: 'sushi-1',
      restaurantId: 'sushi-zen',
      name: 'Salmon Nigiri',
      description: 'Fresh salmon over seasoned sushi rice',
      price: 299,
      rating: 4.9,
      icon: '🍣',
      category: 'Nigiri',
      imageUrl: this.asset(`${this.assetBase}/food-items/Salmon Nigiri.png`),
    },
    {
      id: 'sushi-2',
      restaurantId: 'sushi-zen',
      name: 'Tempura Shrimp Roll',
      description: 'Crispy tempura shrimp with creamy sauce',
      price: 329,
      rating: 4.8,
      icon: '🍣',
      category: 'Rolls',
      imageUrl: this.asset(`${this.assetBase}/food-items/Tempura Shrimp Rol.jpg`),
    },
    {
      id: 'sushi-3',
      restaurantId: 'sushi-zen',
      name: 'Avocado Veg Roll',
      description: 'Avocado, cucumber, and sushi rice',
      price: 249,
      rating: 4.7,
      icon: '🍣',
      category: 'Rolls',
      imageUrl: this.asset(`${this.assetBase}/food-items/Avocado Veg Roll.png`),
    },
    {
      id: 'sushi-4',
      restaurantId: 'sushi-zen',
      name: 'California Roll',
      description: 'Crab-style filling, avocado, and sesame',
      price: 279,
      rating: 4.8,
      icon: '🍣',
      category: 'Rolls',
      imageUrl: this.asset(`${this.assetBase}/food-items/California Roll.jpg`),
    },
    {
      id: 'sushi-5',
      restaurantId: 'sushi-zen',
      name: 'Sushi Platter',
      description: 'Chef selection of nigiri and rolls',
      price: 599,
      rating: 5.0,
      icon: '🍱',
      category: 'Platters',
      imageUrl: this.asset(`${this.assetBase}/food-items/sushi platter.jpg`),
    },
    {
      id: 'chi-1',
      restaurantId: 'noodle-house',
      name: 'Dragon Fire Noodles',
      description: 'Fiery noodles with peppers and spring onion',
      price: 259,
      rating: 4.8,
      icon: '🍜',
      category: 'Noodles',
      imageUrl: this.asset(`${this.assetBase}/food-items/dragon-fire noodles.jpg`),
    },
    {
      id: 'chi-2',
      restaurantId: 'noodle-house',
      name: 'Szechuan Spice Fusion Noodles',
      description: 'Bold Szechuan sauce, garlic, and veggies',
      price: 279,
      rating: 4.7,
      icon: '🍜',
      category: 'Noodles',
      imageUrl: this.asset(`${this.assetBase}/food-items/szechuan-spice-fusion noodles.png`),
    },
    {
      id: 'chi-3',
      restaurantId: 'noodle-house',
      name: 'Tonki Hakka Noodles',
      description: 'Street-style Hakka noodles with crunchy veg',
      price: 239,
      rating: 4.6,
      icon: '🍜',
      category: 'Wok',
      imageUrl: this.asset(`${this.assetBase}/food-items/tonki-hakka noodles.png`),
    },
    {
      id: 'chi-4',
      restaurantId: 'noodle-house',
      name: 'Wok Toss Noodles',
      description: 'Classic wok-tossed noodles with soy and greens',
      price: 229,
      rating: 4.5,
      icon: '🍜',
      category: 'Wok',
      imageUrl: this.asset(`${this.assetBase}/food-items/wok-toss-noodles.png`),
    },
    {
      id: 'chi-5',
      restaurantId: 'noodle-house',
      name: 'Veg Hakka Noodles',
      description: 'Light noodles with mixed vegetables and soy',
      price: 219,
      rating: 4.4,
      icon: '🍜',
      category: 'Noodles',
      imageUrl: this.asset(`${this.assetBase}/food-items/veg-hukka-noodles.png`),
    },
  ];

  readonly categoriesSignal = signal(this.categories);
  readonly restaurantsSignal = signal(this.readRestaurants());
  readonly menuItemsSignal = signal(this.readMenuItems());

  constructor() {
    this.sync.on('catalog', () => {
      this.restaurantsSignal.set(this.readRestaurants());
      this.menuItemsSignal.set(this.readMenuItems());
    });
    this.refreshFromBackend();
  }

  private refreshFromBackend(): void {
    this.http.get<BackendRestaurantResponse[]>(`${this.baseUrl}/restaurants`).subscribe({
      next: (restaurants) => {
        const mappedRestaurants = restaurants.map((restaurant) => restaurantToFrontend(restaurant));
        const mappedMenus = restaurants.flatMap((restaurant) =>
          (restaurant.menuItems ?? []).map((item) =>
            menuToFrontend(
              slugify(restaurant.name),
              restaurant.name,
              restaurant.id,
              item as BackendMenuItemResponse,
            ),
          ),
        );

        this.restaurantsSignal.set(mappedRestaurants.length ? mappedRestaurants : this.readRestaurants());
        this.menuItemsSignal.set(mappedMenus.length ? mappedMenus : this.readMenuItems());
      },
      error: () => {
        this.restaurantsSignal.set(this.readRestaurants());
        this.menuItemsSignal.set(this.readMenuItems());
      },
    });
  }

  categoryList() {
    return this.categoriesSignal();
  }

  restaurantList() {
    return this.restaurantsSignal();
  }

  restaurantById(id: string) {
    return this.restaurantsSignal().find((restaurant) => restaurant.id === id);
  }

  menuForRestaurant(id: string) {
    return this.menuItemsSignal().filter((item) => item.restaurantId === id);
  }

  updateRestaurantAvailability(id: string, status: 'OPEN' | 'CLOSED'): void {
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === id);
    if (!restaurant?.backendId) {
      this.restaurantsSignal.update((restaurants) =>
        restaurants.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      return;
    }

    this.http
      .put<BackendRestaurantResponse>(`${this.baseUrl}/restaurants/${restaurant.backendId}`, {
        status: restaurantStatusToBackend(status),
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.restaurantsSignal.update((restaurants) =>
            restaurants.map((item) => (item.id === id ? { ...item, status } : item)),
          ),
      });
  }

  updateRestaurant(id: string, patch: Partial<Restaurant>): void {
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === id);
    if (!restaurant?.backendId) {
      this.restaurantsSignal.update((restaurants) =>
        restaurants.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item)),
      );
      return;
    }

    this.http
      .put<BackendRestaurantResponse>(`${this.baseUrl}/restaurants/${restaurant.backendId}`, {
        name: patch.name ?? restaurant.name,
        address: patch.description ?? restaurant.description,
        rating: patch.rating ?? restaurant.rating,
        cuisineType: cuisineTypeFromText(patch.category ?? restaurant.cuisine),
        status: patch.status ? restaurantStatusToBackend(patch.status) : undefined,
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.restaurantsSignal.update((restaurants) =>
            restaurants.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item)),
          ),
      });
  }

  addRestaurant(restaurant: Restaurant): void {
    this.http
      .post<BackendRestaurantResponse>(`${this.baseUrl}/restaurants`, {
        name: restaurant.name,
        address: restaurant.description,
        phoneNumber: '0000000000',
        email: `${restaurant.id}@quickbite.dev`,
        cuisineType: cuisineTypeFromText(restaurant.cuisine ?? restaurant.category),
        rating: restaurant.rating,
        ownerName: '',
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.restaurantsSignal.update((restaurants) => [
            restaurant,
            ...restaurants.filter((entry) => entry.id !== restaurant.id),
          ]),
      });
  }

  addMenuItem(item: MenuItem): void {
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === item.restaurantId);
    if (!restaurant?.backendId) {
      this.menuItemsSignal.update((items) => [
        item,
        ...items.filter((entry) => entry.id !== item.id),
      ]);
      return;
    }

    this.http
      .post(`${this.baseUrl}/restaurants/${restaurant.backendId}/menu-items`, {
        name: item.name,
        description: item.description,
        price: item.price,
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.menuItemsSignal.update((items) => [
            item,
            ...items.filter((entry) => entry.id !== item.id),
          ]),
      });
  }

  updateMenuItem(id: string, patch: Partial<MenuItem>): void {
    const item = this.menuItemsSignal().find((entry) => entry.id === id);
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === item?.restaurantId);
    if (!item?.backendId || !restaurant?.backendId) {
      this.menuItemsSignal.update((items) =>
        items.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry)),
      );
      return;
    }

    this.http
      .put(`${this.baseUrl}/restaurants/${restaurant.backendId}/menu-items/${item.backendId}`, {
        name: patch.name ?? item.name,
        description: patch.description ?? item.description,
        price: patch.price ?? item.price,
        availability: patch.available === false ? 'UNAVAILABLE' : 'AVAILABLE',
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.menuItemsSignal.update((items) =>
            items.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry)),
          ),
      });
  }

  deleteMenuItem(id: string): void {
    const item = this.menuItemsSignal().find((entry) => entry.id === id);
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === item?.restaurantId);
    if (!item?.backendId || !restaurant?.backendId) {
      this.menuItemsSignal.update((items) => items.filter((entry) => entry.id !== id));
      return;
    }

    this.http
      .delete(`${this.baseUrl}/restaurants/${restaurant.backendId}/menu-items/${item.backendId}`)
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () => this.menuItemsSignal.update((items) => items.filter((entry) => entry.id !== id)),
      });
  }

  toggleMenuItemAvailability(id: string): void {
    const item = this.menuItemsSignal().find((entry) => entry.id === id);
    const nextAvailable = item?.available === false;
    this.setMenuItemAvailability(id, nextAvailable);
  }

  setMenuItemAvailability(id: string, available: boolean): void {
    const item = this.menuItemsSignal().find((entry) => entry.id === id);
    const restaurant = this.restaurantsSignal().find((entry) => entry.id === item?.restaurantId);
    if (!item?.backendId || !restaurant?.backendId) {
      this.menuItemsSignal.update((items) =>
        items.map((entry) => (entry.id === id ? { ...entry, available } : entry)),
      );
      return;
    }

    this.http
      .put(`${this.baseUrl}/restaurants/${restaurant.backendId}/menu-items/${item.backendId}`, {
        availability: available ? 'AVAILABLE' : 'UNAVAILABLE',
      })
      .subscribe({
        next: () => this.refreshFromBackend(),
        error: () =>
          this.menuItemsSignal.update((items) =>
            items.map((entry) => (entry.id === id ? { ...entry, available } : entry)),
          ),
      });
  }

  categoryLabel(id: string) {
    return this.categories.find((category) => category.id === id)?.label ?? 'All';
  }

  private readRestaurants(): Restaurant[] {
    const raw = localStorage.getItem(RESTAURANTS_KEY);
    if (!raw) {
      return this.defaultRestaurants.map((restaurant) => ({ ...restaurant }));
    }

    try {
      const saved = JSON.parse(raw) as Partial<Restaurant>[];
      if (!Array.isArray(saved)) {
        return this.defaultRestaurants.map((restaurant) => ({ ...restaurant }));
      }

      const merged = this.defaultRestaurants.map((restaurant) => {
        const patch = saved.find((entry) => entry.id === restaurant.id);
        return patch ? { ...restaurant, ...patch, id: restaurant.id } : { ...restaurant };
      });
      const extras: Restaurant[] = saved
        .filter(
          (entry) =>
            !!entry.id && !this.defaultRestaurants.some((restaurant) => restaurant.id === entry.id),
        )
        .map((entry, index) => ({
          id: entry.id ?? `restaurant-${index + 1}`,
          name: entry.name?.trim() || `Restaurant ${index + 1}`,
          cuisine: entry.cuisine?.trim() || 'Custom',
          category: entry.category?.trim().toLowerCase() || 'burgers',
          rating: Number.isFinite(entry.rating as number) ? (entry.rating as number) : 4.5,
          deliveryMinutes: entry.deliveryMinutes?.trim() || '25-35',
          minOrder: Number.isFinite(entry.minOrder as number) ? (entry.minOrder as number) : 150,
          status: (entry.status === 'CLOSED' ? 'CLOSED' : 'OPEN') as Restaurant['status'],
          heroEmoji: entry.heroEmoji?.trim() || '🍽️',
          description: entry.description?.trim() || 'Fresh food, fast delivery',
          imageUrl: entry.imageUrl,
          latitude: typeof entry.latitude === 'number' ? entry.latitude : undefined,
          longitude: typeof entry.longitude === 'number' ? entry.longitude : undefined,
        }));
      return [...extras, ...merged];
    } catch {
      return this.defaultRestaurants.map((restaurant) => ({ ...restaurant }));
    }
  }

  private readMenuItems(): MenuItem[] {
    const raw = localStorage.getItem(MENU_ITEMS_KEY);
    if (!raw) {
      return this.defaultMenuItems.map((item) => ({ ...item }));
    }

    try {
      const saved = JSON.parse(raw) as Partial<MenuItem>[];
      if (!Array.isArray(saved)) {
        return this.defaultMenuItems.map((item) => ({ ...item }));
      }

      const merged = this.defaultMenuItems.map((item) => {
        const patch = saved.find((entry) => entry.id === item.id);
        return patch ? { ...item, ...patch, id: item.id } : { ...item };
      });
      const extras: MenuItem[] = saved
        .filter(
          (entry) => !!entry.id && !this.defaultMenuItems.some((item) => item.id === entry.id),
        )
        .map((entry, index) => ({
          id: entry.id ?? `menu-${index + 1}`,
          restaurantId: entry.restaurantId?.trim() || 'burger-palace',
          name: entry.name?.trim() || `Menu Item ${index + 1}`,
          description: entry.description?.trim() || 'Chef special',
          price: Number.isFinite(entry.price as number) ? (entry.price as number) : 0,
          rating: Number.isFinite(entry.rating as number) ? (entry.rating as number) : 4.5,
          icon: entry.icon?.trim() || '🍽️',
          category: entry.category?.trim() || 'General',
          available: entry.available !== false,
          imageUrl: entry.imageUrl,
          discountPercent: Number.isFinite(entry.discountPercent as number)
            ? (entry.discountPercent as number)
            : undefined,
          prepTimeMinutes: Number.isFinite(entry.prepTimeMinutes as number)
            ? (entry.prepTimeMinutes as number)
            : undefined,
          ingredients: Array.isArray(entry.ingredients) ? entry.ingredients : undefined,
          addons: Array.isArray(entry.addons) ? entry.addons : undefined,
          variants: Array.isArray(entry.variants) ? entry.variants : undefined,
          flags: Array.isArray(entry.flags) ? entry.flags : undefined,
        }));
      return [...extras, ...merged];
    } catch {
      return this.defaultMenuItems.map((item) => ({ ...item }));
    }
  }

  private persistRestaurants(): void {
    localStorage.setItem(RESTAURANTS_KEY, JSON.stringify(this.restaurantsSignal()));
    this.sync.publish('catalog');
  }

  private persistMenuItems(): void {
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(this.menuItemsSignal()));
    this.sync.publish('catalog');
  }
}
