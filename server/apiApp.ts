import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import { SEED_EVENTS } from '../src/data/seedEvents.ts';
import type {
  CreateEventPayload,
  EvoraEvent,
  IssuedTicketPass,
  PaymentIntentResponse,
  TicketOrder,
} from '../src/types/ticketing.ts';

dotenv.config();

const SIGNING_SECRET = process.env.PAYMENT_SIGNING_SECRET || 'evora-dev-signing-secret';
// Merchant settlement VPA used strictly to encode dynamic checkout QR payloads; never exposed in UI text
const MERCHANT_SETTLEMENT_VPA = process.env.EVORA_SETTLEMENT_VPA || 'tushw@ibl';

function getMapsApiKey(): string {
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

const eventsStore: EvoraEvent[] = SEED_EVENTS.map((evt) => ({
  ...evt,
  tiers: evt.tiers.map((tier) => ({ ...tier })),
  schedule: evt.schedule.map((item) => ({ ...item })),
  description: [...evt.description],
  host: { ...evt.host },
}));

interface EventSnapshot {
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
  capacity: number;
  remaining: number;
}

interface StoredPaymentIntent extends PaymentIntentResponse {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  userId?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'expired';
  eventSnapshot?: EventSnapshot;
}

interface GeocodeCacheEntry {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
  expiresAt: number;
}

const GEOCODE_TTL_MS = 29 * 24 * 60 * 60 * 1000; // <= 30 days per Google Maps Platform ToS
const geocodeCache = new Map<string, GeocodeCacheEntry>();

const paymentIntents = new Map<string, StoredPaymentIntent>();
const ordersStore = new Map<string, TicketOrder>();

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `event-${Date.now()}`;
}

function signTicketPayload(payload: string): string {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex').slice(0, 24);
}

function signIntentToken(intent: Omit<StoredPaymentIntent, 'intentToken' | 'paymentQrPayload'>): string {
  const encoded = Buffer.from(JSON.stringify(intent), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyIntentToken(token: string): StoredPaymentIntent | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as StoredPaymentIntent;
    if (!parsed || typeof parsed.intentId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

function sanitizeVpa(raw?: string): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim();
  if (!cleaned) return undefined;
  return UPI_VPA_REGEX.test(cleaned) ? cleaned : undefined;
}

function computeTotalsPaise(unitPricePaise: number, quantity: number, feePercent = 0) {
  const subtotalPaise = unitPricePaise * quantity;
  const clampedPercent =
    typeof feePercent === 'number' && Number.isFinite(feePercent)
      ? Math.max(0, Math.min(20, feePercent))
      : 0;
  const platformFeePaise =
    subtotalPaise > 0 && clampedPercent > 0
      ? Math.round((subtotalPaise * clampedPercent) / 100)
      : 0;
  return {
    subtotalPaise,
    platformFeePaise,
    totalPaise: subtotalPaise + platformFeePaise,
  };
}

function buildDynamicPaymentQrPayload(
  totalPaise: number,
  intentId: string,
  eventTitle: string,
  hostPayoutVpa?: string,
  hostOrganization?: string,
  fallbackPayoutVpa?: string,
  fallbackPayeeName?: string,
): string {
  const amountRupees = (totalPaise / 100).toFixed(2);
  const shortNote = `Evora ${eventTitle}`.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 42).trim();
  const validHostVpa = sanitizeVpa(hostPayoutVpa);
  const validFallbackVpa = sanitizeVpa(fallbackPayoutVpa);
  const payeeVpa = validHostVpa || validFallbackVpa || MERCHANT_SETTLEMENT_VPA;
  const rawName = validHostVpa
    ? hostOrganization?.trim() || 'Event Organizer'
    : fallbackPayeeName?.trim() || 'Evora by Browns Squad';
  const payeeName = rawName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 40).trim() || 'Evora by Browns Squad';
  const params = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    am: amountRupees,
    cu: 'INR',
    tr: intentId,
    tn: shortNote || 'Evora Event Pass',
  });
  return `upi://pay?${params.toString()}`;
}

function isOriginAllowed(origin: string): boolean {
  const configured = (process.env.CORS_ORIGIN || '').trim();
  if (!configured || configured === '*') return true;
  const allowedList = configured
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowedList.includes(origin.toLowerCase());
}

function sanitizeWalletIdSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 60);
  return cleaned || 'evora_item';
}

function base64UrlEncodeJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64url');
}

function signRs256Jwt(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString('base64url');
  return `${signingInput}.${signature}`;
}

function buildGoogleWalletPassBundle(
  order: TicketOrder,
  pass: IssuedTicketPass,
  issuerId: string,
) {
  const classSuffix = sanitizeWalletIdSegment(`evora_evt_${order.eventId || order.eventSlug}`);
  const objectSuffix = sanitizeWalletIdSegment(`evora_pass_${order.orderId}_${pass.ticketId}`);
  const classId = `${issuerId}.${classSuffix}`;
  const objectId = `${issuerId}.${objectSuffix}`;

  const eventTicketClass = {
    id: classId,
    issuerName: "Evora by Browns' Squad",
    reviewStatus: 'UNDER_REVIEW',
    eventName: {
      defaultValue: {
        language: 'en-US',
        value: order.eventTitle.slice(0, 120),
      },
    },
    venue: {
      name: {
        defaultValue: {
          language: 'en-US',
          value: order.venueName.slice(0, 120),
        },
      },
      address: {
        defaultValue: {
          language: 'en-US',
          value: `${order.venueAddress}, ${order.city}`.slice(0, 200),
        },
      },
    },
    hexBackgroundColor: '#000000',
  };

  const eventTicketObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    ticketHolderName: pass.holderName.slice(0, 100),
    ticketNumber: pass.ticketId,
    seatInfo: {
      section: {
        defaultValue: {
          language: 'en-US',
          value: order.tierName.slice(0, 60),
        },
      },
      seat: {
        defaultValue: {
          language: 'en-US',
          value: pass.seatCode,
        },
      },
    },
    barcode: {
      type: 'QR_CODE',
      value: pass.qrPayload,
      alternateText: pass.ticketId,
    },
    textModulesData: [
      {
        id: 'schedule',
        header: 'DATE & TIME',
        body: `${order.eventDateLabel} · ${order.eventTimeLabel}`,
      },
      {
        id: 'order_ref',
        header: 'ORDER ID',
        body: `${order.orderId} (${order.paymentReference})`,
      },
    ],
  };

  return {
    classId,
    objectId,
    eventTicketClass,
    eventTicketObject,
  };
}

