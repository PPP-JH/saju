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
  metal: '#607d8b',
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

// 25가지 조합 설명 텍스트 (사용자 주 오행 × 오늘 오행)
// generates: 보강 오행 = GENERATED_BY[user] / overcome_by: 보강 오행 = OVERCOME_BY[today]
const EXPLANATIONS: Record<string, Record<string, string>> = {
  wood: {
    wood:  '목(木) 기운이 오늘도 겹쳐 성장의 에너지가 두 배가 되는 날입니다. 목 번호 위주로 구성했습니다.',
    fire:  '목(木)은 화(火)를 생(生)합니다. 기운을 내어주는 날이니, 목을 채워주는 수(水) 번호를 더했습니다.',
    earth: '목(木)이 토(土)를 극(克)하는 날입니다. 의지가 강하게 발휘되는 날, 목 번호 위주로 힘차게 구성했습니다.',
    metal: '오늘의 금(金)이 목(木)을 극(克)합니다. 눌리는 기운에 맞서, 금을 제압하는 화(火) 번호를 보강했습니다.',
    water: '오늘의 수(水)가 목(木)을 생(生)합니다. 기운을 받는 날, 충만해진 목 번호를 중심으로 뽑았습니다.',
  },
  fire: {
    wood:  '오늘의 목(木)이 화(火)를 생(生)합니다. 에너지를 받는 날, 화 기운이 더욱 강해집니다. 화 번호 중심으로 구성했습니다.',
    fire:  '화(火) 기운이 오늘도 겹쳐 열정이 두 배로 타오르는 날입니다. 화 번호 위주로 구성했습니다.',
    earth: '화(火)는 토(土)를 생(生)합니다. 기운을 소진하는 날이니, 화를 채워주는 목(木) 번호를 더했습니다.',
    metal: '화(火)가 금(金)을 극(克)하는 날입니다. 단단한 것을 녹이는 힘이 강한 날, 화 번호 위주로 구성했습니다.',
    water: '오늘의 수(水)가 화(火)를 극(克)합니다. 눌리는 기운에 맞서, 수를 막는 토(土) 번호를 보강했습니다.',
  },
  earth: {
    wood:  '오늘의 목(木)이 토(土)를 극(克)합니다. 눌리는 기운에 맞서, 목을 제압하는 금(金) 번호를 보강했습니다.',
    fire:  '오늘의 화(火)가 토(土)를 생(生)합니다. 따뜻한 기운을 받아 토가 더욱 단단해지는 날입니다. 토 번호 중심으로 구성했습니다.',
    earth: '토(土) 기운이 오늘도 겹쳐 안정과 신뢰의 기운이 두 배가 되는 날입니다. 토 번호 위주로 구성했습니다.',
    metal: '토(土)는 금(金)을 생(生)합니다. 결실을 맺어주는 날이니, 토를 채워주는 화(火) 번호를 더했습니다.',
    water: '토(土)가 수(水)를 극(克)하는 날입니다. 흐름을 다스리는 힘이 강한 날, 토 번호 위주로 구성했습니다.',
  },
  metal: {
    wood:  '금(金)이 목(木)을 극(克)하는 날입니다. 날카로운 결단이 빛을 발하는 날, 금 번호 위주로 힘차게 구성했습니다.',
    fire:  '오늘의 화(火)가 금(金)을 극(克)합니다. 눌리는 기운에 맞서, 화를 제압하는 수(水) 번호를 보강했습니다.',
    earth: '오늘의 토(土)가 금(金)을 생(生)합니다. 땅이 금을 품어 기운을 키워주는 날입니다. 금 번호 중심으로 구성했습니다.',
    metal: '금(金) 기운이 오늘도 겹쳐 결단과 집중의 기운이 두 배가 되는 날입니다. 금 번호 위주로 구성했습니다.',
    water: '금(金)은 수(水)를 생(生)합니다. 기운을 내어주는 날이니, 금을 채워주는 토(土) 번호를 더했습니다.',
  },
  water: {
    wood:  '수(水)는 목(木)을 생(生)합니다. 기운을 소진하는 날이니, 수를 채워주는 금(金) 번호를 더했습니다.',
    fire:  '수(水)가 화(火)를 극(克)하는 날입니다. 불을 다스리는 힘이 강한 날, 수 번호 위주로 구성했습니다.',
    earth: '오늘의 토(土)가 수(水)를 극(克)합니다. 눌리는 기운에 맞서, 토를 제압하는 목(木) 번호를 보강했습니다.',
    metal: '오늘의 금(金)이 수(水)를 생(生)합니다. 금이 녹아 물이 되듯 기운을 받는 날입니다. 수 번호 중심으로 구성했습니다.',
    water: '수(水) 기운이 오늘도 겹쳐 지혜와 유연함의 기운이 두 배가 되는 날입니다. 수 번호 위주로 구성했습니다.',
  },
};

