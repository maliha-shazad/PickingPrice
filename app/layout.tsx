import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Picking Price — Good finds. Better prices.",
  description: "Discover new and pre-loved products, or post what you need. A two-way marketplace in Pakistan.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
