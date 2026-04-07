'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, MapPin, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ComplaintCategory } from '@/types';
import { CATEGORY_COLORS } from '@/types';

declare global { interface Window { naver: { maps: { Map: new (el: HTMLElement, opts: object) => unknown; LatLng: new (lat: number, lng: number) => unknown; Marker: new (opts: object) => unknown; Event: { addListener: (t: unknown, e: string, h: (e: { coord: { lat: () => number; lng: () => number } }) => void) => void }; } }; } }

const CATEGORIES: ComplaintCategory[] = ['쓰레기 무단투기', '불법 주정차', '시설 파손', '범죄 위험', '악취', '기타'];

const CATEGORY_DESC: Record<ComplaintCategory, string> = {
  '쓰레기 무단투기': '쓰레기 방치·불법 투기',
  '불법 주정차': '주차금지 구역 주정차',
  '시설 파손': '도로·공공시설 파손',
  '범죄 위험': '우범지대·야간 위험',
  '악취': '악취 발생 지역',
  '기타': '기타 생활 불편',
};

export default function ReportPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<unknown>(null);
  const mapInstance = useRef<unknown>(null);

  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const GONGJU = { lat: 36.4547, lng: 127.1197 };

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(GONGJU.lat, GONGJU.lng),
      zoom: 14,
    });
    mapInstance.current = map;

    window.naver.maps.Event.addListener(map, 'click', (e: { coord: { lat: () => number; lng: () => number } }) => {
      const clickedLat = e.coord.lat();
      const clickedLng = e.coord.lng();
      setLat(clickedLat);
      setLng(clickedLng);

      if (markerRef.current) (markerRef.current as { setMap: (m: null) => void }).setMap(null);
      markerRef.current = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(clickedLat, clickedLng),
        map,
        icon: {
          content: '<div style="background:#3b82f6;color:white;padding:6px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);">📍 선택된 위치</div>',
          anchor: { x: 50, y: 20 } as unknown as never,
        },
      });
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude); setLng(longitude);
        (map as { setCenter: (l: unknown) => void }).setCenter(new window.naver.maps.LatLng(latitude, longitude));
        markerRef.current = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(latitude, longitude),
          map,
          icon: {
            content: '<div style="background:#3b82f6;color:white;padding:6px 10px;border-radius:20px;font-size:11px;font-weight:700;">📍 내 위치</div>',
            anchor: { x: 40, y: 20 } as unknown as never,
          },
        });
      });
    }
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const tryInit = () => { if (window.naver?.maps) { initMap(); return; } setTimeout(tryInit, 300); };
    setTimeout(tryInit, 100);
  }, [step, initMap]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!category || !description.trim() || lat === null || lng === null) {
      setError('카테고리, 내용, 위치를 모두 입력해 주세요.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lng));
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/complaints', { method: 'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || '등록 실패'); }
      setSuccess(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">민원이 접수되었습니다</h2>
          <p className="text-gray-400 text-sm">데이터 분석에 반영되어 시설 설치 추천에 활용됩니다.</p>
          <p className="text-gray-500 text-xs">잠시 후 메인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 헤더 */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold text-white text-sm">민원 등록</h1>
          <p className="text-xs text-gray-400">민원을 수집하는 것이 아니라, 해결까지 연결하는 플랫폼</p>
        </div>
        <div className="ml-auto flex gap-1">
          {[1, 2].map((s) => (
            <div key={s} className={`w-6 h-1.5 rounded-full ${step >= s ? 'bg-blue-500' : 'bg-gray-700'}`} />
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {step === 1 && (
          <>
            {/* 카테고리 */}
            <section>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">1. 유형 선택</h2>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left ${category === cat ? 'border-blue-500 bg-blue-950' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                    <span className="text-sm font-semibold text-white">{cat}</span>
                    <span className="text-xs text-gray-400">{CATEGORY_DESC[cat]}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 설명 */}
            <section>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">2. 상세 내용</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어떤 문제인지 간단히 설명해 주세요. (예: 골목 입구에 쓰레기가 쌓여 있습니다)"
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </section>

            {/* 사진 */}
            <section>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">3. 사진 첨부 (선택)</h2>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="첨부 사진" className="w-full h-48 object-cover rounded-xl" />
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-lg">
                    제거
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-36 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                  <Camera className="w-8 h-8 text-gray-500" />
                  <span className="text-sm text-gray-400">카메라 또는 갤러리에서 선택</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </section>

            <button onClick={() => setStep(2)} disabled={!category || !description.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />위치 선택하기
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">4. 위치 선택</h2>
                {lat !== null && <span className="text-xs text-blue-400">✓ 위치 선택됨</span>}
              </div>
              <p className="text-xs text-gray-500 mb-3">지도를 클릭하거나 GPS로 자동 설정합니다.</p>
              <div ref={mapRef} className="w-full h-72 rounded-xl overflow-hidden border border-gray-700" />
              {lat !== null && (
                <p className="text-xs text-gray-500 mt-2">
                  위도 {lat.toFixed(5)}, 경도 {lng?.toFixed(5)}
                </p>
              )}
            </section>

            {/* 요약 */}
            <section className="bg-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400">등록 내용 요약</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: category ? CATEGORY_COLORS[category] : '#666' }} />
                <span className="text-sm text-white">{category || '-'}</span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{description}</p>
              {imagePreview && <img src={imagePreview} alt="첨부" className="w-16 h-16 object-cover rounded-lg" />}
            </section>

            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors">
                이전
              </button>
              <button onClick={handleSubmit} disabled={submitting || lat === null}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? '등록 중...' : '민원 등록하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
