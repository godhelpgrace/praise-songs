'use client';

import { useState, useEffect } from 'react';

export default function AlbumCover({ 
    src, 
    alt, 
    className, 
    fallback = '/images/default_cover.png' 
}: { 
    src: string, 
    alt: string, 
    className?: string,
    fallback?: string
}) {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [src]);

    return (
        <img 
            src={error ? fallback : src} 
            alt={alt} 
            className={className}
            onError={() => setError(true)}
        />
    );
}
