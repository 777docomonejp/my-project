import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

/** 予期しないエラーで真っ白にならないよう、復旧手段を表示する */
class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="content stack">
        <h1>表示中にエラーが起きました</h1>
        <p>データは端末に保存されています。再読み込みしても直らない場合は、内容をメモして連絡してください。</p>
        <pre className="err">{this.state.error}</pre>
        <button className="btn primary" onClick={() => location.reload()}>再読み込み</button>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
);
