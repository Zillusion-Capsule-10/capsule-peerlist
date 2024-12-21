/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';

export function ResizablePanel({ children }) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const maxWidth = Math.min(containerWidth * 0.6, containerWidth - 400); // Max 80% or leave 200px
      const minWidth = Math.max(400, containerWidth * 0.2); // Min 20% or 200px
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);

      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const [leftPanel, rightPanel] = children;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          width: `${leftPanelWidth}px`,
          minWidth: '200px',
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          position: 'relative',
          transition: isResizing ? 'none' : 'width 0.1s ease',
        }}
      >
        {leftPanel}
        <div
          style={{
            position: 'absolute',
            right: '-4px',
            top: 0,
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            backgroundColor: isResizing ? 'var(--accent-color)' : 'transparent',
            transition: 'background-color 0.2s ease',
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.opacity = '0.5';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.opacity = '1';
            }
          }}
        />
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: 'var(--bg-primary)',
          overflow: 'hidden',
          minWidth: '200px',
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
