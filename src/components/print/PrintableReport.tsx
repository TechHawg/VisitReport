import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export function PrintableReport({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ 
    content: () => ref.current, 
    documentTitle: 'VisitReport' 
  });
  
  return (
    <>
      <button className="btn btn-primary" onClick={print}>
        Print / Save PDF
      </button>
      <div ref={ref} className="pdf-page">
        {children}
      </div>
    </>
  );
}