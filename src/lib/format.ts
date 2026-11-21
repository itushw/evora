export function formatInr(paise: number): string {
  if (paise === 0) return 'Free';
  const rupees = paise / 100;
  const hasDecimals = paise % 100 !== 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(rupees);
  } catch {
    return `₹${hasDecimals ? rupees.toFixed(2) : Math.round(rupees)}`;
  }
}

export function formatIsoDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STORAGE_KEY = 'evora_recent_orders_v1';

export function getSavedOrderIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveOrderId(orderId: string): void {
  try {
    const existing = getSavedOrderIds().filter((id) => id !== orderId);
    const next = [orderId, ...existing].slice(0, 20);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors in restricted environments
  }
}
