'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SelectBox } from '@/components/ui/SelectBox';
import { SiteHeader } from '@/components/SiteHeader';
import { getProfile, type ProfileResponse } from '@/lib/api';
import styles from './page.module.css';

// ── 오행 기본 데이터 ──────────────────────────────────────

const ELEMENT_NUMBERS: Record<string, number[]> = {
  wood:  [3, 8, 13, 18, 23, 28, 33, 38, 43],
  fire:  [2, 7, 12, 17, 22, 27, 32, 37, 42],
  earth: [5, 10, 15, 20, 25, 30, 35, 40, 45],
  metal: [4, 9, 14, 19, 24, 29, 34, 39, 44],
  water: [1, 6, 11, 16, 21, 26, 31, 36, 41],
};

const ELEMENT_NAMES: Record<string, string> = {
  wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
};

const ELEMENT_DESC: Record<string, string> = {
  wood: '성장과 확장의 기운',
  fire: '열정과 밝음의 기운',
  earth: '안정과 신뢰의 기운',
  metal: '결단과 집중의 기운',
  water: '지혜와 유연함의 기운',
};

const ELEMENT_COLOR: Record<string, string> = {
  wood: '#4caf50',
  fire: '#f44336',
  earth: '#ff9800',
  metal: '#9e9e9e',
  water: '#2196f3',
};

// 상생: 木→火→土→金→水→木
const GENERATES: Record<string, string> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};
// 상극: 木→土, 火→金, 土→水, 金→木, 水→火
const OVERCOMES: Record<string, string> = {
  wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
};
// 역방향 조회
const GENERATED_BY: Record<string, string> = Object.fromEntries(
  Object.entries(GENERATES).map(([k, v]) => [v, k])
);
const OVERCOME_BY: Record<string, string> = Object.fromEntries(
  Object.entries(OVERCOMES).map(([k, v]) => [v, k])
);

// ── 날짜 오행 (천간 10일 주기) ────────────────────────────
// 기준: 2000-01-01 = 甲 (index 0 = wood)
function getTodayElement(): string {
  const ref = new Date('2000-01-01').getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now.getTime() - ref) / 86400000);
  const stem = ((days % 10) + 10) % 10;
  return ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'][stem];
}

// ── 관계 분석 & 균형 오행 결정 ──────────────────────────────

type Relationship = 'same' | 'generates' | 'generated_by' | 'overcomes' | 'overcome_by';

function getRelationship(user: string, today: string): Relationship {
  if (user === today) return 'same';
  if (GENERATES[user] === today) return 'generates';
  if (GENERATED_BY[user] === today) return 'generated_by';
  if (OVERCOMES[user] === today) return 'overcomes';
  return 'overcome_by';
}

// 오늘 기운을 고려한 균형 오행 (추가 가중치 부여할 오행)
function getBalanceElement(primary: string, today: string): string | null {
  const rel = getRelationship(primary, today);
  switch (rel) {
    case 'generates':
      // 내가 오늘 기운을 먹임 → 나를 생해주는 오행 보충
      return GENERATED_BY[primary];
    case 'overcome_by':
      // 오늘이 나를 극함 → 오늘을 극하는 오행으로 반격
      return OVERCOME_BY[today];
    default:
      return null;
  }
}

type ExplanationText = {
  userLine: string;
  todayLine: string;
  reasoning: string;
};

function buildExplanation(
  primary: string,
  today: string,
  balance: string | null,
): ExplanationText {
  const rel = getRelationship(primary, today);
  const uName = ELEMENT_NAMES[primary];
  const tName = ELEMENT_NAMES[today];
  const bName = balance ? ELEMENT_NAMES[balance] : null;

  const userLine = `사주의 주요 기운은 ${uName}입니다.`;
  const todayLine = `오늘은 ${tName}의 기운이 흐르는 날입니다.`;

  let reasoning: string;
  switch (rel) {
    case 'same':
      reasoning = `${uName} 기운이 오늘도 겹쳐 힘이 두 배가 되는 날입니다. ${uName} 번호 위주로 구성했습니다.`;
      break;
    case 'generates':
      reasoning = `${uName}은 ${tName}을 생(生)하여 기운을 내어주는 날입니다. 소진되는 기운을 보충하기 위해 ${bName} 번호를 더했습니다.`;
      break;
    case 'generated_by':
      reasoning = `오늘의 ${tName}이 ${uName}을 생(生)하여 기운을 받는 날입니다. 흐름이 좋으니 ${uName} 번호를 중심으로 구성했습니다.`;
      break;
    case 'overcomes':
      reasoning = `${uName}이 오늘의 ${tName}을 극(克)하는 날입니다. 의지가 강하게 발휘되는 날로 ${uName} 번호 중심으로 뽑았습니다.`;
      break;
    case 'overcome_by':
      reasoning = `오늘의 ${tName}이 ${uName}을 극(克)하는 날입니다. 균형을 맞추기 위해 ${tName}을 누르는 ${bName} 번호를 보강했습니다.`;
      break;
  }

  return { userLine, todayLine, reasoning };
}

