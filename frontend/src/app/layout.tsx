import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INX: The Last Request | Neo-Tactile Glass Engine',
  description: 'Mission-critical resource allocation engine with zero double-allocations and modern Neo-Tactile Glassmorphic interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="en" className="dark">
    {/* Removed the hardcoded bg-slate classes so the CSS gradient shows */}
    <body className="text-slate-100 min-h-screen antialiased selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">
      
      {/* Removed the fixed floating ambient lights and cyber-grid divs */}

      <div className="relative z-10">
        {children}
      </div>
    </body>
  </html>
);
}
