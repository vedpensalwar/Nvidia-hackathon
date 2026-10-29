import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowPilot Verify — Code verifies provenance. Nemotron evaluates meaning.',
  description:
    'Verification-first AI research engine. Code verifies quote provenance, while NVIDIA Nemotron-3.5-Lightning evaluates semantic meaning.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
