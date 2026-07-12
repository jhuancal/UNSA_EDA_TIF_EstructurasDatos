import React, { useEffect, useRef } from 'react';

interface CodeLogProps {
  logs: string[];
  currentStepLog: string;
}

export const CodeLog: React.FC<CodeLogProps> = ({ logs, currentStepLog }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, currentStepLog]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-36 typewriter-log border border-primary/20 rounded-DEFAULT p-4 overflow-y-auto mt-4 flex flex-col gap-1 text-sm select-text"
    >
      <div className="text-on-surface-variant/50 font-bold italic mb-1 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">terminal</span>
        <span>REGISTRO DE EJECUCIÓN DEL HEAP &amp; PUNTEROS</span>
      </div>
      
      {logs.map((log, index) => (
        <div key={index} className="text-on-surface-variant/80 font-mono">
          &gt; {log}
        </div>
      ))}
      
      {currentStepLog && (
        <div className="text-secondary font-mono font-bold flex items-center gap-1">
          <span>&gt; {currentStepLog}</span>
          <span className="w-1.5 h-4 bg-secondary animate-[pulse_1s_infinite]"></span>
        </div>
      )}
    </div>
  );
};
