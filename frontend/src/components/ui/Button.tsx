import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
    const cn = [
        styles.btn,
        styles[variant],
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return (
        <button className={cn} {...props}>
            {children}
        </button>
    );
}
