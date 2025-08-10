
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

function Bubble({ who, children, isStreaming = false }) {
  const handleCopy = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Optional: Show a brief copy confirmation
        console.log('Text copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    // Allow default context menu for text selection
    return false;
  };

  const handleKeyDown = (e) => {
    // Handle Ctrl+C for copying selected text
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const selection = window.getSelection();
      if (selection.toString()) {
        e.preventDefault();
        navigator.clipboard.writeText(selection.toString());
      }
    }
  };

  return (
    <div 
      className={`bubble ${who}`} 
      style={{ 
        fontSize: '14px', 
        lineHeight: '1.5',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '100%',
        height: 'auto',
        minHeight: 'fit-content',
        position: 'relative'
      }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Copy button */}
      <button
        onClick={() => handleCopy(children)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(60, 109, 240, 0.8)',
          color: '#e6e6e6',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '10px',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          zIndex: 10
        }}
        onMouseEnter={(e) => e.target.style.opacity = 1}
        onMouseLeave={(e) => e.target.style.opacity = 0}
        title="Copy message"
      >
        Copy
      </button>
      
      {isStreaming ? (
        <span className="streaming-text">{children}</span>
      ) : (
        <div 
          dangerouslySetInnerHTML={{ __html: marked.parse(children || '') }}
          style={{ userSelect: 'text', cursor: 'text' }}
        />
      )}
    </div>
  );
}

