import React from 'react';

// Server Component - No interactivity needed, can be pre-rendered
export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
            {children}
        </div>
    );
}
