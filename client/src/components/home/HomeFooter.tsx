import React from 'react';

// Server Component - Static content
export default function HomeFooter() {
    return (
        <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} Video Conferencing App. All rights reserved.</p>
        </footer>
    );
}
