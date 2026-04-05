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

  if (!hasNarrative) {
    return <p className={styles.streamHintText}>사주의 흐름을 읽는 중입니다...</p>;
  }

  return (
    <div className={styles.tabContainer}>
      {/* narrative 카드 — 스트리밍 중에도, 완료 후에도 유지 */}
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

      {/* 구조화 데이터 — done 이후에만 등장 */}
      {data && (
        <>
          <div className={styles.divider} />

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
