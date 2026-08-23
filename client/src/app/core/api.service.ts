import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Booking, Car, CarFilters, User } from './models';

function toParams(obj: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

// The frontend always calls relative /api/... paths — never a hardcoded host. In dev,
// Angular's dev-server proxy (proxy.conf.json) forwards these to FastAPI; in production
// FastAPI serves both the API and the built Angular app from the same origin.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getCars(filters: CarFilters = {}): Observable<Car[]> {
    return this.http.get<Car[]>('/api/cars', { params: toParams({ ...filters }) });
  }

  getCar(id: number): Observable<Car> {
    return this.http.get<Car>(`/api/cars/${id}`);
  }

  createBooking(payload: {
    car_id: number;
    starts_at: string;
    ends_at: string;
    customer_name: string;
    email: string;
  }): Observable<Booking> {
    return this.http.post<Booking>('/api/bookings', payload);
  }

  getBooking(id: string): Observable<Booking> {
    return this.http.get<Booking>(`/api/bookings/${id}`);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>('/api/bookings/mine');
  }

  cancelBooking(id: string): Observable<{ cancelled: boolean; fee: number }> {
    return this.http.delete<{ cancelled: boolean; fee: number }>(`/api/bookings/${id}`);
  }

  getSession(): Observable<{ user: User | null }> {
    return this.http.get<{ user: User | null }>('/api/auth/session');
  }

  signUp(payload: { email: string; password: string; name: string }): Observable<User> {
    return this.http.post<User>('/api/auth/signup', payload);
  }

  signIn(payload: { email: string; password: string }): Observable<User> {
    return this.http.post<User>('/api/auth/sign-in', payload);
  }

  signOut(): Observable<{ signed_out: boolean }> {
    return this.http.post<{ signed_out: boolean }>('/api/auth/sign-out', {});
  }
}
