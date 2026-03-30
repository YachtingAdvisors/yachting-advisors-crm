import type { Metadata } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { cn } from '@/lib/utils';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Yachting Advisors CRM',
  description: 'Premium CRM for Yachting & Real Estate',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('h-full', dmSans.variable, dmMono.variable)}>
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
