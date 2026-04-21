'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SelectBox } from '@/components/ui/SelectBox';
import { SiteHeader } from '@/components/SiteHeader';
import { createProfile } from '@/lib/api';
import styles from './page.module.css';

type FormData = {
  name: string;
  gender: 'M' | 'F';
  birth_year: string;
  birth_month: string;
  birth_day: string;
  birth_time: string;
  is_lunar: boolean;
};

export default function HomeClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: 'M',
    birth_year: '',
    birth_month: '',
    birth_day: '',
    birth_time: '',
    is_lunar: false,
  });
  const [loading, setLoading] = useState<'saju' | 'lottery' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const isFormValid = !!formData.birth_year && !!formData.birth_month && !!formData.birth_day && privacyAgreed;

  const handleSubmit = async (destination: 'saju' | 'lottery') => {
    if (!isFormValid || !privacyAgreed) return;
    setLoading(destination);
    setError(null);

    try {
      const birthDate = `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}`;
      const response = await createProfile({
        name: formData.name.trim() || null,
        gender: formData.gender,
        birth_date: birthDate,
        birth_time: formData.birth_time || null,
        is_lunar: formData.is_lunar,
      });

      localStorage.setItem('saju_profile_id', response.profile_id);
      try {
        sessionStorage.setItem('saju_lottery_birth', JSON.stringify({
          year: formData.birth_year,
          month: formData.birth_month,
          day: formData.birth_day,
        }));
      } catch {
        // ignore
      }

      if (destination === 'saju') {
        router.push(`/saju?profile_id=${encodeURIComponent(response.profile_id)}`);
      } else {
        router.push(`/lottery?profile_id=${encodeURIComponent(response.profile_id)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 생성 중 오류가 발생했습니다.');
      setLoading(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
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
      <SiteHeader right={
        <nav className={styles.nav}>
          <Link href="/story">사주 상식</Link>
          <Link href="/glossary">용어 사전</Link>
        </nav>
      } />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>내 사주 알아보기</h1>
          <p className={styles.subtitle}>생년월일로 사주를 분석해드립니다.</p>
        </div>

        <Card className={styles.formCard}>
          <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
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
              <label className={styles.label}>태어난 시간 <span className={styles.optionalLabel}>(선택)</span></label>
              <SelectBox
                options={timeOptions}
                value={formData.birth_time}
                onChange={(v) => handleSelectChange('birth_time', v)}
                placeholder="시간을 선택하거나 입력하세요"
              />
              <span className={styles.hint}>정확한 시간을 모를 경우 비워두셔도 됩니다</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>성별</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="gender" value="M" checked={formData.gender === 'M'} onChange={handleChange} /> 남성
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="gender" value="F" checked={formData.gender === 'F'} onChange={handleChange} /> 여성
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>이름 또는 닉네임 <span className={styles.optionalLabel}>(선택)</span></label>
              <input
                type="text"
                id="name"
                name="name"
                className={styles.inputText}
                value={formData.name}
                onChange={handleChange}
                placeholder="홍길동"
              />
            </div>

            <div className={styles.privacyRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                />
                개인정보 수집·이용에 동의합니다
              </label>
              <button
                type="button"
                className={styles.privacyBtn}
                onClick={() => setShowPrivacyModal(true)}
              >
                처리방침 보기
              </button>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.buttonRow}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className={styles.actionBtn}
                disabled={!isFormValid || loading !== null}
                onClick={() => handleSubmit('saju')}
              >
                {loading === 'saju' ? '분석 중...' : '사주 풀이 보기 →'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className={styles.actionBtn}
                disabled={!isFormValid || loading !== null}
                onClick={() => handleSubmit('lottery')}
              >
                {loading === 'lottery' ? '분석 중...' : '행운의 번호 보기 →'}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      <footer className={styles.footer}>
        <Link href="/privacy" className={styles.footerLink}>개인정보처리방침</Link>
      </footer>

      {showPrivacyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>개인정보처리방침</h2>
              <button className={styles.modalClose} onClick={() => setShowPrivacyModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalUpdated}>최종 수정일: 2026년 4월 5일</p>

              <h3>1. 수집하는 정보</h3>
              <p>사주해(四柱解)는 사주 풀이 서비스 제공을 위해 다음 정보를 수집합니다.</p>
              <ul>
                <li>생년월일 및 출생 시간 (사주 계산 목적)</li>
                <li>성별 (사주 계산 목적)</li>
                <li>서비스 이용 기록 및 서버 접속 로그</li>
              </ul>
              <p>회원 가입이나 이메일 수집은 없습니다.</p>

              <h3>2. 정보의 이용 목적</h3>
              <ul>
                <li>사주 풀이 결과 생성 및 제공</li>
                <li>이전 풀이 결과 재조회</li>
                <li>서비스 품질 개선</li>
              </ul>

              <h3>3. 정보의 보유 및 파기</h3>
              <p>수집된 정보는 서비스 제공 목적이 달성될 때까지 보관하며, 이용자가 삭제를 요청하거나 서비스가 종료되는 경우 지체 없이 파기합니다.</p>

              <h3>4. 문의</h3>
              <p>이메일: syntec3333@gmail.com</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalAgreeBtn}
                onClick={() => { setPrivacyAgreed(true); setShowPrivacyModal(false); }}
              >
                동의하고 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
