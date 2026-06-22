import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  try {
    const { eventId } = await params;
    const event = await fetch(`${API_URL}/api/public/events/${eventId}`, { next: { revalidate: 60 } })
      .then(r => r.ok ? r.json() : null);
    if (!event) return { robots: { index: false, follow: false } };

    const date = new Date(event.heldAt).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
    const price =
      event.priceMale != null && event.priceFemale != null
        ? `男性¥${event.priceMale.toLocaleString()} / 女性¥${event.priceFemale.toLocaleString()}`
        : event.price != null
        ? `¥${event.price.toLocaleString()}`
        : '';
    const description = [date, event.location, price].filter(Boolean).join(' · ');

    return {
      robots: { index: false, follow: false },
      title: event.title,
      description,
      openGraph: {
        title: event.title,
        description,
        images: event.imageUrl ? [{ url: event.imageUrl }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: event.title,
        description,
        images: event.imageUrl ? [event.imageUrl] : [],
      },
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
