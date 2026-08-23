import { Routes } from '@angular/router';

import { BookingConfirmation } from './pages/booking-confirmation/booking-confirmation';
import { CarDetail } from './pages/car-detail/car-detail';
import { Checkout } from './pages/checkout/checkout';
import { Compare } from './pages/compare/compare';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { MyBookings } from './pages/my-bookings/my-bookings';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'cars/:id', component: CarDetail },
  { path: 'compare', component: Compare },
  { path: 'checkout', component: Checkout },
  { path: 'bookings/:id', component: BookingConfirmation },
  { path: 'my-bookings', component: MyBookings },
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: '**', redirectTo: '' },
];
