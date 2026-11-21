import type {
  CreateEventPayload,
  EvoraEvent,
  PaymentIntentResponse,
  TicketOrder,
} from '../types/ticketing.ts';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  if (!res.ok) {
    throw new ApiError(
      typeof payload.error === 'string' ? payload.error : `Request failed (${res.status})`,
      res.status,
      typeof payload.code === 'string' ? payload.code : 'REQUEST_FAILED',
    );
  }
  return payload as T;
}

export async function fetchEvents(params?: {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
}): Promise<EvoraEvent[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.category && params.category !== 'All') search.set('category', params.category);
  if (params?.city && params.city !== 'All') search.set('city', params.city);
  if (params?.sort) search.set('sort', params.sort);
  const qs = search.toString();
  const res = await fetch(`/api/events${qs ? `?${qs}` : ''}`);
  const data = await parseJsonResponse<{ events: EvoraEvent[] }>(res);
  return data.events;
}

export async function fetchEventBySlug(slug: string): Promise<EvoraEvent> {
  const res = await fetch(`/api/events/${encodeURIComponent(slug)}`);
  const data = await parseJsonResponse<{ event: EvoraEvent }>(res);
  return data.event;
}

export async function createEvent(payload: CreateEventPayload): Promise<EvoraEvent> {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ event: EvoraEvent }>(res);
  return data.event;
}

export async function createPaymentIntent(payload: {
  eventSlug: string;
  tierId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  userId?: string;
  eventSnapshot?: {
    id: string;
    slug: string;
    title: string;
    dateLabel: string;
    timeLabel: string;
    venueName: string;
    venueAddress: string;
    city: string;
    tierId: string;
    tierName: string;
    pricePaise: number;
    capacity: number;
    remaining: number;
  };
}): Promise<PaymentIntentResponse> {
  const res = await fetch('/api/payments/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ intent: PaymentIntentResponse }>(res);
  return data.intent;
}

export async function confirmPayment(payload: {
  intentId: string;
  utrReference?: string;
}): Promise<TicketOrder> {
  const res = await fetch('/api/payments/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ order: TicketOrder }>(res);
  return data.order;
}

export async function fetchOrderById(orderId: string): Promise<TicketOrder> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(orderId)}`);
  const data = await parseJsonResponse<{ order: TicketOrder }>(res);
  return data.order;
}

export async function searchOrders(params: { email?: string; orderId?: string }): Promise<TicketOrder[]> {
  const search = new URLSearchParams();
  if (params.email) search.set('email', params.email);
  if (params.orderId) search.set('orderId', params.orderId);
  const res = await fetch(`/api/tickets?${search.toString()}`);
  const data = await parseJsonResponse<{ orders: TicketOrder[] }>(res);
  return data.orders;
}

export async function refundOrder(orderId: string): Promise<TicketOrder> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(orderId)}/refund`, {
    method: 'POST',
  });
  const data = await parseJsonResponse<{ order: TicketOrder }>(res);
  return data.order;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

const clientGeocodeCache = new Map<string, GeocodedLocation>();

export async function geocodeVenueAddress(address: string): Promise<GeocodedLocation | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  const cached = clientGeocodeCache.get(key);
  if (cached) return cached;

  const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address.trim())}`);
  if (res.status === 429) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as GeocodedLocation;
  if (typeof data.lat === 'number' && typeof data.lng === 'number') {
    clientGeocodeCache.set(key, data);
    return data;
  }
  return null;
}

export async function fetchMapsRuntimeConfig(): Promise<{ configured: boolean; apiKey: string }> {
  const res = await fetch('/api/maps/config');
  if (!res.ok) return { configured: false, apiKey: '' };
  return (await res.json()) as { configured: boolean; apiKey: string };
}
