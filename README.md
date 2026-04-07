# GongJu Smart — 민원 데이터 기반 시설 설치 의사결정 시스템

> **"민원을 수집하는 것이 아니라, 해결까지 연결하는 플랫폼을 만든다."**

공주시 내 생활 불편 민원을 수집·분석하여 CCTV, 클린하우스, 가로등 등
공공시설의 최적 설치 위치를 자동 도출하고, 안전신문고와 연결하는 웹 플랫폼입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🗺️ **스마트 지도** | 민원 히트맵 + 추천 시설 위치 시각화 |
| 📍 **민원 등록** | 지도 클릭·GPS 위치 기반 민원 접수 |
| 📊 **위험도 분석** | 격자 기반 위험도·시급성 자동 산출 |
| 🏗️ **시설 추천** | 민원 유형별 최적 시설 종류·수량 추천 |
| 💰 **예산 최적화** | 입력한 예산 내 최적 설치 조합 도출 |
| 📝 **민원 자동 생성** | 안전신문고 제출용 문장 자동 작성 |

---

## 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
# .env.local 열어서 Supabase·Naver Map 키 입력
```

### 3. Supabase DB 설정
- Supabase 대시보드 → SQL Editor
- `supabase/schema.sql` 내용 붙여넣고 실행
- Storage 버킷 `smart-images` 생성 (Public)

### 4. 개발 서버 실행
```bash
npm run dev
# http://localhost:3001 (gongju와 포트 충돌 방지)
```

---

## 프로젝트 구조

```
gongju-smart/
├── app/
│   ├── page.tsx          # 메인 지도 대시보드
│   ├── report/page.tsx   # 민원 등록 (2단계)
│   ├── analysis/page.tsx # 분석·추천·민원 자동 생성
│   └── api/complaints/   # REST API
├── components/
│   └── SmartMap.tsx      # 네이버 지도 + 히트맵
├── lib/
│   ├── recommendation.ts # 추천 알고리즘 (격자 기반)
│   └── supabase.ts
└── types/index.ts
```

---

## 추천 알고리즘

```
격자(~550m) 단위로 민원 집계
→ 위험도 = 전체 민원 수 × 8 + 미처리 × 12 + 최근30일 × 5
→ 시급성 = 최근7일 × 20 + 최근30일 × 4 + 미처리 × 10
→ 지배 카테고리 → 시설 유형 결정
→ 예산 내 상위 지역부터 선택
```

---

## 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (서버리스)
- **DB**: Supabase (PostgreSQL)
- **Map**: 네이버 클라우드 플랫폼 Maps API (히트맵 모듈)
- **배포**: Vercel
