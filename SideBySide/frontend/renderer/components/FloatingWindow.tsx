
import React, { useState, useEffect } from 'react';

const FloatingWindow = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');

  useEffect(() => {
    // In a real implementation, we'd use IPC to listen for clipboard updates
    // For now, let's just simulate the UI
    const handleResize = () => {
        // Send IPC to resize window
        // window.electron.ipcRenderer.send('resize-window', { width: isExpanded ? 800 : 300, height: isExpanded ? 600 : 100 });
    };
    handleResize();
  }, [isExpanded]);

  return (
    <div className="fixed inset-0 bg-gray-900 text-white p-4 rounded-lg shadow-lg border border-gray-700 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h1 className="text-sm font-bold">Side-by-Side</h1>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 text-xs text-gray-300">
           <p>Clipboard: {clipboardContent || 'Waiting...'}</p>
        </div>
      )}
    </div>
  );
};

export default FloatingWindow;
