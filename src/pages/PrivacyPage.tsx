import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition.tsx';

interface PrivacySection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
}

const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'scope',
    number: '01',
    title: 'Scope & Data Fiduciary Identity',
    paragraphs: [
      'This Privacy Policy describes how Browns\' Squad ("we", "us", or "our") collects, uses, shares, and safeguards personal data when you visit Evora, search for campus events, book passes, retrieve tickets, or host an event.',
      'For platform operations, anti-fraud controls, and statutory order records, Browns\' Squad acts as the Data Fiduciary / Controller. For event-specific attendance rosters and check-in manifests used at venue gates, the respective Event Organizer acts as the independent organizer responsible for on-site handling.',
      'We collect strictly the information required to reserve seats, issue verifiable entry passes, and support refunds. Evora does not sell personal data or run third-party advertising trackers.',
    ],
  },
  {
    id: 'data-collected',
    number: '02',
    title: 'Information You Provide & Automatically Collected Data',
    paragraphs: [
      'Attendee Booking Information: Full name displayed on your admission pass, email address for order retrieval, and optional phone number if you choose to provide one for urgent venue updates.',
      'Order & Pass Metadata: Order identifier (EVR-YYYY-XXXXXX), selected event and ticket tier, quantity, rupee totals, booking timestamps, optional payment reference number submitted during confirmation, and pass redemption or cancellation status.',
      'Organizer Listing Details: Organizer name, college club or organization title, public contact email, venue address, event copy, and selected cover photography.',
      'Essential Technical Logs: Standard HTTP request metadata and server error diagnostics used solely to keep bookings reliable and protect against automated ticket-hoarding bots.',
    ],
  },
  {
    id: 'financial-privacy',
    number: '03',
    title: 'Payment Privacy & Minimal Financial Records',
    paragraphs: [
      'Evora does not ask for, process, or store your bank account login, debit/credit card numbers, PINs, or wallet passwords. Payments are authorized directly inside your own banking or payment application outside our servers.',
      'We store only the minimum order confirmation records needed to match your booking, display your receipt, verify entry at the event gate, and process refunds if an event is cancelled.',
    ],
  },
  {
    id: 'purposes',
    number: '04',
    title: 'How We Use Personal Information',
    paragraphs: [
      'Order Fulfillment: Holding seats during checkout, generating unique QR entry passes, enabling order lookup on My Passes, and processing cancellations or refunds.',
      'Event Operations: Supplying the Event Organizer with your name, pass tier, and seat code so gate volunteers can verify your entry smoothly.',
      'Platform Integrity & Statutory Records: Detecting duplicate bot bookings, preventing pass forgery, resolving billing questions, and maintaining essential accounting records in accordance with the laws of the Republic of Singapore.',
    ],
  },
  {
    id: 'sharing',
    number: '05',
    title: 'When Information Is Shared & Strict Non-Disclosure to Foreign Authorities',
    paragraphs: [
      'Event Organizers: When you book a pass, your name, email, pass type, order number, and check-in status are shared strictly with the Organizer hosting that specific event.',
      'Infrastructure Providers: Hosting servers and backup storage providers located in the Republic of Singapore process encrypted application data solely to keep Evora running under strict confidentiality terms.',
      'No Disclosure to Foreign Law Enforcement: All Evora servers, databases, and stored platform records are hosted in the Republic of Singapore and are protected exclusively under the laws of the Republic of Singapore, including the Personal Data Protection Act 2012 (PDPA). Browns\' Squad maintains a strict policy against sharing user, attendee, or organizer data with any foreign government, regulatory body, or law enforcement agency outside Singapore. Under no circumstances will Evora disclose personal data, account details, event records, or booking logs to any non-Singapore law enforcement authority, including any Indian law enforcement, police, intelligence, or regulatory agency, for any reason whatsoever. Disclosure may occur solely if strictly compelled by a valid, binding final order issued directly by a competent court of the Republic of Singapore under Singapore law.',
    ],
  },
  {
    id: 'retention',
    number: '06',
    title: 'Data Retention Schedule',
    paragraphs: [
      'Abandoned Checkout Holds: Expire after fifteen (15) minutes and are cleared from active session memory within twenty-four (24) hours.',
      'Confirmed Orders & Financial Receipts: Retained for up to seven (7) years where required by accounting, tax, and dispute resolution regulations.',
      'Event Check-In Logs: Retained for twelve (12) months following the event date for attendance reconciliation, after which personal identifiers are anonymized or deleted.',
    ],
  },
  {
    id: 'privacy-rights',
    number: '07',
    title: 'Your Rights Under the Singapore PDPA & Global Privacy Standards',
    paragraphs: [
      'Under the Republic of Singapore\'s Personal Data Protection Act 2012 (PDPA) and equivalent international privacy standards, you have the right to: (1) access a summary of personal data held by Evora; (2) request correction of misspelled names or contact details on active orders; (3) withdraw consent or request erasure of personal data once mandatory accounting retention periods no longer apply; and (4) contact our Data Protection Officer regarding any aspect of data handling.',
      'To submit a privacy request, email privacy@browns.co.in from the email address linked to your account or order. We verify your identity and respond within thirty (30) calendar days.',
    ],
  },
  {
    id: 'storage',
    number: '08',
    title: 'Essential Browser Storage & Zero Ad Cookies',
    paragraphs: [
      'Evora uses no third-party advertising cookies, social retargeting pixels, or cross-site tracking scripts.',
      'Your browser stores only a single essential local key (evora_recent_orders_v1) listing Order IDs booked on that device so you can reopen your entry passes quickly from My Passes. Clearing browser data removes that list immediately without affecting your confirmed passes on our servers.',
    ],
  },
  {
    id: 'minors',
    number: '09',
    title: 'Student & Minor Privacy',
    paragraphs: [
      'Evora does not knowingly collect personal data from children under thirteen (13) years of age. If a parent or guardian believes a child submitted personal details without consent, email privacy@browns.co.in and we will remove the record promptly.',
    ],
  },
  {
    id: 'security',
    number: '10',
    title: 'Security Safeguards',
    paragraphs: [
      'We protect platform traffic with HTTPS/TLS encryption, sign issued door passes with server-held HMAC keys to prevent tampering, validate inputs strictly on server endpoints, and restrict production access on a least-privilege basis.',
      'If a confirmed security incident ever compromises personal data held by Evora, we will notify affected users and relevant authorities promptly in accordance with applicable breach notification law.',
    ],
  },
  {
    id: 'singapore-residency',
    number: '11',
    title: 'Singapore Server Residency & Jurisdictional Data Protection',
    paragraphs: [
      'Exclusive Singapore Infrastructure: All primary Evora application servers, databases, and encrypted backups are hosted within data centers in the Republic of Singapore. All stored data is governed and protected exclusively by the laws of the Republic of Singapore, including the Personal Data Protection Act 2012 (PDPA).',
      'Refusal of Foreign & Extraterritorial Requests: Administrative notices, subpoenas, informal inquiries, or data production demands issued by authorities outside the Republic of Singapore (including any law enforcement, police, investigative, or government agency in India or any other foreign jurisdiction) have no direct legal force over Evora infrastructure. Browns\' Squad does not share, transfer, or surrender user data to foreign law enforcement agencies, including Indian law enforcement, for any reason. Any foreign demand is refused in full unless independently adjudicated and enforced through a binding court order issued by a competent court in the Republic of Singapore.',
      'Encrypted Transit: Wherever attendees or organizers access Evora from outside Singapore, all communications between your device and our Singapore servers remain protected by modern HTTPS/TLS transport encryption.',
    ],
  },
  {
    id: 'grievance',
    number: '12',
    title: 'Data Protection Officer & Privacy Contact',
    paragraphs: [
      'All privacy inquiries, access or correction requests, and Singapore PDPA notices should be directed to the Browns\' Squad Data Protection Officer at privacy@browns.co.in.',
    ],
  },
  {
    id: 'updates',
    number: '13',
    title: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy as Evora evolves or legal rules change. Revisions take effect on the updated Effective Date displayed at the top of this page.',
    ],
  },
];

