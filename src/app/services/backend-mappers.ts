import { CartItem, MenuItem, Order, PaymentMethod, Restaurant } from '../core/app.models';

export interface BackendRestaurantResponse {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  cuisineType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  rating: number;
  ownerId?: number | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  menuItems?: BackendMenuItemResponse[];
}

export interface BackendMenuItemResponse {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
}

export interface BackendOrderResponse {
  id: number;
  customerId: number;
  restaurantId: number;
  customerEmail: string;
  totalAmount: number;
  orderStatus: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  paymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  paymentMethod?: string | null;
  items: Array<{
    id: number;
    menuItemId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface BackendCartItemResponse {
  id: number;
  customerId: number;
  restaurantId: number;
  restaurantName: string;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
  category?: string | null;
  createdAt: string;
}

export interface BackendCartSummaryResponse {
  items: BackendCartItemResponse[];
  subtotal: number;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleize(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function restaurantStatusFromBackend(status?: string): 'OPEN' | 'CLOSED' {
  return status === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

export function restaurantStatusToBackend(status: 'OPEN' | 'CLOSED'): 'ACTIVE' | 'CLOSED' {
  return status === 'OPEN' ? 'ACTIVE' : 'CLOSED';
}

export function orderStatusFromBackend(
  status?: BackendOrderResponse['orderStatus'],
): Order['status'] {
  switch (status) {
    case 'CREATED':
      return 'PLACED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PREPARING':
      return 'READY';
    case 'OUT_FOR_DELIVERY':
      return 'ON_THE_WAY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
    default:
      return 'CANCELLED';
  }
}

export function orderStatusToBackend(status: Order['status']): BackendOrderResponse['orderStatus'] {
  switch (status) {
    case 'PLACED':
      return 'CREATED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PREPARING':
    case 'READY':
      return 'PREPARING';
    case 'ON_THE_WAY':
      return 'OUT_FOR_DELIVERY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
    default:
      return 'CANCELLED';
  }
}

export function paymentMethodToBackend(
  method: PaymentMethod,
): 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH_ON_DELIVERY' {
  switch (method) {
    case 'COD':
      return 'CASH_ON_DELIVERY';
    case 'UPI':
    case 'CARD':
    case 'NETBANKING':
    case 'WALLET':
    default:
      return method;
  }
}

export function cuisineTypeFromText(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes('indian')) return 'INDIAN';
  if (normalized.includes('chinese') || normalized.includes('noodle')) return 'CHINESE';
  if (normalized.includes('pizza') || normalized.includes('italian')) return 'ITALIAN';
  if (normalized.includes('burger') || normalized.includes('american') || normalized.includes('fast')) return 'AMERICAN';
  if (normalized.includes('taco') || normalized.includes('mexican')) return 'CONTINENTAL';
  return 'OTHER';
}

export function restaurantImageForSlug(slug: string): string | undefined {
  const map: Record<string, string> = {
    'burger-palace': '/assets/images/restaurants/burger-palace.jpg',
    'pizza-hut-express': '/assets/images/restaurants/pizza-hut.jpg',
    'sushi-zen': '/assets/images/restaurants/sushi-zen.png',
    'spice-garden': '/assets/images/restaurants/spice-kitchen.jpg',
    'urban-cafe': '/assets/images/restaurants/urban-cafe.jpg',
    'green-bowl': '/assets/images/restaurants/green-bowl.jpg',
    'sweet-heaven': '/assets/images/restaurants/sweet-heaven.jpg',
    'taco-fiesta': '/assets/images/restaurants/street-flavors.jpg',
    'noodle-house': '/assets/images/restaurants/dragon-wok.jpg',
  };
  return map[slug];
}

export function menuImageForSlug(slug: string): string | undefined {
  const map: Record<string, string> = {
    'classic-cheeseburger': '/assets/images/food-items/classic-cheeseburger.jpg',
    'bbq-bacon-burger': '/assets/images/food-items/bbq-bacon-burger.png',
    'veggie-burger': '/assets/images/food-items/veggie-burger.png',
    'loaded-fries': '/assets/images/food-items/loaded-fries.png',
    'chocolate-shake': '/assets/images/food-items/chocolate-shake.png',
    'margherita-pizza': '/assets/images/food-items/margherita-pizza.jpg',
    'pepperoni-feast': '/assets/images/food-items/pepperoni-feast.jpg',
    'paneer-flame-fusion-pizza': '/assets/images/food-items/paneer-flame-fusion pizza.png',
    'garlic-bread': '/assets/images/food-items/garlic-bread.jpg',
    'paneer-lababdar': '/assets/images/food-items/paneer-lababdar.jpg',
    'daal-makhani': '/assets/images/food-items/daal-makhani.jpg',
    'paneer-tikka': '/assets/images/food-items/paneer-tikka.jpg',
    'naan-basket': '/assets/images/food-items/naan-basket.jpg',
    'mango-lassi': '/assets/images/food-items/mango-lassi.jpg',
    'nacho-cheese-melt': '/assets/images/food-items/nacho-cheese-melt.jpg',
    'onion-ring-crunch': '/assets/images/food-items/onion-ring-crunch.png',
    'crispy-fried-momos': '/assets/images/food-items/crispy-fried-momos.jpg',
    'salmon-nigiri': '/assets/images/food-items/Salmon Nigiri.png',
    'tempura-shrimp-roll': '/assets/images/food-items/Tempura Shrimp Rol.jpg',
    'avocado-veg-roll': '/assets/images/food-items/Avocado Veg Roll.png',
    'california-roll': '/assets/images/food-items/California Roll.jpg',
    'sushi-platter': '/assets/images/food-items/sushi platter.jpg',
    'dragon-fire-noodles': '/assets/images/food-items/dragon-fire noodles.jpg',
    'szechuan-spice-fusion-noodles': '/assets/images/food-items/szechuan-spice-fusion noodles.png',
    'tonki-hakka-noodles': '/assets/images/food-items/tonki-hakka noodles.png',
    'wok-toss-noodles': '/assets/images/food-items/wok-toss-noodles.png',
    'veg-hakka-noodles': '/assets/images/food-items/veg-hukka-noodles.png',
  };
  return map[slug];
}

export function restaurantToFrontend(response: BackendRestaurantResponse): Restaurant {
  const slug = slugify(response.name);
  const isBurger = slug.includes('burger');
  const isPizza = slug.includes('pizza');
  const isSushi = slug.includes('sushi');
  const isTaco = slug.includes('taco');
  const isNoodle = slug.includes('noodle');
  const isSandwich = slug.includes('cafe') || slug.includes('sandwich');
  const isDrink = slug.includes('drink') || slug.includes('bowl');
  const isDessert = slug.includes('sweet') || slug.includes('dessert') || slug.includes('icecream');
  const isBiryani = slug.includes('spice') || slug.includes('biryani') || slug.includes('indian');
  return {
    id: slug,
    backendId: response.id,
    name: response.name,
    cuisine: `${response.cuisineType.charAt(0)}${response.cuisineType.slice(1).toLowerCase()}`,
    category: isPizza
      ? 'pizza'
      : isBurger
        ? 'burgers'
        : isBiryani
          ? 'biryani'
          : isSandwich
            ? 'sandwich'
            : isDrink
              ? 'drinks'
              : isDessert
                ? 'dessert'
                : isSushi
                  ? 'sushi'
                  : isTaco
                    ? 'mexican'
                    : isNoodle
                      ? 'chinese'
                      : 'burgers',
    rating: response.rating ?? 0,
    deliveryMinutes: '25-35',
    minOrder: 150,
    status: restaurantStatusFromBackend(response.status),
    heroEmoji:
      isPizza
        ? '🍕'
        : isBurger
          ? '🍔'
          : isBiryani
            ? '🍛'
            : isSandwich
              ? '🥪'
              : isDrink
                ? '🥤'
                : isDessert
                  ? '🍰'
                  : isSushi
                    ? '🍣'
                    : isTaco
                      ? '🌮'
                      : isNoodle
                        ? '🥡'
                        : '🍔',
    description: response.address || `${response.name} on QuickBite`,
    imageUrl: restaurantImageForSlug(slug),
  };
}

export function menuToFrontend(
  restaurantId: string,
  restaurantName: string,
  restaurantBackendId: number | undefined,
  item: BackendMenuItemResponse,
): MenuItem {
  const slug = slugify(item.name);
  return {
    id: slug,
    backendId: item.id,
    restaurantId,
    restaurantBackendId,
    name: item.name,
    description: item.description ?? '',
    price: item.price,
    rating: 4.6,
    icon: restaurantName.includes('Sushi')
      ? '🍣'
      : restaurantName.includes('Pizza')
        ? '🍕'
        : restaurantName.includes('Noodle')
          ? '🍜'
          : restaurantName.includes('Taco')
            ? '🌮'
            : '🍔',
    category: restaurantName.includes('Burger')
      ? 'Burgers'
      : restaurantName.includes('Pizza')
        ? 'Pizza'
        : restaurantName.includes('Spice')
          ? 'Curries'
          : restaurantName.includes('Taco')
            ? 'Tacos'
            : restaurantName.includes('Sushi')
              ? 'Rolls'
              : 'Noodles',
    available: item.availability !== 'UNAVAILABLE',
    imageUrl: menuImageForSlug(slug),
  };
}

export function cartToFrontend(item: BackendCartItemResponse): CartItem {
  return {
    id: `cart-${item.id}`,
    backendId: item.id,
    backendRestaurantId: item.restaurantId,
    backendMenuItemId: item.menuItemId,
    restaurantId: slugify(item.restaurantName),
    restaurantName: item.restaurantName,
    name: item.itemName,
    description: item.category ?? '',
    price: item.unitPrice,
    quantity: item.quantity,
    imageUrl: item.imageUrl ?? undefined,
  };
}
