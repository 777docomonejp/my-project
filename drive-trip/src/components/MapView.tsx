import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Spot, SpotStatus } from "../types";
import { hasCoords } from "../state";

const TODA: [number, number] = [35.8176, 139.6779];

const PREF_LABELS: [string, number, number][] = [
  ["埼玉", 36.0, 139.35],
  ["東京", 35.69, 139.5],
  ["群馬", 36.5, 138.95],
  ["栃木", 36.68, 139.8],
  ["千葉", 35.5, 140.2],
  ["茨城", 36.3, 140.3],
  ["神奈川", 35.42, 139.3],
];

export const STATUS_COLOR: Record<SpotStatus | "none", string> = { want: "#1f7a52", hold: "#b7791f", no: "#8a8f98", none: "#2f5d9e" };

export function MapView({ spots, statusOf, onSelect }: { spots: Spot[]; statusOf: (id: string) => SpotStatus | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: TODA, zoom: 8, zoomControl: true, attributionControl: true });
    // OpenStreetMap 公式タイル（APIキー不要）。タイル利用ポリシーに従い、帰属表示を出し、ズーム範囲を絞って過剰な取得をしない。
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      minZoom: 6,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });
    let ok = 0;
    let bad = 0;
    tiles.on("tileload", () => ok++);
    tiles.on("tileerror", () => {
      bad++;
      if (bad >= 3 && ok === 0) setTilesFailed(true);
    });
    tiles.addTo(m);
    L.circleMarker(TODA, { radius: 7, color: "#fff", weight: 2, fillColor: "#c0392b", fillOpacity: 1 }).addTo(m).bindTooltip("戸田市（合流地点）");
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !tilesFailed) return;
    // 地図画像が取得できない環境（オフライン・表示制限）では県名ラベルだけ表示して位置関係を示す
    const g = L.layerGroup(
      PREF_LABELS.map(([n, lat, lng]) => L.marker([lat, lng], { interactive: false, icon: L.divIcon({ className: "pref-label", html: n, iconSize: [60, 20] }) })),
    ).addTo(m);
    return () => {
      g.remove();
    };
  }, [tilesFailed]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const sp of spots) {
      if (!hasCoords(sp)) continue;
      const st = statusOf(sp.id);
      const mk = L.circleMarker([sp.lat, sp.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: STATUS_COLOR[st ?? "none"],
        fillOpacity: st === "no" ? 0.5 : 0.95,
      });
      mk.bindTooltip(sp.name);
      mk.on("click", () => select.current(sp.id));
      g.addLayer(mk);
    }
  }, [spots, statusOf]);

  return (
    <div className="map-wrap">
      <div ref={el} className={`map ${tilesFailed ? "no-tiles" : ""}`} role="application" aria-label="観光地の地図" />
      {tilesFailed && (
        <p className="map-note">
          この表示環境では地図画像を読み込めません（オフライン、または外部画像が制限されたページ）。マーカーの位置関係は表示しています。詳しい場所は各観光地の「Googleマップで開く」を使ってください。
        </p>
      )}
    </div>
  );
}
