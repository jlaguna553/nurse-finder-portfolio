import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NurseFinder Admin',
  description: 'Panel de administración de NurseFinder',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
