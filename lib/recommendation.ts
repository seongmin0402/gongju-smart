import type { Complaint, AnalysisResult, GridCell, FacilityType } from '@/types';

const GRID_DEG = 0.005; // ~550m 격자

function gridKey(lat: number, lng: number): string {
  return `${Math.floor(lat / GRID_DEG)}_${Math.floor(lng / GRID_DEG)}`;
}

function gridCenter(key: string): { lat: number; lng: number } {
  const [r, c] = key.split('_').map(Number);
  return { lat: (r + 0.5) * GRID_DEG, lng: (c + 0.5) * GRID_DEG };
}

function subtractDays(d: Date, days: number): Date {
  const r = new Date(d); r.setDate(r.getDate() - days); return r;
}

function dominantCategory(complaints: Complaint[]): string {
  const map: Record<string, number> = {};
  complaints.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '기타';
}

function recommendFacility(dominant: string, riskScore: number): { facility: FacilityType; count: number; reason: string } {
  if (dominant === '쓰레기 무단투기' || dominant === '악취') {
    return {
      facility: riskScore >= 60 ? '클린하우스' : '쓰레기통',
      count: riskScore >= 60 ? 1 : 2,
      reason: `쓰레기 관련 민원이 집중되어 있으며 위험도 ${riskScore}점으로 ${riskScore >= 60 ? '클린하우스' : '쓰레기통 추가'} 설치가 시급합니다.`,
    };
  }
  if (dominant === '불법 주정차' || dominant === '범죄 위험') {
    const count = riskScore >= 70 ? 3 : riskScore >= 40 ? 2 : 1;
    return {
      facility: 'CCTV',
      count,
      reason: `${dominant} 민원이 다수 접수된 지역으로, CCTV ${count}대 설치를 통해 억제 효과가 기대됩니다.`,
    };
  }
  if (dominant === '시설 파손') {
    return {
      facility: '가로등',
      count: 2,
      reason: '시설 파손 및 야간 안전 취약 지역으로 가로등 추가 설치가 필요합니다.',
    };
  }
  return {
    facility: 'CCTV',
    count: 1,
    reason: `다양한 민원이 발생하는 지역으로 기본적인 CCTV 설치를 권장합니다.`,
  };
}

export function analyzeComplaints(complaints: Complaint[]): AnalysisResult[] {
  const now = new Date();
  const cutoff30 = subtractDays(now, 30);
  const cutoff7  = subtractDays(now, 7);

  // 격자 분류
  const cells: Record<string, GridCell> = {};
  complaints.forEach((c) => {
    const key = gridKey(c.latitude, c.longitude);
    if (!cells[key]) {
      const { lat, lng } = gridCenter(key);
      cells[key] = { key, lat, lng, complaints: [] };
    }
    cells[key].complaints.push(c);
  });

  return Object.values(cells)
    .filter((cell) => cell.complaints.length >= 1)
    .map((cell): AnalysisResult => {
      const total  = cell.complaints.length;
      const recent30 = cell.complaints.filter((c) => new Date(c.created_at) >= cutoff30).length;
      const recent7  = cell.complaints.filter((c) => new Date(c.created_at) >= cutoff7).length;
      const open     = cell.complaints.filter((c) => c.status === '접수').length;

      // 위험도: 전체 민원 수 + 접수 미처리 비율
      const riskScore = Math.min(100, Math.round(
        total * 8 + open * 12 + recent30 * 5
      ));

      // 시급성: 최근 추세
      const urgencyScore = Math.min(100, Math.round(
        recent7 * 20 + recent30 * 4 + open * 10
      ));

      const dominant = dominantCategory(cell.complaints);
      const { facility, count, reason } = recommendFacility(dominant, riskScore);

      return {
        id: cell.key,
        area_key: cell.key,
        center_lat: cell.lat,
        center_lng: cell.lng,
        radius: 300,
        risk_score: riskScore,
        urgency_score: urgencyScore,
        complaint_count: total,
        recent_count: recent30,
        recommended_facility: facility,
        recommended_count: count,
        reason,
        dominant_category: dominant,
        created_at: now.toISOString(),
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score);
}

export function budgetRecommendation(
  results: AnalysisResult[],
  budget: number
): { selected: AnalysisResult[]; totalCost: number; remaining: number } {
  const FACILITY_COST: Record<string, number> = {
    CCTV: 3000000, 클린하우스: 8000000, 가로등: 1500000, 쓰레기통: 500000,
  };
  let remaining = budget;
  const selected: AnalysisResult[] = [];

  for (const r of results) {
    const cost = (FACILITY_COST[r.recommended_facility] ?? 3000000) * r.recommended_count;
    if (remaining >= cost) {
      selected.push(r);
      remaining -= cost;
    }
  }
  return { selected, totalCost: budget - remaining, remaining };
}

export function generateComplaintText(complaint: Complaint, address: string): string {
  const dateStr = new Date(complaint.created_at).toLocaleDateString('ko-KR');
  return `제목: [${complaint.category}] ${address} 문제 신고\n\n` +
    `안전신문고에 민원을 접수합니다.\n\n` +
    `발생 위치: ${address} (위도 ${complaint.latitude.toFixed(5)}, 경도 ${complaint.longitude.toFixed(5)})\n` +
    `발생 유형: ${complaint.category}\n` +
    `신고 일시: ${dateStr}\n` +
    `상세 내용: ${complaint.description}\n\n` +
    `해당 지역에서 ${complaint.category} 문제가 지속적으로 발생하고 있어 ` +
    `조속한 처리 및 재발 방지 시설 설치를 요청드립니다.\n\n` +
    `본 민원은 공주시 스마트 민원 분석 플랫폼(GongJu Smart)을 통해 접수되었습니다.`;
}
