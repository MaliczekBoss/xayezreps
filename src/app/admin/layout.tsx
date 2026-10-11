import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel admina",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh">{children}</div>;
}
