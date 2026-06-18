import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabPanelProps {
  tabs: Tab[];
  children: (activeTab: string) => React.ReactNode;
}

export function TabPanel({ tabs, children }: TabPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 bg-slate-50/60 p-2">
        <div className="flex gap-1 rounded-xl bg-white/90 p-1 shadow-sm backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">{children(activeTab || tabs[0]?.id)}</div>
    </div>
  );
}
