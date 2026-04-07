import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GongJu Smart — 민원 기반 시설 설치 의사결정 시스템',
  description: '공주시 생활 민원 데이터를 분석하여 CCTV·클린하우스·가로등 최적 설치 위치를 도출하는 스마트 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=visualization`}
          defer
        />
      </head>
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
