import type { Metadata } from "next";
import { Noto_Serif_KR, DM_Mono } from "next/font/google";
import "./globals.css";

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "사주해 | 사주 풀이, 왜 그런지까지",
  description: "사주팔자 결과만이 아니라, 왜 그런지를 설명합니다. 일간, 오행, 십성 — 모든 용어에 인라인 해설.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.css"
          rel="stylesheet"
        />
      </head>
      <body className={`${notoSerifKR.variable} ${dmMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
