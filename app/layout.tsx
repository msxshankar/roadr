import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROADR | Interactive UK Driving Route Planner & Scenic Telemetry',
  description: 'Roadr is a liquid glass styled web app for driving enthusiasts to plan scenic UK routes, estimate live fuel costs, and inspect road telemetry.',
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
