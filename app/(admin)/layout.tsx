import { Playfair_Display } from "next/font/google";

// Serif headline font for the researcher-facing dashboard only — exposed as
// a CSS variable so tailwind.config.js's `font-serif-display` utility can
// reference it. Scoped to this route group (not the root layout) so
// participant-facing routes (app/test/[id]/[variant], app/usability/[id])
// are completely unaffected.
const serifDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif-display",
  display: "swap",
});

// No persistent left-nav rail here — removed per feedback: with the
// dashboard's two "create a new study" cards already covering A/B vs.
// Usability, a sidebar duplicating those same two links added no value.
// Still scopes the serif font to every researcher-facing page.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={serifDisplay.variable}>{children}</div>;
}
