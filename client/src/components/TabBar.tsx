import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export type Tab = {
    id: string;
    label: string;
    count: number;
};

type Props = {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
};

export function TabBar({ tabs, activeTab, onTabChange }: Props) {
    if (tabs.length <= 1) return null;

    return (
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 w-fit">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer',
                        activeTab === tab.id
                            ? 'text-slate-800'
                            : 'text-slate-500 hover:text-slate-700',
                    )}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute inset-0 bg-white rounded-lg shadow-sm"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                    )}
                    <span className="relative z-10">
                        {tab.label} ({tab.count})
                    </span>
                </button>
            ))}
        </div>
    );
}
