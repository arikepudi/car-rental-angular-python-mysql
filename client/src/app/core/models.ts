export interface Car {
  id: number;
  name: string;
  category: string;
  location: string;
  price_per_day: number;
  rating: number;
  image: string;
  tags: string[];
  metadata: Record<string, string | number>;
}

export interface Booking {
  id: string;
  car_id: number;
  car_name: string;
  price_per_day: number;
  starts_at: string;
  ends_at: string;
  total_price: number;
  customer_name: string;
  email: string;
  created_at: string;
  cancellable: boolean;
  cancellation_fee: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface CarFilters {
  category?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  starts_at?: string;
  ends_at?: string;
}
