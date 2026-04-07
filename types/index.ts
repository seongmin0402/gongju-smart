export type ComplaintCategory = '쓰레기 무단투기' | '불법 주정차' | '시설 파손' | '범죄 위험' | '악취' | '기타';
export type ComplaintStatus = '접수' | '처리중' | '완료';
export type FacilityType = 'CCTV' | '클린하우스' | '가로등' | '쓰레기통';

export interface Complaint {
  id: string;
  latitude: number;
  longitude: number;
  category: ComplaintCategory;
  description: string;
  image_url?: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  ai_category?: string | null;
  risk_score?: number | null;
  urgency_score?: number | null;
  address?: string | null;
}

export interface AnalysisResult {
  id: string;
  area_key: string;           // "lat_lng" 그리드 키
  center_lat: number;
  center_lng: number;
  radius: number;
  risk_score: number;          // 0~100
  urgency_score: number;       // 0~100
  complaint_count: number;
  recent_count: number;        // 최근 30일
  recommended_facility: FacilityType;
  recommended_count: number;
  reason: string;
  dominant_category: string;
  created_at: string;
}

export interface RecommendationInput {
  complaints: Complaint[];
  budget?: number;
}

export interface GridCell {
  key: string;
  lat: number;
  lng: number;
  complaints: Complaint[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  '쓰레기 무단투기': '#ef4444',
  '불법 주정차':     '#f97316',
  '시설 파손':       '#eab308',
  '범죄 위험':       '#8b5cf6',
  '악취':           '#84cc16',
  '기타':           '#6b7280',
};

export const FACILITY_INFO: Record<FacilityType, { icon: string; cost: number; color: string }> = {
  'CCTV':    { icon: '📹', cost: 3000000,  color: '#3b82f6' },
  '클린하우스': { icon: '🏠', cost: 8000000,  color: '#22c55e' },
  '가로등':   { icon: '💡', cost: 1500000,  color: '#eab308' },
  '쓰레기통':  { icon: '🗑️', cost: 500000,   color: '#f97316' },
};

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  '접수':   'bg-orange-100 text-orange-700',
  '처리중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
};
