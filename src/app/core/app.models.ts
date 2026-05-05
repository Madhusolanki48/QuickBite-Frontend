export type AppRole = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DELIVERY_PARTNER' | 'ADMIN';

export interface AuthUser {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: AppRole;
  restaurantId?: string;
  restaurantName?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  user: AuthUser;
}

export interface NotificationItem {
  id: number;
  recipientEmail?: string | null;
  recipientRole?: AppRole | null;
  title: string;
  message: string;
  category: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface AdminUserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: AppRole;
  restaurantId?: string | null;
  restaurantName?: string | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  enabled: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: AppRole;
  restaurantId?: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  imageUrl?: string;
}

export interface Restaurant {
  id: string;
  backendId?: number;
  name: string;
  cuisine: string;
  category: string;
  rating: number;
  deliveryMinutes: string;
  minOrder: number;
  status: 'OPEN' | 'CLOSED';
  heroEmoji: string;
  description: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface MenuItem {
  id: string;
  backendId?: number;
  restaurantId: string;
  restaurantBackendId?: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  icon: string;
  category: string;
  available?: boolean;
  imageUrl?: string;
  discountPercent?: number;
  prepTimeMinutes?: number;
  ingredients?: string[];
  addons?: Array<{ name: string; price: number }>;
  variants?: Array<{ label: string; price: number }>;
  flags?: Array<'Bestseller' | 'Top Rated' | 'Low Selling'>;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
  memberSince: string;
  avgRating: number;
  totalOrders: number;
  totalSpent: string;
  loyaltyTier: string;
}

export interface CartItem {
  id: string;
  backendId?: number;
  restaurantId: string;
  backendRestaurantId?: number;
  backendMenuItemId?: number;
  restaurantName: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'COD';
export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'custom';

export interface OperatingHour {
  day: string;
  open: string;
  close: string;
  openToday: boolean;
}

export interface RestaurantProfile {
  restaurantId: string;
  name: string;
  cuisine: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  radiusKm: number;
  minOrder: number;
  deliveryCharge: number;
  gstin: string;
  fssai: string;
  open: boolean;
}

export interface Order {
  id: string;
  backendId?: number;
  restaurantId?: string;
  backendRestaurantId?: number;
  restaurantName: string;
  items: string;
  total: number;
  status: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  paymentOrderId?: string;
  paymentSignature?: string;
  agent?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  time?: string;
  createdAt: string;
  note?: string;
  customerDistanceKm?: number;
  deliveryAddressLine?: string;
  deliveryLocation?: GeoPoint;
  pickupLocation?: GeoPoint;
  deliveryAgentName?: string;
  deliveryAgentEmail?: string;
  deliveryAgentPhone?: string;
  deliveryAgentStatus?:
    | 'REQUESTED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'ASSIGNED'
    | 'PICKED_UP'
    | 'DELIVERED';
  deliveryAgentEtaMinutes?: number;
  deliveryAgentDistanceKm?: number;
  deliveryAgentEarnings?: number;
  deliveryAgentLocation?: GeoPoint;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface Address {
  id: string;
  title: string;
  addressLine: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
}

export interface OwnerMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  category: string;
  emoji: string;
  imageUrl?: string;
  discountPercent?: number;
  prepTimeMinutes?: number;
  ingredients?: string[];
  addons?: Array<{ name: string; price: number }>;
  variants?: Array<{ label: string; price: number }>;
  flags?: Array<'Bestseller' | 'Top Rated' | 'Low Selling'>;
}

export interface OwnerAnalytics {
  revenueToday: string;
  ordersToday: number;
  avgRating: number;
  avgPrepTime: string;
  conversionRate: string;
  cancellationRate: string;
  peakHour: string;
  topSellers: Array<{ name: string; sold: number; width: string }>;
  statusBreakdown: Array<{ label: string; value: number; tone: 'success' | 'warning' | 'danger' }>;
  revenueByHour: Array<{ hour: string; height: string }>;
  ordersByHour: Array<{ hour: string; value: number }>;
  revenueTrend: Array<{ label: string; value: number }>;
}
