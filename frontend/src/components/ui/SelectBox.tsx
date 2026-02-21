import React, { useState, useEffect, useRef } from 'react';
import styles from './SelectBox.module.css';

interface Option {
    value: string;
    label: string;
}

interface SelectBoxProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    id?: string;
}

export function SelectBox({ options, value, onChange, placeholder = '선택해주세요', name, id }: SelectBoxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Find current label
    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : '');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (newValue: string) => {
        onChange(newValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <div className={styles.inputContainer} onClick={() => setIsOpen(true)}>
                <input
                    id={id}
                    name={name}
                    type="text"
                    className={styles.input}
                    placeholder={!isOpen && !selectedOption ? placeholder : ''}
                    value={displayValue}
                    onChange={(e) => {
                        setIsOpen(true);
                        setSearchTerm(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                    autoComplete="off"
                />
                <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
                <ul className={styles.optionsList}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <li
                                key={opt.value}
                                className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                {opt.label}
                            </li>
                        ))
                    ) : (
                        <li className={styles.noResult}>검색 결과가 없습니다</li>
                    )}
                </ul>
            )}
        </div>
    );
}
