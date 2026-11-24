import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';

interface LegalSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    number: '01',
    title: 'Acceptance of Terms & Contractual Scope',
    paragraphs: [
      'These Terms of Service ("Terms") form a legally binding agreement between you ("User", "Attendee", or "Organizer") and Browns\' Squad ("Browns\' Squad", "Evora", "we", "us", or "our") governing your use of the Evora website, event discovery pages, event publishing forms, booking checkout, and digital pass services (collectively, the "Platform").',
      'By browsing events, registering for complimentary passes, completing a paid booking, downloading an entry pass, or publishing an event on Evora, you confirm that you have read, understood, and accepted these Terms and our Privacy Policy. If you publish or book events on behalf of a student council, college club, institution, or company, you confirm that you hold authority to bind that organization.',
      'Paid orders and event hosting require you to be at least eighteen (18) years of age, or to act with verifiable consent from a parent, legal guardian, or authorized college faculty coordinator where campus regulations permit student participation.',
    ],
  },
  {
    id: 'platform-role',
    number: '02',
    title: 'Role of Evora & Independent Event Organizers',
    paragraphs: [
      'Evora by Browns\' Squad operates strictly as an event listing, registration, and pass delivery platform connecting independent Organizers (such as college societies, hackathon teams, clubs, and independent hosts) with Attendees. Unless expressly listed as an official Browns\' Squad program, Browns\' Squad does not organize, manage, stage, cater, supervise, or insure any listed event.',
      'The Event Organizer holds sole responsibility for event scheduling, speaker or artist lineups, campus security clearances, venue occupancy permits, student ID verification rules, food and beverage handling, and delivery of all advertised pass perks or merchandise kits.',
      'Completing a booking creates two distinct agreements: (a) an attendance license directly between you and the Organizer subject to the event rules published on the listing, and (b) a ticketing and order-processing service agreement between you and Evora by Browns\' Squad.',
    ],
  },
  {
    id: 'organizer-obligations',
    number: '03',
    title: 'Organizer Publishing Standards & Permissions',
    paragraphs: [
      'Organizers publishing on Evora warrant that all venue permissions, institutional approvals, municipal sound or assembly clearances, and media licenses are secured prior to opening registrations. All submitted listings are subject to review and approval by Evora administrators before becoming publicly visible. Event descriptions, schedules, ticket prices, and seat counts must remain accurate and truthful.',
      'Organizers must disclose material conditions of admission before checkout, including college ID requirements, minimum age thresholds, team-size constraints for hackathons, gate closing hours, and non-refundable merchandise components.',
      'Organizers may not list misleading capacity figures, collect undisclosed mandatory cash fees at the gate beyond stated ticket prices, or use Evora listings to redirect attendees to unverified external payment links.',
    ],
  },
  {
    id: 'ticket-purchases',
    number: '04',
    title: 'Bookings & Ticket Pricing',
    paragraphs: [
      'All ticket prices are set directly by the Organizer and displayed in Indian Rupees (INR). Before you finalize any order at checkout, Evora presents the exact payable ticket subtotal with zero platform booking commission. Both complimentary RSVPs and paid event passes incur ₹0 platform commission.',
      'Starting checkout holds your selected passes for fifteen (15) minutes. If checkout is not completed within that window, the temporary reservation expires automatically and seats return to public availability.',
      'A booking becomes confirmed only after Evora records order confirmation and issues an official Order ID (prefixed EVR-) together with unique scannable QR entry passes.',
    ],
  },
  {
    id: 'payments-settlement',
    number: '05',
    title: 'Order Settlement, Verification & Organizer Payouts',
    paragraphs: [
      'Paid ticket bookings are settled through the designated checkout screen for the exact order amount shown on your order summary. Where an Organizer supplies their own verified UPI VPA on the listing, checkout QR codes route payment directly to that Organizer UPI account. Attendees are responsible for verifying the order amount before confirming payment and keeping their transaction reference number if requested during reconciliation.',
      'Orders marked confirmed without verified settlement matching the issued order reference may be placed under review or cancelled prior to event entry. Evora and Organizers reserve the right to reconcile settlement logs before gate check-in.',
      'Organizers are solely responsible for maintaining an accurate UPI VPA, reconciling incoming attendee payments, and issuing any eligible attendee refunds directly in accordance with their published refund policy.',
    ],
  },
  {
    id: 'refunds',
    number: '06',
    title: 'Cancellations, Refunds & Event Postponements',
    paragraphs: [
      'Each event page states the Organizer refund policy clearly prior to checkout. Where an Attendee cancels an eligible booking within the published cancellation window using the Order Receipt page, the corresponding QR passes are voided immediately and capacity returns to the event.',
      'If an Organizer cancels an event entirely or reschedules the event by more than twenty-four (24) hours without providing a mutually acceptable alternative date, affected paid attendees are entitled to a full refund of ticket face value from the Organizer within five (5) to ten (10) business days.',
      'Once a pass has been scanned at venue entry or once the published cancellation cutoff has passed, bookings are final except where mandatory consumer protection law provides otherwise.',
    ],
  },
  {
    id: 'transfers',
    number: '07',
    title: 'Single-Entry Passes, Duplication & Anti-Scalping',
    paragraphs: [
      'Each entry pass issued by Evora carries a unique pass identifier and signed QR code valid for a single admission scan. The first valid scan at check-in redeems the pass; screenshots, photocopies, or forwarded duplicates presented afterward will be denied entry.',
      'Reselling tickets above face value, operating automated booking scripts, hoarding free student passes to block genuine attendees, or altering pass PDFs or QR graphics is strictly prohibited. Evora and the Organizer may cancel passes obtained in violation of this rule without refund.',
    ],
  },
  {
    id: 'prohibited-events',
    number: '08',
    title: 'Prohibited Listings & Platform Abuse',
    paragraphs: [
      'You may not use Evora to promote or collect funds for illegal gatherings, unlicensed betting or lotteries, pyramid schemes, counterfeit merchandise sales, discriminatory or violent assemblies, unauthorized campus events lacking institutional consent, or deceptive fundraising campaigns.',
      'Users must not probe, scrape, overload, or attempt to bypass inventory locks, signing logic, or server validation controls. Browns\' Squad may remove non-compliant events, suspend offending accounts, and hold pending payouts while investigating suspected fraud.',
    ],
  },
  {
    id: 'intellectual-property',
    number: '09',
    title: 'Intellectual Property & Content Licenses',
    paragraphs: [
      'The Evora name, Browns\' Squad branding, interface design, software code, and pass layout remain the intellectual property of Browns\' Squad. These Terms do not grant any right to copy, resell, or white-label the Platform without prior written permission.',
      'Organizers retain ownership of event titles, descriptions, schedules, and photographs submitted to Evora, and grant Browns\' Squad a non-exclusive, royalty-free license to host, display, and format that material for operating the directory and generating attendee passes.',
    ],
  },
  {
    id: 'venue-conduct',
    number: '10',
    title: 'Campus Rules, Attendee Conduct & Assumption of Risk',
    paragraphs: [
      'Attendees agree to follow all venue and campus rules enforced by the Organizer, including presenting valid government or student photo identification, adhering to hackathon codes of conduct, respecting quiet or safety zones, and complying with bag checks.',
      'Organizers may deny admission or remove any attendee whose behavior threatens safety, violates campus policies, or disrupts performances, without issuing a refund. Attendees voluntarily assume standard physical risks associated with attending live crowds, music stages, workshops, and campus venues.',
    ],
  },
  {
    id: 'disputes',
    number: '11',
    title: 'Billing Questions & Dispute Resolution',
    paragraphs: [
      'If you notice a duplicate order, incorrect amount, or unresolved refund question, contact the Event Organizer listed on your pass or reach Browns\' Squad Support before raising an external bank dispute so the issue can be resolved promptly.',
      'In the event of a formal payment dispute, Evora may share order timestamps, pass issuance logs, attendee contact records, and door check-in scans with payment partners to document fulfillment.',
    ],
  },
  {
    id: 'liability',
    number: '12',
    title: 'Disclaimers & Limitation of Liability',
    paragraphs: [
      'THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR CONTINUOUS UPTIME.',
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, BROWNS\' SQUAD AND ITS CONTRIBUTORS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING TRAVEL EXPENSES, ACCOMMODATION COSTS, LOST PRIZES, OR SCHEDULE CHANGES CAUSED BY THIRD-PARTY ORGANIZERS.',
      'IN ALL CASES, BROWNS\' SQUAD\'S TOTAL AGGREGATE LIABILITY ARISING OUT OF THESE TERMS SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL BOOKING FEES PAID BY YOU TO EVORA IN THE PRECEDING TWELVE (12) MONTHS, OR (B) FIVE THOUSAND INDIAN RUPEES (₹5,000).',
    ],
  },
  {
    id: 'indemnification',
    number: '13',
    title: 'Indemnification',
    paragraphs: [
      'Organizers agree to indemnify and hold harmless Browns\' Squad and its team from any third-party claims, campus penalties, copyright disputes, venue injury claims, or tax liabilities arising from an Organizer\'s event, breach of these Terms, or misuse of exported attendee check-in lists.',
    ],
  },
  {
    id: 'governing-law',
    number: '14',
    title: 'Governing Law, Singapore Data Residency & Jurisdiction',
    paragraphs: [
      'All Evora servers, databases, and stored platform records are hosted in the Republic of Singapore and are governed and protected exclusively by the laws of the Republic of Singapore, including the Personal Data Protection Act 2012 (PDPA).',
      'Browns\' Squad strictly upholds Singapore jurisdictional sovereignty over all hosted records. Platform data, attendee information, and organizer records will not be disclosed or shared with any foreign law enforcement, investigative, or government authority outside the Republic of Singapore, including Indian law enforcement agencies, for any reason whatsoever. Disclosure may occur exclusively where compelled by a binding final order of a competent court of the Republic of Singapore.',
      'These Terms are governed by and construed in accordance with the laws of the Republic of Singapore without regard to conflict-of-law principles, and the courts of the Republic of Singapore shall have exclusive jurisdiction over disputes not resolved through good-faith written negotiation.',
      'Browns\' Squad may revise these Terms periodically to reflect new platform capabilities or legal requirements. Updates take effect on the Effective Date listed at the top of this page and apply to bookings and listings created thereafter.',
    ],
  },
];

