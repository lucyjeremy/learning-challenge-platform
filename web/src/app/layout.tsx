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

// Google 태그 관리자 컨테이너 ID (공개 값, 비밀 아님)
const GTM_ID = "GTM-TDMX9TSW";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spoqa.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-grey-97 text-grey-0">
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        <noscript>
          <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <a href="#main" className="skip-link">본문으로 건너뛰기</a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
