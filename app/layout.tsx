import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Atlas",
  description: "AI Infrastructure Site → Power Visualizer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
