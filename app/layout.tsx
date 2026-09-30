import "./globals.css";

export const metadata = {
  title: "Prototype Testing",
};

// Explicit viewport (matches Next's default, stated here for clarity): never
// disable zoom — required for accessible mobile participant testing.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
