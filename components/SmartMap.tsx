'use client';

import { useEffect, useRef } from 'react';
import type { Complaint, AnalysisResult } from '@/types';
import { CATEGORY_COLORS, FACILITY_INFO } from '@/types';

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMap;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (opts: object) => NaverMarker;
        InfoWindow: new (opts: object) => NaverInfoWindow;
        Event: { addListener: (target: unknown, event: string, handler: () => void) => void };
        visualization: {
          HeatMap: new (opts: object) => NaverHeatMap;
          SpectrumStyle: { RAINBOW: unknown };
        };
      };
    };
  }
}
interface NaverMap { setCenter: (latlng: NaverLatLng) => void; getZoom: () => number; }
interface NaverLatLng { lat: () => number; lng: () => number; }
interface NaverMarker { setMap: (map: NaverMap | null) => void; getElement?: () => HTMLElement; }
interface NaverInfoWindow { open: (map: NaverMap, marker: NaverMarker) => void; close: () => void; }
interface NaverHeatMap { setMap: (map: NaverMap | null) => void; setData: (data: unknown[]) => void; }

interface Props {
  complaints: Complaint[];
  analysis: AnalysisResult[];
  showHeatmap: boolean;
  showRecommend: boolean;
  selectedArea: AnalysisResult | null;
  onAreaSelect: (area: AnalysisResult | null) => void;
}

export default function SmartMap({ complaints, analysis, showHeatmap, showRecommend, selectedArea, onAreaSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const recMarkersRef = useRef<NaverMarker[]>([]);
  const heatmapRef = useRef<NaverHeatMap | null>(null);
  const infoWindowRef = useRef<NaverInfoWindow | null>(null);

  const GONGJU_CENTER = { lat: 36.4547, lng: 127.1197 };

  function clearMarkers(arr: NaverMarker[]) {
    arr.forEach((m) => m.setMap(null));
    arr.length = 0;
  }

  function initMap() {
    if (!containerRef.current || !window.naver?.maps) return;
    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center: new window.naver.maps.LatLng(GONGJU_CENTER.lat, GONGJU_CENTER.lng),
      zoom: 13,
      mapTypeControl: false,
    });
  }

  function renderComplaints() {
    if (!mapRef.current || !window.naver?.maps) return;
    clearMarkers(markersRef.current);
    complaints.forEach((c) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(c.latitude, c.longitude),
        map: mapRef.current!,
        icon: {
          content: `<div style="width:12px;height:12px;border-radius:50%;background:${CATEGORY_COLORS[c.category]};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5);"></div>`,
          anchor: new (window.naver.maps as unknown as { Point: new (x: number, y: number) => unknown }).Point(6, 6),
        },
      });
      const iw = new window.naver.maps.InfoWindow({
        content: `<div style="padding:8px 12px;background:#1f2937;color:#f9fafb;border-radius:8px;font-size:12px;min-width:140px;">
          <b style="color:${CATEGORY_COLORS[c.category]}">${c.category}</b><br/>
          <span style="color:#9ca3af">${c.description.slice(0, 40)}${c.description.length > 40 ? '…' : ''}</span><br/>
          <span style="color:#6b7280;font-size:10px">${c.status} · ${new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
        </div>`,
        borderWidth: 0,
        backgroundColor: 'transparent',
        anchorSkew: true,
      });
      window.naver.maps.Event.addListener(marker, 'click', () => {
        infoWindowRef.current?.close();
        iw.open(mapRef.current!, marker);
        infoWindowRef.current = iw;
      });
      markersRef.current.push(marker);
    });
  }

  function renderRecommendations() {
    if (!mapRef.current || !window.naver?.maps) return;
    clearMarkers(recMarkersRef.current);
    if (!showRecommend) return;
    analysis.slice(0, 15).forEach((a) => {
      const info = FACILITY_INFO[a.recommended_facility];
      const color = a.risk_score >= 70 ? '#ef4444' : a.risk_score >= 40 ? '#f97316' : '#eab308';
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(a.center_lat, a.center_lng),
        map: mapRef.current!,
        icon: {
          content: `<div style="background:${color};color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);border:2px solid white;cursor:pointer;">
            ${info.icon} ${a.recommended_facility} (${a.risk_score}점)
          </div>`,
          anchor: new (window.naver.maps as unknown as { Point: new (x: number, y: number) => unknown }).Point(50, 16),
        },
        zIndex: 10,
      });
      window.naver.maps.Event.addListener(marker, 'click', () => onAreaSelect(a));
      recMarkersRef.current.push(marker);
    });
  }

  function renderHeatmap() {
    if (!mapRef.current || !window.naver?.maps?.visualization) return;
    if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    if (!showHeatmap || complaints.length === 0) return;
    heatmapRef.current = new window.naver.maps.visualization.HeatMap({
      map: mapRef.current,
      data: complaints.map((c) => ({ lat: c.latitude, lng: c.longitude, weight: 1 })),
      radius: 30,
      opacity: 0.65,
    });
  }

  useEffect(() => {
    const tryInit = () => {
      if (window.naver?.maps) { initMap(); return; }
      setTimeout(tryInit, 300);
    };
    tryInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { renderComplaints(); renderRecommendations(); renderHeatmap(); }, [complaints, analysis]);
  useEffect(() => { renderHeatmap(); }, [showHeatmap]);
  useEffect(() => { renderRecommendations(); }, [showRecommend]);

  return <div ref={containerRef} className="w-full h-full" />;
}
