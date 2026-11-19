import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Care Budget - demo',
  description: 'Independent demo of a family caregiving-finance board. Synthetic data.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ground text-ink antialiased">{children}</body>
    </html>
  );
}
