import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, List, Map as MapIcon } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { EventImage } from '../components/EventImage.tsx';
import { EventsMapView } from '../components/EventsMapView.tsx';
import { listMergedEvents } from '../lib/firestoreStore.ts';
import { formatInr } from '../lib/format.ts';
import { SEED_EVENTS } from '../data/seedEvents.ts';
import { EVENT_CATEGORIES, type EvoraEvent } from '../types/ticketing.ts';

const CATEGORIES = ['All', ...EVENT_CATEGORIES] as const;

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EvoraEvent[]>(SEED_EVENTS);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [city, setCity] = useState<string>(searchParams.get('city') || 'All');
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'date');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'list',
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const catParam = searchParams.get('category') || 'All';
    const cityParam = searchParams.get('city') || 'All';
    const sortParam = searchParams.get('sort') || 'date';
    const viewParam = searchParams.get('view') === 'map' ? 'map' : 'list';
    setQuery(qParam);
    setCategory(catParam);
    setCity(cityParam);
    setSort(sortParam);
    setViewMode(viewParam);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    listMergedEvents({ q: query, category, city, sort })
      .then((list) => {
        if (active) setEvents(list);
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Unable to load events right now.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, category, city, sort]);

  const updateUrlFilters = (next: {
    q?: string;
    category?: string;
    city?: string;
    sort?: string;
    view?: 'list' | 'map';
  }) => {
    const params = new URLSearchParams();
    const finalQ = next.q !== undefined ? next.q : query;
    const finalCat = next.category !== undefined ? next.category : category;
    const finalCity = next.city !== undefined ? next.city : city;
    const finalSort = next.sort !== undefined ? next.sort : sort;
    const finalView = next.view !== undefined ? next.view : viewMode;
    if (finalQ.trim()) params.set('q', finalQ.trim());
    if (finalCat && finalCat !== 'All') params.set('category', finalCat);
    if (finalCity && finalCity !== 'All') params.set('city', finalCity);
    if (finalSort && finalSort !== 'date') params.set('sort', finalSort);
    if (finalView === 'map') params.set('view', 'map');
    setSearchParams(params, { replace: true });
  };

  const cities = useMemo(() => {
    const unique = new Set<string>(['All']);
    SEED_EVENTS.forEach((e) => unique.add(e.city));
    events.forEach((e) => unique.add(e.city));
    return Array.from(unique);
  }, [events]);

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="display-xxl text-[#000000]">Events</h1>
              <p className="mt-2 text-sm text-[#5e5e5e]">
                {loading
                  ? 'Updating events...'
                  : `${events.length} ${events.length === 1 ? 'event' : 'events'} available`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                role="group"
                aria-label="Event display mode"
                className="inline-flex rounded-lg bg-[#efefef] p-1"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => {
                    setViewMode('list');
                    updateUrlFilters({ view: 'list' });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium ${
                    viewMode === 'list'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-transparent text-[#000000]'
                  }`}
                >
                  <List size={14} aria-hidden="true" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'map'}
                  onClick={() => {
                    setViewMode('map');
                    updateUrlFilters({ view: 'map' });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium ${
                    viewMode === 'map'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-transparent text-[#000000]'
                  }`}
                >
                  <MapIcon size={14} aria-hidden="true" />
                  <span>Map</span>
                </button>
              </div>
              <Link
                to="/host"
                className="text-sm font-medium text-[#000000] underline whitespace-nowrap shrink-0"
              >
                List your event
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-5 relative">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000]"
              />
              <label htmlFor="event-search" className="sr-only">
                Search events
              </label>
              <input
                id="event-search"
                type="search"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  updateUrlFilters({ q: val });
                }}
                placeholder="Search by fest, hackathon, venue, or college"
                className="w-full rounded-lg bg-[#efefef] pl-11 pr-4 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
              />
            </div>

            <div className="lg:col-span-4">
              <label htmlFor="city-filter" className="sr-only">
                Filter by city
              </label>
              <select
                id="city-filter"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  updateUrlFilters({ city: e.target.value });
                }}
                className="w-full rounded-lg bg-[#efefef] px-4 py-3 text-sm text-[#000000]"
              >
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item === 'All' ? 'All cities' : item}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="sort-filter" className="sr-only">
                Sort events
              </label>
              <select
                id="sort-filter"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateUrlFilters({ sort: e.target.value });
                }}
                className="w-full rounded-lg bg-[#efefef] px-4 py-3 text-sm text-[#000000]"
              >
                <option value="date">Soonest first</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter by category"
            className="mt-5 flex flex-wrap gap-2"
          >
            {CATEGORIES.map((item) => {
              const selected = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setCategory(item);
                    updateUrlFilters({ category: item });
                  }}
                  className={`px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap ${
                    selected
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#efefef] text-[#000000]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-16">
        {errorMessage ? (
          <div className="rounded-xl border border-[#b42318] bg-[#ffffff] p-5 text-sm text-[#b42318] mb-8">
            {errorMessage}
          </div>
        ) : null}

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] p-12 text-center">
            <h2 className="text-xl font-bold text-[#000000]">
              No events match these filters
            </h2>
            <p className="mt-2 text-sm text-[#5e5e5e]">
              Clear your search or try another city or category.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                  setCity('All');
                  setSort('date');
                  setSearchParams(viewMode === 'map' ? { view: 'map' } : {}, { replace: true });
                }}
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-2.5 rounded-full"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <EventsMapView events={events} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {events.map((event) => {
              const lowestPaise = Math.min(...event.tiers.map((t) => t.pricePaise));
              const seatsRemaining = event.tiers.reduce((acc, t) => acc + t.remaining, 0);
              return (
                <article
                  key={event.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#ffffff]"
                >
                  <Link to={`/events/${event.slug}`} className="block">
                    <EventImage
                      src={event.coverImage}
                      alt={event.title}
                      aspectClass="aspect-[16/10]"
                      className="[&>div]:rounded-none [&>div]:border-0 [&>div]:border-b [&>div]:border-[#e2e2e2]"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <p className="text-xs text-[#5e5e5e]">
                        {event.dateLabel} · {event.city} · {event.category}
                      </p>
                      <h2 className="mt-2.5 display-md text-[#000000]">
                        <Link to={`/events/${event.slug}`}>{event.title}</Link>
                      </h2>
                      <p className="mt-2.5 text-sm text-[#5e5e5e] leading-relaxed">
                        {event.subtitle}
                      </p>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[#e2e2e2] flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono-tabular text-sm font-semibold text-[#000000]">
                          {lowestPaise === 0 ? 'Free / Paid' : `From ${formatInr(lowestPaise)}`}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5e5e5e] font-mono-tabular">
                          {seatsRemaining} left · {event.venueName}
                        </p>
                      </div>
                      <Link
                        to={`/events/${event.slug}`}
                        className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-2.5 rounded-full whitespace-nowrap shrink-0"
                      >
                        Tickets
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
