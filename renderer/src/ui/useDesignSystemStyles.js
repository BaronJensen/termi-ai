import { useEffect } from 'react';

// Inject a lightweight design system shared across pages/components
export default function useDesignSystemStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --ds-bg-0: #0b0d12;
        --ds-bg-1: #0f141c;
        --ds-bg-2: #0b1018;
        --ds-border: #1d2633;
        --ds-border-strong: #2a3b55;
        --ds-text: #e6e6e6;
        --ds-text-dim: #c9d5e1;
        --ds-primary: #3c6df0;
        --ds-primary-2: #3b82f6;
        --ds-card-grad: linear-gradient(135deg, #0f141c 0%, #101828 100%);
        --ds-shadow: 0 10px 28px rgba(0,0,0,0.35);
        --ds-radius: 12px;
      }
      .ds-card {
        background: var(--ds-card-grad);
        border: 1px solid var(--ds-border);
        border-radius: var(--ds-radius);
        box-shadow: var(--ds-shadow);
      }
      .ds-badge {
        font-size: 10px;
        color: #cde3ff;
        background: rgba(60,109,240,.15);
        border: 1px solid var(--ds-border-strong);
        padding: 4px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: .6px;
      }
      .ds-button {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        border-radius: 12px; border: 1px solid var(--ds-border-strong);
        height: 40px; padding: 0 16px; cursor: pointer;
        color: #f2f6ff; background: linear-gradient(135deg, rgba(60,109,240,0.95), rgba(37,99,235,0.95));
        box-shadow: 0 6px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
        transition: transform .08s ease, box-shadow .2s ease, filter .2s ease, opacity .2s ease;
      }
      .ds-button:hover { transform: translateY(-1px); filter: brightness(1.06); }
      .ds-button:active { transform: translateY(0); filter: brightness(.98); }
      .ds-button:disabled { opacity: .6; cursor: not-allowed; }
      .ds-button.secondary { background: #1e2a3d; color: #cde3ff; border-color: var(--ds-border-strong); box-shadow: none; }
      .ds-button.ghost { background: transparent; color: var(--ds-text); border-color: var(--ds-border); }
      .ds-icon-button { width: 28px; height: 28px; border-radius: 999px; border: 1px solid var(--ds-border-strong); background: rgba(15,23,42,.6); color: #cde3ff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
      .ds-icon-button:hover { background: rgba(30,42,61,.8); }
      .ds-input, .ds-select {
        width: 100%; box-sizing: border-box; height: 40px; padding: 10px 12px; border-radius: 10px;
        background: #0b0f16; border: 1px solid #27354a; color: #d6dee8; outline: none;
      }
      .ds-textarea { width: 100%; box-sizing: border-box; min-height: 90px; padding: 10px 12px; border-radius: 10px; background: #0b0f16; border: 1px solid #27354a; color: #d6dee8; outline: none; }
      .ds-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
      .ds-modal { width: min(780px, 92vw); background: linear-gradient(135deg, #0f141c 0%, #0b1018 100%); border: 1px solid var(--ds-border); border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.45); overflow: hidden; }
      .ds-modal-header { padding: 14px 16px; border-bottom: 1px solid var(--ds-border); display: flex; align-items: center; justify-content: space-between; }
      .ds-modal-body { padding: 16px; }
      .ds-modal-footer { padding: 16px; border-top: 1px solid var(--ds-border); display: flex; gap: 10px; justify-content: flex-end; }
      .ds-label { font-size: 12px; color: #a8c0ff; margin-bottom: 6px; }

      /* Hero styles */
      .ds-hero {
        position: relative;
        padding: 48px 24px 56px;
        border-radius: 18px;
        overflow: hidden;
        background: radial-gradient(1000px 400px at 50% -200px, rgba(60,109,240,0.35), transparent 60%),
                    linear-gradient(180deg, #0b0d12 0%, #0f141c 50%, #0b1018 100%);
        border: 1px solid var(--ds-border);
        box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        display: flex; flex-direction: column; align-items: center; gap: 10px;
      }
      .ds-hero-title {
        font-size: clamp(28px, 6.2vw, 56px);
        line-height: 1.1;
        font-weight: 800;
        color: #eaf1ff;
        text-align: center;
        letter-spacing: -0.02em;
      }
      .ds-hero-title .accent { color: #f97316; filter: drop-shadow(0 4px 12px rgba(249,115,22,.35)); }
      .ds-hero-subtitle { color: #c9d5e1; opacity: .85; text-align: center; font-size: 14px; margin-top: 4px; }
      .ds-hero-bar {
        margin-top: 18px;
        width: min(980px, 96%);
        display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;
        padding: 12px; border-radius: 18px;
        background: rgba(7,10,16,0.8);
        border: 1px solid #243246;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.35);
        backdrop-filter: blur(6px);
      }
      .ds-hero-bar .ds-input { height: 48px; font-size: 14px; background: #0b0f16; }
      .ds-hero-bar .ds-select { height: 48px; min-width: 160px; }
      .ds-hero-bar .ds-button { height: 48px; min-width: 120px; }

      /* Compact controls */
      .ds-button.compact { height: 36px; padding: 0 12px; border-radius: 10px; font-size: 13px; }
      .ds-select.compact {
        width: auto;
        height: 32px;
        min-width: 120px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 12px;
      }

      /* Hero one-line textarea */
      .ds-textarea.hero-one-line {
        height: 48px;
        resize: none;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        line-height: 48px;
        padding-top: 0; padding-bottom: 0;
      }

      .icon-inline { display: inline-flex; align-items: center; gap: 6px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
}


