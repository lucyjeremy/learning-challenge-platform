import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
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

// Google 애널리틱스 4 측정 ID (공개 값, 비밀 아님)
const GA_ID = "G-M7JKKTBECS";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spoqa.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-grey-97 text-grey-0">
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
        <a href="#main" className="skip-link">본문으로 건너뛰기</a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
