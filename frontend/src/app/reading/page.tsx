import type { Metadata } from 'next';
import { Suspense } from 'react';
import ReadingClient from './ReadingClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '내 운세 풀이 | 사주해',
  description: '사주 팔자 기반 AI 운세 풀이. 내 사주의 흐름을 지금 확인해보세요.',
  openGraph: {
    title: '내 운세 풀이 | 사주해',
    description: '사주 팔자 기반 AI 운세 풀이. 내 사주의 흐름을 지금 확인해보세요.',
    images: ['/og-reading.png'],
  },
};

export default function ReadingPage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
      </div>
    }>
      <ReadingClient />
    </Suspense>
  );
}
