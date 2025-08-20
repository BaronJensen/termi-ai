import React, { useState, useEffect } from 'react';

export default function ScrollToBottomButton({ scroller, onScrollToBottom }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!scroller?.current) return;

    const checkScrollPosition = () => {
      const element = scroller.current;
      if (!element) return;

      // Check if we're near the bottom (within 100px)
      const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 100;
      setIsVisible(!isNearBottom);
    };

    // Check initial position
    checkScrollPosition();

    // Add scroll listener
    const element = scroller.current;
    element.addEventListener('scroll', checkScrollPosition);

    // Also check when content changes (new messages, etc.)
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [scroller]);

  if (!isVisible) return null;

  return (
    <button
      onClick={onScrollToBottom}
      className="scroll-to-bottom-button"
      title="Scroll to bottom"
      aria-label="Scroll to bottom of chat"
    >
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M7 13l5 5 5-5"/>
        <path d="M7 6l5 5 5-5"/>
      </svg>
    </button>
  );
}
