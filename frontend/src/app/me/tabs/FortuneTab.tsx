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

export default function FortuneTab({ data, streamText, streamLoading, streamError }: FortuneTabProps) {
  if (!data && !streamLoading && !streamError) {
    return <p className={styles.streamHintText}>운세를 준비하고 있습니다...</p>;
  }

  return (
    <div className={styles.tabContainer}>
      {data && (
        <Card className={styles.scoreCard}>
          <div className={styles.scoreHeader}>
            <div className={styles.scoreValue}>{data.score}<span>점</span></div>
            <h2 className={styles.scoreTitle}>{data.title}</h2>
          </div>
          {data.summary && !data.summary.includes('동일 결과를 제공합니다') && (
            <div className={styles.summaryText}>{data.summary}</div>
          )}
        </Card>
      )}

      <div className={styles.divider} />

      <h3 className={styles.sectionSubTitle}>실시간 사주 풀이</h3>
      <Card className={styles.llmStreamCard}>
        {streamError && <p className={styles.streamErrorText}>{streamError}</p>}
        {!streamError && !streamText && streamLoading && (
          <p className={styles.streamHintText}>문장을 생성 중입니다...</p>
        )}
        {!!streamText && (
          <p className={styles.streamingText}>
            {streamText}
            {streamLoading && <span className={styles.cursor} />}
          </p>
        )}
      </Card>

      {data && (
        <>
          <div className={styles.divider} />

          <h3 className={styles.sectionSubTitle}>상세 흐름</h3>
          <div className={styles.detailsList}>
            {data.details.map((item, i) => (
              <Card key={`${item.subtitle}-${i}`} className={styles.detailCard}>
                <div className={styles.detailIcon}>#</div>
                <div className={styles.detailContent}>
                  <h4 className={styles.detailSubTitle}>{item.subtitle}</h4>
                  <p className={styles.detailText}>{item.content}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className={styles.divider} />

          <h3 className={styles.sectionSubTitle}>행동 가이드</h3>
          <div className={styles.actionsList}>
            {data.actions.map((act, i) => (
              <div key={`${act}-${i}`} className={styles.actionItem}>
                <div className={styles.checkIcon}>+</div>
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
