import React from 'react';
import styles from './Card.module.css';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`${styles.card} ${className || ''}`} {...props}>
            {children}
        </div>
    );
}
