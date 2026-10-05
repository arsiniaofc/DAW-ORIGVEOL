import React, { useRef, useEffect, useCallback } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { WindowState } from '../types/daw';

interface FloatingWindowProps {
  windowState: WindowState;
  isActive: boolean;
  onUpdateState: (newState: Partial<WindowState>) => void;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
  headerIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  windowState,
  isActive,
  onUpdateState,
  onFocus,
  onClose,
  children,
  headerIcon,
  headerActions,
  className = '',
}) => {
  const {
    id,
    title,
    isOpen,
    isMinimized,
    isMaximized,
    x,
    y,
    width,
    height,
    zIndex,
    minWidth = 320,
    minHeight = 200,
  } = windowState;

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
    edge: 'se' | 'e' | 's';
  } | null>(null);

  // Handle Dragging
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button, and not if clicking buttons/inputs in header
    if (e.button !== 0 || isMaximized) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) {
      return;
    }
    e.preventDefault();

    onFocus();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
    };

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;

      const newX = Math.max(0, dragRef.current.origX + deltaX);
      const newY = Math.max(0, dragRef.current.origY + deltaY);

      onUpdateState({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Resizing
  const handleResizeMouseDown = (e: React.MouseEvent, edge: 'se' | 'e' | 's') => {
    if (e.button !== 0 || isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus();

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: width,
      origH: height,
      edge,
    };

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = edge === 'se' ? 'se-resize' : edge === 'e' ? 'e-resize' : 's-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;

      const updates: Partial<WindowState> = {};
      if (edge === 'se' || edge === 'e') {
        updates.width = Math.max(minWidth, resizeRef.current.origW + deltaX);
      }
      if (edge === 'se' || edge === 's') {
        updates.height = Math.max(minHeight, resizeRef.current.origH + deltaY);
      }

      onUpdateState(updates);
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  // Maximize styling vs Floating window styling
  const style: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex,
      }
    : {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: isMinimized ? 'auto' : `${height}px`,
        zIndex,
      };

  return (
    <div
      style={style}
      onMouseDown={onFocus}
      className={`flex flex-col select-none rounded-lg overflow-hidden shadow-2xl transition-shadow ${
        isActive
          ? 'border-2 border-[#3b82f6] shadow-[0_10px_35px_rgba(0,0,0,0.85)] ring-1 ring-blue-500/30'
          : 'border border-[#262f42] shadow-[0_6px_25px_rgba(0,0,0,0.65)]'
      } bg-[#131620] ${className}`}
    >
      {/* Title Bar (FL Studio Style) */}
      <div
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={() => onUpdateState({ isMaximized: !isMaximized })}
        className={`h-7 px-2 flex items-center justify-between shrink-0 cursor-move border-b select-none ${
          isActive
            ? 'bg-gradient-to-r from-[#1d263b] via-[#1a2133] to-[#161a26] border-[#313f5c]'
            : 'bg-[#151924] border-[#22293a] text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {headerIcon && <div className="shrink-0">{headerIcon}</div>}
          <span
            className={`font-bold text-[11px] tracking-wide truncate ${
              isActive ? 'text-white' : 'text-zinc-300'
            }`}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerActions}

          {/* Window control buttons */}
          <div className="flex items-center gap-1 border-l border-zinc-700/60 pl-2">
            {/* Minimize */}
            <button
              onClick={() => onUpdateState({ isMinimized: !isMinimized })}
              title={isMinimized ? 'Expand' : 'Minimize'}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>

            {/* Maximize / Restore */}
            <button
              onClick={() => onUpdateState({ isMaximized: !isMaximized })}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors"
            >
              {isMaximized ? (
                <Copy className="w-2.5 h-2.5 rotate-180" />
              ) : (
                <Square className="w-2.5 h-2.5" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close"
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-900/80 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Window Content */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 bg-[#0e1118]">
          {children}

          {/* Resize Handles (Only when not maximized) */}
          {!isMaximized && (
            <>
              {/* Bottom Right Corner */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 opacity-60 hover:opacity-100"
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-zinc-400" />
              </div>

              {/* Right Edge */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize z-40 hover:bg-blue-500/20"
              />

              {/* Bottom Edge */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 's')}
                className="absolute bottom-0 left-0 w-full h-1.5 cursor-s-resize z-40 hover:bg-blue-500/20"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
