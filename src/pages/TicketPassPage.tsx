import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, Download } from 'lucide-react';
import { PageTransition } from '../components/PageTransition.tsx';
import { QrCodeGraphic } from '../components/QrCodeGraphic.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchOrderById, refundOrder } from '../lib/api.ts';
import { cancelUserOrderInFirestore, getUserOrderById } from '../lib/firestoreStore.ts';
import { formatInr, formatIsoDateTime } from '../lib/format.ts';
import type { TicketOrder } from '../types/ticketing.ts';

export function TicketPassPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, authReady } = useAuth();
  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmRefundOpen, setConfirmRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (!orderId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setNotFound(false);

    async function load() {
      let found: TicketOrder | null = null;
      if (user) {
        found = await getUserOrderById(orderId!).catch(() => null);
      }
      if (!found) {
        found = await fetchOrderById(orderId!).catch(() => null);
      }
      if (!active) return;
      if (!found) {
        setNotFound(true);
      } else {
        setOrder(found);
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [orderId, user, authReady]);

  const handleDownloadReceipt = () => {
    if (!order) return;
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderId}-pass.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefund = async () => {
    if (!order) return;
    setActionError('');
    setRefunding(true);
    try {
      let updated: TicketOrder | null = null;
      if (user && order.userId === user.uid) {
        updated = await cancelUserOrderInFirestore(order);
        await refundOrder(order.orderId).catch(() => null);
      } else {
        updated = await refundOrder(order.orderId);
      }
      setOrder(updated);
      setConfirmRefundOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to cancel this order.');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-24">
          <p className="text-sm text-[#5e5e5e]">Loading your pass...</p>
        </div>
      </PageTransition>
    );
  }

  if (notFound || !order) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[760px] px-6 md:px-8 py-24">
          <div className="border border-[#e2e2e2] bg-[#ffffff] p-10 rounded-2xl">
            <p className="font-mono-tabular text-xs text-[#5e5e5e]">404</p>
            <h1 className="mt-3 display-xl text-[#000000]">Order not found</h1>
            <p className="mt-4 text-sm text-[#5e5e5e]">
              Check your order ID or sign in on My Passes to open orders linked to your account.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/passes"
                className="bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
              >
                Go to My Passes
              </Link>
              <Link
                to="/events"
                className="bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-5 py-3 rounded-full"
              >
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p
                className={`font-mono-tabular text-xs font-medium ${
                  order.status === 'confirmed' ? 'text-[#166534]' : 'text-[#b42318]'
                }`}
              >
                {order.status === 'confirmed'
                  ? `BOOKING CONFIRMED · ${order.orderId}`
                  : `ORDER CANCELLED · ${order.orderId}`}
              </p>
              <h1 className="mt-3 display-xl text-[#000000]">
                {order.eventTitle}
              </h1>
              <p className="mt-2 text-sm text-[#5e5e5e]">
                {order.eventDateLabel} · {order.eventTimeLabel} · {order.venueName}, {order.city}
              </p>
            </div>

            <div className="no-print flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-4 py-2.5 rounded-full"
              >
                <Printer size={15} aria-hidden="true" />
                <span>Print Pass</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-2 bg-[#efefef] active:bg-[#e2e2e2] text-[#000000] text-sm font-medium px-4 py-2.5 rounded-full"
              >
                <Download size={15} aria-hidden="true" />
                <span>Download Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1040px] px-6 md:px-8 py-12 space-y-12">
        {actionError ? (
          <div className="border border-[#b42318] bg-[#ffffff] p-4 text-sm text-[#b42318] rounded-xl">
            {actionError}
          </div>
        ) : null}

        <section>
          <h2 className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e] mb-5">
            Your Entry Passes ({order.passes.length})
          </h2>
          <div className="space-y-6">
            {order.passes.map((pass, index) => (
              <div
                key={pass.ticketId}
                className="border border-[#000000] bg-[#ffffff] p-7 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center rounded-2xl"
              >
                <div className="md:col-span-8 space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-[#e2e2e2]">
                    <span className="font-mono-tabular text-xs text-[#5e5e5e]">
                      PASS {String(index + 1).padStart(2, '0')} OF {String(order.passes.length).padStart(2, '0')}
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-[#000000]">
                      {order.status === 'confirmed' ? 'VALID FOR ENTRY' : 'CANCELLED'}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-[#5e5e5e]">Attendee</dt>
                      <dd className="mt-1 font-semibold text-[#000000]">{pass.holderName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#5e5e5e]">Pass Type & Code</dt>
                      <dd className="mt-1 font-mono-tabular font-semibold text-[#000000]">
                        {order.tierName} · {pass.seatCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#5e5e5e]">Pass ID</dt>
                      <dd className="mt-1 font-mono-tabular text-[#000000]">{pass.ticketId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#5e5e5e]">Venue</dt>
                      <dd className="mt-1 text-[#5e5e5e]">{order.venueAddress}</dd>
                    </div>
                  </dl>
                </div>

                <div className="md:col-span-4 flex flex-col items-start md:items-end">
                  <QrCodeGraphic
                    value={pass.qrPayload}
                    size={168}
                    label={`Entry QR code for pass ${pass.ticketId}`}
                  />
                  <p className="mt-2.5 text-xs text-[#5e5e5e]">
                    Show at venue entry
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#e2e2e2] bg-[#f3f3f3] p-7 md:p-8 rounded-2xl">
          <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
            Order Receipt
          </h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Order ID</dt>
                <dd className="font-mono-tabular text-[#000000]">{order.orderId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Reference</dt>
                <dd className="font-mono-tabular text-[#000000]">{order.paymentReference}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Booked On</dt>
                <dd className="font-mono-tabular text-[#5e5e5e]">
                  {formatIsoDateTime(order.createdAt)}
                </dd>
              </div>
              {order.refundedAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#b42318]">Cancelled On</dt>
                  <dd className="font-mono-tabular text-[#b42318]">
                    {formatIsoDateTime(order.refundedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <dl className="space-y-3 border-t md:border-t-0 md:border-l border-[#e2e2e2] pt-4 md:pt-0 md:pl-8">
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Tickets ({order.quantity})</dt>
                <dd className="font-mono-tabular text-[#000000]">
                  {formatInr(order.subtotalPaise)}
                </dd>
              </div>
              {order.platformFeePaise > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5e5e5e]">Booking fee</dt>
                  <dd className="font-mono-tabular text-[#000000]">
                    {formatInr(order.platformFeePaise)}
                  </dd>
                </div>
              ) : null}
              <div className="pt-3 border-t border-[#e2e2e2] flex justify-between gap-4 font-bold text-[#000000]">
                <dt>Total Paid</dt>
                <dd className="font-mono-tabular">{formatInr(order.totalPaise)}</dd>
              </div>
            </dl>
          </div>

          {order.status === 'confirmed' ? (
            <div className="no-print mt-8 pt-6 border-t border-[#e2e2e2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-[#5e5e5e]">
                Plans changed? Cancel eligible bookings to release your spot.
              </p>
              {!confirmRefundOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmRefundOpen(true)}
                  className="bg-[#ffffff] border border-[#e2e2e2] text-[#b42318] text-xs font-medium px-4 py-2.5 rounded-full whitespace-nowrap"
                >
                  Cancel Order
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={refunding}
                    onClick={handleRefund}
                    className="bg-[#b42318] text-[#ffffff] text-xs font-medium px-4 py-2.5 rounded-full"
                  >
                    {refunding ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRefundOpen(false)}
                    className="bg-[#ffffff] border border-[#e2e2e2] text-[#000000] text-xs font-medium px-4 py-2.5 rounded-full"
                  >
                    Keep Pass
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </PageTransition>
  );
}
