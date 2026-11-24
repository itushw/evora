import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
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
          <p className="font-mono-tabular text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
            Zero Commission · Zero Hosting Fees
          </p>
          <h1 className="mt-3 display-xxl text-[#000000]">Pricing</h1>
          <p className="mt-4 text-base text-[#5e5e5e] max-w-2xl leading-relaxed">
            Hosting and booking on Evora costs ₹0. We take 0% commission on ticket sales, charge zero monthly subscriptions, and let organizers collect payments straight to their own UPI VPA.
          </p>
        </div>
      </section>

      <section className="w-full bg-[#f3f3f3]">
        <div className="mx-auto max-w-[1120px] px-6 md:px-8 py-14 md:py-16 space-y-12">
          {/* Browns' Squad Motto & Why We Provide Zero-Cost Ticketing */}
          <div className="relative overflow-hidden rounded-2xl bg-[#000000] text-[#ffffff] border border-black/10 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-6 space-y-5">
                <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#afafaf]">
                  Browns&apos; Squad · browns.co.in
                </p>
                <blockquote className="display-xl text-[#ffffff]">
                  &ldquo;Free software for humanity.&rdquo;
                </blockquote>
                <p className="text-base font-medium text-[#e2e2e2]">
                  Curiosity brought us here. Building keeps us here.
                </p>
                <div className="pt-2">
                  <a
                    href="https://browns.co.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 active:bg-white/20 px-4 py-2 text-xs font-medium text-[#ffffff]"
                  >
                    <span>Visit browns.co.in</span>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-4 border-t lg:border-t-0 lg:border-l border-white/15 pt-6 lg:pt-0 lg:pl-10">
                <h2 className="text-lg font-bold text-[#ffffff]">
                  Why we provide Evora at zero cost
                </h2>
                <p className="text-sm text-[#e2e2e2] leading-relaxed">
                  Browns&apos; Squad is an open-source organization and builder team dedicated to turning public and community problems into free software that anyone can use, inspect, and build upon.
                </p>
                <p className="text-sm text-[#afafaf] leading-relaxed">
                  Student councils, college clubs, hackathon organizers, and independent community hosts operate on tight budgets. Conventional ticketing platforms take percentage cuts, tack on convenience fees, and lock funds behind payout delays. Evora removes those tolls completely so every rupee an attendee pays supports the event itself.
                </p>
                <dl className="pt-4 border-t border-white/15 grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-xs text-[#afafaf]">Commission</dt>
                    <dd className="mt-1 font-mono-tabular text-xl font-bold text-[#ffffff]">0%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#afafaf]">Hosting Fee</dt>
                    <dd className="mt-1 font-mono-tabular text-xl font-bold text-[#ffffff]">₹0</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#afafaf]">You Keep</dt>
                    <dd className="mt-1 font-mono-tabular text-xl font-bold text-[#ffffff]">100%</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="border border-[#e2e2e2] glass-light overflow-x-auto rounded-2xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e2e2e2] bg-white/50 text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
                  <th className="py-4 px-6">Event Type</th>
                  <th className="py-4 px-6">Booking Commission</th>
                  <th className="py-4 px-6">Hosting Cost</th>
                  <th className="py-4 px-6">Included</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e2]">
                <tr>
                  <td className="py-5 px-6 font-semibold text-[#000000]">
                    Free RSVPs & Campus Hackathons
                  </td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0 (0%)</td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                  <td className="py-5 px-6 text-[#5e5e5e]">
                    Signed QR entry passes & Google Wallet support
                  </td>
                </tr>
                <tr>
                  <td className="py-5 px-6 font-semibold text-[#000000]">
                    Paid Fest, Show & Workshop Passes
                  </td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0 (0%)</td>
                  <td className="py-5 px-6 font-mono-tabular text-[#000000]">₹0</td>
                  <td className="py-5 px-6 text-[#5e5e5e]">
                    Direct UPI settlement to your own VPA, QR passes & Google Wallet
                  </td>
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
                  <dt className="text-[#5e5e5e]">Evora platform commission (0%)</dt>
                  <dd className="font-mono-tabular text-[#166534] font-medium">{formatInr(0)}</dd>
                </div>
                <div className="pt-4 border-t border-[#e2e2e2] flex justify-between gap-4 text-base font-bold text-[#000000]">
                  <dt>Organizer receives (100%)</dt>
                  <dd className="font-mono-tabular">{formatInr(grossPaise)}</dd>
                </div>
              </dl>
              <div className="mt-8">
                <Link
                  to="/host"
                  className="inline-flex items-center justify-center bg-[#000000] active:bg-[#282828] text-[#ffffff] text-sm font-medium px-5 py-3 rounded-full"
                >
                  Host an Event for Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
