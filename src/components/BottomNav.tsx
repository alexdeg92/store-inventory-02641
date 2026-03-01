'use client';

export type Tab = 'loterie' | 'cigarettes' | 'scanner' | 'historique';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'loterie',     label: 'Loterie',     icon: '🎰' },
  { id: 'cigarettes',  label: 'Cigarettes',  icon: '🚬' },
  { id: 'scanner',     label: 'Scanner',     icon: '📷' },
  { id: 'historique',  label: 'Historique',  icon: '📅' },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onPointerDown={e => { e.preventDefault(); onChange(tab.id); }}
            className={`flex-1 flex flex-col items-center justify-center py-2 pt-2 gap-0.5 transition-colors select-none
              min-h-[56px] active:bg-gray-50
              ${active === tab.id
                ? 'text-blue-600 border-t-2 border-blue-600'
                : 'text-gray-400 border-t-2 border-transparent'
              }`}
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-semibold leading-tight tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
