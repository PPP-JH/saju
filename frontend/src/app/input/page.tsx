'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SelectBox } from '@/components/ui/SelectBox';
import { createProfile } from '@/lib/api';
import styles from './page.module.css';

export default function InputPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M' as 'M' | 'F',
    birth_year: '',
    birth_month: '',
    birth_day: '',
    birth_time: '',
    is_lunar: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const birthDate = `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}`;
      const response = await createProfile({
        name: formData.name.trim(),
        gender: formData.gender,
        birth_date: birthDate,
        birth_time: formData.birth_time || null,
        is_lunar: formData.is_lunar,
      });

      localStorage.setItem('saju_profile_id', response.profile_id);
      router.push(`/me?profile_id=${encodeURIComponent(response.profile_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => {
    const y = (currentYear - i).toString();
    return { value: y, label: `${y}년` };
  });

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return { value: m, label: `${m}월` };
  });

  const dayOptions = Array.from({ length: 31 }, (_, i) => {
    const d = (i + 1).toString().padStart(2, '0');
    return { value: d, label: `${d}일` };
  });

  const timeOptions = [
    { value: '', label: '모름' },
    { value: '00:30', label: '자시 (23:30 ~ 01:29)' },
    { value: '02:30', label: '축시 (01:30 ~ 03:29)' },
    { value: '04:30', label: '인시 (03:30 ~ 05:29)' },
    { value: '06:30', label: '묘시 (05:30 ~ 07:29)' },
    { value: '08:30', label: '진시 (07:30 ~ 09:29)' },
    { value: '10:30', label: '사시 (09:30 ~ 11:29)' },
    { value: '12:30', label: '오시 (11:30 ~ 13:29)' },
    { value: '14:30', label: '미시 (13:30 ~ 15:29)' },
    { value: '16:30', label: '신시 (15:30 ~ 17:29)' },
    { value: '18:30', label: '유시 (17:30 ~ 19:29)' },
    { value: '20:30', label: '술시 (19:30 ~ 21:29)' },
    { value: '22:30', label: '해시 (21:30 ~ 23:29)' },
  ];

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
              <label className={styles.label}>생년월일</label>
              <div className={styles.dateSelectorRow}>
                <div className={styles.selectWrapper}>
                  <SelectBox
                    options={yearOptions}
                    value={formData.birth_year}
                    onChange={(v) => handleSelectChange('birth_year', v)}
                    placeholder="연도"
                  />
                </div>
                <div className={styles.selectWrapper}>
                  <SelectBox
                    options={monthOptions}
                    value={formData.birth_month}
                    onChange={(v) => handleSelectChange('birth_month', v)}
                    placeholder="월"
                  />
                </div>
                <div className={styles.selectWrapper}>
                  <SelectBox
                    options={dayOptions}
                    value={formData.birth_day}
                    onChange={(v) => handleSelectChange('birth_day', v)}
                    placeholder="일"
                  />
                </div>
              </div>
              <div className={styles.dateRow}>
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
              <label className={styles.label}>태어난 시간 (선택)</label>
              <SelectBox
                options={timeOptions}
                value={formData.birth_time}
                onChange={(v) => handleSelectChange('birth_time', v)}
                placeholder="시간을 선택하거나 입력하세요"
              />
              <span className={styles.hint}>정확한 시간을 모를 경우 비워두셔도 됩니다 (3주 풀이로 자동 변환)</span>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.submitWrapper}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className={styles.submitBtn}
                disabled={
                  loading ||
                  !formData.name ||
                  !formData.birth_year ||
                  !formData.birth_month ||
                  !formData.birth_day
                }
              >
                {loading ? '분석 중...' : '사주 결과 보기'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
