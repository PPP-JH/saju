import type { Metadata } from 'next';
import { Suspense } from 'react';
import LotteryClient from './LotteryClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '사주 로또 번호 추천 | 사주해',
  description: '내 생년월일 사주 기운으로 이번 주 행운의 로또 번호를 뽑아보세요. 오행 에너지 기반 번호 추천.',
  openGraph: {
    title: '사주 로또 번호 추천 | 사주해',
    description: '내 생년월일 사주 기운으로 이번 주 행운의 로또 번호를 뽑아보세요.',
  },
};

export default function LotteryPage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>번호를 계산하는 중...</p>
      </div>
    }>
      <LotteryClient />
    </Suspense>
  );
}
