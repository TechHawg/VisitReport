import React from 'react';

type Unit = { 
  u: number; 
  heightU: number; 
  label?: string; 
  kind: 'empty' | 'device' | 'pdu' | 'ups' | 'switch' | 'server' 
};

type Props = { 
  totalU?: number; 
  units: Unit[] 
};

const typeColor: Record<string, string> = {
  switch: 'bg-blue-200',
  server: 'bg-green-200', 
  pdu: 'bg-amber-200',
  ups: 'bg-purple-200',
  device: 'bg-sky-200',
  empty: 'bg-gray-100'
};

export default function RackDiagram({ totalU = 42, units }: Props) {
  return (
    <div className="rack relative grid" style={{ gridTemplateRows: `repeat(${totalU}, 24px)` }}>
      {/* RU labels left (42 at top) */}
      <div className="absolute left-0 top-0 z-20">
        {Array.from({ length: totalU }, (_, i) => totalU - i).map(u => (
          <div key={u} className="h-[24px] leading-[24px] text-[10px] select-none">{u}</div>
        ))}
      </div>
      {/* Devices layer */}
      <div className="ml-8 col-start-1 row-start-1 w-full relative z-10 grid" style={{ gridTemplateRows: `repeat(${totalU}, 24px)` }}>
        {units.map(x => (
          <div key={`${x.u}-${x.label ?? x.kind}`}
               className={`border border-black/40 rounded-sm overflow-hidden ${typeColor[x.kind] ?? 'bg-gray-100'}`}
               style={{ gridRow: `${(totalU - x.u + 1)} / span ${x.heightU}` }}>
            <div className="px-2 text-xs truncate">{x.label ?? x.kind}</div>
          </div>
        ))}
      </div>
    </div>
  );
}