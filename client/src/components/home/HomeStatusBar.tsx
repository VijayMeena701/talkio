'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TURNStatusIndicator from '@/components/TURNStatusIndicator';

// Client Component - Needs router navigation
export default function HomeStatusBar() {
    const router = useRouter();

    return (
        <div className="flex justify-between items-center py-2">
            <TURNStatusIndicator />
            <button
                onClick={() => router.push('/settings')}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
            >
                ⚙️ Settings
            </button>
        </div>
    );
}
