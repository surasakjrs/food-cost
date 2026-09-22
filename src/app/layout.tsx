import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodCost — คำนวณต้นทุนเมนูอาหาร",
  description: "คำนวณ Food Cost สูตรย่อย สต็อก Supplier และ Purchase Order",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
