import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodCost — คำนวณต้นทุนเมนูอาหาร",
  description: "คำนวณต้นทุนวัตถุดิบ ต้นทุนต่อจาน และ Food Cost",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
