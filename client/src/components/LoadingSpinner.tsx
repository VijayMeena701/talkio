'use client';

import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    message?: string;
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    message,
    className = ''
}) => {
    const sizeClasses = {
        small: 'w-6 h-6',
        medium: 'w-8 h-8',
        large: 'w-12 h-12'
    };

    const textSizes = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={`${sizeClasses[size]} border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin`}></div>
            {message && (
                <p className={`mt-3 text-gray-600 dark:text-gray-300 ${textSizes[size]}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;
