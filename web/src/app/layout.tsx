import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const spoqa = localFont({
  src: [
    { path: "./fonts/SpoqaHanSansNeo-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SpoqaHanSansNeo-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SpoqaHanSansNeo-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-spoqa",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "챌린지업 · 끝까지 함께하는 강의 챌린지", template: "%s · 챌린지업" },
  description: "매일 강의 하나, 미션 하나. 같은 기수 동료와 함께 끝까지 완주하는 온라인 강의 챌린지.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spoqa.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-grey-97 text-grey-0">
        <a href="#main" className="skip-link">본문으로 건너뛰기</a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
