export const styles = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes typewriter {
        from { 
          opacity: 0.8;
          transform: translateY(2px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInFromRight {
        from {
          opacity: 0;
          transform: translateX(100px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
      
      @keyframes slideOutToLeft {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateX(-100px) scale(0.8);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0,-8px,0);
        }
        70% {
          transform: translate3d(0,-4px,0);
        }
        90% {
          transform: translate3d(0,-2px,0);
        }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          max-height: 300px;
          transform: translateY(0);
        }
      }
      
      /* Streaming text styles */
      .streaming-text-display {
        animation: fadeInUp 0.3s ease-out;
        position: relative;
        margin-left: 20px;
      }
      
      .streaming-text-display::before {
        content: '';
        position: absolute;
        top: 0;
        left: -20px;
        width: 3px;
        height: 100%;

      }
      
      .bubble {
        position: relative;
        transition: all 0.3s ease;
      }
      
      .bubble:hover {
        transform: translateY(-1px);
      }
      
      .bubble.user {
        margin-left: auto;
        margin-right: 0;
        max-width: 80%;
      }
      
      .bubble.assistant {
        margin-left: 0;
        margin-right: auto;
        max-width: 85%;
      }
      
      .bubble.result {
        margin-left: 0;
        margin-right: auto;
        max-width: 90%;
      }
      
      .bubble.streaming {
        border-left: 4px solid #3b82f6;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
      }
      
      .bubble.tool-call {
        border-left: 3px solid #3b82f6;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
        border: 1px solid rgba(59, 130, 246, 0.2);
        animation: toolCallPulse 2s ease-in-out infinite;
      }
      
      @keyframes toolCallPulse {
        0%, 100% { 
          border-color: rgba(59, 130, 246, 0.2);
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.1);
        }
        50% { 
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      }
      
      .streaming-text {
        position: relative;
      }
      
      .streaming-text::after {
        content: '▋';
        display: inline-block;
        animation: blink 1s infinite;
        color: #3b82f6;
        font-weight: bold;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      
      /* Streaming text blinking animations */
      @keyframes streamingBlink {
        0%, 100% { 
          opacity: 0.6;
          transform: scale(1);
        }
        50% { 
          opacity: 0.8;
          transform: scale(1.02);
        }
      }
      
      @keyframes textBlink {
        0%, 100% { 
          opacity: 1;
          color: #60a5fa;
        }
        50% { 
          opacity: 0.7;
          color: #93c5fd;
        }
      }
      
      @keyframes contentBlink {
        0%, 100% { 
          opacity: 0.6;
        }
        50% { 
          opacity: 0.9;
        }
      }
      
      /* Enhanced markdown content styles */
      .markdown-content {
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3,
      .markdown-content h4,
      .markdown-content h5,
      .markdown-content h6 {
        margin: 16px 0 8px 0;
        font-weight: 600;
        line-height: 1.25;
        color: inherit;
      }
      
      .markdown-content h1 { font-size: 1.5em; }
      .markdown-content h2 { font-size: 1.3em; }
      .markdown-content h3 { font-size: 1.1em; }
      
      .markdown-content p {
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      .markdown-content li {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .markdown-content blockquote {
        margin: 12px 0;
        padding: 8px 16px;
        border-left: 4px solid #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 4px;
        font-style: italic;
      }
      
      .markdown-content code {
        background: rgba(55, 65, 81, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        color: #e5e7eb;
      }
      
      .markdown-content pre {
        background: rgba(17, 24, 39, 0.8);
        padding: 12px 16px;
        border-radius: 8px;
        overflow-x: auto;
        border: 1px solid rgba(55, 65, 81, 0.3);
        margin: 12px 0;
      }
      
      .markdown-content pre code {
        background: none;
        padding: 0;
        border-radius: 0;
        color: inherit;
      }
      
      .markdown-content a {
        color: #60a5fa;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease;
      }
      
      .markdown-content a:hover {
        border-bottom-color: #60a5fa;
      }
      
      .markdown-content strong {
        font-weight: 600;
        color: inherit;
      }
      
      .markdown-content em {
        font-style: italic;
        color: inherit;
      }
      
      .markdown-content hr {
        border: none;
        height: 1px;
        background: rgba(55, 65, 81, 0.3);
        margin: 16px 0;
      }
      
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 12px 0;
      }
      
      .markdown-content th,
      .markdown-content td {
        border: 1px solid rgba(55, 65, 81, 0.3);
        padding: 8px 12px;
        text-align: left;
      }
      
      .markdown-content th {
        background: rgba(31, 41, 55, 0.3);
        font-weight: 600;
      }
      
      .bubble {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        padding: 10px 14px;
        margin: 6px 0;
        border-radius: 10px;
        transition: all 0.2s ease;
        min-height: fit-content;
        height: auto;
        font-size: 12px;
      }
      
      .bubble.assistant {
        background: linear-gradient(135deg, #0b1018 0%, #172033 100%);
        border-left: 3px solid #3c6df0;
        margin-right: 18px;
        color: #e6e6e6;
      }
      
      .bubble.user {
        background: linear-gradient(135deg, #121a29 0%, #243249 100%);
        color: #e6e6e6;
        margin-left: 18px;
        text-align: right;
      }
      
      .bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: auto;
        min-height: 0;
        position: relative;
      }

      /* Custom scrollbar for messages */
      .messages::-webkit-scrollbar {
        width: 8px;
      }

      .messages::-webkit-scrollbar-track {
        background: #0b0f16;
        border-radius: 4px;
      }

      .messages::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        border-radius: 4px;
        border: 1px solid #1e293b;
      }

      .messages::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
      }

      /* Firefox scrollbar styling */
      .messages {
        scrollbar-width: thin;
        scrollbar-color: #3b82f6 #0b0f16;
      }

      /* Messages container wrapper */
      .messages-container {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        height: auto;
        min-height: 0;
      }

      /* Message list - the actual scrollable container */
      .message-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: auto;
        min-height: 0;
        position: relative;
      }

      /* Custom scrollbar for message-list */
      .message-list::-webkit-scrollbar {
        width: 8px;
      }

      .message-list::-webkit-scrollbar-track {
        background: #0b0f16;
        border-radius: 4px;
      }

      .message-list::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        border-radius: 4px;
        border: 1px solid #1e293b;
      }

      .message-list::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
      }

      /* Firefox scrollbar styling */
      .message-list {
        scrollbar-width: thin;
        scrollbar-color: #3b82f6 #0b0f16;
      }
      
      .input {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #0b0f16;
        border: 1px solid #27354a;
        border-radius: 12px;
        padding: 10px;
        width: 100%;
        box-sizing: border-box;
        margin-top: 8px;
      }
      
      .input textarea {
        flex: 1;
        resize: vertical;
        min-height: 56px;
        max-height: 180px;
        background: #0b1018;
        border: 1px solid #1d2633;
        color: #d6dee8;
        padding: 10px;
        border-radius: 10px;
        outline: none;
        font-family: inherit;
        font-size: 12px;
        line-height: 1.35;
        width: 100%;
        box-sizing: border-box;
      }

      .input-field { grid-column: 1; grid-row: 1; }
      .shortcut-hint {
        grid-column: 1;
        grid-row: 2;
        font-size: 10px;
        color: #6b7280;
        font-family: monospace;
        justify-self: start;
        align-self: center;
      }

      .send-button {
        width: 36px;
        height: 36px;
        padding: 0;
        border: 1px solid #2a3b55;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(60,109,240,0.9) 0%, rgba(59,130,246,0.85) 50%, rgba(37,99,235,0.9) 100%);
        color: #f2f6ff;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 0.2px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 16px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
        transition: transform 0.08s ease, box-shadow 0.2s ease, filter 0.2s ease, opacity 0.2s ease;
        cursor: pointer;
        align-self: center;
      }

      .chip { 
        display: inline-flex; align-items: center; gap: 6px;
        background: #0b1018; border: 1px solid #1d2633; color: #c9d5e1;
        padding: 6px 10px; border-radius: 999px; font-size: 11px;
      }

      .chip-select { 
        appearance: none; background: #0b1018; color: #e6e6e6; 
        border: 1px solid #1d2633; border-radius: 999px; padding: 6px 28px 6px 10px; 
        font-size: 11px; outline: none; cursor: pointer;
        background-image: linear-gradient(45deg, transparent 50%, #6b7280 50%), linear-gradient(135deg, #6b7280 50%, transparent 50%);
        background-position: calc(100% - 14px) calc(1em - 2px), calc(100% - 9px) calc(1em - 2px);
        background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
      }

      .send-button:hover:not(:disabled) {
        box-shadow: 0 10px 24px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
        filter: brightness(1.06);
        transform: translateY(-1px);
      }

      .send-button:active:not(:disabled) {
        transform: translateY(0);
        filter: brightness(0.98);
      }

      .send-button:disabled {
        cursor: not-allowed;
        filter: grayscale(20%);
      }

      /* Themed scrollbars for app surfaces */
      .messages {
        scrollbar-color: #3b82f6 #0b0f16; /* Firefox - updated to match new theme */
        scrollbar-width: thin; /* Firefox */
      }

      .markdown-content pre {
        scrollbar-color: #3b82f6 #0b0f16;
        scrollbar-width: thin;
      }
      .markdown-content pre::-webkit-scrollbar {
        height: 8px;
      }
      .markdown-content pre::-webkit-scrollbar-track {
        background: #0b0f16;
        border-top: 1px solid #1d2633;
        border-bottom: 1px solid #1d2633;
      }
      .markdown-content pre::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        border-radius: 8px;
        border: 1px solid #1e293b;
      }

      .input textarea {
        scrollbar-color: #3b82f6 #0b0f16;
        scrollbar-width: thin;
      }
      .input textarea::-webkit-scrollbar {
        width: 8px;
      }
      .input textarea::-webkit-scrollbar-track {
        background: #0b0f16;
        border-left: 1px solid #1d2633;
      }
      .input textarea::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        border-radius: 8px;
        border: 1px solid #1e293b;
      }
      
      /* Global copy functionality */
      .copyable-text {
        user-select: text;
        cursor: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
      
      .copyable-text:hover {
        background-color: rgba(60, 109, 240, 0.1);
        border-radius: 2px;
        padding: 1px 2px;
        margin: -1px -2px;
      }
      
      .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(60, 109, 240, 0.8);
        color: #e6e6e6;
        border: none;
        borderRadius: '4px';
        padding: '4px 8px';
        fontSize: '10px';
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        zIndex: 10;
      }
      
      .copy-button:hover {
        opacity: 1;
      }
      
      .copyable-container {
        position: relative;
      }
      
      .copyable-container:hover .copy-button {
        opacity: 1;
      }
      
      /* Accessibility improvements */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Focus styles for better accessibility */
      .bubble:focus,
      .input textarea:focus,
      button:focus {
        outline: 2px solid #3c6df0;
        outline-offset: 2px;
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .bubble {
          border: 2px solid currentColor;
        }
        
        .copy-button {
          background: #000;
          color: #fff;
          border: 1px solid currentColor;
        }
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .streaming-text,
        .bubble,
        .copy-button {
          animation: none;
          transition: none;
        }
      }
      
      /* Markdown content styles */
      .markdown-content {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.45;
        color: #e6e6e6;
        font-size: 12px;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3,
      .markdown-content h4,
      .markdown-content h5,
      .markdown-content h6 {
        margin: 16px 0 8px 0;
        color: #3c6df0;
        font-weight: 600;
        line-height: 1.3;
      }
      
      .markdown-content h1 { font-size: 1.5em; border-bottom: 2px solid #3c6df0; padding-bottom: 4px; }
      .markdown-content h2 { font-size: 1.3em; border-bottom: 1px solid #3c6df0; padding-bottom: 2px; }
      .markdown-content h3 { font-size: 1.1em; }
      .markdown-content h4 { font-size: 1em; }
      .markdown-content h5 { font-size: 0.9em; }
      .markdown-content h6 { font-size: 0.8em; }
      
      .markdown-content p {
        margin: 8px 0;
        line-height: 1.6;
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      .markdown-content li {
        margin: 4px 0;
        line-height: 1.5;
      }
      
      .markdown-content blockquote {
        margin: 12px 0;
        padding: 8px 16px;
        border-left: 4px solid #3c6df0;
        background: rgba(60, 109, 240, 0.1);
        border-radius: 4px;
        font-style: italic;
        color: #c9d5e1;
      }
      
      .markdown-content strong,
      .markdown-content b {
        color: #ffffff;
        font-weight: 600;
      }
      
      .markdown-content em,
      .markdown-content i {
        color: #c9d5e1;
        font-style: italic;
      }
      
      .markdown-content code {
        background: rgba(15, 23, 42, 0.8);
        color: #fbbf24;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 0.85em;
        border: 1px solid #374151;
      }
      
      .markdown-content pre {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        overflow-x: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        position: relative;
      }
      
      .markdown-content pre code {
        background: transparent;
        color: #e2e8f0;
        padding: 0;
        border: none;
        font-size: 0.85em;
        line-height: 1.45;
        display: block;
        white-space: pre;
        overflow-x: auto;
      }
      
      .markdown-content pre::before {
        content: '📄';
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 12px;
        opacity: 0.6;
        color: #64748b;
      }
      
      .markdown-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
        background: rgba(15, 23, 42, 0.6);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #334155;
      }
      
      .markdown-content th,
      .markdown-content td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #334155;
      }
      
      .markdown-content th {
        background: rgba(60, 109, 240, 0.2);
        color: #3c6df0;
        font-weight: 600;
        font-size: 0.9em;
      }
      
      .markdown-content td {
        color: #e2e8f0;
        font-size: 0.9em;
      }
      
      .markdown-content tr:hover {
        background: rgba(60, 109, 240, 0.05);
      }
      
      .markdown-content a {
        color: #60a5fa;
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s ease;
      }
      
      .markdown-content a:hover {
        border-bottom-color: #60a5fa;
        color: #93c5fd;
      }
      
      .markdown-content hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #3c6df0, transparent);
        margin: 24px 0;
      }
      
      .markdown-content .highlight {
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 4px;
        padding: 2px 4px;
        color: #fbbf24;
      }
      
      /* Tool call indicator styles */
      .tool-call-indicator {
        margin: 8px 0;
        padding: 8px 12px;
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border: 1px solid #1d2633;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        color: #e6e6e6;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        z-index: 1;
        animation: slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        animation-delay: var(--animation-delay, 0s);
        transform-origin: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
      }
      
      .tool-call-indicator:hover {
        border-color: #3c6df0;
        box-shadow: 0 8px 25px rgba(60, 109, 240, 0.3);
        transform: translateY(-3px) scale(1.03);
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
      
      .tool-call-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #3c6df0;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
        filter: drop-shadow(0 0 4px rgba(60, 109, 240, 0.5));
      }
      
      .tool-call-check {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
        animation: bounce 0.6s ease-out, fadeInUp 0.4s ease-out;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }
      
      .tool-call-indicator .copy-button {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, rgba(60, 109, 240, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%);
        color: #e6e6e6;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        z-index: 10;
        transform: scale(0.9);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .tool-call-indicator:hover .copy-button {
        opacity: 1;
        transform: scale(1);
      }
      
      .tool-call-indicator .copy-button:hover {
        background: linear-gradient(135deg, rgba(60, 109, 240, 1) 0%, rgba(59, 130, 246, 1) 100%);
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      /* Truncation and popover for long inline texts (e.g., paths) */
      .truncate-with-popover {
        max-width: 40ch;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-block;
        vertical-align: bottom;
        position: relative;
      }
      .truncate-with-popover:hover::after {
        content: attr(data-full);
        position: absolute;
        left: 0;
        top: 120%;
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        color: #e6e6e6;
        border: 1px solid #27354a;
        padding: 8px 10px;
        border-radius: 8px;
        z-index: 50;
        white-space: pre-wrap;
        min-width: max(220px, 100%);
        max-width: 70vw;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      }
      .truncate-with-popover:hover::before {
        content: '';
        position: absolute;
        left: 10px;
        top: 110%;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid #27354a;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
      }

      .chip-select:hover {
        border-color: #3b82f6;
        background-color: #1e293b;
      }

      /* Floating scroll to bottom button */
      .scroll-to-bottom-button {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        z-index: 1000;
        opacity: 0;
        animation: fadeInUp 0.3s ease forwards;
      }

      .scroll-to-bottom-button:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3);
        background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      }

      .scroll-to-bottom-button:active {
        transform: translateY(0) scale(0.98);
        transition: all 0.1s ease;
      }

      .scroll-to-bottom-button svg {
        transition: transform 0.2s ease;
      }

      .scroll-to-bottom-button:hover svg {
        transform: translateY(2px);
      }

      /* Animation for button appearance */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .scroll-to-bottom-button {
          bottom: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
        }
      }
    `;