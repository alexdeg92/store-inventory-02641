import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'Inventaire Loterie – Voisin #02641',
  description: "Suivi d'inventaire des billets de loterie",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f59e0b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Inventaire" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#f59e0b" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
