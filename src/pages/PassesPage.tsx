import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchOrderById, searchOrders } from '../lib/api.ts';
import { getUserOrderById, listUserOrders } from '../lib/firestoreStore.ts';
import { formatInr, formatIsoDateTime, getSavedOrderIds } from '../lib/format.ts';
import type { TicketOrder } from '../types/ticketing.ts';

export function PassesPage() {
  const { user, authReady, openAuthModal } = useAuth();
  const [accountOrders, setAccountOrders] = useState<TicketOrder[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResults, setLookupResults] = useState<TicketOrder[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!authReady) return;
    let active = true;

    async function loadOrders() {
      setLoadingAccount(true);
      try {
        const merged = new Map<string, TicketOrder>();

        if (user) {
          const remote = await listUserOrders(user.uid).catch(() => []);
          remote.forEach((order) => merged.set(order.orderId, order));
        }

        const savedIds = getSavedOrderIds();
        if (savedIds.length > 0) {
          const localResolved = await Promise.all(
            savedIds.map((id) => fetchOrderById(id).catch(() => null)),
          );
          localResolved.forEach((order) => {
            if (order && !merged.has(order.orderId)) {
              merged.set(order.orderId, order);
            }
          });
        }

        if (active) {
          setAccountOrders(
            Array.from(merged.values()).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            ),
          );
        }
      } finally {
        if (active) setLoadingAccount(false);
      }
    }

    void loadOrders();
    return () => {
      active = false;
    };
  }, [user, authReady]);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const cleaned = lookupInput.trim();
    if (!cleaned) return;
    setErrorText('');
    setSearching(true);
    try {
      const isOrderCode = cleaned.toUpperCase().startsWith('EVR-');
      const matches = new Map<string, TicketOrder>();

      if (isOrderCode && user) {
        const firestoreOrder = await getUserOrderById(cleaned).catch(() => null);
        if (firestoreOrder) matches.set(firestoreOrder.orderId, firestoreOrder);
      } else if (!isOrderCode && user) {
        accountOrders
          .filter((o) => o.buyerEmail.toLowerCase() === cleaned.toLowerCase())
          .forEach((o) => matches.set(o.orderId, o));
      }

      const apiResults = await searchOrders(
        isOrderCode ? { orderId: cleaned } : { email: cleaned },
      ).catch(() => []);
      apiResults.forEach((o) => {
        if (!matches.has(o.orderId)) matches.set(o.orderId, o);
      });

      setLookupResults(
        Array.from(matches.values()).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Unable to find orders right now.');
    } finally {
      setSearching(false);
    }
  }

  const displayedOrders = lookupResults !== null ? lookupResults : accountOrders;

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-18">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="display-xxl text-[#000000]">My passes</h1>
              <p className="mt-3 text-base text-[#5e5e5e] max-w-xl leading-relaxed">
                {user
                  ? `Showing passes linked to ${user.email || user.displayName}.`
                  : 'Sign in to access your account-synced passes, or search using your Order ID.'}
              </p>
            </div>
            {authReady && !user ? (
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full whitespace-nowrap shrink-0"
              >
                Sign In to Sync Passes
              </button>
            ) : null}
          </div>

          <form
            onSubmit={handleLookup}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl"
          >
            <label htmlFor="order-lookup" className="sr-only">
              Order ID or email address
            </label>
            <input
              id="order-lookup"
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Order ID (EVR-2026-...) or email address"
              className="flex-1 bg-[#efefef] px-4 py-3.5 text-sm text-[#000000] placeholder:text-[#5e5e5e] rounded-lg"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-6 py-3.5 rounded-full whitespace-nowrap shrink-0"
            >
              {searching ? 'Searching...' : 'Find Pass'}
            </button>
            {lookupResults !== null ? (
              <button
                type="button"
                onClick={() => {
                  setLookupInput('');
                  setLookupResults(null);
                  setErrorText('');
                }}
                className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-4 py-3.5 rounded-full whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            ) : null}
          </form>

          {errorText ? (
            <p className="mt-4 text-sm text-[#b42318]" role="alert">
              {errorText}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-16">
        <div className="pb-4 border-b border-[#e2e2e2] flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
            {lookupResults !== null
              ? 'Matching Orders'
              : user
                ? 'Your Account Passes'
                : 'Recent Bookings'}
          </h2>
          <span className="font-mono-tabular text-xs text-[#5e5e5e]">
            {loadingAccount
              ? 'Syncing...'
              : `${displayedOrders.length} ${displayedOrders.length === 1 ? 'order' : 'orders'}`}
          </span>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="mt-8 border border-[#e2e2e2] bg-[#f3f3f3] p-12 rounded-2xl">
            <h3 className="text-xl font-bold text-[#000000]">
              {lookupResults !== null ? 'No matching orders found' : 'No passes booked yet'}
            </h3>
            <p className="mt-2 text-sm text-[#5e5e5e] max-w-lg leading-relaxed">
              {lookupResults !== null
                ? 'Double-check your email address or Order ID and try again.'
                : 'Once you book a fest, hackathon, arts showcase, or workshop, your passes show up here immediately.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/events"
                className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
              >
                Explore Events
              </Link>
              {authReady && !user ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="inline-flex items-center justify-center border border-[#e2e2e2] bg-[#ffffff] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
                >
                  Sign In
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e2e2] border-b border-[#e2e2e2] bg-[#ffffff]">
            {displayedOrders.map((order) => (
              <div
                key={order.orderId}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
              >
                <div className="md:col-span-3">
                  <p className="font-mono-tabular text-sm font-semibold text-[#000000]">
                    {order.orderId}
                  </p>
                  <p className="mt-1 font-mono-tabular text-xs text-[#5e5e5e]">
                    {formatIsoDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="md:col-span-5">
                  <p className="text-base font-bold text-[#000000]">{order.eventTitle}</p>
                  <p className="mt-1 text-xs text-[#5e5e5e]">
                    {order.tierName} x {order.quantity} · {order.eventDateLabel} · {order.city}
                  </p>
                </div>

                <div className="md:col-span-2 md:text-right">
                  <p className="font-mono-tabular text-sm font-semibold text-[#000000]">
                    {formatInr(order.totalPaise)}
                  </p>
                  <p
                    className={`mt-1 font-mono-tabular text-xs font-medium ${
                      order.status === 'confirmed' ? 'text-[#166534]' : 'text-[#b42318]'
                    }`}
                  >
                    {order.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                  </p>
                </div>

                <div className="md:col-span-2 flex md:justify-end">
                  <Link
                    to={`/tickets/${order.orderId}`}
                    className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-4 py-2 rounded-full whitespace-nowrap"
                  >
                    View Pass
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
