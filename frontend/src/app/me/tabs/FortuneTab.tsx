import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReadResult } from '@/lib/api';
import styles from './tabs.module.css';

interface FortuneTabProps {
  data: ReadResult | null;
  streamText: string;
  streamLoading: boolean;
  streamError: string | null;
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className={styles.skeletonLine} style={{ width }} />;
}

function LoadingSkeleton() {
  return (
    <div className={styles.tabContainer}>
      <Card className={styles.scoreCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <SkeletonLine width="50%" />
          <SkeletonLine width="15%" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine width="80%" />
        </div>
      </Card>

      <div className={styles.divider} />

      <SkeletonLine width="30%" />
      <div className={styles.detailsList} style={{ marginTop: '0.5rem' }}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className={styles.detailCard}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <SkeletonLine width="40%" />
              <SkeletonLine />
              <SkeletonLine width="85%" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function FortuneTab({ data, streamLoading, streamError }: FortuneTabProps) {
  if (streamError) {
    return <p className={styles.streamErrorText}>{streamError}</p>;
  }

  if (!data) {
    if (streamLoading) return <LoadingSkeleton />;
    return <p className={styles.streamHintText}>사주의 흐름을 읽는 중입니다...</p>;
  }

  return (
    <div className={styles.tabContainer}>
      {/* 제목 + 요약 + 점수(서브) */}
      <Card className={styles.scoreCard}>
        <div className={styles.scoreHeader}>
          <h2 className={styles.scoreTitle}>{data.title}</h2>
          <div className={styles.scoreValue}>{data.score}<span>점</span></div>
        </div>

        {/* 요약 본문 */}
        {data.summary && (
          <p className={styles.summaryText}>{data.summary}</p>
        )}
      </Card>

      {/* 광고 */}
      <div className={styles.adBanner}>
        <span className={styles.adLabel}>광고</span>
        <div className={styles.adSlot}>
          {/* 광고 코드 삽입 위치 */}
        </div>
      </div>

      <div className={styles.divider} />

      {/* 상세 흐름 */}
      <h3 className={styles.sectionSubTitle}>상세 흐름</h3>
      <div className={styles.detailsList}>
        {data.details.map((item, i) => (
          <Card key={`${item.subtitle}-${i}`} className={styles.detailCard}>
            <div className={styles.detailIndex}>{i + 1}</div>
            <div className={styles.detailContent}>
              <h4 className={styles.detailSubTitle}>{item.subtitle}</h4>
              <p className={styles.detailText}>{item.content}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* 광고 */}
      <div className={styles.adBanner}>
        <span className={styles.adLabel}>광고</span>
        <div className={styles.adSlot}>
          {/* 광고 코드 삽입 위치 */}
        </div>
      </div>

      <div className={styles.divider} />

      {/* 행동 가이드 */}
      <h3 className={styles.sectionSubTitle}>행동 가이드</h3>
      <div className={styles.actionsList}>
        {data.actions.map((act, i) => (
          <div key={`${act}-${i}`} className={styles.actionItem}>
            <div className={styles.checkIcon}>✓</div>
            <span>{act}</span>
          </div>
        ))}
      </div>

      <div className={styles.footerCta}>
        <p className={styles.footerHint}>결과에 등장한 단어가 궁금하시다면?</p>
        <Button variant="secondary" onClick={() => { window.location.href = '/glossary'; }}>
          용어사전 살펴보기
        </Button>
      </div>
    </div>
  );
}
