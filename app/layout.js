import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'PolyEdge — Prediction Market Mispricing Dashboard',
  description:
    'Surface mispricing on Polymarket multi-candidate markets. See overround, fair prices, and gaps in real-time.',
  openGraph: {
    title: 'PolyEdge — Prediction Market Mispricing Dashboard',
    description: 'Find overround and fair-price gaps on Polymarket.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
