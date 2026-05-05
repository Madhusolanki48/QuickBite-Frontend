import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { CustomerLayoutComponent } from './layouts/customer-layout.component';
import { OwnerLayoutComponent } from './layouts/owner-layout.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { SignInPageComponent } from './pages/auth/sign-in-page.component';
import { AddressesPageComponent } from './pages/customer/addresses-page.component';
import { CartPageComponent } from './pages/customer/cart-page.component';
import { HomePageComponent } from './pages/customer/home-page.component';
import { MenuPageComponent } from './pages/customer/menu-page.component';
import { OrderSuccessPageComponent } from './pages/customer/order-success-page.component';
import { OrdersPageComponent } from './pages/customer/orders-page.component';
import { PaymentPageComponent } from './pages/customer/payment-page.component';
import { ProfilePageComponent } from './pages/customer/profile-page.component';
import { AnalyticsPageComponent } from './pages/owner/analytics-page.component';
import { HoursStatusPageComponent } from './pages/owner/hours-status-page.component';
import { LiveOrdersPageComponent } from './pages/owner/live-orders-page.component';
import { MenuManagerPageComponent } from './pages/owner/menu-manager-page.component';
import { RestaurantProfilePageComponent } from './pages/owner/restaurant-profile-page.component';
import { DeliveryLayoutComponent } from './layouts/delivery-layout.component';
import { roleGuard } from './core/auth.guard';
import { DeliveryDashboardPageComponent } from './pages/delivery/delivery-dashboard-page.component';
import { DeliveryHistoryPageComponent } from './pages/delivery/delivery-history-page.component';
import { DeliveryEarningsPageComponent } from './pages/delivery/delivery-earnings-page.component';
import { DeliveryProfilePageComponent } from './pages/delivery/delivery-profile-page.component';
import { AdminDashboardPageComponent } from './pages/admin/admin-dashboard-page.component';
import { AdminOrdersPageComponent } from './pages/admin/admin-orders-page.component';
import { AdminRestaurantsPageComponent } from './pages/admin/admin-restaurants-page.component';
import { AdminDeliveryAgentsPageComponent } from './pages/admin/admin-delivery-agents-page.component';
import { AdminCustomersPageComponent } from './pages/admin/admin-customers-page.component';
import { AdminSettingsPageComponent } from './pages/admin/admin-settings-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    component: AuthLayoutComponent,
    canActivateChild: [guestGuard],
    children: [
      { path: 'sign-in', component: SignInPageComponent },
      { path: 'login', component: LoginPageComponent },
    ],
  },
  {
    path: '',
    component: CustomerLayoutComponent,
    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomePageComponent },
      { path: 'restaurants/:id', component: MenuPageComponent },
      { path: 'cart', component: CartPageComponent },
      { path: 'payment', component: PaymentPageComponent },
      { path: 'order-success', component: OrderSuccessPageComponent },
      { path: 'orders', component: OrdersPageComponent },
      { path: 'profile', component: ProfilePageComponent },
      { path: 'addresses', component: AddressesPageComponent },
    ],
  },
  {
    path: 'owner',
    component: OwnerLayoutComponent,
    canActivateChild: [roleGuard(['RESTAURANT_OWNER'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'live-orders' },
      { path: 'live-orders', component: LiveOrdersPageComponent },
      { path: 'menu-manager', component: MenuManagerPageComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'profile', component: RestaurantProfilePageComponent },
      { path: 'hours-status', component: HoursStatusPageComponent },
    ],
  },
  {
    path: 'delivery',
    component: DeliveryLayoutComponent,
    canActivateChild: [roleGuard(['DELIVERY_PARTNER'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'my-deliveries' },
      { path: 'my-deliveries', component: DeliveryDashboardPageComponent },
      { path: 'history', component: DeliveryHistoryPageComponent },
      { path: 'earnings', component: DeliveryEarningsPageComponent },
      { path: 'profile', component: DeliveryProfilePageComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard(['ADMIN'])],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardPageComponent },
      { path: 'orders', component: AdminOrdersPageComponent },
      { path: 'restaurants', component: AdminRestaurantsPageComponent },
      { path: 'delivery-agents', component: AdminDeliveryAgentsPageComponent },
      { path: 'customers', component: AdminCustomersPageComponent },
      { path: 'settings', component: AdminSettingsPageComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
