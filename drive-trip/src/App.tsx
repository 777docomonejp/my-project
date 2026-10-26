import { useState } from "react";
import { useTripStore } from "./state";
import { HomeTab } from "./components/HomeTab";
import { SpotsTab } from "./components/SpotsTab";
import { SpotDetail } from "./components/SpotDetail";
import { PlanTab } from "./components/PlanTab";
import { CostTab } from "./components/CostTab";
import { ShareTab } from "./components/ShareTab";

const TABS = [
  ["home", "ホーム", "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  ["spots", "観光地", "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"],
  ["plan", "旅程", "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z"],
  ["cost", "費用", "M3 6a2 2 0 0 1 2-2h13v3H5v1h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2zm14 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
  ["share", "共有", "M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"],
] as const;

type Tab = (typeof TABS)[number][0];

export function App() {
  const s = useTripStore();
  const [tab, setTab] = useState<Tab>("home");
  const [spot, setSpot] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="top">
        <span className="top-title">オヤジ3人旅特設アプリ</span>
        <span className="me">{s.me ? s.memberName(s.me) : "名前未選択"}</span>
      </header>
      {s.notice && (
        <div className="alert warn banner" role="alert">
          {s.notice}
          <button className="link-btn" onClick={() => s.setNotice(undefined)}>閉じる</button>
        </div>
      )}
      <main className="content">
        {tab === "home" && <HomeTab s={s} go={(t) => setTab(t as Tab)} />}
        {tab === "spots" && <SpotsTab s={s} onOpen={setSpot} />}
        {tab === "plan" && <PlanTab s={s} onOpenSpot={setSpot} />}
        {tab === "cost" && <CostTab s={s} />}
        {tab === "share" && <ShareTab s={s} onOpenSpot={setSpot} />}
      </main>
      <nav className="tabbar" aria-label="メニュー">
        {TABS.map(([k, label, d]) => (
          <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => { setTab(k); window.scrollTo(0, 0); }}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {spot && <SpotDetail s={s} spotId={spot} onClose={() => setSpot(null)} />}
    </div>
  );
}
