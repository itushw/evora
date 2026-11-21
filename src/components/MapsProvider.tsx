import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { fetchMapsRuntimeConfig } from '../lib/api.ts';

interface MapsContextValue {
  apiKey: string;
  loading: boolean;
  configured: boolean;
}

const MapsContext = createContext<MapsContextValue>({
  apiKey: '',
  loading: true,
  configured: false,
});

const MAPS_LIBRARIES = ['marker', 'places'];

export function MapsProvider({ children }: { children: ReactNode }) {
  const buildTimeKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const [apiKey, setApiKey] = useState<string>(buildTimeKey);
  const [loading, setLoading] = useState<boolean>(!buildTimeKey);

  useEffect(() => {
    if (buildTimeKey) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchMapsRuntimeConfig()
      .then((cfg) => {
        if (!active) return;
        if (cfg.configured && cfg.apiKey) {
          setApiKey(cfg.apiKey);
        }
      })
      .catch(() => {
        // Keep unconfigured state gracefully
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [buildTimeKey]);

  const value = useMemo<MapsContextValue>(
    () => ({
      apiKey,
      loading,
      configured: Boolean(apiKey),
    }),
    [apiKey, loading],
  );

  if (!apiKey) {
    return <MapsContext.Provider value={value}>{children}</MapsContext.Provider>;
  }

  return (
    <MapsContext.Provider value={value}>
      <APIProvider
        apiKey={apiKey}
        libraries={MAPS_LIBRARIES}
        language="en"
        region="IN"
        onError={() => {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }}
      >
        {children}
      </APIProvider>
    </MapsContext.Provider>
  );
}

export function useMapsConfig(): MapsContextValue {
  return useContext(MapsContext);
}
