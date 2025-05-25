import React from 'react';

// Server Component - No interactivity needed
export default function HomeHeader() {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Talk IO
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
                Connect with anyone, anywhere.
            </p>
        </div>
    );
}
