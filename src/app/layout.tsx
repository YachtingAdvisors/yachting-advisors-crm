import type { Metadata } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import ClientLayout from '@/components/client-layout';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Real Estate CRM | Yachting Advisors',
  description: 'Real Estate MLS Deal Pipeline & Leads CRM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full bg-[#f5f8fa] text-[#33475b] antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