export function TermsPage() {
  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-18">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
            Evora by Browns&apos; Squad · Effective 01 November 2026
          </p>
          <h1 className="mt-3 display-xxl text-[#000000]">
            Terms of Service
          </h1>
          <p className="mt-4 text-base text-[#5e5e5e] max-w-2xl leading-relaxed">
            Rules governing event listings, ticket bookings, cancellations, organizer payouts, and attendee conduct on Evora.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <aside className="lg:col-span-4 lg:sticky lg:top-24 border border-[#e2e2e2] bg-[#f3f3f3] p-6 rounded-2xl">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e] pb-3 border-b border-[#e2e2e2]">
              Sections
            </h2>
            <nav aria-label="Terms of Service sections" className="mt-4">
              <ol className="space-y-2.5 text-sm">
                {TERMS_SECTIONS.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="flex items-baseline gap-3 text-[#000000]"
                    >
                      <span className="font-mono-tabular text-xs text-[#5e5e5e] shrink-0">
                        {sec.number}.
                      </span>
                      <span>{sec.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-6 pt-5 border-t border-[#e2e2e2] text-xs text-[#5e5e5e]">
              <Link to="/privacy" className="text-[#000000] underline">
                Read the Privacy Policy
              </Link>
            </div>
          </aside>

          <article className="lg:col-span-8 border border-[#e2e2e2] bg-[#ffffff] p-8 md:p-12 divide-y divide-[#e2e2e2] rounded-2xl">
            {TERMS_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="py-10 first:pt-0 last:pb-0 scroll-mt-24"
              >
                <p className="font-mono-tabular text-xs text-[#5e5e5e]">
                  SECTION {section.number}
                </p>
                <h2 className="mt-2 display-md text-[#000000]">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-4 editorial-prose text-[15px]">
                  {section.paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="pt-10 text-sm text-[#5e5e5e] space-y-6">
              <div>
                <p className="font-semibold text-[#000000]">Mapping & Location Services</p>
                <p className="mt-2 leading-relaxed">
                  Interactive event maps and venue address autocomplete on Evora are powered by Google Maps Platform. By using map views or venue location features, you agree to be bound by the{' '}
                  <a
                    href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#000000] underline"
                  >
                    Google Maps / Google Earth Additional Terms of Service
                  </a>{' '}
                  and the{' '}
                  <a
                    href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#000000] underline"
                  >
                    Google Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#000000]">Contact Browns&apos; Squad</p>
                <p className="mt-2 leading-relaxed">
                  Questions about these Terms or organizer compliance can be sent to{' '}
                  <span className="font-mono-tabular text-[#000000]">legal@browns.co.in</span>.
                </p>
              </div>
            </section>
          </article>
        </div>
      </div>
    </PageTransition>
  );
}
