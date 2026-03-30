import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
  title: 'Yachting Advisors CRM',
  description: 'Meta Leads CRM for Yachting Advisors',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", dmSans.variable, dmMono.variable, "font-sans", geist.variable)}>
      <body className="min-h-full bg-[#0a0c10] text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
