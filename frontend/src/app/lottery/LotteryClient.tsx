'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SelectBox } from '@/components/ui/SelectBox';
import { SiteHeader } from '@/components/SiteHeader';
import styles from './page.module.css';

// 오행 → 1~45 숫자 대응
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

function ballColor(n: number): string {
  if (n <= 10) return '#fbc400';
  if (n <= 20) return '#69c8f2';
  if (n <= 30) return '#ff7272';
  if (n <= 40) return '#aaaaaa';
  return '#b0d840';
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
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

type LotteryResult = {
  pool: number[];
  comboA: number[];
  comboB: number[];
  primaryElement: string;
};

function getTodayKey(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function generateNumbers(year: number, month: number, day: number): LotteryResult {
  const primaryElement = getYearElement(year);
  const secondaryElement = getMonthElement(month);

  const birthSeed = year * 10000 + month * 100 + day;
  const todaySeed = getTodayKey();
  const seed = birthSeed ^ (todaySeed * 1000003);
  const rand = seededRandom(seed);

  const weightMap: Record<string, number> = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
  weightMap[primaryElement] += 4;
  if (secondaryElement !== primaryElement) {
    weightMap[secondaryElement] += 2;
  }

  const pool: number[] = [];
  for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
    const weight = weightMap[el];
    const nums = ELEMENT_NUMBERS[el];
    for (let i = 0; i < weight; i++) {
      pool.push(nums[Math.floor(rand() * nums.length)]);
    }
  }

  const set = new Set(pool);
  while (set.size < 7) {
    set.add(Math.floor(rand() * 45) + 1);
  }

  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const pool7 = arr.slice(0, 7).sort((a, b) => a - b);

  return {
    pool: pool7,
    comboA: pool7.slice(0, 6),
    comboB: pool7.slice(1, 7),
    primaryElement,
  };
}

const SESSION_KEY = 'saju_lottery_birth';

type BirthForm = { year: string; month: string; day: string };

export default function LotteryClient() {
  const [form, setForm] = useState<BirthForm>({ year: '', month: '', day: '' });
  const [result, setResult] = useState<LotteryResult | null>(null);
  const [copied, setCopied] = useState(false);

  // sessionStorage에서 생년월일 불러오기
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BirthForm;
        if (parsed.year && parsed.month && parsed.day) {
          setForm(parsed);
          setResult(generateNumbers(
            parseInt(parsed.year),
            parseInt(parsed.month),
            parseInt(parsed.day),
          ));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.year || !form.month || !form.day) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
    setResult(generateNumbers(parseInt(form.year), parseInt(form.month), parseInt(form.day)));
  };

  const handleReset = () => {
    setResult(null);
    setCopied(false);
  };

  const handleShare = async () => {
    if (!result) return;
    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const text = [
      `🎰 ${today} 사주 행운 번호`,
      `${form.year}년생 ${ELEMENT_NAMES[result.primaryElement]} ${ELEMENT_DESC[result.primaryElement]}`,
      '',
      `추천 조합: ${result.comboA.join(' · ')}`,
      '',
      'sajuhae.com/lottery 에서 내 번호 뽑기',
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
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
                      <SelectBox
                        options={yearOptions}
                        value={form.year}
                        onChange={(v) => setForm((p) => ({ ...p, year: v }))}
                        placeholder="연도"
                      />
                    </div>
                    <div className={styles.selectWrapper}>
                      <SelectBox
                        options={monthOptions}
                        value={form.month}
                        onChange={(v) => setForm((p) => ({ ...p, month: v }))}
                        placeholder="월"
                      />
                    </div>
                    <div className={styles.selectWrapper}>
                      <SelectBox
                        options={dayOptions}
                        value={form.day}
                        onChange={(v) => setForm((p) => ({ ...p, day: v }))}
                        placeholder="일"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className={styles.submitBtn}
                  disabled={!form.year || !form.month || !form.day}
                >
                  행운 번호 뽑기
                </Button>
              </form>
            </Card>
          </>
        ) : (
          <>
            <div className={styles.pageHeader}>
              <p className={styles.eyebrow}>{form.year}년생 · {ELEMENT_NAMES[result.primaryElement]}</p>
              <h1 className={styles.title}>오늘의 행운 번호</h1>
              <p className={styles.subtitle}>{ELEMENT_DESC[result.primaryElement]}이 깃든 오늘의 번호입니다.</p>
            </div>

            <Card className={styles.resultCard}>
              <p className={styles.poolLabel}>행운 번호 풀</p>
              <div className={styles.ballRow}>
                {result.pool.map((n) => (
                  <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>
                    {n}
                  </div>
                ))}
              </div>
            </Card>

            <div className={styles.combos}>
              <Card className={styles.comboCard}>
                <p className={styles.comboLabel}>추천 조합 A</p>
                <div className={styles.ballRow}>
                  {result.comboA.map((n) => (
                    <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>
                      {n}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className={styles.comboCard}>
                <p className={styles.comboLabel}>추천 조합 B</p>
                <div className={styles.ballRow}>
                  {result.comboB.map((n) => (
                    <div key={n} className={styles.ball} style={{ backgroundColor: ballColor(n) }}>
                      {n}
                    </div>
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
        )}
      </main>
    </div>
  );
}
