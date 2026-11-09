import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Inside Systems — Elasticsearch and Cassandra, explained',
  description: 'Interactive field guides for understanding the machinery inside Elasticsearch and Apache Cassandra.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Inside Systems',
    description: 'Explore Elasticsearch and Cassandra from first principles.',
    type: 'website',
    url: siteUrl,
    images: [{ url: '/og.png', width: 1734, height: 907, alt: 'Inside Systems' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inside Systems',
    description: 'Explore Elasticsearch and Cassandra from first principles.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f7f2',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
