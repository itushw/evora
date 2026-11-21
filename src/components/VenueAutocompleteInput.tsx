import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Check } from 'lucide-react';
import { useMapsConfig } from './MapsProvider.tsx';

export interface SelectedVenuePlace {
  venueName: string;
  venueAddress: string;
  city: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

interface VenueAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: SelectedVenuePlace) => void;
  verifiedLabel?: string;
}

interface SuggestionItem {
  id: string;
  primaryText: string;
  secondaryText: string;
  raw: google.maps.places.AutocompleteSuggestion;
}

function extractCityFromComponents(
  components?: google.maps.places.AddressComponent[],
): string {
  if (!components || components.length === 0) return '';
  const locality = components.find((c) => c.types.includes('locality'));
  if (locality?.longText) return locality.longText;
  const admin2 = components.find((c) => c.types.includes('administrative_area_level_2'));
  if (admin2?.longText) return admin2.longText;
  const admin1 = components.find((c) => c.types.includes('administrative_area_level_1'));
  return admin1?.longText || '';
}

function PlacesAutocompleteCore({
  value,
  onChange,
  onPlaceSelected,
  verifiedLabel,
}: VenueAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (placesLib && !sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib || !open) return;
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
        });

        if (cancelled) return;
        const nextItems: SuggestionItem[] = (response.suggestions || [])
          .filter((item) => item.placePrediction)
          .slice(0, 5)
          .map((item, idx) => {
            const pred = item.placePrediction!;
            return {
              id: pred.placeId || `sug_${idx}`,
              primaryText: pred.mainText?.text || pred.text?.text || trimmed,
              secondaryText: pred.secondaryText?.text || '',
              raw: item,
            };
          });
        setSuggestions(nextItems);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, value, open]);

  const handleSelect = async (item: SuggestionItem) => {
    setOpen(false);
    setSuggestions([]);
    const prediction = item.raw.placePrediction;
    if (!prediction) return;

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'id'],
      });

      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const resolvedVenueName = place.displayName || item.primaryText;
      const resolvedAddress = place.formattedAddress || item.secondaryText || resolvedVenueName;
      const resolvedCity = extractCityFromComponents(place.addressComponents);

      onPlaceSelected({
        venueName: resolvedVenueName,
        venueAddress: resolvedAddress,
        city: resolvedCity,
        placeId: place.id || item.id,
        latitude: lat,
        longitude: lng,
      });

      // Reset session token after Place Details completion
      if (placesLib) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          size={16}
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#000000]"
        />
        <input
          id="host-venue"
          type="text"
          required
          autoComplete="off"
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder="Search campus auditorium, college, or venue"
          className="w-full rounded-lg bg-[#efefef] pl-10 pr-4 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
        />
      </div>

      {verifiedLabel ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[#166534]">
          <Check size={13} aria-hidden="true" />
          <span>Map pin verified: {verifiedLabel}</span>
        </p>
      ) : null}

      {open && (suggestions.length > 0 || searching) ? (
        <div
          role="listbox"
          aria-label="Venue suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[#e2e2e2] bg-[#ffffff]"
        >
          {searching && suggestions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#5e5e5e]">Searching venues...</p>
          ) : (
            <ul className="divide-y divide-[#e2e2e2]">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void handleSelect(item);
                    }}
                    className="w-full px-4 py-3 text-left bg-[#ffffff] active:bg-[#efefef]"
                  >
                    <p className="text-sm font-medium text-[#000000]">{item.primaryText}</p>
                    {item.secondaryText ? (
                      <p className="mt-0.5 text-xs text-[#5e5e5e]">{item.secondaryText}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function VenueAutocompleteInput(props: VenueAutocompleteInputProps) {
  const { configured } = useMapsConfig();

  if (!configured) {
    return (
      <input
        id="host-venue"
        type="text"
        required
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="Main Engineering Auditorium"
        className="w-full rounded-lg bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
      />
    );
  }

  return <PlacesAutocompleteCore {...props} />;
}
