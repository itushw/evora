import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight, Pause, Play } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { EventImage } from '../components/EventImage.tsx';
import { listMergedEvents } from '../lib/firestoreStore.ts';
import { formatInr } from '../lib/format.ts';
import { SEED_EVENTS } from '../data/seedEvents.ts';
import { EVENT_CATEGORIES, type EvoraEvent } from '../types/ticketing.ts';

const HOME_CATEGORIES = ['All', ...EVENT_CATEGORIES] as const;

function lowestPricePaise(event: EvoraEvent): number {
  return Math.min(...event.tiers.map((t) => t.pricePaise));
}

function totalRemaining(event: EvoraEvent): number {
  return event.tiers.reduce((sum, t) => sum + t.remaining, 0);
}

export function HomePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [events, setEvents] = useState<EvoraEvent[]>(SEED_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [videoPaused, setVideoPaused] = useState(false);

  useEffect(() => {
    let mounted = true;
    listMergedEvents()
      .then((data) => {
        if (mounted && data.length > 0) {
          setEvents(data);
        }
      })
      .catch(() => {
        // Keep seeded events cleanly
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced && videoRef.current) {
      videoRef.current.pause();
      setVideoPaused(true);
    }
  }, []);

  const toggleHeroVideo = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => {});
      setVideoPaused(false);
    } else {
      el.pause();
      setVideoPaused(true);
    }
  };

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((evt) => {
      counts.set(evt.city, (counts.get(evt.city) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [events]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: events.length };
    EVENT_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });
    events.forEach((evt) => {
      counts[evt.category] = (counts[evt.category] || 0) + 1;
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'All') return events;
    return events.filter((evt) => evt.category === selectedCategory);
  }, [events, selectedCategory]);

  const viewAllHref =
    selectedCategory === 'All'
      ? '/events'
      : `/events?category=${encodeURIComponent(selectedCategory)}`;

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCity !== 'All') params.set('city', selectedCity);
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    const qs = params.toString();
    navigate(`/events${qs ? `?${qs}` : ''}`);
  };

  return (
    <PageTransition>
      {/* Hero section ONLY: looping real college-events video extends behind the frosted top nav */}
      <section className="relative -mt-16 pt-16 w-full overflow-hidden border-b border-white/15 bg-[#000000]">
        <video
          ref={videoRef}
          src="/src/assets/videos/college_events_hero.mp4"
          poster="/src/assets/images/real_fest_crowd.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hero-video-scrim"
        />

        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="display-xxl text-[#ffffff]">
                Find your next event on campus and around the city.
              </h1>
              <p className="mt-5 text-base text-[#f3f3f3] max-w-lg leading-relaxed">
                Browse upcoming college fests, hackathons, arts showcases, workshops, and live nights. Book your spot and get your pass right away.
              </p>
            </div>

            <div className="lg:col-span-5">
              <form
                onSubmit={handleHeroSearch}
                className="glass-light rounded-2xl border border-white/60 p-6 space-y-3.5"
              >
                <p className="text-xs font-medium text-[#282828]">
                  Search Campus Events
                </p>

                <div className="relative">
                  <Search
                    size={16}
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000]"
                  />
                  <label htmlFor="hero-search-query" className="sr-only">
                    Search events, colleges, or hackathons
                  </label>
                  <input
                    id="hero-search-query"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search fest, hackathon, or college"
                    className="w-full rounded-lg border border-black/10 bg-white/85 pl-11 pr-4 py-3.5 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
                  />
                </div>

                <div className="relative">
                  <MapPin
                    size={16}
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000]"
                  />
                  <label htmlFor="hero-search-city" className="sr-only">
                    Select city
                  </label>
                  <select
                    id="hero-search-city"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full rounded-lg border border-black/10 bg-white/85 pl-11 pr-4 py-3.5 text-sm text-[#000000]"
                  >
                    <option value="All">All cities</option>
                    {cities.map(([cityName]) => (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#000000] active:bg-[#282828] text-[#ffffff] text-base font-medium px-6 py-3.5 rounded-xl"
                >
                  See Events
                </button>
              </form>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={toggleHeroVideo}
              aria-label={videoPaused ? 'Play background video' : 'Pause background video'}
              className="glass-dark inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-[#ffffff]"
            >
              {videoPaused ? (
                <>
                  <Play size={13} aria-hidden="true" />
                  <span>Play video</span>
                </>
              ) : (
                <>
                  <Pause size={13} aria-hidden="true" />
                  <span>Pause video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-[#e2e2e2]">
            <div>
              <h2 className="display-xl text-[#000000]">Upcoming events</h2>
              <p className="mt-2 text-sm text-[#5e5e5e]">
                Open for registration right now.
              </p>
            </div>
            <Link
              to={viewAllHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#000000] underline whitespace-nowrap shrink-0"
            >
              <span>
                {selectedCategory === 'All'
                  ? `View all (${filteredEvents.length})`
                  : `View all ${selectedCategory} (${filteredEvents.length})`}
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div
            role="tablist"
            aria-label="Filter upcoming events by category"
            className="mt-6 inline-flex flex-wrap gap-2 rounded-2xl glass-light border border-white/70 p-2"
          >
            {HOME_CATEGORIES.map((item) => {
              const active = selectedCategory === item;
              const count = categoryCounts[item] || 0;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(item)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap ${
                    active
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-black/5 text-[#000000]'
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      active ? 'text-[#afafaf]' : 'text-[#5e5e5e]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="mt-10 rounded-2xl glass-light border border-[#e2e2e2] p-12 text-center">
              <h3 className="text-lg font-bold text-[#000000]">
                No upcoming events in {selectedCategory} yet
              </h3>
              <p className="mt-2 text-sm text-[#5e5e5e]">
                Switch categories or host the first campus event in this category.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="rounded-full bg-[#000000] active:bg-[#282828] px-5 py-2.5 text-sm font-medium text-[#ffffff]"
                >
                  Show All Events
                </button>
                <Link
                  to="/host"
                  className="rounded-full bg-[#ffffff] border border-[#e2e2e2] px-5 py-2.5 text-sm font-medium text-[#000000]"
                >
                  Host an Event
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              {filteredEvents.slice(0, 6).map((event) => {
                const startingPaise = lowestPricePaise(event);
                const seatsLeft = totalRemaining(event);
                return (
                  <article
                    key={event.id}
                    className="flex flex-col overflow-hidden rounded-2xl glass-light border border-[#e2e2e2]"
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
                        <h3 className="mt-2.5 display-md text-[#000000]">
                          <Link to={`/events/${event.slug}`}>{event.title}</Link>
                        </h3>
                        <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
                          {event.venueName}
                        </p>
                      </div>

                      <div className="mt-6 pt-5 border-t border-[#e2e2e2] flex items-center justify-between gap-4">
                        <div>
                          <p className="font-mono-tabular text-sm font-semibold text-[#000000]">
                            {startingPaise === 0 ? 'Free' : `From ${formatInr(startingPaise)}`}
                          </p>
                          <p className="mt-0.5 font-mono-tabular text-xs text-[#5e5e5e]">
                            {seatsLeft} spots left
                          </p>
                        </div>
                        <Link
                          to={`/events/${event.slug}`}
                          className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-2.5 rounded-full whitespace-nowrap shrink-0"
                        >
                          Get Tickets
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="w-full border-t border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4">
              <h2 className="display-xl text-[#000000]">Browse by city</h2>
              <p className="mt-3 text-sm text-[#5e5e5e] leading-relaxed">
                Jump straight to fests, hackathons, arts showcases, and workshops happening near your campus.
              </p>
            </div>
            <div className="lg:col-span-8 overflow-hidden rounded-2xl glass-soft border border-[#e2e2e2] divide-y divide-[#e2e2e2]">
              {cities.map(([cityName, count]) => (
                <Link
                  key={cityName}
                  to={`/events?city=${encodeURIComponent(cityName)}`}
                  className="flex items-center justify-between px-6 py-5 text-[#000000]"
                >
                  <span className="text-lg font-semibold">{cityName}</span>
                  <span className="font-mono-tabular text-sm text-[#5e5e5e]">
                    {count} {count === 1 ? 'event' : 'events'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative w-full overflow-hidden bg-[#000000] text-[#ffffff]">
        <img
          src="/src/assets/images/real_fest_crowd.jpg"
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black/55"
        />
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-8 py-16 md:py-24">
          <div className="glass-dark rounded-2xl border border-white/15 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <h2 className="display-xl text-[#ffffff]">
                  Organizing a college fest or hackathon?
                </h2>
                <p className="mt-4 text-base text-[#e2e2e2] max-w-xl leading-relaxed">
                  List your event, set ticket tiers or free RSVPs, and manage registrations in minutes.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/host"
                    className="inline-flex items-center justify-center bg-[#ffffff] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-6 py-3.5 rounded-full"
                  >
                    Host an Event
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center border border-white/30 bg-white/10 active:bg-white/20 text-[#ffffff] text-sm font-medium px-6 py-3.5 rounded-full"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5">
                <EventImage
                  src="/src/assets/images/real_fest_crowd.jpg"
                  alt="Audience gathered at a live college music festival"
                  aspectClass="aspect-[4/3]"
                  className="[&>div]:border-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
