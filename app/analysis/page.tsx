'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, AlertTriangle, Zap, DollarSign, ExternalLink, Copy, CheckCheck } from 'lucide-react';
import type { Complaint, AnalysisResult } from '@/types';
import { FACILITY_INFO, CATEGORY_COLORS } from '@/types';
import { analyzeComplaints, budgetRecommendation, generateComplaintText } from '@/lib/recommendation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function AnalysisPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<number>(10000000);
  const [activeTab, setActiveTab] = useState<'risk' | 'budget' | 'text'>('risk');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.from('smart_complaints').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints((data as Complaint[]) ?? []); setLoading(false); });
  }, []);

  const analysis = useMemo(() => analyzeComplaints(complaints), [complaints]);
  const budgetResult = useMemo(() => budgetRecommendation(analysis, budget), [analysis, budget]);

  const complaintText = useMemo(() => {
    if (!selectedComplaint) return '';
    return generateComplaintText(selectedComplaint, '공주시 해당 지역');
  }, [selectedComplaint]);

  function copyText() {
    navigator.clipboard.writeText(complaintText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  const riskColor = (score: number) =>
    score >= 70 ? 'text-red-400 bg-red-950' : score >= 40 ? 'text-orange-400 bg-orange-950' : 'text-yellow-400 bg-yellow-950';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 헤더 */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold text-white text-sm">데이터 분석 · 시설 추천</h1>
          <p className="text-xs text-gray-400">민원 데이터 기반 최적 시설 설치 위치 도출</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '총 민원', value: complaints.length, icon: '📋', color: 'text-blue-400' },
              { label: '분석 지역', value: analysis.length, icon: '📍', color: 'text-violet-400' },
              { label: '고위험 지역', value: analysis.filter(a => a.risk_score >= 60).length, icon: '⚠️', color: 'text-red-400' },
              { label: '추천 시설', value: analysis.reduce((s, a) => s + a.recommended_count, 0), icon: '🏗️', color: 'text-green-400' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
            {([
              { key: 'risk', label: '위험도 분석', icon: TrendingUp },
              { key: 'budget', label: '예산 기반 추천', icon: DollarSign },
              { key: 'text', label: '민원 자동 생성', icon: Zap },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* 위험도 분석 탭 */}
          {activeTab === 'risk' && (
            <div className="space-y-3">
              {analysis.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>민원 데이터가 없습니다. 민원을 먼저 등록해 주세요.</p>
                </div>
              ) : (
                analysis.map((a, idx) => (
                  <div key={a.id} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-gray-400 text-sm font-mono w-6 flex-shrink-0">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{FACILITY_INFO[a.recommended_facility].icon}</span>
                          <span className="font-bold text-white text-sm">{a.recommended_facility} {a.recommended_count}대 추천</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${riskColor(a.risk_score)}`}>
                            위험도 {a.risk_score}
                          </span>
                          <span className="text-xs text-violet-400 bg-violet-950 px-2 py-0.5 rounded-full">
                            시급성 {a.urgency_score}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: CATEGORY_COLORS[a.dominant_category] }} />
                          {a.dominant_category} 다발 · 총 {a.complaint_count}건 (최근 30일 {a.recent_count}건)
                        </p>
                      </div>
                    </div>

                    {/* 점수 바 */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>위험도</span><span>{a.risk_score}/100</span></div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${a.risk_score}%`, background: a.risk_score >= 70 ? '#ef4444' : a.risk_score >= 40 ? '#f97316' : '#eab308' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>시급성</span><span>{a.urgency_score}/100</span></div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${a.urgency_score}%` }} />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed bg-gray-750 bg-gray-900/50 rounded-lg p-3">
                      💡 {a.reason}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 예산 기반 추천 탭 */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-300 mb-3">💰 가용 예산</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1000000} max={100000000} step={1000000}
                    value={budget} onChange={(e) => setBudget(Number(e.target.value))}
                    className="flex-1 accent-blue-500" />
                  <span className="text-blue-400 font-bold text-sm whitespace-nowrap">
                    {(budget / 10000).toLocaleString()}만원
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>100만원</span><span>1억원</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-300">최적 설치 조합</p>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">예상 총 비용</p>
                    <p className="text-blue-400 font-bold">{(budgetResult.totalCost / 10000).toLocaleString()}만원</p>
                  </div>
                </div>
                {budgetResult.selected.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">예산이 부족합니다. (최소 50만원)</p>
                ) : (
                  <div className="space-y-2">
                    {budgetResult.selected.map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                        <span className="text-gray-500 text-xs w-5">#{idx + 1}</span>
                        <span>{FACILITY_INFO[a.recommended_facility].icon}</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">{a.recommended_facility} {a.recommended_count}대</p>
                          <p className="text-[10px] text-gray-400">{a.dominant_category} 지역 · 위험도 {a.risk_score}</p>
                        </div>
                        <p className="text-xs text-green-400 font-semibold whitespace-nowrap">
                          {((FACILITY_INFO[a.recommended_facility].cost * a.recommended_count) / 10000).toLocaleString()}만원
                        </p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-700 text-sm">
                      <span className="text-gray-400">잔여 예산</span>
                      <span className="text-gray-300 font-semibold">{(budgetResult.remaining / 10000).toLocaleString()}만원</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 시설별 단가표 */}
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-300 mb-3">시설별 설치 단가</p>
                <div className="space-y-2">
                  {Object.entries(FACILITY_INFO).map(([facility, info]) => (
                    <div key={facility} className="flex items-center gap-3">
                      <span>{info.icon}</span>
                      <span className="text-xs text-gray-300 flex-1">{facility}</span>
                      <span className="text-xs text-gray-400">{(info.cost / 10000).toLocaleString()}만원/대</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 민원 자동 생성 탭 */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-300 mb-3">민원 선택</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {complaints.slice(0, 20).map((c) => (
                    <button key={c.id} onClick={() => setSelectedComplaint(c)}
                      className={`w-full text-left flex items-center gap-2 p-2.5 rounded-lg transition-colors ${selectedComplaint?.id === c.id ? 'bg-blue-900 border border-blue-600' : 'bg-gray-900 hover:bg-gray-750'}`}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[c.category] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-300">{c.category}</p>
                        <p className="text-[10px] text-gray-500 truncate">{c.description}</p>
                      </div>
                    </button>
                  ))}
                  {complaints.length === 0 && <p className="text-xs text-gray-500 text-center py-4">등록된 민원 없음</p>}
                </div>
              </div>

              {selectedComplaint && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-300">자동 생성된 민원 문장</p>
                    <button onClick={copyText}
                      className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1.5 rounded-lg transition-colors">
                      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {complaintText}
                  </pre>
                  <a href="https://www.safetyreport.go.kr" target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    <ExternalLink className="w-4 h-4" />안전신문고로 이동하여 제출
                  </a>
                  <p className="text-xs text-gray-500 text-center mt-2">위 내용을 복사하여 안전신문고에 붙여넣으세요</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