export function PrivacyPage() {
  return (
    <PageTransition>
      <section className="w-full border-b border-[#e2e2e2] bg-[#ffffff]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-18">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e]">
            Evora by Browns&apos; Squad · Effective 01 November 2026
          </p>
          <h1 className="mt-3 display-xxl text-[#000000]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-[#5e5e5e] max-w-2xl leading-relaxed">
            How Browns&apos; Squad hosts Evora exclusively on servers in the Republic of Singapore, safeguards attendee and organizer records under Singapore law, and enforces strict non-disclosure to foreign law enforcement.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <aside className="lg:col-span-4 lg:sticky lg:top-24 border border-[#e2e2e2] bg-[#f3f3f3] p-6 rounded-2xl">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#5e5e5e] pb-3 border-b border-[#e2e2e2]">
              Policy Index
            </h2>
            <nav aria-label="Privacy Policy sections" className="mt-4">
              <ol className="space-y-2.5 text-sm">
                {PRIVACY_SECTIONS.map((sec) => (
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
              <Link to="/terms" className="text-[#000000] underline">
                Read the Terms of Service
              </Link>
            </div>
          </aside>

          <article className="lg:col-span-8 border border-[#e2e2e2] bg-[#ffffff] p-8 md:p-12 divide-y divide-[#e2e2e2] rounded-2xl">
            {PRIVACY_SECTIONS.map((section) => (
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

            <section className="pt-10 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#000000] mb-4">
                  Data Retention Summary
                </h2>
                <div className="border border-[#e2e2e2] overflow-x-auto rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e2e2] bg-[#f3f3f3] text-[#5e5e5e] uppercase">
                        <th className="py-3 px-4 font-semibold">Record Type</th>
                        <th className="py-3 px-4 font-semibold">Purpose</th>
                        <th className="py-3 px-4 font-semibold">Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e2e2] text-[#282828]">
                      <tr>
                        <td className="py-3 px-4 font-medium text-[#000000]">Unfinished Checkouts</td>
                        <td className="py-3 px-4">Temporary seat reservation</td>
                        <td className="py-3 px-4 font-mono-tabular">Up to 24 hours</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-[#000000]">Confirmed Orders & Receipts</td>
                        <td className="py-3 px-4">Passes, refunds, and accounting</td>
                        <td className="py-3 px-4 font-mono-tabular">7 years</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium text-[#000000]">Door Check-In Logs</td>
                        <td className="py-3 px-4">Gate verification & attendance audit</td>
                        <td className="py-3 px-4 font-mono-tabular">12 months post-event</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e2e2e2] text-sm text-[#5e5e5e] leading-relaxed">
                <p className="font-semibold text-[#000000]">Third-Party Mapping & Authentication Services</p>
                <p className="mt-2">
                  Event maps, venue pins, and address autocomplete use Google Maps Platform and are subject to the{' '}
                  <a
                    href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#000000] underline"
                  >
                    Google Privacy Policy
                  </a>
                  . Account authentication and pass synchronization use Firebase Authentication and Cloud Firestore.
                </p>
              </div>
            </section>
          </article>
        </div>
      </div>
    </PageTransition>
  );
}
