'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, AlertTriangle, CheckCircle, Clock, TrendingUp, Plus, BarChart3, Zap } from 'lucide-react';
import type { Complaint, AnalysisResult } from '@/types';
import { CATEGORY_COLORS, FACILITY_INFO, STATUS_COLORS } from '@/types';
import { analyzeComplaints } from '@/lib/recommendation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const SmartMap = dynamic(() => import('@/components/SmartMap'), { ssr: false });

export default function HomePage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRecommend, setShowRecommend] = useState(true);
  const [selectedArea, setSelectedArea] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommend' | 'stats'>('overview');

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.from('smart_complaints').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints((data as Complaint[]) ?? []); setLoading(false); });
  }, []);

  const analysis = useMemo(() => analyzeComplaints(complaints), [complaints]);

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === '접수').length,
    processing: complaints.filter((c) => c.status === '처리중').length,
    done: complaints.filter((c) => c.status === '완료').length,
    highRisk: analysis.filter((a) => a.risk_score >= 60).length,
  };

  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    complaints.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [complaints]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">GS</div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">GongJu Smart</h1>
            <p className="text-xs text-gray-400">민원 데이터 기반 시설 설치 의사결정 시스템</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/analysis" className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <BarChart3 className="w-3.5 h-3.5" />분석 결과
          </Link>
          <Link href="/report" className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />민원 등록
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드 패널 */}
        <aside className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-gray-800">
            {(['overview', 'recommend', 'stats'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {tab === 'overview' ? '현황' : tab === 'recommend' ? '추천' : '통계'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === 'overview' && (
              <>
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '전체 민원', value: stats.total, icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-950' },
                    { label: '미처리', value: stats.open, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-950' },
                    { label: '처리중', value: stats.processing, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-950' },
                    { label: '완료', value: stats.done, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-950' },
                  ].map((s) => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center gap-2`}>
                      <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                      <div>
                        <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 위험 지역 */}
                <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-300">고위험 지역</span>
                    <span className="ml-auto text-xs bg-red-800 text-red-200 px-1.5 py-0.5 rounded-full">{stats.highRisk}개소</span>
                  </div>
                  {analysis.filter((a) => a.risk_score >= 60).slice(0, 3).map((a) => (
                    <div key={a.id} onClick={() => setSelectedArea(a)}
                      className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-red-900/20 rounded px-1 transition-colors">
                      <div>
                        <span className="text-xs text-gray-300">{a.dominant_category}</span>
                        <span className="text-xs text-gray-500 ml-1">({a.complaint_count}건)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${a.risk_score}%` }} />
                        </div>
                        <span className="text-xs text-red-400 font-mono w-8 text-right">{a.risk_score}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 최근 민원 */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">최근 접수</p>
                  {complaints.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-start gap-2 py-2 border-b border-gray-800 last:border-0">
                      <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: CATEGORY_COLORS[c.category] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-300">{c.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.description}</p>
                      </div>
                    </div>
                  ))}
                  {complaints.length === 0 && !loading && (
                    <p className="text-xs text-gray-600 text-center py-4">등록된 민원이 없습니다.</p>
                  )}
                </div>
              </>
            )}

            {activeTab === 'recommend' && (
              <>
                <p className="text-xs text-gray-500">민원 밀집도·위험도를 분석하여 시설 설치 위치를 자동 추천합니다.</p>
                {analysis.slice(0, 8).map((a, idx) => (
                  <div key={a.id} onClick={() => setSelectedArea(a)}
                    className={`bg-gray-800 rounded-xl p-3 cursor-pointer hover:bg-gray-750 transition-colors border ${selectedArea?.id === a.id ? 'border-blue-500' : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{FACILITY_INFO[a.recommended_facility].icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{a.recommended_facility} {a.recommended_count}대</span>
                          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded-full">#{idx + 1}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{a.dominant_category} 다발 지역</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">위험도</p>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${a.risk_score}%`, background: a.risk_score >= 70 ? '#ef4444' : a.risk_score >= 40 ? '#f97316' : '#eab308' }} />
                          </div>
                          <span className="text-[10px] text-gray-300 w-6 text-right">{a.risk_score}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-0.5">시급성</p>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${a.urgency_score}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-300 w-6 text-right">{a.urgency_score}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">{a.reason.slice(0, 60)}...</p>
                  </div>
                ))}
                {analysis.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-xs">민원 데이터가 없습니다.</div>
                )}
              </>
            )}

            {activeTab === 'stats' && (
              <>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />유형별 민원
                  </p>
                  {categoryStats.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2 mb-2 last:mb-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                      <span className="text-xs text-gray-300 w-24 truncate">{cat}</span>
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(count / (stats.total || 1)) * 100}%`, background: CATEGORY_COLORS[cat] }} />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  ))}
                  {categoryStats.length === 0 && <p className="text-xs text-gray-600 text-center py-2">데이터 없음</p>}
                </div>

                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />추천 시설 분포
                  </p>
                  {Object.entries(FACILITY_INFO).map(([facility, info]) => {
                    const cnt = analysis.filter((a) => a.recommended_facility === facility).length;
                    return (
                      <div key={facility} className="flex items-center gap-2 mb-2 last:mb-0">
                        <span>{info.icon}</span>
                        <span className="text-xs text-gray-300 w-20">{facility}</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(cnt / (analysis.length || 1)) * 100}%`, background: info.color }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 지도 컨트롤 */}
          <div className="border-t border-gray-800 p-3 space-y-2 flex-shrink-0">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">지도 레이어</p>
            <div className="flex gap-2">
              <button onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${showHeatmap ? 'bg-red-800 text-red-200' : 'bg-gray-800 text-gray-400'}`}>
                🔥 히트맵
              </button>
              <button onClick={() => setShowRecommend(!showRecommend)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${showRecommend ? 'bg-blue-800 text-blue-200' : 'bg-gray-800 text-gray-400'}`}>
                📍 추천 위치
              </button>
            </div>
          </div>
        </aside>

        {/* 지도 */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">민원 데이터 불러오는 중...</p>
              </div>
            </div>
          )}
          <SmartMap
            complaints={complaints}
            analysis={analysis}
            showHeatmap={showHeatmap}
            showRecommend={showRecommend}
            selectedArea={selectedArea}
            onAreaSelect={setSelectedArea}
          />

          {/* 선택된 지역 상세 팝업 */}
          {selectedArea && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 w-96 z-20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{FACILITY_INFO[selectedArea.recommended_facility].icon}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{selectedArea.recommended_facility} 설치 권장</p>
                    <p className="text-xs text-gray-400">{selectedArea.recommended_count}대 · {selectedArea.dominant_category} 다발</p>
                  </div>
                </div>
                <button onClick={() => setSelectedArea(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-400">{selectedArea.risk_score}</p>
                  <p className="text-[10px] text-gray-400">위험도</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-violet-400">{selectedArea.urgency_score}</p>
                  <p className="text-[10px] text-gray-400">시급성</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-400">{selectedArea.complaint_count}</p>
                  <p className="text-[10px] text-gray-400">민원 수</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">{selectedArea.reason}</p>
              <div className="flex gap-2">
                <Link href={`/analysis?area=${selectedArea.id}`}
                  className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium">
                  상세 분석 보기
                </Link>
                <Link href="/report"
                  className="flex-1 text-center text-xs bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors font-medium">
                  민원 등록
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
