import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ReadResult } from '@/lib/api';
import styles from './tabs.module.css';

interface FortuneTabProps {
  data: ReadResult | null;
  streamText: string;
  streamTitle: string | null;
  streamLoading: boolean;
  streamError: string | null;
  isWeekly: boolean;
}

export default function FortuneTab({ data, streamText, streamTitle, streamLoading, streamError, isWeekly }: FortuneTabProps) {
  if (streamError) {
    return <p className={styles.streamErrorText}>{streamError}</p>;
  }

  const title = streamTitle ?? data?.title ?? null;
  const hasNarrative = !!(streamText || title);

  return (
    <div className={styles.tabContainer}>
      {/* 결과도 에러도 없으면 로딩 카드 표시 */}
      {!hasNarrative && (
        <Card className={styles.streamLoadingCard}>
          <div className={styles.streamLoadingDots}>
            <span /><span /><span />
          </div>
          <span className={styles.streamLoadingLabel}>사주를 읽는 중입니다</span>
        </Card>
      )}

      {hasNarrative && (
        <Card className={styles.llmStreamCard}>
          <div className={styles.fortuneNarrativeHeader}>
            {title && <h2 className={styles.narrativeTitle}>{title}</h2>}
            {data && isWeekly && (
              <div className={styles.scoreBadge}>
                {data.score}<span>점</span>
              </div>
            )}
          </div>
          <p className={styles.streamingText}>
            {streamText}
            {streamLoading && <span className={styles.cursor} />}
          </p>
        </Card>
      )}

      {/* 구조화 데이터 — done 이후에만 등장 */}
      {data && (
        <>
          <div className={styles.divider} />

          <div className={styles.bulletList}>
            {data.details.map((item, i) => (
              <div key={`${item.subtitle}-${i}`} className={styles.bulletItem}>
                <span className={styles.bulletLabel}>{item.subtitle}</span>
                <span className={styles.bulletContent}>{item.content}</span>
              </div>
            ))}
          </div>

          {/* 광고 */}
          <div className={styles.adBanner}>
            <span className={styles.adLabel}>광고</span>
            <div className={styles.adSlot} />
          </div>

          <div className={styles.divider} />

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
        </>
      )}
    </div>
  );
}
