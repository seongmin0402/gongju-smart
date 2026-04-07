interface NaverMapsAPI {
  Map: new (el: HTMLElement, opts: object) => NaverMapInstance;
  LatLng: new (lat: number, lng: number) => NaverLatLngInstance;
  Marker: new (opts: object) => NaverMarkerInstance;
  InfoWindow: new (opts: object) => NaverInfoWindowInstance;
  Point: new (x: number, y: number) => unknown;
  Event: {
    addListener: (
      target: unknown,
      event: string,
      handler: (e: { coord: { lat: () => number; lng: () => number } }) => void
    ) => void;
  };
  visualization: {
    HeatMap: new (opts: object) => NaverHeatMapInstance;
    SpectrumStyle: { RAINBOW: unknown; DEEP_SEA: unknown };
  };
}

interface NaverMapInstance {
  setCenter: (latlng: NaverLatLngInstance) => void;
  getZoom: () => number;
}
interface NaverLatLngInstance { lat: () => number; lng: () => number; }
interface NaverMarkerInstance { setMap: (map: NaverMapInstance | null) => void; }
interface NaverInfoWindowInstance {
  open: (map: NaverMapInstance, marker: NaverMarkerInstance) => void;
  close: () => void;
}
interface NaverHeatMapInstance {
  setMap: (map: NaverMapInstance | null) => void;
  setData: (data: unknown[]) => void;
}

declare global {
  interface Window {
    naver: { maps: NaverMapsAPI };
  }
}

export {};
