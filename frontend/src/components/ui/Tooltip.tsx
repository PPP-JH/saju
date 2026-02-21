'use client';

import React, { useState } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <span
            className={styles.container}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)}
        >
            {children}
            {isVisible && (
                <span className={styles.tooltip}>
                    {content}
                    <span className={styles.arrow} />
                </span>
            )}
        </span>
    );
}
