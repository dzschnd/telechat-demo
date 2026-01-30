import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telechat",
  description: "Telechat demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
