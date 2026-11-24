import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { deleteOrderAsAdmin, updateOrderAsAdmin } from '../../lib/firestoreStore.ts';
import { formatInr, formatIsoDateTime } from '../../lib/format.ts';
import type { TicketOrder } from '../../types/ticketing.ts';

interface AdminOrdersPanelProps {
  orders: TicketOrder[];
  loading: boolean;
  onOrdersChange: (next: TicketOrder[]) => void;
  onStatusMessage: (msg: string) => void;
  onErrorMessage: (msg: string) => void;
}

export function AdminOrdersPanel({
  orders,
  loading,
  onOrdersChange,
  onStatusMessage,
  onErrorMessage,
}: AdminOrdersPanelProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'refunded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    let confirmed = 0;
    let refunded = 0;
    let revenuePaise = 0;
    let totalPasses = 0;
    let checkedInPasses = 0;

    orders.forEach((o) => {
      if (o.status === 'confirmed') {
        confirmed += 1;
        revenuePaise += o.totalPaise;
      } else {
        refunded += 1;
      }
      o.passes.forEach((p) => {
        totalPasses += 1;
        if (p.checkedIn) checkedInPasses += 1;
      });
    });

    return { confirmed, refunded, revenuePaise, totalPasses, checkedInPasses };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.eventTitle.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerEmail.toLowerCase().includes(q) ||
        (o.buyerPhone || '').toLowerCase().includes(q) ||
        o.paymentReference.toLowerCase().includes(q) ||
        o.passes.some((p) => p.ticketId.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, searchQuery]);

  const handleTogglePassCheckIn = async (order: TicketOrder, ticketId: string) => {
    setBusyOrderId(order.orderId);
    onErrorMessage('');
    onStatusMessage('');
    try {
      const nextPasses = order.passes.map((p) =>
        p.ticketId === ticketId ? { ...p, checkedIn: !p.checkedIn } : p,
      );
      const updated = await updateOrderAsAdmin(order, { passes: nextPasses });
      onOrdersChange(orders.map((o) => (o.orderId === order.orderId ? updated : o)));
      const toggled = nextPasses.find((p) => p.ticketId === ticketId);
      onStatusMessage(
        toggled?.checkedIn
          ? `Checked in pass ${ticketId} (${order.buyerName}).`
          : `Reverted check-in for pass ${ticketId}.`,
      );
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to update pass check-in.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSetOrderStatus = async (order: TicketOrder, nextStatus: 'confirmed' | 'refunded') => {
    setBusyOrderId(order.orderId);
    onErrorMessage('');
    onStatusMessage('');
    try {
      const updated = await updateOrderAsAdmin(order, {
        status: nextStatus,
        refundedAt: nextStatus === 'refunded' ? new Date().toISOString() : undefined,
      });
      onOrdersChange(orders.map((o) => (o.orderId === order.orderId ? updated : o)));
      onStatusMessage(
        nextStatus === 'refunded'
          ? `Order ${order.orderId} marked cancelled/refunded.`
          : `Order ${order.orderId} reinstated to confirmed.`,
      );
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to update order status.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setBusyOrderId(orderId);
    onErrorMessage('');
    onStatusMessage('');
    try {
      await deleteOrderAsAdmin(orderId);
      onOrdersChange(orders.filter((o) => o.orderId !== orderId));
      setConfirmDeleteId(null);
      onStatusMessage(`Deleted order ${orderId} permanently.`);
    } catch (err: unknown) {
      onErrorMessage(err instanceof Error ? err.message : 'Unable to delete order.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
          <p className="text-xs text-[#5e5e5e]">Confirmed Orders</p>
          <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#166534]">
            {metrics.confirmed}
          </p>
        </div>
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
          <p className="text-xs text-[#5e5e5e]">Confirmed Gross Value</p>
          <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
            {formatInr(metrics.revenuePaise)}
          </p>
        </div>
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
          <p className="text-xs text-[#5e5e5e]">Gate Check-Ins</p>
          <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#000000]">
            {metrics.checkedInPasses} / {metrics.totalPasses}
          </p>
        </div>
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-5">
          <p className="text-xs text-[#5e5e5e]">Cancelled / Refunded</p>
          <p className="mt-2 font-mono-tabular text-3xl font-bold text-[#b42318]">
            {metrics.refunded}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="inline-flex flex-wrap gap-2 rounded-2xl glass-light border border-white/70 p-2">
          {(
            [
              { key: 'all', label: 'All Orders', count: orders.length },
              { key: 'confirmed', label: 'Confirmed', count: metrics.confirmed },
              { key: 'refunded', label: 'Cancelled', count: metrics.refunded },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap ${
                  active ? 'bg-[#000000] text-[#ffffff]' : 'bg-black/5 text-[#000000]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`font-mono-tabular text-[11px] ${active ? 'text-[#afafaf]' : 'text-[#5e5e5e]'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-80">
          <Search
            size={15}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e5e5e]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Order ID, pass ID, buyer, or UTR"
            className="w-full rounded-xl border border-[#e2e2e2] bg-[#ffffff] pl-10 pr-4 py-2.5 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
          />
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-10 text-center">
          <p className="text-sm text-[#5e5e5e]">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-[#e2e2e2] glass-light rounded-2xl p-12 text-center">
          <h3 className="text-lg font-bold text-[#000000]">No matching orders</h3>
          <p className="mt-2 text-sm text-[#5e5e5e]">
            Confirmed attendee bookings appear here with full check-in and refund controls.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const isBusy = busyOrderId === order.orderId;
            const confirmingDelete = confirmDeleteId === order.orderId;

            return (
              <article
                key={order.orderId}
                className="border border-[#e2e2e2] glass-light rounded-2xl p-6 space-y-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono-tabular font-bold text-[#000000]">
                        {order.orderId}
                      </span>
                      <span
                        className={`font-mono-tabular font-semibold uppercase ${
                          order.status === 'confirmed' ? 'text-[#166534]' : 'text-[#b42318]'
                        }`}
                      >
                        {order.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                      </span>
                      <span className="font-mono-tabular text-[#5e5e5e]">
                        {formatIsoDateTime(order.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#000000]">
                      {order.eventTitle}
                    </h3>
                    <p className="mt-1 text-xs text-[#5e5e5e]">
                      {order.tierName} x {order.quantity} · {order.eventDateLabel} · {order.city}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/tickets/${order.orderId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3.5 py-2 text-xs font-medium text-[#000000]"
                    >
                      <span>Open Pass</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </Link>

                    {order.status === 'confirmed' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleSetOrderStatus(order, 'refunded');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#b42318] bg-[#ffffff] disabled:opacity-50 px-3.5 py-2 text-xs font-medium text-[#b42318]"
                      >
                        <X size={12} aria-hidden="true" />
                        <span>Cancel / Refund</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          void handleSetOrderStatus(order, 'confirmed');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#000000] disabled:opacity-50 px-3.5 py-2 text-xs font-medium text-[#ffffff]"
                      >
                        <RotateCcw size={12} aria-hidden="true" />
                        <span>Reinstate</span>
                      </button>
                    )}

                    {!confirmingDelete ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(order.orderId)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs font-medium text-[#b42318]"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleDeleteOrder(order.orderId);
                          }}
                          className="rounded-full bg-[#b42318] px-3 py-2 text-xs font-medium text-[#ffffff]"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full border border-[#e2e2e2] bg-[#ffffff] px-3 py-2 text-xs font-medium text-[#000000]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-[#e2e2e2] py-3.5 text-xs">
                  <div>
                    <dt className="text-[#5e5e5e]">Attendee</dt>
                    <dd className="mt-1 font-medium text-[#000000]">{order.buyerName}</dd>
                    <dd className="mt-0.5 font-mono-tabular text-[#5e5e5e]">
                      {order.buyerEmail} {order.buyerPhone ? `· ${order.buyerPhone}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#5e5e5e]">Payment Reference / UTR</dt>
                    <dd className="mt-1 font-mono-tabular font-medium text-[#000000]">
                      {order.paymentReference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#5e5e5e]">Total Paid</dt>
                    <dd className="mt-1 font-mono-tabular text-sm font-bold text-[#000000]">
                      {formatInr(order.totalPaise)}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#5e5e5e]">
                    Issued Passes & Gate Check-In ({order.passes.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {order.passes.map((pass) => (
                      <div
                        key={pass.ticketId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e2e2] bg-[#ffffff] px-4 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-mono-tabular font-semibold text-[#000000]">
                            {pass.ticketId} · {pass.seatCode}
                          </p>
                          <p className="text-[#5e5e5e]">{pass.holderName}</p>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy || order.status !== 'confirmed'}
                          onClick={() => {
                            void handleTogglePassCheckIn(order, pass.ticketId);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap disabled:opacity-45 ${
                            pass.checkedIn
                              ? 'bg-[#166534] text-[#ffffff]'
                              : 'border border-[#e2e2e2] bg-[#f3f3f3] text-[#000000]'
                          }`}
                        >
                          <Check size={12} aria-hidden="true" />
                          <span>{pass.checkedIn ? 'Checked In' : 'Check In'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
