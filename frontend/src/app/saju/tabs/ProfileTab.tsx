import React from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ProfileResponse, ReadResult } from '@/lib/api';
import { ELEMENT_NUMBERS, ballColor, seededRandom } from '@/lib/lottery-utils';
import styles from './tabs.module.css';

type ProfileTabProps = {
  profile: ProfileResponse;
  streamText: string;
  streamLoading: boolean;
  streamError: string | null;
  streamResult: ReadResult | null;
  streamTitle: string | null;
  weekKey: string;
};

// 오행 → 1~45 숫자 대응 (오행 고유 수리)

// 로또볼 색상 (한국 로또 기준)

function getLuckyNumbers(profile: ProfileResponse, weekKey: string): number[] {
  // 시드: profile_id + weekKey 해시
  const raw = profile.profile_id + weekKey;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = Math.imul(31, hash) + raw.charCodeAt(i);
  }
  const rand = seededRandom(hash);

  // 오행 강도 순 정렬
  const sorted = (
    [
      { key: 'wood',  count: profile.elements.wood },
      { key: 'fire',  count: profile.elements.fire },
      { key: 'earth', count: profile.elements.earth },
      { key: 'metal', count: profile.elements.metal },
      { key: 'water', count: profile.elements.water },
    ] as { key: keyof typeof ELEMENT_NUMBERS; count: number }[]
  ).sort((a, b) => b.count - a.count);

  // 강한 오행일수록 더 많은 숫자를 풀에 추가 (5,4,3,2,1)
  const pool: number[] = [];
  sorted.forEach((el, idx) => {
    const weight = 5 - idx;
    const nums = ELEMENT_NUMBERS[el.key];
    for (let i = 0; i < weight; i++) {
      pool.push(nums[Math.floor(rand() * nums.length)]);
    }
  });

  // 중복 제거 후 부족하면 1~45에서 랜덤 보충
  const set = new Set(pool);
  while (set.size < 6) {
    set.add(Math.floor(rand() * 45) + 1);
  }

  // 시드 셔플 후 6개 추출, 오름차순 정렬
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 6).sort((a, b) => a - b);
}

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
  weekKey,
}: ProfileTabProps) {
  const luckyNumbers = getLuckyNumbers(profile, weekKey);
  const highlights = streamResult?.highlights;
  const highlightedElements = new Set(highlights?.elements ?? []);
  const highlightedTenGods = new Set(highlights?.ten_gods ?? []);

  const pillars = [
    { name: '시주', top: profile.pillars.time[0], bottom: profile.pillars.time[1] },
    { name: '일주', top: profile.pillars.day[0], bottom: profile.pillars.day[1], isMe: true },
    { name: '월주', top: profile.pillars.month[0], bottom: profile.pillars.month[1] },
    { name: '년주', top: profile.pillars.year[0], bottom: profile.pillars.year[1] },
  ];

  const elements = [
    { name: '목', key: 'wood', count: profile.elements.wood, color: '#4ade80' },
    { name: '화', key: 'fire', count: profile.elements.fire, color: '#f87171' },
    { name: '토', key: 'earth', count: profile.elements.earth, color: '#fbbf24' },
    { name: '금', key: 'metal', count: profile.elements.metal, color: '#9ca3af' },
    { name: '수', key: 'water', count: profile.elements.water, color: '#60a5fa' },
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

      {!streamError && !streamText && !streamTitle && !streamResult && (
        <Card className={styles.streamLoadingCard}>
          <div className={styles.streamLoadingDots}>
            <span /><span /><span />
          </div>
          <span className={styles.streamLoadingLabel}>사주를 읽는 중입니다</span>
        </Card>
      )}

      {!streamError && (streamText || streamTitle || streamResult) && (
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
          <div className={styles.bulletList}>
            {streamResult.details.map((item, i) => (
              <div key={`${item.subtitle}-${i}`} className={styles.bulletItem}>
                <span className={styles.bulletLabel}>{item.subtitle}</span>
                <span className={styles.bulletContent}>{item.content}</span>
              </div>
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
          {elements.map((el) => {
            const isHighlighted = highlightedElements.has(el.key);
            return (
              <div key={el.name} className={styles.elementItem}>
                <div
                  className={`${styles.elementCircle} ${isHighlighted ? styles.elementCircleHighlighted : ''}`}
                  style={{ borderColor: el.color, color: el.color, ...(isHighlighted ? { background: el.color + '22' } : {}) }}
                >
                  {el.name}
                </div>
                <div className={`${styles.elementValue} ${isHighlighted ? styles.elementValueHighlighted : ''}`}>{el.count}개</div>
              </div>
            );
          })}
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
          <Card key={god.name} className={`${styles.godCard} ${highlightedTenGods.has(god.name) ? styles.godCardHighlighted : ''}`}>
            <div className={styles.godHeader}>
              <h3 className={styles.godTitle}>{god.name}</h3>
              <span className={`${styles.badge} ${god.level === '강함' ? styles.badgeStrong : ''}`}>{god.level}</span>
            </div>
            <p className={styles.godDesc}>{god.desc}</p>
          </Card>
        ))}
      </div>

      <div className={styles.divider} />

      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>이번 주 행운 번호</h2>
        <p className={styles.sectionDesc}>오행의 기운을 기반으로 매주 새롭게 계산됩니다.</p>
      </header>

      <Card className={styles.card}>
        <div className={styles.luckyNumbersRow}>
          {luckyNumbers.map((n) => (
            <div
              key={n}
              className={styles.lottoBall}
              style={{ backgroundColor: ballColor(n) }}
            >
              {n}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
