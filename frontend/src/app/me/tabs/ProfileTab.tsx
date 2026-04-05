import React from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ProfileResponse, ReadResult } from '@/lib/api';
import styles from './tabs.module.css';

type ProfileTabProps = {
  profile: ProfileResponse;
  streamText: string;
  streamLoading: boolean;
  streamError: string | null;
  streamResult: ReadResult | null;
  streamTitle: string | null;
};

const GOD_LABEL_MAP: Record<string, string> = {
  비견: '독립심과 주도성',
  식상: '표현력과 생산성',
  재성: '재물과 성과 지향',
  관성: '책임감과 규율',
  인성: '학습력과 내면 안정',
};

export default function ProfileTab({
  profile,
  streamText,
  streamLoading,
  streamError,
  streamResult,
  streamTitle,
}: ProfileTabProps) {
  const pillars = [
    { name: '시주', top: profile.pillars.time[0], bottom: profile.pillars.time[1] },
    { name: '일주', top: profile.pillars.day[0], bottom: profile.pillars.day[1], isMe: true },
    { name: '월주', top: profile.pillars.month[0], bottom: profile.pillars.month[1] },
    { name: '년주', top: profile.pillars.year[0], bottom: profile.pillars.year[1] },
  ];

  const elements = [
    { name: '목', count: profile.elements.wood, color: '#4ade80' },
    { name: '화', count: profile.elements.fire, color: '#f87171' },
    { name: '토', count: profile.elements.earth, color: '#fbbf24' },
    { name: '금', count: profile.elements.metal, color: '#9ca3af' },
    { name: '수', count: profile.elements.water, color: '#60a5fa' },
  ];

  const tenGods = Object.entries(profile.ten_gods_summary).map(([name, level]) => ({
    name,
    level,
    desc: GOD_LABEL_MAP[name] ?? '성향 해석 포인트',
  }));

  return (
    <div className={styles.tabContainer}>
      {/* ── 사주 풀이 (최상단) ── */}
      {streamError && <p className={styles.streamErrorText}>{streamError}</p>}

      {!streamError && !streamText && !streamResult && (
        <p className={styles.streamHintText}>사주의 기운을 읽는 중입니다...</p>
      )}

      {!streamError && (streamText || streamTitle) && (
        <Card className={styles.llmStreamCard}>
          {(streamTitle ?? streamResult?.title) && (
            <h2 className={styles.narrativeTitle}>{streamTitle ?? streamResult?.title}</h2>
          )}
          <p className={styles.streamingText}>
            {streamText}
            {streamLoading && <span className={styles.cursor} />}
          </p>
        </Card>
      )}

      {!streamError && streamResult && streamResult.details.length > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.detailsList}>
            {streamResult.details.map((item, i) => (
              <Card key={`${item.subtitle}-${i}`} className={styles.detailCard}>
                <div className={styles.detailIndex}>{i + 1}</div>
                <div className={styles.detailContent}>
                  <h4 className={styles.detailSubTitle}>{item.subtitle}</h4>
                  <p className={styles.detailText}>{item.content}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!streamError && streamResult && streamResult.actions.length > 0 && (
        <>
          <h3 className={styles.sectionSubTitle}>삶의 방향</h3>
          <div className={styles.actionsList}>
            {streamResult.actions.map((act, i) => (
              <div key={`${act}-${i}`} className={styles.actionItem}>
                <div className={styles.checkIcon}>✓</div>
                <span>{act}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.divider} />

      {/* ── 명식 (풀이의 근거) ── */}
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>명식 (사주 8자)</h2>
        <p className={styles.sectionDesc}>
          당신이 태어난 연월일시를 <Tooltip content="10개의 천간과 12개의 지지로 이루어진 기호">간지</Tooltip>로 변환한 고유의 바코드입니다.
        </p>
      </header>

      <Card className={styles.card}>
        <div className={styles.pillarsGrid}>
          {pillars.map((pillar) => (
            <div key={pillar.name} className={`${styles.pillarCol} ${pillar.isMe ? styles.isMe : ''}`}>
              <div className={styles.pillarName}>{pillar.name}</div>
              <div className={styles.pillarCharTop}>{pillar.top}</div>
              <div className={styles.pillarCharBottom}>{pillar.bottom}</div>
              {pillar.isMe && <div className={styles.meLabel}>나(일간)</div>}
            </div>
          ))}
        </div>
      </Card>

      <div className={styles.divider} />

      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>오행의 균형</h2>
        <p className={styles.sectionDesc}>
          우주를 구성하는 5가지 기운(<Tooltip content="나무의 뻗어나가는 기운">목</Tooltip>, <Tooltip content="불의 확산하는 기운">화</Tooltip>, 토, 금, 수)의 분포입니다.
        </p>
      </header>

      <Card className={styles.card}>
        <div className={styles.elementsRow}>
          {elements.map((el) => (
            <div key={el.name} className={styles.elementItem}>
              <div className={styles.elementCircle} style={{ borderColor: el.color, color: el.color }}>
                {el.name}
              </div>
              <div className={styles.elementValue}>{el.count}개</div>
            </div>
          ))}
        </div>
        <div className={styles.interpretation}>
          <strong>해석:</strong> {profile.summary_text}
        </div>
      </Card>

      <div className={styles.divider} />

      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>십성 분석</h2>
        <p className={styles.sectionDesc}>
          일간(나)를 기준으로 다른 글자들이 맺는 관계를 10가지 성질로 분류한 것입니다.
        </p>
      </header>

      <div className={styles.godsList}>
        {tenGods.map((god) => (
          <Card key={god.name} className={styles.godCard}>
            <div className={styles.godHeader}>
              <h3 className={styles.godTitle}>{god.name}</h3>
              <span className={`${styles.badge} ${god.level === '강함' ? styles.badgeStrong : ''}`}>{god.level}</span>
            </div>
            <p className={styles.godDesc}>{god.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