function buildExplanation(primary: string, today: string): string {
  return EXPLANATIONS[primary]?.[today] ?? `${ELEMENT_NAMES[primary]} 기운을 중심으로 오늘의 번호를 구성했습니다.`;
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

// 번호 → 오행 매핑 (n%5: 0=토, 1=수, 2=화, 3=목, 4=금)
function getElementForNumber(n: number): string {
  const mod = n % 5;
  if (mod === 0) return 'earth';
  if (mod === 1) return 'water';
  if (mod === 2) return 'fire';
  if (mod === 3) return 'wood';
  return 'metal';
}

type LotteryResult = {
  pool: number[];       // 9개
  comboA: number[];     // 6개 (pool 0-5)
  comboB: number[];     // 6개 (pool 2-7)
  comboC: number[];     // 6개 (pool 3-8)
  primaryElement: string;
  todayElement: string;
  displayWeights: Record<string, number>;  // 바 차트용 (균형 보정 전)
  balanceElement: string | null;
};

// 가중 비복원 샘플링 — 오행 비율이 실제로 번호에 반영됨
function buildPool(
  weightMap: Record<string, number>,
  rand: () => number,
): { pool: number[]; comboA: number[]; comboB: number[]; comboC: number[] } {
  // 1~45 각 번호에 오행 가중치 부여
  const candidates: { n: number; w: number }[] = [];
  for (let n = 1; n <= 45; n++) {
    candidates.push({ n, w: weightMap[getElementForNumber(n)] ?? 1 });
  }

  const picked: number[] = [];
  const remaining = [...candidates];

  for (let i = 0; i < 9; i++) {
    const total = remaining.reduce((s, x) => s + x.w, 0);
    let r = rand() * total;
    let idx = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].w;
      if (r <= 0) { idx = j; break; }
    }
    picked.push(remaining[idx].n);
    remaining.splice(idx, 1);
  }

  const pool = picked.sort((a, b) => a - b);
  return {
    pool,
    comboA: pool.slice(0, 6),
    comboB: pool.slice(2, 8),
    comboC: pool.slice(3, 9),
  };
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

  const displayWeights: Record<string, number> = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  displayWeights[primary] += 4;
  if (secondary !== primary) displayWeights[secondary] += 2;

  const algoWeights = { ...displayWeights };
  if (balance) algoWeights[balance] = (algoWeights[balance] ?? 1) + 2;

  const seed = (year * 10000 + month * 100 + day) ^ (getTodayKey() * 1000003);
  const { pool, comboA, comboB, comboC } = buildPool(algoWeights, seededRandom(seed));

  return { pool, comboA, comboB, comboC, primaryElement: primary, todayElement, displayWeights, balanceElement: balance };
}

function generateNumbersFromProfile(
  profileId: string,
  elements: ProfileResponse['elements'],
): LotteryResult {
  const todayElement = getTodayElement();
  const primary = Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0];
  const balance = getBalanceElement(primary, todayElement);

  const displayWeights: Record<string, number> = {
    wood: Math.max(1, elements.wood),
    fire: Math.max(1, elements.fire),
    earth: Math.max(1, elements.earth),
    metal: Math.max(1, elements.metal),
    water: Math.max(1, elements.water),
  };

  const algoWeights = { ...displayWeights };
  if (balance) algoWeights[balance] = (algoWeights[balance] ?? 1) + 2;

  const seed = hashString(profileId) ^ (getTodayKey() * 1000003);
  const { pool, comboA, comboB, comboC } = buildPool(algoWeights, seededRandom(seed));

  return { pool, comboA, comboB, comboC, primaryElement: primary, todayElement, displayWeights, balanceElement: balance };
}

// ── UI 컴포넌트 ───────────────────────────────────────────

function ElementBars({ weights }: { weights: Record<string, number>}) {
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
          const explanation = buildExplanation(result.primaryElement, result.todayElement);
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
                <ElementBars weights={result.displayWeights} />

                <div className={styles.todayRow}>
                  <span className={styles.todayLabel}>오늘의 기운</span>
                  <span className={styles.todayBadge} style={{ backgroundColor: ELEMENT_COLOR[result.todayElement] }}>
                    {ELEMENT_NAMES[result.todayElement]}
                  </span>
                  <span className={styles.todayDesc}>{ELEMENT_DESC[result.todayElement]}</span>
                </div>

                <p className={styles.explanationText}>{explanation}</p>
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
                {([['A', result.comboA], ['B', result.comboB], ['C', result.comboC]] as [string, number[]][]).map(([label, nums]) => (
                  <Card key={label} className={styles.comboCard}>
                    <p className={styles.comboLabel}>추천 조합 {label}</p>
                    <div className={styles.ballRow}>
                      {nums.map((n) => (
                        <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>{n}</div>
                      ))}
                    </div>
                  </Card>
                ))}
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
