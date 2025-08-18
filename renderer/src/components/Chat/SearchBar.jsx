import React from 'react';

export default function SearchBar({ 
  showSearch, 
  searchQuery, 
  setSearchQuery, 
  currentSearchIndex, 
  setCurrentSearchIndex, 
  filteredMessages, 
  messages, 
  navigateSearch 
}) {
  if (!showSearch) return null;

  return (
    <div className="search-container copyable-container" style={{
      padding: '8px 12px',
      margin: '8px 0',
      backgroundColor: '#0b1018',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      border: '1px solid #1d2633',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#e6e6e6'
    }}>
      <span>🔍</span>
      <input
        type="text"
        placeholder="Search messages..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          flex: 1,
          background: '#1a2331',
          border: '1px solid #27354a',
          color: '#e6e6e6',
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '12px',
          outline: 'none'
        }}
        aria-label="Search messages"
      />
      {searchQuery && (
        <button
          onClick={() => {
            setSearchQuery('');
            setCurrentSearchIndex(0);
          }}
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: '#6b7280',
            color: '#e6e6e6',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      <span style={{ fontSize: '10px', opacity: 0.7 }}>
        {filteredMessages.length} / {messages.length} messages
      </span>
      {searchQuery && filteredMessages.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => navigateSearch('prev')}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#6b7280',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title="Previous result"
            aria-label="Go to previous search result"
          >
            ↑
          </button>
          <span style={{ fontSize: '10px', minWidth: '20px', textAlign: 'center' }}>
            {currentSearchIndex + 1}
          </span>
          <button
            onClick={() => navigateSearch('next')}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#6b7280',
              color: '#e6e6e6',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title="Next result"
            aria-label="Go to next search result"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}
