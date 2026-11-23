import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';
import { formatInr } from '../lib/format.ts';

export function PricingPage() {
  const [ticketPriceRupees, setTicketPriceRupees] = useState(299);
  const [ticketsSold, setTicketsSold] = useState(200);

  const unitPaise = Math.max(0, Math.round(ticketPriceRupees * 100));
  const grossPaise = unitPaise * ticketsSold;

  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-18">
          <h1 className="display-xxl text-[#000000]">Pricing</h1>
          <p className="mt-3 text-base text-[#5e5e5e] max-w-xl leading-relaxed">
            Hosting and booking on Evora is completely free, with zero platform commission and zero setup charges.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-16 space-y-12">
          <div className="border border-[#e2e2e2] glass-light overflow-x-auto rounded-2xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e2e2e2] bg-white/50 text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                  <th className="py-4 px-6">Event Type</th>
                  <th className="py-4 px-6">Booking Fee</th>
                  <th className="py-4 px-6">Hosting Cost</th>
                  <th className="py-4 px-6">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e2]">
                <tr>
                  <td className="py-5 px-6 font-semibold text-[#000000]">
                    Free RSVPs & Campus Hackathons
                  </td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                  <td className="py-5 px-6 text-[#5e5e5e]">Not applicable</td>
                </tr>
                <tr>
                  <td className="py-5 px-6 font-semibold text-[#000000]">
                    Paid Fest & Workshop Passes
                  </td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0 (0%)</td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                  <td className="py-5 px-6 text-[#5e5e5e]">Direct to organizer UPI VPA</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 border border-[#e2e2e2] glass-light p-8 space-y-6 rounded-2xl">
              <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                Estimate your ticket revenue
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
                  className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
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
                  className="w-full bg-white/85 border border-black/10 px-3.5 py-3 text-sm font-mono-tabular text-[#000000] rounded-lg"
                />
              </div>
            </div>

            <div className="lg:col-span-6 border border-[#e2e2e2] glass-soft p-8 rounded-2xl">
              <h2 className="text-lg font-bold text-[#000000] pb-4 border-b border-[#e2e2e2]">
                Payout breakdown
              </h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5e5e5e]">Attendee pays per pass</dt>
                  <dd className="font-mono-tabular font-semibold text-[#000000]">
                    {formatInr(unitPaise)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5e5e5e]">Gross ticket sales ({ticketsSold})</dt>
                  <dd className="font-mono-tabular text-[#000000]">{formatInr(grossPaise)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#5e5e5e]">Platform commission</dt>
                  <dd className="font-mono-tabular text-[#5e5e5e]">{formatInr(0)}</dd>
                </div>
                <div className="pt-4 border-t border-[#e2e2e2] flex justify-between gap-4 text-base font-bold text-[#000000]">
                  <dt>Organizer receives</dt>
                  <dd className="font-mono-tabular">{formatInr(grossPaise)}</dd>
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
        </div>
      </section>
    </PageTransition>
  );
}
