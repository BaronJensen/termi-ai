import React, { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, footer, children, hideClose = false }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-header">
          <div style={{ fontWeight: 600, color: '#cde3ff' }}>{title}</div>
          {!hideClose && (
            <button className="ds-button ghost" onClick={onClose}>Close</button>
          )}
        </div>
        <div className="ds-modal-body">
          {children}
        </div>
        <div className="ds-modal-footer">
          {footer}
        </div>
      </div>
    </div>
  );
}


