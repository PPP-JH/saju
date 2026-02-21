'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function InputPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        gender: 'M',
        birth_date: '',
        birth_time: '',
        is_lunar: false,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Mocking an API call
        setTimeout(() => {
            setLoading(false);
            // Let's assume the dummy profile_id is "user-123"
            router.push('/me');
        }, 1200);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>사주 허브</Link>
            </header>

            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>내 사주 알아보기</h1>
                    <p className={styles.subtitle}>정확한 분석을 위해 태어난 시간을 꼭 확인해주세요.</p>
                </div>

                <Card className={styles.formCard}>
                    <form onSubmit={handleSubmit} className={styles.form}>

                        <div className={styles.formGroup}>
                            <label htmlFor="name" className={styles.label}>이름 또는 닉네임</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                className={styles.input}
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="홍길동"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>성별</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="M"
                                        checked={formData.gender === 'M'}
                                        onChange={handleChange}
                                    /> 남성
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="F"
                                        checked={formData.gender === 'F'}
                                        onChange={handleChange}
                                    /> 여성
                                </label>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="birth_date" className={styles.label}>생년월일</label>
                            <div className={styles.dateRow}>
                                <input
                                    type="date"
                                    id="birth_date"
                                    name="birth_date"
                                    className={styles.input}
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    required
                                />
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="is_lunar"
                                        checked={formData.is_lunar}
                                        onChange={handleChange}
                                    /> 음력
                                </label>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="birth_time" className={styles.label}>태어난 시간 (선택)</label>
                            <input
                                type="time"
                                id="birth_time"
                                name="birth_time"
                                className={styles.input}
                                value={formData.birth_time}
                                onChange={handleChange}
                            />
                            <span className={styles.hint}>정확한 시간을 모를 경우 비워두셔도 됩니다 (3주 풀이로 자동 변환)</span>
                        </div>

                        <div className={styles.submitWrapper}>
                            <Button type="submit" variant="primary" size="lg" className={styles.submitBtn} disabled={loading}>
                                {loading ? '분석 중...' : '사주 결과 보기'}
                            </Button>
                        </div>

                    </form>
                </Card>
            </main>
        </div>
    );
}
