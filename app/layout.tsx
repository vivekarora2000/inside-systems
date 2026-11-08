import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://inside-search.vivekarora2000.chatgpt.site'),
  title: 'Inside Search — See why it ranked',
  description: 'Search a fictional city, inspect every score, and change the rules of a real browser-based search engine.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Inside Search — See why it ranked',
    description: 'Search for something. Inspect the inverted index. Change the ranking rules.',
    type: 'website',
    url: 'https://inside-search.vivekarora2000.chatgpt.site',
    images: [{ url: '/og.png', width: 1732, height: 908, alt: 'Inside Search — inspect the index and change the rules' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inside Search — See why it ranked',
    description: 'Search for something. Inspect the inverted index. Change the ranking rules.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f3efe6',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
