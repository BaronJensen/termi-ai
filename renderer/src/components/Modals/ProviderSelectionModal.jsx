import React, { useState, useEffect } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { getDefaultProvider } from '../../store/settings';

export default function ProviderSelectionModal({ onClose, onSelect }) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProviders() {
      try {
        setLoading(true);
        // Get available providers from the system
        const availableProviders = await window.termiAI.getAgentProviders();
        setProviders(availableProviders);

        // Set default provider
        const defaultProv = getDefaultProvider();
        setSelectedProvider(defaultProv);
      } catch (error) {
        console.error('Failed to load providers:', error);
        // Fallback to cursor
        setProviders([{
          name: 'cursor',
          displayName: 'Cursor AI',
          available: true,
          capabilities: {}
        }]);
        setSelectedProvider('cursor');
      } finally {
        setLoading(false);
      }
    }

    loadProviders();
  }, []);

  const handleSelect = () => {
    if (selectedProvider) {
      onSelect(selectedProvider);
      onClose();
    }
  };

  const getProviderIcon = (name) => {
    switch (name) {
      case 'cursor': return '⚡';
      case 'claude': return '🤖';
      case 'codex': return '🔥';
      default: return '🔧';
    }
  };

  const getProviderColor = (name) => {
    switch (name) {
      case 'cursor': return '#3b82f6';
      case 'claude': return '#f97316';
      case 'codex': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <Modal
      title="Select AI Agent Provider"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedProvider || loading}
          >
            Create Session
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Choose which AI agent to use for this session. Each provider has different capabilities and requirements.
        </p>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>
            Loading providers...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.map((provider) => (
              <button
                key={provider.name}
                onClick={() => setSelectedProvider(provider.name)}
                disabled={!provider.available}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: 12,
                  backgroundColor: selectedProvider === provider.name
                    ? getProviderColor(provider.name) + '20'
                    : '#0b1018',
                  border: selectedProvider === provider.name
                    ? `2px solid ${getProviderColor(provider.name)}`
                    : '1px solid #1d2633',
                  borderRadius: 8,
                  cursor: provider.available ? 'pointer' : 'not-allowed',
                  opacity: provider.available ? 1 : 0.5,
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{getProviderIcon(provider.name)}</span>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: provider.available ? '#e6e6e6' : '#6b7280'
                  }}>
                    {provider.displayName}
                  </span>
                  {!provider.available && (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      backgroundColor: '#7f1d1d',
                      color: '#fca5a5',
                      borderRadius: 3,
                      fontWeight: 600
                    }}>
                      CLI NOT INSTALLED
                    </span>
                  )}
                  {provider.capabilities?.requiresApiKey && (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      backgroundColor: '#1e3a8a',
                      color: '#93c5fd',
                      borderRadius: 3,
                      fontWeight: 600
                    }}>
                      REQUIRES API KEY
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                  {provider.metadata?.description || 'AI coding assistant'}
                </div>
                {provider.capabilities && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {provider.capabilities.supportsStreaming && (
                      <span style={{
                        fontSize: 9,
                        padding: '2px 4px',
                        backgroundColor: '#065f46',
                        color: '#6ee7b7',
                        borderRadius: 2
                      }}>
                        Streaming
                      </span>
                    )}
                    {provider.capabilities.supportsToolCalls && (
                      <span style={{
                        fontSize: 9,
                        padding: '2px 4px',
                        backgroundColor: '#065f46',
                        color: '#6ee7b7',
                        borderRadius: 2
                      }}>
                        Tool Calls
                      </span>
                    )}
                    {provider.capabilities.supportsSessionResumption && (
                      <span style={{
                        fontSize: 9,
                        padding: '2px 4px',
                        backgroundColor: '#065f46',
                        color: '#6ee7b7',
                        borderRadius: 2
                      }}>
                        Resume Sessions
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {providers.length === 0 && !loading && (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#ef4444',
            backgroundColor: '#7f1d1d20',
            borderRadius: 8,
            border: '1px solid #7f1d1d'
          }}>
            No AI agent providers found. Please install at least one CLI tool.
          </div>
        )}
      </div>
    </Modal>
  );
}
