import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';
import { formatInr } from '../lib/format.ts';

export function PricingPage() {
  const [ticketPriceRupees, setTicketPriceRupees] = useState(299);
  const [ticketsSold, setTicketsSold] = useState(200);
  const [feeBearer, setFeeBearer] = useState<'attendee' | 'organizer'>('attendee');

  const unitPaise = Math.max(0, Math.round(ticketPriceRupees * 100));
  const grossPaise = unitPaise * ticketsSold;
  const feePerTicket = unitPaise > 0 ? Math.round(unitPaise * 0.025) : 0;

  const attendeePaysPerTicket =
    feeBearer === 'attendee' ? unitPaise + feePerTicket : unitPaise;
  const organizerReceivesPerTicket =
    feeBearer === 'attendee' ? unitPaise : Math.max(0, unitPaise - feePerTicket);
  const netOrganizerPayout = organizerReceivesPerTicket * ticketsSold;
  const totalFeePaise = feePerTicket * ticketsSold;

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-18">
          <h1 className="display-xxl text-[#000000]">Pricing</h1>
          <p className="mt-3 text-base text-[#5e5e5e] max-w-xl leading-relaxed">
            Free events cost nothing. Paid tickets carry a flat 2.5% booking fee with zero monthly subscriptions or setup charges.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-16 space-y-16">
        <div className="border border-[#e2e2e2] bg-[#ffffff] overflow-x-auto rounded-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e2e2e2] bg-[#f3f3f3] text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                <th className="py-4 px-6">Event Type</th>
                <th className="py-4 px-6">Booking Fee</th>
                <th className="py-4 px-6">Monthly Cost</th>
                <th className="py-4 px-6">Payout Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e2e2]">
              <tr>
                <td className="py-5 px-6 font-semibold text-[#000000]">
                  Free RSVPs & Campus Hackathons
                </td>
                <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0 (Free)</td>
                <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                <td className="py-5 px-6 text-[#5e5e5e]">Not applicable</td>
              </tr>
              <tr>
                <td className="py-5 px-6 font-semibold text-[#000000]">
                  Paid Fest & Workshop Passes
                </td>
                <td className="py-5 px-6 font-mono-tabular text-[#000000]">2.5% per ticket</td>
                <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                <td className="py-5 px-6 text-[#5e5e5e]">2 business days after event</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 border border-[#e2e2e2] bg-[#ffffff] p-8 space-y-6 rounded-2xl">
            <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
              Estimate your payout
            </h2>

            <div>
              <label htmlFor="calc-price" className="block text-xs font-medium text-[#000000] mb-1.5">
                Ticket price (INR)
              </label>
              <input
                id="calc-price"
                type="number"
                min={0}
                max={100000}
                value={ticketPriceRupees}
                onChange={(e) => setTicketPriceRupees(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-[#efefef] px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="calc-qty" className="block text-xs font-medium text-[#000000] mb-1.5">
                Estimated tickets sold
              </label>
              <input
                id="calc-qty"
                type="number"
                min={1}
                max={50000}
                value={ticketsSold}
                onChange={(e) => setTicketsSold(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-[#efefef] px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-[#000000] mb-2">Who covers the 2.5% fee?</p>
              <div className="grid grid-cols-2 border border-[#e2e2e2] divide-x divide-[#e2e2e2] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFeeBearer('attendee')}
                  className={`py-2.5 px-3 text-xs font-medium ${
                    feeBearer === 'attendee'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#efefef] text-[#000000]'
                  }`}
                >
                  Attendee at checkout
                </button>
                <button
                  type="button"
                  onClick={() => setFeeBearer('organizer')}
                  className={`py-2.5 px-3 text-xs font-medium ${
                    feeBearer === 'organizer'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#efefef] text-[#000000]'
                  }`}
                >
                  Included in ticket price
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 border border-[#e2e2e2] bg-[#f3f3f3] p-8 rounded-2xl">
            <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
              Payout breakdown
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Attendee pays per pass</dt>
                <dd className="font-mono-tabular font-semibold text-[#000000]">
                  {formatInr(attendeePaysPerTicket)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Gross ticket sales ({ticketsSold})</dt>
                <dd className="font-mono-tabular text-[#000000]">{formatInr(grossPaise)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#5e5e5e]">Total booking fee (2.5%)</dt>
                <dd className="font-mono-tabular text-[#5e5e5e]">{formatInr(totalFeePaise)}</dd>
              </div>
              <div className="pt-4 border-t border-[#e2e2e2] flex justify-between gap-4 text-base font-bold text-[#000000]">
                <dt>You receive</dt>
                <dd className="font-mono-tabular">{formatInr(netOrganizerPayout)}</dd>
              </div>
            </dl>
            <div className="mt-8">
              <Link
                to="/host"
                className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
              >
                Host an Event
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
