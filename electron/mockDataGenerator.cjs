const { EventEmitter } = require('events');

class MockDataGenerator extends EventEmitter {
  constructor(message, sessionObject, options = {}) {
    super();
    this.message = message;
    this.sessionObject = sessionObject;
    this.sessionId = sessionObject?.cursorSessionId || null;
    this.internalSessionId = sessionObject?.id || null;
    this.options = {
      typingDelay: options.typingDelay || 100,
      messageDelay: options.messageDelay || 2000,
      finalDelay: options.finalDelay || 1000
    };
    
    // Log session information for debugging
    console.log(`🧪 MockDataGenerator: Created for message: "${message}"`);
    console.log(`🧪 MockDataGenerator: Session Object:`, sessionObject);
    console.log(`🧪 MockDataGenerator: Internal Session ID: ${this.internalSessionId}`);
    console.log(`🧪 MockDataGenerator: Cursor Session ID: ${this.sessionId}`);
    
    this.typingDelay = this.options.typingDelay;
    this.messageDelay = this.options.messageDelay;
    this.finalDelay = this.options.finalDelay;
    
    // Initialize other properties
    this.isRunning = false;
    this.messageIndex = 0;
    this.sessionStartTime = new Date();
    
    // Generate session ID if none provided
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }
  }

  generateSessionId() {
    return `mock-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Emit session start message
    setTimeout(() => {
      this.emitSessionStart();
    }, 100);
    
    // Simulate the initial thinking phase
    setTimeout(() => {
      this.emitThinking();
    }, 500);

    // Simulate assistant message generation
    setTimeout(() => {
      this.emitAssistantMessage();
    }, 1500);

    // Simulate tool calls
    setTimeout(() => {
      this.emitToolCalls();
    }, 4000);

    // Simulate final result
    setTimeout(() => {
      this.emitFinalResult();
    }, 6000);
    
    // Emit session end message
    setTimeout(() => {
      this.emitSessionEnd();
    }, 7000);
  }

  stop() {
    this.isRunning = false;
    this.removeAllListeners();
  }

  generateSessionStart() {
    return {
      type: "session_start",
      session_id: this.sessionId,
      message: `Starting new session: ${this.sessionId}`,
      timestamp: this.sessionStartTime.toISOString(),
      metadata: {
        user_message: this.message,
        session_type: "mock_debug",
        version: "1.0.0",
        created_at: this.sessionStartTime.toISOString(),
        mock_options: {
          typingDelay: this.typingDelay,
          messageDelay: this.messageDelay,
          finalDelay: this.finalDelay
        }
      }
    };
  }
  
  emitSessionStart() {
    if (!this.isRunning) return;
    
    const sessionStartMessage = this.generateSessionStart();
    this.emit('data', JSON.stringify(sessionStartMessage) + '\n');
  }

  emitThinking() {
    if (!this.isRunning) return;
    
    const thinkingMessage = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I\'m thinking about your request...'
          }
        ]
      },
      session_id: this.sessionId
    };
    
    this.emit('data', JSON.stringify(thinkingMessage) + '\n');
  }

  generateResponse() {
    const responses = [
      `I understand you want me to help with: "${this.message}"`,
      `Let me analyze your request and provide a helpful response.`,
      `Based on your message, I can see you need assistance with development tasks.`,
      `I'll help you with this. Let me break it down step by step.`
    ];
    
    const response = responses[this.messageIndex % responses.length];
    this.messageIndex++;
    return response;
  }
  
  generateAssistantMessage() {
    return {
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          {
            type: "text",
            text: this.generateResponse()
          }
        ]
      },
      session_id: this.sessionId,
      metadata: {
        message_index: this.messageIndex,
        timestamp: new Date().toISOString()
      }
    };
  }

  emitAssistantMessage() {
    if (!this.isRunning) return;
    
    const assistantMessage = this.generateAssistantMessage();
    this.emit('data', JSON.stringify(assistantMessage) + '\n');
  }

  emitToolCalls() {
    if (!this.isRunning) return;
    
    const toolCalls = [
      {
        type: 'tool_call',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'file_search',
              arguments: '{"query": "package.json"}'
            }
          }
        ],
        session_id: this.sessionId,
        metadata: {
          // Tool call metadata (if needed)
        }
      },
      {
        type: 'tool_result',
        tool_use_id: 'call_123',
        content: [
          {
            type: 'text',
            text: 'Found package.json in the current directory.'
          }
        ],
        session_id: this.sessionId,
        metadata: {
          // Tool result metadata (if needed)
        }
      }
    ];
    
    toolCalls.forEach((toolCall, index) => {
      setTimeout(() => {
        if (!this.isRunning) return;
        this.emit('data', JSON.stringify(toolCall) + '\n');
      }, index * 500);
    });
  }

  emitFinalResult() {
    if (!this.isRunning) return;
    
    const finalResult = {
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: `Mock execution completed successfully for: "${this.message}"\n\nThis was a test run using mock data. In production, this would be the actual result from cursor-agent CLI.`,
      raw: {
        type: 'result',
        success: true,
        message: 'Mock execution completed'
      },
      session_id: this.sessionId,
      metadata: {
        completion_time: new Date().toISOString()
      }
    };
    
    this.emit('data', JSON.stringify(finalResult) + '\n');
    
    // Emit exit event
    setTimeout(() => {
      if (!this.isRunning) return;
      this.emit('exit', 0);
    }, 500);
  }

  emitSessionEnd() {
    if (!this.isRunning) return;
    
    const sessionEndMessage = {
      type: 'session_end',
      session_id: this.sessionId,
      message: `Session completed: ${this.sessionId}`,
      timestamp: new Date().toISOString(),
      metadata: {
        duration_ms: Date.now() - this.sessionStartTime.getTime(),
        total_messages: this.messageIndex + 1,
        completion_status: 'success'
      }
    };
    
    this.emit('data', JSON.stringify(sessionEndMessage) + '\n');
  }

  // Simulate streaming data like the real CLI
  simulateStreaming() {
    if (!this.isRunning) return;
    
    const streamData = {
      type: 'stream',
      content: 'Simulating streaming output...\n',
      session_id: this.sessionId,
      metadata: {
        // Stream metadata (if needed)
      }
    };
    
    this.emit('data', JSON.stringify(streamData) + '\n');
  }
}

module.exports = { MockDataGenerator };
