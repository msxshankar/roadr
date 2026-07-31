import type { Metadata, Viewport } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROADR | Interactive UK Driving Route Planner & Scenic Telemetry',
  description: 'Roadr is a map-first UK route planner for scenic driving routes, live fuel estimates, and road telemetry.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07111f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="app-body bg-[#090a0f] text-gray-100 antialiased min-h-screen selection:bg-teal-300 selection:text-slate-950">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
