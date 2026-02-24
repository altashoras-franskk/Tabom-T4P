import { useState, useRef, useEffect, ReactNode } from 'react';
import { Minimize2, Maximize2 } from 'lucide-react';

type DraggableWindowProps = {
  title: string;
  defaultPosition?: { x: number; y: number };
  children: ReactNode;
  icon?: string;
};

export const DraggableWindow = ({ 
  title, 
  defaultPosition = { x: 20, y: 20 }, 
  children,
  icon = '📊'
}: DraggableWindowProps) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Attach global mouse events when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={windowRef}
      className="fixed pointer-events-auto select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 100 : 10
      }}
    >
      <div className="bg-black/5 backdrop-blur-sm rounded border border-white/[0.02] overflow-hidden shadow-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{icon}</span>
            <span className="text-white/80 text-[11px] tracking-[0.15em] uppercase font-light">
              {title}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            style={{ cursor: 'pointer' }}
          >
            {isMinimized ? (
              <Maximize2 size={12} className="text-white/60" />
            ) : (
              <Minimize2 size={12} className="text-white/60" />
            )}
          </button>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-3 cursor-auto select-text">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