// ── 난수 & 풀 생성 ────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash, 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getTodayKey(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function ballColor(n: number): string {
  if (n <= 10) return '#fbc400';
  if (n <= 20) return '#69c8f2';
  if (n <= 30) return '#ff7272';
  if (n <= 40) return '#aaaaaa';
  return '#b0d840';
}

type LotteryResult = {
  pool: number[];
  comboA: number[];
  comboB: number[];
  primaryElement: string;
  todayElement: string;
  elementWeights: Record<string, number>;
  balanceElement: string | null;
};

function buildPool(
  weightMap: Record<string, number>,
  rand: () => number,
): { pool: number[]; comboA: number[]; comboB: number[] } {
  const pool: number[] = [];
  for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
    const weight = weightMap[el] ?? 1;
    const nums = ELEMENT_NUMBERS[el];
    for (let i = 0; i < weight; i++) {
      pool.push(nums[Math.floor(rand() * nums.length)]);
    }
  }

  const set = new Set(pool);
  while (set.size < 7) set.add(Math.floor(rand() * 45) + 1);

  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const pool7 = arr.slice(0, 7).sort((a, b) => a - b);
  return { pool: pool7, comboA: pool7.slice(0, 6), comboB: pool7.slice(1, 7) };
}

function getYearElement(year: number): string {
  const mod = ((year % 10) + 10) % 10;
  if (mod === 4 || mod === 5) return 'wood';
  if (mod === 6 || mod === 7) return 'fire';
  if (mod === 8 || mod === 9) return 'earth';
  if (mod === 0 || mod === 1) return 'metal';
  return 'water';
}

function getMonthElement(month: number): string {
  const map: Record<number, string> = {
    1: 'wood', 2: 'wood', 3: 'earth',
    4: 'fire', 5: 'fire', 6: 'earth',
    7: 'metal', 8: 'metal', 9: 'earth',
    10: 'water', 11: 'water', 12: 'earth',
  };
  return map[month];
}

function generateNumbers(year: number, month: number, day: number): LotteryResult {
  const todayElement = getTodayElement();
  const primary = getYearElement(year);
  const secondary = getMonthElement(month);
  const balance = getBalanceElement(primary, todayElement);

  const baseWeights: Record<string, number> = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  baseWeights[primary] += 4;
  if (secondary !== primary) baseWeights[secondary] += 2;
  if (balance) baseWeights[balance] = (baseWeights[balance] ?? 1) + 2;

  const birthSeed = year * 10000 + month * 100 + day;
  const seed = birthSeed ^ (getTodayKey() * 1000003);
  const rand = seededRandom(seed);
  const { pool, comboA, comboB } = buildPool(baseWeights, rand);

  return { pool, comboA, comboB, primaryElement: primary, todayElement, elementWeights: baseWeights, balanceElement: balance };
}

function generateNumbersFromProfile(
  profileId: string,
  elements: ProfileResponse['elements'],
): LotteryResult {
  const todayElement = getTodayElement();
  const sortedEntries = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const primary = sortedEntries[0][0];
  const balance = getBalanceElement(primary, todayElement);

  const weightMap: Record<string, number> = {
    wood: Math.max(1, elements.wood),
    fire: Math.max(1, elements.fire),
    earth: Math.max(1, elements.earth),
    metal: Math.max(1, elements.metal),
    water: Math.max(1, elements.water),
  };
  if (balance) weightMap[balance] = (weightMap[balance] ?? 1) + 2;

  const seed = hashString(profileId) ^ (getTodayKey() * 1000003);
  const rand = seededRandom(seed);
  const { pool, comboA, comboB } = buildPool(weightMap, rand);

  return { pool, comboA, comboB, primaryElement: primary, todayElement, elementWeights: weightMap, balanceElement: balance };
}

// ── UI 컴포넌트 ───────────────────────────────────────────

