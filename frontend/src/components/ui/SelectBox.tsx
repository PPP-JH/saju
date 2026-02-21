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
    // If not open, but there's a searchTerm that doesn't match the selected value, it means the user typed something invalid that wasn't selected
    const isInvalid = !isOpen && searchTerm && selectedOption?.label !== searchTerm;
    const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : searchTerm);

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

    const handleSelect = (newValue: string, newLabel: string) => {
        onChange(newValue);
        setSearchTerm(newLabel);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;

        if (e.key === 'Tab' || e.key === 'Enter') {
            if (filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].value, filteredOptions[0].label);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (selectedOption) {
                setSearchTerm(selectedOption.label);
            } else {
                setSearchTerm('');
            }
        }
    };

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <div className={styles.inputContainer} onClick={() => setIsOpen(true)}>
                <input
                    id={id}
                    name={name}
                    type="text"
                    className={`${styles.input} ${isInvalid ? styles.invalid : ''}`}
                    placeholder={!isOpen && !selectedOption ? placeholder : ''}
                    value={displayValue}
                    onChange={(e) => {
                        setIsOpen(true);
                        setSearchTerm(e.target.value);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                    onKeyDown={handleKeyDown}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(opt.value, opt.label);
                                }}
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
