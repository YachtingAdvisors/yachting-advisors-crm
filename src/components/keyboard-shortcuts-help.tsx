'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['\u2318K', 'Ctrl+K'], description: 'Search' },
  { keys: ['G then L'], description: 'Go to Leads' },
  { keys: ['G then D'], description: 'Go to Deals' },
  { keys: ['N'], description: 'New Deal (on Deals page)' },
  { keys: ['?'], description: 'Show this help' },
];

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bottom-4 right-4 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'shortcuts-help-in 150ms ease-out',
        }}
      >
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-[#1a1a2e]">Keyboard Shortcuts</h3>
        </div>
        <div className="px-4 py-2">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-xs text-[#33475b]">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <span key={j}>
                    {j > 0 && <span className="text-[10px] text-gray-400 mx-1">/</span>}
                    <kbd className="text-[10px] text-[#33475b] bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-200">
          <span className="text-[10px] text-gray-400">
            Press ESC or click outside to close
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shortcuts-help-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
