import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true
    }
  }
};

export default function VouchersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
