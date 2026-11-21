import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';
import { useMapsConfig } from './MapsProvider.tsx';
import { geocodeVenueAddress } from '../lib/api.ts';
import { formatInr } from '../lib/format.ts';
import type { EvoraEvent } from '../types/ticketing.ts';

interface ResolvedEventPin {
  event: EvoraEvent;
  lat: number;
  lng: number;
}

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

function BoundsFitter({ pins }: { pins: ResolvedEventPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || pins.length === 0) return;

    if (pins.length === 1) {
      map.panTo({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    pins.forEach((pin) => {
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    });
    map.fitBounds(bounds, 64);
  }, [map, pins]);

  return null;
}

interface EventsMapViewProps {
  events: EvoraEvent[];
}

export function EventsMapView({ events }: EventsMapViewProps) {
  const { configured, loading: configLoading } = useMapsConfig();
  const placesLib = useMapsLibrary('places');
  const [coordsByEventId, setCoordsByEventId] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [resolving, setResolving] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const missing = events.filter(
      (evt) =>
        (typeof evt.latitude !== 'number' || typeof evt.longitude !== 'number') &&
        !coordsByEventId[evt.id],
    );

    if (missing.length === 0) {
      setResolving(false);
      return;
    }

    setResolving(true);
    Promise.all(
      missing.map(async (evt) => {
        const queryText = `${evt.venueName}, ${evt.venueAddress}`;
        const serverGeo = await geocodeVenueAddress(queryText);
        if (serverGeo) {
          return { id: evt.id, lat: serverGeo.lat, lng: serverGeo.lng };
        }
        if (placesLib) {
          try {
            const { places } = await placesLib.Place.searchByText({
              textQuery: queryText,
              fields: ['location'],
              maxResultCount: 1,
            });
            const loc = places?.[0]?.location;
            if (loc) {
              return { id: evt.id, lat: loc.lat(), lng: loc.lng() };
            }
          } catch {
            return null;
          }
        }
        return null;
      }),
    )
      .then((resolvedList) => {
        if (!active) return;
        const updates: Record<string, { lat: number; lng: number }> = {};
        resolvedList.forEach((item) => {
          if (item) {
            updates[item.id] = { lat: item.lat, lng: item.lng };
          }
        });
        if (Object.keys(updates).length > 0) {
          setCoordsByEventId((prev) => ({ ...prev, ...updates }));
        }
      })
      .finally(() => {
        if (active) setResolving(false);
      });

    return () => {
      active = false;
    };
  }, [events, coordsByEventId, placesLib]);

  const pins = useMemo<ResolvedEventPin[]>(() => {
    return events.flatMap((event) => {
      if (typeof event.latitude === 'number' && typeof event.longitude === 'number') {
        return [{ event, lat: event.latitude, lng: event.longitude }];
      }
      const cached = coordsByEventId[event.id];
      if (cached) {
        return [{ event, lat: cached.lat, lng: cached.lng }];
      }
      return [];
    });
  }, [events, coordsByEventId]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return pins[0]?.event || null;
    return events.find((e) => e.id === selectedEventId) || pins[0]?.event || null;
  }, [events, pins, selectedEventId]);

  if (configLoading) {
    return (
      <div className="rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] p-12 text-center">
        <p className="text-sm text-[#5e5e5e]">Loading map...</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] p-12 text-center">
        <h2 className="text-lg font-bold text-[#000000]">Map view unavailable right now</h2>
        <p className="mt-2 text-sm text-[#5e5e5e]">
          Switch to List view to browse all campus venues and event schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8">
        <div className="relative h-[500px] w-full overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3]">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={INDIA_CENTER}
            defaultZoom={5}
            gestureHandling="cooperative"
            mapTypeControl={false}
            streetViewControl={false}
            internalUsageAttributionIds={ATTRIBUTION_IDS}
            className="h-full w-full"
          >
            <BoundsFitter pins={pins} />
            {pins.map((pin) => {
              const isSelected = selectedEvent?.id === pin.event.id;
              return (
                <AdvancedMarker
                  key={pin.event.id}
                  position={{ lat: pin.lat, lng: pin.lng }}
                  title={pin.event.title}
                  onClick={() => setSelectedEventId(pin.event.id)}
                >
                  <Pin
                    background={isSelected ? '#ffffff' : '#000000'}
                    borderColor="#000000"
                    glyphColor={isSelected ? '#000000' : '#ffffff'}
                  />
                </AdvancedMarker>
              );
            })}
          </GoogleMap>

          {resolving ? (
            <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-1.5 text-xs font-medium text-[#000000]">
              Locating event venues...
            </div>
          ) : null}
        </div>
        <p className="mt-3 font-mono-tabular text-xs text-[#5e5e5e]">
          Showing {pins.length} of {events.length} filtered venues on map. Click any pin to view pass details.
        </p>
      </div>

      <aside className="lg:col-span-4 space-y-4">
        {selectedEvent ? (
          <div className="overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#ffffff]">
            <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#e2e2e2] bg-[#f3f3f3]">
              <img
                src={selectedEvent.coverImage}
                alt={selectedEvent.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover block"
              />
              {selectedEventId ? (
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  aria-label="Reset selected event"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e2e2e2] bg-[#ffffff] text-[#000000]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="p-6">
              <p className="text-xs text-[#5e5e5e]">
                {selectedEvent.dateLabel} · {selectedEvent.city} · {selectedEvent.category}
              </p>
              <h2 className="mt-2 text-lg font-bold text-[#000000] leading-snug">
                {selectedEvent.title}
              </h2>
              <div className="mt-3 flex items-start gap-2 text-xs text-[#5e5e5e]">
                <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-[#000000]" />
                <span>
                  {selectedEvent.venueName} · {selectedEvent.venueAddress}
                </span>
              </div>

              <div className="mt-5 pt-4 border-t border-[#e2e2e2] flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono-tabular text-sm font-semibold text-[#000000]">
                    {Math.min(...selectedEvent.tiers.map((t) => t.pricePaise)) === 0
                      ? 'Free / Paid'
                      : `From ${formatInr(Math.min(...selectedEvent.tiers.map((t) => t.pricePaise)))}`}
                  </p>
                  <p className="mt-0.5 font-mono-tabular text-xs text-[#5e5e5e]">
                    {selectedEvent.tiers.reduce((s, t) => s + t.remaining, 0)} spots left
                  </p>
                </div>
                <Link
                  to={`/events/${selectedEvent.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#000000] active:bg-[#282828] px-4 py-2 text-xs font-medium text-[#ffffff] whitespace-nowrap shrink-0"
                >
                  Get Tickets
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e] pb-3 border-b border-[#e2e2e2]">
            Venues in View ({events.length})
          </p>
          <div className="mt-3 max-h-[220px] overflow-y-auto divide-y divide-[#e2e2e2]">
            {events.map((evt) => {
              const active = selectedEvent?.id === evt.id;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-full py-2.5 text-left ${
                    active ? 'font-semibold text-[#000000]' : 'text-[#5e5e5e]'
                  }`}
                >
                  <p className="text-xs leading-snug text-[#000000]">{evt.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#5e5e5e]">
                    {evt.venueName} · {evt.city}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