export default function Chat({ apiKey, cwd, timeoutMinutes = 15 }) {
  // Add CSS animations and styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
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
      
      .streaming-text {
        display: inline-block;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 100%;
        height: auto;
        min-height: fit-content;
        animation: typewriter 0.15s ease-out;
        transition: all 0.1s ease;
      }
      
      .bubble {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
        min-height: fit-content;
        height: auto;
      }
      
      .bubble.assistant {
        background: linear-gradient(135deg, #0b1018 0%, #1a2331 100%);
        border-left: 4px solid #3c6df0;
        margin-right: 20px;
        color: #e6e6e6;
      }
      
      .bubble.user {
        background: linear-gradient(135deg, #172033 0%, #2d3d57 100%);
        color: #e6e6e6;
        margin-left: 20px;
        text-align: right;
      }
      
      .bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: auto;
        min-height: 0;
      }
      
      .input textarea {
        flex: 1;
        resize: vertical;
        min-height: 64px;
        max-height: 200px;
        background: #0b0f16;
        border: 1px solid #27354a;
        color: #d6dee8;
        padding: 10px;
        border-radius: 10px;
        outline: none;
        font-family: inherit;
        line-height: 1.4;
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
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 10px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
      }
      
      .copy-button:hover {
        opacity: 1;
        background: rgba(60, 109, 240, 1);
      }
      
      .copyable-container {
        position: relative;
      }
      
      .copyable-container:hover .copy-button {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const scroller = useRef(null);
  const unsubRef = useRef(null);
  const streamIndexRef = useRef(-1);
  const runIdRef = useRef(null);

  // Check terminal status on mount and when busy changes
  useEffect(() => {
    checkTerminalStatus();
  }, [busy]);

  // Reset textarea height when input changes
  useEffect(() => {
    const textarea = document.querySelector('.input textarea');
    if (textarea && !input) {
      textarea.style.height = '64px';
    }
  }, [input]);

  async function checkTerminalStatus() {
    try {
      const status = await window.cursovable.getTerminalStatus();
      setTerminalStatus(status);
    } catch (err) {
      setTerminalStatus({ error: err.message });
    }
  }

  async function forceCleanup() {
    try {
      const result = await window.cursovable.forceTerminalCleanup();
      await checkTerminalStatus();
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup completed:** ${result.message}. Cleaned ${result.processesCleaned} processes.` }]);
    } catch (err) {
      setMessages(m => [...m, { who: 'assistant', text: `**Cleanup failed:** ${err.message}` }]);
    }
  }

  // Force reset streaming state if something goes wrong
  function forceResetStreamingState() {
    if (unsubRef.current) { 
      try { unsubRef.current(); } catch {} 
      unsubRef.current = null; 
    }
    streamIndexRef.current = -1;
    runIdRef.current = null;
    setBusy(false);
  }

  useEffect(() => {
    (async () => {
      const hist = await window.cursovable.getHistory();
      const display = [];
      for (const item of hist) {
        if (item.type === 'result') {
          display.push({ who: 'user', text: item.prompt || item.message || '(message not stored)' });
          display.push({ who: 'assistant', text: item.result || JSON.stringify(item) });
        } else if (item.type === 'raw') {
          display.push({ who: 'assistant', text: '```\n' + item.output + '\n```' });
        }
      }
      setMessages(display);
    })();
  }, []);

  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    
    // Check if working directory is selected
    if (!cwd) {
      alert('Please select a working directory first using the "Change" button above.');
      return;
    }
    
    setInput('');
    // Reset textarea height
    const textarea = document.querySelector('.input textarea');
    if (textarea) {
      textarea.style.height = '64px';
    }
    setMessages(m => [...m, { who: 'user', text }]);
    setBusy(true);
    
    try {
      // Prepare streaming message and subscribe to logs for this run
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      runIdRef.current = runId;
      
      // Create streaming assistant message
      let streamIdx;
      setMessages(m => {
        streamIdx = m.length;
        streamIndexRef.current = streamIdx;
        return [...m, { who: 'assistant', text: '', isStreaming: true }];
      });
      
      // Track accumulated assistant text
      let accumulatedText = '';
      
      // Subscribe to log stream for this run
      unsubRef.current = window.cursovable.onCursorLog(async (payload) => {
        if (!payload || payload.runId !== runIdRef.current) {
          return;
        }
        
        try {
          // Parse each line as JSON
          const lines = payload.line.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              console.log(line,parsed);
              
              // Handle assistant messages - accumulate text content
              if (parsed.type === 'assistant' && parsed.message && parsed.message.content) {
                for (const content of parsed.message.content) {
                  if (content.type === 'text' && content.text) {
                    accumulatedText += content.text;
                    
                    // Update the streaming message with accumulated text
                    setMessages(m => {
                      const idx = streamIndexRef.current;
                      if (idx >= 0 && idx < m.length) {
                        const updated = [...m];
                        updated[idx] = { ...updated[idx], text: accumulatedText, isStreaming: true };
                        return updated;
                      }
                      return m;
                    });
                    
                    // Add a small delay for more organic typing feel
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
              }
              
              // Stop streaming when we get a result
              if (parsed.type === 'result') {
                // Mark the streaming message as complete
                if (accumulatedText.trim()) {
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                  
                  // Create a new bubble with the final result message
                  setMessages(m => {
                    const newMessages = [...m, { 
                      who: 'assistant', 
                      text: `**Command completed successfully!**\n\n${accumulatedText}`,
                      isStreaming: false 
                    }];
                    
                    // Scroll to the new message after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      if (scroller.current) {
                        scroller.current.scrollTop = scroller.current.scrollHeight;
                      }
                    }, 100);
                    
                    return newMessages;
                  });
                } else {
                  // If we didn't get any assistant content, show a fallback message
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                }
                
                // Clean up streaming state and allow new input
                if (unsubRef.current) { 
                  try { unsubRef.current(); } catch {} 
                  unsubRef.current = null; 
                }
                streamIndexRef.current = -1;
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
            } catch (parseError) {
              // This line is not valid JSON - check if it's our end marker
              if (line.includes('123[*****END*****]123')) {
                // Mark the streaming message as complete
                if (accumulatedText.trim()) {
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                  
                  // Create a new bubble with the final result message
                  setMessages(m => {
                    const newMessages = [...m, { 
                      who: 'assistant', 
                      text: `**Command completed successfully!**\n\n${accumulatedText}`,
                      isStreaming: false 
                    }];
                    
                    // Scroll to the new message after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      if (scroller.current) {
                        scroller.current.scrollTop = scroller.current.scrollHeight;
                      }
                    }, 100);
                    
                    return newMessages;
                  });
                } else {
                  // If we didn't get any assistant content, show a fallback message
                  setMessages(m => {
                    const idx = streamIndexRef.current;
                    if (idx >= 0 && idx < m.length) {
                      const updated = [...m];
                      updated[idx] = { ...updated[idx], text: 'No response content received from cursor-agent.', isStreaming: false };
                      return updated;
                    }
                    return m;
                  });
                }
                
                // Clean up streaming state and allow new input
                if (unsubRef.current) { 
                  try { unsubRef.current(); } catch {} 
                  unsubRef.current = null; 
                }
                streamIndexRef.current = -1;
                runIdRef.current = null;
                setBusy(false);
                
                return;
              }
              
              // Skip other lines that aren't valid JSON
              continue;
            }
          }
        } catch (error) {
          console.error('Error processing log line:', error);
        }
      });

      const res = await window.cursovable.runCursor({ 
        message: text, 
        apiKey: apiKey || undefined, 
        cwd: cwd || undefined, 
        runId,
        timeoutMs: timeoutMinutes * 60 * 1000 // Convert minutes to milliseconds
      });
      
      // We just need to ensure the process completed successfully
      if (res.type === 'error') {
        throw new Error(res.error || 'Unknown error occurred');
      }
      
      // Fallback: If we're still streaming after runCursor completes, assume it's done
      if (streamIndexRef.current >= 0 && accumulatedText.trim()) {
        // Mark streaming as complete
        setMessages(m => {
          const idx = streamIndexRef.current;
          if (idx >= 0 && idx < m.length) {
            const updated = [...m];
            updated[idx] = { ...updated[idx], isStreaming: false };
            return updated;
          }
          return m;
        });
        
        // Create completion message if we have content
        if (accumulatedText.trim()) {
          setMessages(m => [...m, { 
            who: 'assistant', 
            text: `**Command completed:**\n\n${accumulatedText}`,
            isStreaming: false 
          }]);
        }
        
        // Clean up streaming state and allow new input
        if (unsubRef.current) { 
          try { unsubRef.current(); } catch {} 
          unsubRef.current = null; 
        }
        streamIndexRef.current = -1;
        runIdRef.current = null;
        setBusy(false);
      }
    } catch (e) {
      // Check if it's a terminal-related error
      let errorMessage = e.message || String(e);
      if (errorMessage.includes('timeout') || errorMessage.includes('idle')) {
        errorMessage = `**Terminal timeout detected:** ${errorMessage}\n\nThis usually means the cursor-agent process hung or is waiting for input. Try:\n\n1. **Force Cleanup** button above to kill stuck processes\n2. Check if cursor-agent needs interactive input\n3. Restart the application if the issue persists`;
      } else if (errorMessage.includes('cursor-agent')) {
        errorMessage = `**Cursor agent error:** ${errorMessage}\n\nCheck if cursor-agent is properly installed and accessible.`;
      } else if (errorMessage.includes('SIGTERM') || errorMessage.includes('killed')) {
        errorMessage = `**Process terminated:** ${errorMessage}\n\nThis usually means the process was killed due to timeout or cleanup. This is normal behavior.`;
      }
      
      // Render error in the streaming bubble if available
      setMessages(m => {
        const idx = streamIndexRef.current;
        const text = errorMessage;
        if (idx >= 0 && idx < m.length) {
          const updated = [...m];
          updated[idx] = { who: 'assistant', text, isStreaming: false };
          return updated;
        }
        return [...m, { who: 'assistant', text, isStreaming: false }];
      });
      
      // Update terminal status after error
      await checkTerminalStatus();
    } finally {
      // Clean up streaming state
      if (unsubRef.current) { try { unsubRef.current(); } catch {} unsubRef.current = null; }
      streamIndexRef.current = -1;
      runIdRef.current = null;
      setBusy(false);
    }
  }

  return (
    <>
      {/* Working directory header */}
      <div className="working-dir-header copyable-container" style={{
        padding: '8px 12px',
        margin: '8px 0',
        backgroundColor: '#0b1018',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        border: '1px solid #1d2633',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#e6e6e6'
      }}>
        <div className="copyable-text" style={{ flex: 1 }}>
          <strong>Working Directory:</strong> 
          <span style={{ color: !cwd ? '#ff6b6b' : '#c9d5e1', fontWeight: !cwd ? 'bold' : 'normal' }}>
            {cwd || '⚠️ NO DIRECTORY SELECTED'}
          </span> | 
          <strong>Timeout:</strong> {timeoutMinutes === 0 ? 'No limit' : `${timeoutMinutes} min`}
        </div>
        <button 
          onClick={async () => {
            try {
              const folderPath = await window.cursovable.selectFolder();
              if (folderPath) {
                await window.cursovable.setWorkingDirectory(folderPath);
                // Force a re-render by updating the cwd prop
                window.location.reload();
              }
            } catch (err) {
              alert(`Failed to set working directory: ${err.message}`);
            }
          }}
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: '#3c6df0',
            color: '#e6e6e6',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Change
        </button>
        <button
          onClick={() => {
            const text = `Working Directory: ${cwd || 'NO DIRECTORY SELECTED'} | Timeout: ${timeoutMinutes === 0 ? 'No limit' : `${timeoutMinutes} min`}`;
            navigator.clipboard.writeText(text);
          }}
          className="copy-button"
          title="Copy directory info"
        >
          Copy
        </button>
      </div>
      
      {/* Terminal Status and Controls */}
      {terminalStatus && (
        <div className="copyable-container" style={{ 
          padding: '8px 12px', 
          margin: '8px 0', 
          backgroundColor: '#0b1018',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#e6e6e6',
          border: '1px solid #1d2633',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="copyable-text" style={{ flex: 1 }}>
            <strong>Terminal Status:</strong> {terminalStatus.terminalType || 'none'} | 
            Processes: {terminalStatus.processCount || 0} | 
            PTY: {terminalStatus.hasPty ? '✓' : '✗'} | 
            Vite: {terminalStatus.hasViteProcess ? '✓' : '✗'}
          </div>
          <div>
            {terminalStatus.processCount > 2 && (
              <button 
                onClick={forceCleanup}
                style={{ 
                  marginRight: '10px', 
                  padding: '2px 8px', 
                  background: '#ff6b6b', 
                  color: '#e6e6e6', 
                  border: 'none', 
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Force Cleanup
              </button>
            )}
            <button 
              onClick={forceResetStreamingState}
              style={{ 
                padding: '2px 8px', 
                background: '#3c6df0', 
                color: '#e6e6e6', 
                border: 'none', 
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Reset Chat State
            </button>
          </div>
          <button
            onClick={() => {
              const text = `Terminal Status: ${terminalStatus.terminalType || 'none'} | Processes: ${terminalStatus.processCount || 0} | PTY: ${terminalStatus.hasPty ? '✓' : '✗'} | Vite: ${terminalStatus.hasViteProcess ? '✓' : '✗'}`;
              navigator.clipboard.writeText(text);
            }}
            className="copy-button"
            title="Copy terminal status"
          >
            Copy
          </button>
        </div>
      )}
      
      <div className="messages" ref={scroller}>
        {messages.map((m, i) => (
          <Bubble key={i} who={m.who} isStreaming={m.isStreaming}>
            {m.text}
          </Bubble>
        ))}
      </div>
      
      {/* Status indicators at the bottom */}
      {busy && (
        <div className="status-indicators copyable-container" style={{
          padding: '16px',
          margin: '12px 0',
          backgroundColor: 'linear-gradient(135deg, #0b1018 0%, #1a2331 100%)',
          borderRadius: '12px',
          border: '1px solid #1d2633',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '14px',
          color: '#e6e6e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}>
          <div className="spinner" style={{
            width: '20px',
            height: '20px',
            border: '3px solid #1a2331',
            borderTop: '3px solid #3c6df0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div className="copyable-text" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <span style={{ fontWeight: '500', color: '#3c6df0' }}>🤔 Thinking...</span>
            <span style={{ fontSize: '12px', opacity: 0.7, color: '#c9d5e1' }}>
              Processing your request with cursor-agent...
            </span>
          </div>
          <button
            onClick={() => {
              const text = '🤔 Thinking... Processing your request with cursor-agent...';
              navigator.clipboard.writeText(text);
            }}
            className="copy-button"
            title="Copy status message"
          >
            Copy
          </button>
        </div>
      )}
      
      <div className="input">
        <textarea
          placeholder={!cwd ? 'Please select a working directory first...' : `Ask the CTO agent… (timeout: ${timeoutMinutes === 0 ? 'no limit' : `${timeoutMinutes} min`})`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Auto-resize textarea
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
            // Handle Ctrl+C for copying selected text
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
              const selection = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
              if (selection) {
                e.preventDefault();
                navigator.clipboard.writeText(selection);
              }
            }
          }}
          disabled={!cwd}
          style={{ height: '64px' }}
          className="copyable-text"
        />
        <button onClick={send} disabled={busy || !cwd} style={{ opacity: !cwd ? 0.5 : 1 }}>
          {!cwd ? 'Select Directory First' : 'Send'}
        </button>
      </div>
    </>
  );
}
