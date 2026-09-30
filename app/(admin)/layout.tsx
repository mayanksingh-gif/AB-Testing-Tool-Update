import { Playfair_Display } from "next/font/google";
import AdminSidebar from "@/components/AdminSidebar";

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

// Persistent left-nav chrome for every researcher-facing page (dashboard,
// test/study builders, results). Participant-facing routes live outside
// app/(admin) and never render this — route groups are transparent to the
// URL, so /tests/[id] etc. keep their existing paths.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${serifDisplay.variable} flex min-h-dvh w-full`}>
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