export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // CORS support for custom production domains (e.g. https://evr.browns.co.in) calling /api/*
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'evora-api' });
  });

  // Runtime Google Maps key config endpoint (reads provisioned env var cleanly)
  app.get('/api/maps/config', (_req, res) => {
    const apiKey = getMapsApiKey();
    res.json({
      configured: Boolean(apiKey),
      apiKey,
    });
  });

  // Server-side Google Maps Geocoding REST API proxy (avoids browser CORS and caches <= 30 days)
  app.get('/api/maps/geocode', async (req, res) => {
    const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
    if (!address || address.length < 3 || address.length > 300) {
      res.status(400).json({ error: 'Valid address query parameter is required.' });
      return;
    }

    const cacheKey = address.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({
        lat: cached.lat,
        lng: cached.lng,
        formattedAddress: cached.formattedAddress,
        placeId: cached.placeId,
        cached: true,
      });
      return;
    }

    const apiKey = getMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'Google Maps API key is not configured on the server.',
        code: 'MAPS_KEY_MISSING',
      });
      return;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', address);
      url.searchParams.set('region', 'in');
      url.searchParams.set('key', apiKey);

      const gRes = await fetch(url.toString());
      const data = (await gRes.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          formatted_address?: string;
          place_id?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      if (
        gRes.status === 429 ||
        data.status === 'OVER_DAILY_LIMIT' ||
        data.status === 'OVER_QUERY_LIMIT'
      ) {
        res.status(429).json({
          error: 'Google Maps quota exceeded.',
          code: 'RESOURCE_EXHAUSTED',
        });
        return;
      }

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        res.status(404).json({
          error: data.error_message || 'Location could not be geocoded.',
          code: data.status || 'ZERO_RESULTS',
        });
        return;
      }

      const first = data.results[0];
      const lat = first.geometry?.location?.lat;
      const lng = first.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(404).json({ error: 'No coordinates returned for address.' });
        return;
      }

      const entry: GeocodeCacheEntry = {
        lat,
        lng,
        formattedAddress: first.formatted_address || address,
        placeId: first.place_id || '',
        expiresAt: Date.now() + GEOCODE_TTL_MS,
      };
      geocodeCache.set(cacheKey, entry);

      res.json({
        lat: entry.lat,
        lng: entry.lng,
        formattedAddress: entry.formattedAddress,
        placeId: entry.placeId,
        cached: false,
      });
    } catch (err) {
      console.error('Geocode proxy error:', err);
      res.status(502).json({ error: 'Unable to reach geocoding service.' });
    }
  });

  app.get('/api/events', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'date';

    let results = eventsStore.filter(
      (evt) => evt.approvalStatus !== 'pending' && evt.approvalStatus !== 'rejected',
    );

    if (query) {
      results = results.filter(
        (evt) =>
          evt.title.toLowerCase().includes(query) ||
          evt.subtitle.toLowerCase().includes(query) ||
          evt.city.toLowerCase().includes(query) ||
          evt.venueName.toLowerCase().includes(query) ||
          evt.host.organization.toLowerCase().includes(query),
      );
    }

    if (category && category !== 'All') {
      results = results.filter((evt) => evt.category === category);
    }

    if (city && city !== 'All') {
      results = results.filter((evt) => evt.city.toLowerCase() === city.toLowerCase());
    }

    if (sort === 'price_asc') {
      results.sort((a, b) => {
        const minA = Math.min(...a.tiers.map((t) => t.pricePaise));
        const minB = Math.min(...b.tiers.map((t) => t.pricePaise));
        return minA - minB;
      });
    } else if (sort === 'price_desc') {
      results.sort((a, b) => {
        const minA = Math.min(...a.tiers.map((t) => t.pricePaise));
        const minB = Math.min(...b.tiers.map((t) => t.pricePaise));
        return minB - minA;
      });
    } else {
      results.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    }

    res.json({ events: results });
  });

  app.get('/api/events/:slug', (req, res) => {
    const event = eventsStore.find((e) => e.slug === req.params.slug);
    if (!event) {
      res.status(404).json({ error: 'Event not found', code: 'EVENT_NOT_FOUND' });
      return;
    }
    res.json({ event });
  });

  app.post('/api/events', (req, res) => {
    const body = req.body as Partial<CreateEventPayload>;
    if (!body.title?.trim() || !body.city?.trim() || !body.venueName?.trim() || !body.isoDate?.trim()) {
      res.status(400).json({ error: 'Title, city, venue name, and date are required.' });
      return;
    }
    if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
      res.status(400).json({ error: 'Add at least one ticket tier.' });
      return;
    }

    const rawVpa = typeof body.payoutVpa === 'string' ? body.payoutVpa.trim() : '';
    const validatedVpa = rawVpa ? sanitizeVpa(rawVpa) : undefined;
    if (rawVpa && !validatedVpa) {
      res.status(400).json({ error: 'Enter a valid UPI ID (for example, clubname@okaxis).' });
      return;
    }

    let slug = slugify(body.title);
    if (eventsStore.some((e) => e.slug === slug)) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const parsedDate = new Date(`${body.isoDate}T12:00:00Z`);
    const formattedDate = Number.isNaN(parsedDate.getTime())
      ? body.dateLabel || body.isoDate
      : parsedDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

    const newEvent: EvoraEvent = {
      id: `evt_${crypto.randomBytes(6).toString('hex')}`,
      slug,
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || 'Campus event listed on Evora.',
      category: body.category || 'College Fests',
      city: body.city.trim(),
      venueName: body.venueName.trim(),
      venueAddress: body.venueAddress?.trim() || `${body.venueName.trim()}, ${body.city.trim()}`,
      ...(body.placeId ? { placeId: body.placeId.trim() } : {}),
      ...(typeof body.latitude === 'number' && Number.isFinite(body.latitude)
        ? { latitude: body.latitude }
        : {}),
      ...(typeof body.longitude === 'number' && Number.isFinite(body.longitude)
        ? { longitude: body.longitude }
        : {}),
      dateLabel: formattedDate,
      isoDate: body.isoDate.trim(),
      timeLabel: body.timeLabel?.trim() || '10:00 to 18:00',
      timezone: body.timezone?.trim() || 'IST',
      coverImage:
        typeof body.coverImage === 'string' &&
        body.coverImage.length >= 8 &&
        body.coverImage.length <= 260_000 &&
        (body.coverImage.startsWith('/src/assets/') ||
          body.coverImage.startsWith('https://') ||
          body.coverImage.startsWith('data:image/jpeg;base64,') ||
          body.coverImage.startsWith('data:image/png;base64,') ||
          body.coverImage.startsWith('data:image/webp;base64,'))
          ? body.coverImage
          : '/src/assets/images/real_hackathon_main.jpg',
      coverCaption: `${body.venueName.trim()}, ${body.city.trim()}.`,
      description: (body.description || '')
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
      host: {
        name: body.hostName?.trim() || 'Event Organizer',
        organization: body.hostOrganization?.trim() || body.hostName?.trim() || 'Campus Club',
        role: 'Organizer',
        contactEmail: body.hostEmail?.trim() || 'organizer@evora.in',
      },
      schedule: [
        { time: 'Entry', title: 'Check-In & Pass Scan', speaker: 'Main Gate' },
        { time: 'Main', title: body.title.trim(), speaker: body.hostName?.trim() || 'Host' },
      ],
      tiers: body.tiers.map((tier, index) => {
        const cap = Math.max(1, Math.min(5000, Math.floor(Number(tier.capacity) || 100)));
        const pricePaise = Math.max(0, Math.round((Number(tier.priceRupees) || 0) * 100));
        return {
          id: `tier_${slug}_${index + 1}`,
          name: tier.name?.trim() || `Tier ${index + 1}`,
          description: tier.description?.trim() || 'Standard event entry pass.',
          pricePaise,
          currency: 'INR',
          capacity: cap,
          remaining: cap,
        };
      }),
      refundPolicySummary:
        body.refundPolicySummary?.trim() ||
        'Refunds available up to 48 hours before doors open.',
      ...(validatedVpa ? { payoutVpa: validatedVpa } : {}),
      approvalStatus: 'pending',
    };

    if (newEvent.description.length === 0) {
      newEvent.description = [newEvent.subtitle];
    }

    eventsStore.unshift(newEvent);
    res.status(201).json({ event: newEvent });
  });

  // Step 1: Lock seats & generate dynamic checkout QR payload + stateless signed intentToken
  app.post('/api/payments/create-intent', (req, res) => {
    const {
      eventSlug,
      tierId,
      quantity,
      buyerName,
      buyerEmail,
      buyerPhone,
      userId,
      platformFeePercent,
      fallbackPayoutVpa,
      fallbackPayeeName,
      eventSnapshot,
    } = req.body as {
      eventSlug?: string;
      tierId?: string;
      quantity?: number;
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      userId?: string;
      platformFeePercent?: number;
      fallbackPayoutVpa?: string;
      fallbackPayeeName?: string;
      eventSnapshot?: EventSnapshot & {
        pricePaise: number;
        payoutVpa?: string;
        hostOrganization?: string;
      };
    };

    const existingEvent = eventsStore.find((e) => e.slug === eventSlug);
    const existingTier = existingEvent?.tiers.find((t) => t.id === tierId);

    const resolvedEventId = existingEvent?.id || eventSnapshot?.id;
    const resolvedSlug = existingEvent?.slug || eventSnapshot?.slug;
    const resolvedTitle = existingEvent?.title || eventSnapshot?.title;
    const resolvedTierId = existingTier?.id || eventSnapshot?.tierId;
    const resolvedTierName = existingTier?.name || eventSnapshot?.tierName;
    const resolvedPricePaise =
      existingTier !== undefined ? existingTier.pricePaise : eventSnapshot?.pricePaise;
    const resolvedRemaining =
      existingTier !== undefined ? existingTier.remaining : eventSnapshot?.remaining;
    const resolvedPayoutVpa = existingEvent?.payoutVpa || eventSnapshot?.payoutVpa;
    const resolvedHostOrg = existingEvent?.host?.organization || eventSnapshot?.hostOrganization;

    if (!resolvedEventId || !resolvedSlug || !resolvedTitle) {
      res.status(404).json({ error: 'Selected event could not be found.', code: 'EVENT_NOT_FOUND' });
      return;
    }

    if (
      !resolvedTierId ||
      !resolvedTierName ||
      typeof resolvedPricePaise !== 'number' ||
      typeof resolvedRemaining !== 'number'
    ) {
      res.status(404).json({ error: 'Selected ticket tier is unavailable.', code: 'TIER_NOT_FOUND' });
      return;
    }

    const qty = Math.floor(Number(quantity) || 1);
    if (qty < 1 || qty > 10) {
      res.status(400).json({ error: 'Select between 1 and 10 tickets per order.' });
      return;
    }

    if (resolvedRemaining < qty) {
      res.status(409).json({
        error: `Only ${resolvedRemaining} passes left in ${resolvedTierName}.`,
        code: 'INSUFFICIENT_INVENTORY',
      });
      return;
    }

    if (!buyerName?.trim() || !buyerEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      res.status(400).json({ error: 'Enter a valid full name and email address.' });
      return;
    }

    const totals = computeTotalsPaise(resolvedPricePaise, qty, platformFeePercent);
    const intentId = `EVRINT${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const paymentQrPayload =
      totals.totalPaise > 0
        ? buildDynamicPaymentQrPayload(
            totals.totalPaise,
            intentId,
            resolvedTitle,
            resolvedPayoutVpa,
            resolvedHostOrg,
            fallbackPayoutVpa,
            fallbackPayeeName,
          )
        : null;

    const snapshot: EventSnapshot | undefined = existingEvent && existingTier
      ? {
          id: existingEvent.id,
          slug: existingEvent.slug,
          title: existingEvent.title,
          dateLabel: existingEvent.dateLabel,
          timeLabel: existingEvent.timeLabel,
          venueName: existingEvent.venueName,
          venueAddress: existingEvent.venueAddress,
          city: existingEvent.city,
          tierId: existingTier.id,
          tierName: existingTier.name,
          capacity: existingTier.capacity,
          remaining: existingTier.remaining,
        }
      : eventSnapshot
        ? {
            id: eventSnapshot.id,
            slug: eventSnapshot.slug,
            title: eventSnapshot.title,
            dateLabel: eventSnapshot.dateLabel,
            timeLabel: eventSnapshot.timeLabel,
            venueName: eventSnapshot.venueName,
            venueAddress: eventSnapshot.venueAddress,
            city: eventSnapshot.city,
            tierId: eventSnapshot.tierId,
            tierName: eventSnapshot.tierName,
            capacity: eventSnapshot.capacity,
            remaining: eventSnapshot.remaining,
          }
        : undefined;

    const intentCore = {
      intentId,
      eventId: resolvedEventId,
      eventSlug: resolvedSlug,
      eventTitle: resolvedTitle,
      tierId: resolvedTierId,
      tierName: resolvedTierName,
      quantity: qty,
      currency: 'INR' as const,
      subtotalPaise: totals.subtotalPaise,
      platformFeePaise: totals.platformFeePaise,
      totalPaise: totals.totalPaise,
      expiresAt,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim().toLowerCase(),
      buyerPhone: buyerPhone?.trim() || '',
      userId: userId?.trim() || undefined,
      status: 'pending' as const,
      eventSnapshot: snapshot,
    };

    const intentToken = signIntentToken(intentCore);
    const storedIntent: StoredPaymentIntent = {
      ...intentCore,
      paymentQrPayload,
      intentToken,
    };

    paymentIntents.set(intentId, storedIntent);
    res.status(201).json({ intent: storedIntent });
  });

  // Step 2: Confirm order after dynamic QR scan (Order Done) & issue signed door entry passes
  app.post('/api/payments/confirm', (req, res) => {
    const { intentId, intentToken, utrReference } = req.body as {
      intentId?: string;
      intentToken?: string;
      utrReference?: string;
    };

    let intent: StoredPaymentIntent | undefined = intentId
      ? paymentIntents.get(intentId)
      : undefined;

    if (!intent && typeof intentToken === 'string' && intentToken.trim()) {
      const verified = verifyIntentToken(intentToken.trim());
      if (verified && (!intentId || verified.intentId === intentId)) {
        intent = verified;
        paymentIntents.set(verified.intentId, verified);
      }
    }

    if (!intent) {
      res.status(404).json({ error: 'Checkout session expired or not found.', code: 'INTENT_NOT_FOUND' });
      return;
    }

    if (intent.status === 'succeeded') {
      const existingOrder = Array.from(ordersStore.values()).find((o) => o.intentId === intent!.intentId);
      if (existingOrder) {
        res.json({ order: existingOrder });
        return;
      }
    }

    if (Date.now() > new Date(intent.expiresAt).getTime()) {
      intent.status = 'expired';
      res.status(410).json({ error: 'Your 15-minute reservation expired. Please start again.', code: 'SESSION_EXPIRED' });
      return;
    }

    const event = eventsStore.find((e) => e.id === intent.eventId);
    const tier = event?.tiers.find((t) => t.id === intent.tierId);
    const snap = intent.eventSnapshot;

    if ((!event || !tier) && !snap) {
      res.status(404).json({ error: 'Event inventory could not be verified.', code: 'EVENT_NOT_FOUND' });
      return;
    }

    const currentRemaining = tier ? tier.remaining : snap!.remaining;
    const currentCapacity = tier ? tier.capacity : snap!.capacity;

    if (currentRemaining < intent.quantity) {
      res.status(409).json({ error: 'Those seats were just taken. Choose another tier.', code: 'SOLD_OUT' });
      return;
    }

    const cleanedRef = (utrReference || '').trim();
    if (cleanedRef && !/^[a-zA-Z0-9]{6,22}$/.test(cleanedRef)) {
      res.status(400).json({ error: 'Transaction reference must be 6 to 22 letters or digits.' });
      return;
    }

    if (tier) {
      tier.remaining -= intent.quantity;
    }
    intent.status = 'succeeded';

    const orderId = `EVR-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const paymentReference =
      intent.totalPaise === 0
        ? 'FREE-RSVP'
        : cleanedRef || `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const remainingAfter = currentRemaining - intent.quantity;
    const passes: IssuedTicketPass[] = [];
    for (let i = 0; i < intent.quantity; i += 1) {
      const ticketId = `PASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const seatNumber = Math.max(1, currentCapacity - remainingAfter - intent.quantity + i + 1);
      const seatCode = `${intent.tierName.slice(0, 3).toUpperCase()}-${String(seatNumber).padStart(3, '0')}`;
      const payloadBase = JSON.stringify({
        v: 1,
        orderId,
        ticketId,
        eventId: intent.eventId,
        tierId: intent.tierId,
        seatCode,
      });
      const signature = signTicketPayload(payloadBase);
      passes.push({
        ticketId,
        seatCode,
        holderName: intent.buyerName,
        holderEmail: intent.buyerEmail,
        qrPayload: `EVORA:V1:${orderId}:${ticketId}:${seatCode}:${signature}`,
        signature,
        checkedIn: false,
      });
    }

    const order: TicketOrder = {
      orderId,
      intentId: intent.intentId,
      ...(intent.userId ? { userId: intent.userId } : {}),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      eventId: event?.id || snap!.id,
      eventSlug: event?.slug || snap!.slug,
      eventTitle: event?.title || snap!.title,
      eventDateLabel: event?.dateLabel || snap!.dateLabel,
      eventTimeLabel: event?.timeLabel || snap!.timeLabel,
      venueName: event?.venueName || snap!.venueName,
      venueAddress: event?.venueAddress || snap!.venueAddress,
      city: event?.city || snap!.city,
      tierId: tier?.id || snap!.tierId,
      tierName: tier?.name || snap!.tierName,
      quantity: intent.quantity,
      buyerName: intent.buyerName,
      buyerEmail: intent.buyerEmail,
      buyerPhone: intent.buyerPhone,
      paymentReference,
      currency: 'INR',
      subtotalPaise: intent.subtotalPaise,
      platformFeePaise: intent.platformFeePaise,
      totalPaise: intent.totalPaise,
      passes,
    };

    ordersStore.set(orderId, order);
    res.status(201).json({ order });
  });

  app.get('/api/tickets', (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId.trim().toUpperCase() : '';

    let orders = Array.from(ordersStore.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    if (orderId) {
      orders = orders.filter((o) => o.orderId.toUpperCase() === orderId);
    } else if (email) {
      orders = orders.filter((o) => o.buyerEmail === email);
    }

    res.json({ orders });
  });

  app.get('/api/tickets/:orderId', (req, res) => {
    const order = ordersStore.get(req.params.orderId.toUpperCase());
    if (!order) {
      res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
      return;
    }
    res.json({ order });
  });

  app.post('/api/tickets/:orderId/refund', (req, res) => {
    const order = ordersStore.get(req.params.orderId.toUpperCase());
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.status === 'refunded') {
      res.status(409).json({ error: 'This order is already cancelled.' });
      return;
    }

    order.status = 'refunded';
    order.refundedAt = new Date().toISOString();

    const event = eventsStore.find((e) => e.id === order.eventId);
    const tier = event?.tiers.find((t) => t.id === order.tierId);
    if (tier) {
      tier.remaining = Math.min(tier.capacity, tier.remaining + order.quantity);
    }

    res.json({ order });
  });

  // Generate an official Google Wallet Event Ticket save link (signed RS256 savetowallet JWT)
  app.post('/api/wallet/google-pass', (req, res) => {
    const { order: submittedOrder, orderId, ticketId, origin } = req.body as {
      order?: TicketOrder;
      orderId?: string;
      ticketId?: string;
      origin?: string;
    };

    const resolvedOrder: TicketOrder | undefined =
      submittedOrder && submittedOrder.orderId
        ? submittedOrder
        : orderId
          ? ordersStore.get(orderId.trim().toUpperCase())
          : undefined;

    if (!resolvedOrder || !Array.isArray(resolvedOrder.passes) || resolvedOrder.passes.length === 0) {
      res.status(404).json({ error: 'Valid ticket order is required to build a Google Wallet pass.' });
      return;
    }

    if (resolvedOrder.status === 'refunded') {
      res.status(409).json({ error: 'Cancelled passes cannot be added to Google Wallet.' });
      return;
    }

    const pass =
      (ticketId
        ? resolvedOrder.passes.find((p) => p.ticketId === ticketId)
        : resolvedOrder.passes[0]) || resolvedOrder.passes[0];

    const issuerId = (process.env.GOOGLE_WALLET_ISSUER_ID || '').trim();
    const serviceAccountEmail = (process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || '').trim();
    const rawPrivateKey = (process.env.GOOGLE_WALLET_PRIVATE_KEY || '').trim();
    const normalizedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

    const missingEnvVars: string[] = [];
    if (!issuerId) missingEnvVars.push('GOOGLE_WALLET_ISSUER_ID');
    if (!serviceAccountEmail) missingEnvVars.push('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL');
    if (!normalizedPrivateKey) missingEnvVars.push('GOOGLE_WALLET_PRIVATE_KEY');

    const bundle = buildGoogleWalletPassBundle(
      resolvedOrder,
      pass,
      issuerId || 'ISSUER_ID_REQUIRED',
    );

    if (missingEnvVars.length > 0) {
      res.json({
        ready: false,
        reason: 'GOOGLE_WALLET_NOT_CONFIGURED',
        missingEnvVars,
        classId: bundle.classId,
        objectId: bundle.objectId,
        passPayload: {
          eventTicketClass: bundle.eventTicketClass,
          eventTicketObject: bundle.eventTicketObject,
        },
      });
      return;
    }

    const requestOrigin =
      (typeof origin === 'string' && origin.startsWith('http') ? origin : '') ||
      (typeof req.headers.origin === 'string' ? req.headers.origin : '') ||
      (process.env.APP_URL || 'https://evr.browns.co.in');

    const claims = {
      iss: serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [requestOrigin],
      payload: {
        eventTicketClasses: [bundle.eventTicketClass],
        eventTicketObjects: [bundle.eventTicketObject],
      },
    };

    try {
      const token = signRs256Jwt(claims, normalizedPrivateKey);
      res.json({
        ready: true,
        saveUrl: `https://pay.google.com/gp/v/save/${token}`,
        classId: bundle.classId,
        objectId: bundle.objectId,
        passPayload: {
          eventTicketClass: bundle.eventTicketClass,
          eventTicketObject: bundle.eventTicketObject,
        },
      });
    } catch (err) {
      console.error('Google Wallet JWT signing error:', err);
      res.status(500).json({
        error: 'Google Wallet private key could not sign the pass. Verify GOOGLE_WALLET_PRIVATE_KEY format.',
        code: 'WALLET_SIGN_ERROR',
      });
    }
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.', code: 'ROUTE_NOT_FOUND' });
  });

  return app;
}