function ElementBars({ weights }: { weights: Record<string, number> }) {
  const order = ['wood', 'fire', 'earth', 'metal', 'water'];
  const max = Math.max(...Object.values(weights));
  return (
    <div className={styles.elementBars}>
      {order.map((el) => {
        const pct = Math.round((weights[el] / max) * 100);
        return (
          <div key={el} className={styles.elementRow}>
            <span className={styles.elementLabel}>{ELEMENT_NAMES[el]}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${pct}%`, backgroundColor: ELEMENT_COLOR[el] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

const SESSION_KEY = 'saju_lottery_birth';
type BirthForm = { year: string; month: string; day: string };

function LotteryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<BirthForm>({ year: '', month: '', day: '' });
  const [result, setResult] = useState<LotteryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const profileId = searchParams.get('profile_id');

    if (profileId) {
      setProfileLoading(true);
      getProfile(profileId)
        .then((profile) => {
          try {
            const saved = sessionStorage.getItem(SESSION_KEY);
            if (saved) setForm(JSON.parse(saved) as BirthForm);
          } catch { /* ignore */ }
          setResult(generateNumbersFromProfile(profileId, profile.elements));
        })
        .catch(() => { /* fall through to form */ })
        .finally(() => setProfileLoading(false));
      return;
    }

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BirthForm;
        if (parsed.year && parsed.month && parsed.day) {
          setForm(parsed);
          setResult(generateNumbers(parseInt(parsed.year), parseInt(parsed.month), parseInt(parsed.day)));
        }
      }
    } catch { /* ignore */ }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.year || !form.month || !form.day) return;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(form)); } catch { /* ignore */ }
    setResult(generateNumbers(parseInt(form.year), parseInt(form.month), parseInt(form.day)));
  };

  const handleReset = () => {
    if (searchParams.get('profile_id')) {
      router.push('/');
    } else {
      setResult(null);
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const text = [
      `🎰 ${today} 사주 행운 번호`,
      form.year
        ? `${form.year}년생 ${ELEMENT_NAMES[result.primaryElement]} ${ELEMENT_DESC[result.primaryElement]}`
        : `${ELEMENT_NAMES[result.primaryElement]} ${ELEMENT_DESC[result.primaryElement]}`,
      '',
      `추천 조합: ${result.comboA.join(' · ')}`,
      '',
      'sajuhae.com/lottery 에서 내 번호 뽑기',
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fallthrough */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
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

  if (profileLoading) {
    return (
      <div className={styles.container}>
        <SiteHeader />
        <main className={styles.main}>
          <p className={styles.loadingText}>사주 오행을 불러오는 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SiteHeader />

      <main className={styles.main}>
        {!result ? (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.title}>사주 행운 번호</h1>
              <p className={styles.subtitle}>생년월일의 오행 기운으로 이번 주 행운 번호를 뽑아드립니다.</p>
            </div>

            <Card className={styles.formCard}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>생년월일</label>
                  <div className={styles.dateRow}>
                    <div className={styles.selectWrapper}>
                      <SelectBox options={yearOptions} value={form.year} onChange={(v) => setForm((p) => ({ ...p, year: v }))} placeholder="연도" />
                    </div>
                    <div className={styles.selectWrapper}>
                      <SelectBox options={monthOptions} value={form.month} onChange={(v) => setForm((p) => ({ ...p, month: v }))} placeholder="월" />
                    </div>
                    <div className={styles.selectWrapper}>
                      <SelectBox options={dayOptions} value={form.day} onChange={(v) => setForm((p) => ({ ...p, day: v }))} placeholder="일" />
                    </div>
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" className={styles.submitBtn} disabled={!form.year || !form.month || !form.day}>
                  행운 번호 보기
                </Button>
              </form>
            </Card>
          </>
        ) : (() => {
          const explanation = buildExplanation(result.primaryElement, result.todayElement, result.balanceElement);
          return (
            <>
              <div className={styles.pageHeader}>
                <p className={styles.eyebrow}>
                  {form.year ? `${form.year}년생 · ` : ''}{ELEMENT_NAMES[result.primaryElement]}
                </p>
                <h1 className={styles.title}>오늘의 행운 번호</h1>
              </div>

              {/* 오행 설명 카드 */}
              <Card className={styles.explanationCard}>
                <p className={styles.sectionLabel}>오행 분석</p>
                <ElementBars weights={result.elementWeights} />

                <div className={styles.todayRow}>
                  <span className={styles.todayLabel}>오늘의 기운</span>
                  <span className={styles.todayBadge} style={{ backgroundColor: ELEMENT_COLOR[result.todayElement] }}>
                    {ELEMENT_NAMES[result.todayElement]}
                  </span>
                  <span className={styles.todayDesc}>{ELEMENT_DESC[result.todayElement]}</span>
                </div>

                <p className={styles.explanationText}>{explanation.reasoning}</p>
              </Card>

              {/* 번호 풀 */}
              <Card className={styles.resultCard}>
                <p className={styles.poolLabel}>행운 번호 풀</p>
                <div className={styles.ballRow}>
                  {result.pool.map((n) => (
                    <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>{n}</div>
                  ))}
                </div>
              </Card>

              <div className={styles.combos}>
                <Card className={styles.comboCard}>
                  <p className={styles.comboLabel}>추천 조합 A</p>
                  <div className={styles.ballRow}>
                    {result.comboA.map((n) => (
                      <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>{n}</div>
                    ))}
                  </div>
                </Card>

                <Card className={styles.comboCard}>
                  <p className={styles.comboLabel}>추천 조합 B</p>
                  <div className={styles.ballRow}>
                    {result.comboB.map((n) => (
                      <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>{n}</div>
                    ))}
                  </div>
                </Card>
              </div>

              <p className={styles.notice}>오늘의 번호입니다. 내일 다시 확인하면 새 번호를 뽑아드립니다.</p>

              <div className={styles.actions}>
                <Button variant="secondary" size="md" onClick={handleShare}>
                  {copied ? '복사됨!' : '공유하기'}
                </Button>
                <Button variant="ghost" size="md" onClick={handleReset}>
                  다시 입력
                </Button>
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}

export default function LotteryClient() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <SiteHeader />
        <main className={styles.main}>
          <p className={styles.loadingText}>불러오는 중...</p>
        </main>
      </div>
    }>
      <LotteryContent />
    </Suspense>
  );
}
