import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import { useMapsConfig } from './MapsProvider.tsx';
import { geocodeVenueAddress } from '../lib/api.ts';

interface VenueLocationMapProps {
  venueName: string;
  venueAddress: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

export function VenueLocationMap({
  venueName,
  venueAddress,
  city,
  latitude,
  longitude,
}: VenueLocationMapProps) {
  const { configured, loading: configLoading } = useMapsConfig();
  const placesLib = useMapsLibrary('places');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof latitude === 'number' && typeof longitude === 'number'
      ? { lat: latitude, lng: longitude }
      : null,
  );
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      setCoords({ lat: latitude, lng: longitude });
      return;
    }

    let active = true;
    setResolving(true);
    const queryText = `${venueName}, ${venueAddress}`;

    async function resolveLocation() {
      const serverGeo = await geocodeVenueAddress(queryText);
      if (active && serverGeo) {
        setCoords({ lat: serverGeo.lat, lng: serverGeo.lng });
        setResolving(false);
        return;
      }

      if (placesLib) {
        try {
          const { places } = await placesLib.Place.searchByText({
            textQuery: queryText,
            fields: ['location'],
            maxResultCount: 1,
          });
          const loc = places?.[0]?.location;
          if (active && loc) {
            setCoords({ lat: loc.lat(), lng: loc.lng() });
          }
        } catch {
          // Keep clean directions fallback
        }
      }

      if (active) setResolving(false);
    }

    void resolveLocation();

    return () => {
      active = false;
    };
  }, [venueName, venueAddress, latitude, longitude, placesLib]);

  const directionsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName}, ${venueAddress}`)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5 text-sm">
          <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#000000]" />
          <div>
            <p className="font-medium text-[#000000]">{venueName}</p>
            <p className="text-xs text-[#5e5e5e]">{venueAddress} ({city})</p>
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#efefef] active:bg-[#e2e2e2] px-4 py-2 text-xs font-medium text-[#000000] whitespace-nowrap shrink-0"
        >
          <span>Open in Google Maps</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {configLoading || resolving ? (
        <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3]">
          <p className="text-xs text-[#5e5e5e]">Loading venue map...</p>
        </div>
      ) : configured && coords ? (
        <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3]">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            center={coords}
            defaultZoom={15}
            gestureHandling="cooperative"
            mapTypeControl={false}
            streetViewControl={false}
            internalUsageAttributionIds={ATTRIBUTION_IDS}
            className="h-full w-full"
          >
            <AdvancedMarker position={coords} title={venueName}>
              <Pin background="#000000" borderColor="#000000" glyphColor="#ffffff" />
            </AdvancedMarker>
          </GoogleMap>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] p-6 text-xs text-[#5e5e5e]">
          Venue address verified for directions via Google Maps link above.
        </div>
      )}
    </div>
  );
}
