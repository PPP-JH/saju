'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  createProfile,
  fetchTooltips,
  getCurrentWeekKey,
  getSessionId,
  logEvent,
  streamRead,
  trackDailyVisit,
  type ReadResult,
  type StreamDonePayload,
} from '@/lib/api';
import styles from './page.module.css';

const CHIP_TERMS = [
  '일간', '월간', '일지', '월지', '시지', '년지',
  '비겁', '식상', '재성', '관성', '인성',
  '대운', '세운',
];

function detectTerms(text: string): string[] {
  return CHIP_TERMS.filter((term) => text.includes(term));
}

function renderWithChips(
  text: string,
  onChipClick: (term: string) => void,
): React.ReactNode {
  if (!text) return null;
  const pattern = new RegExp(`(${CHIP_TERMS.join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    CHIP_TERMS.includes(part) ? (
      <button key={i} className={styles.termChip} onClick={() => onChipClick(part)}>
        {part}
      </button>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function parseBirthDate(bd: string): string | null {
  if (!/^\d{8}$/.test(bd)) return null;
  const year = parseInt(bd.slice(0, 4), 10);
  const month = parseInt(bd.slice(4, 6), 10);
  const day = parseInt(bd.slice(6, 8), 10);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) return null;
  return `${bd.slice(0, 4)}-${bd.slice(4, 6)}-${bd.slice(6, 8)}`;
}

type PageState = 'loading' | 'streaming' | 'done' | 'error';

export default function ReadingClient() {
  const searchParams = useSearchParams();

  const bd = searchParams.get('bd') ?? '';
  const bh = searchParams.get('bh') ?? null;
  const g = searchParams.get('g') ?? '';

  const birthDate = parseBirthDate(bd);
  const gender = g === 'M' || g === 'F' ? g : null;
  const birthTime = bh && /^\d{2}$/.test(bh) ? `${bh}:00` : null;
  const paramsValid = birthDate !== null && gender !== null;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<ReadResult | null>(null);
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  const sessionIdRef = useRef('');

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    trackDailyVisit();
  }, []);

  useEffect(() => {
    if (!paramsValid) {
      setPageState('error');
      setErrorMessage('올바르지 않은 URL입니다. 사주 입력 페이지에서 다시 시작해주세요.');
      return;
    }

    const controller = new AbortController();
    const weekKey = getCurrentWeekKey();

    const run = async () => {
      try {
        const profile = await createProfile({
          name: null,
          gender: gender!,
          birth_date: birthDate!,
          birth_time: birthTime,
          is_lunar: false,
        });

        setPageState('streaming');

        await streamRead(
          {
            profile_id: profile.profile_id,
            feature_type: 'week',
            period_key: weekKey,
          },
          {
            onDelta: (text) => {
              setStreamText((prev) => prev + text);
            },
            onDone: async (payload: StreamDonePayload) => {
              setResult(payload.result_json);
              setPageState('done');

              const detected = detectTerms(JSON.stringify(payload.result_json));
              if (detected.length > 0) {
                try {
                  const fetched = await fetchTooltips(profile.profile_id, detected);
                  setTooltips(fetched);
                } catch {
                  // best-effort
                }
              }

              if (sessionIdRef.current) {
                void logEvent({ session_id: sessionIdRef.current, event_type: 'reading_view' });
              }
            },
            onError: (message) => {
              setPageState('error');
              setErrorMessage(message);
            },
          },
          controller.signal,
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setPageState('error');
          setErrorMessage(err instanceof Error ? err.message : '오류가 발생했습니다.');
        }
      }
    };

    void run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChipClick = useCallback((term: string) => {
    setSelectedTerm((prev) => (prev === term ? null : term));
    if (sessionIdRef.current) {
      void logEvent({ session_id: sessionIdRef.current, event_type: 'tooltip_view', term });
    }
  }, []);

  if (pageState === 'error') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo}>사주해</Link>
        </header>
        <main className={styles.main}>
          <div className={styles.centerBox}>
            <p className={styles.errorText}>{errorMessage}</p>
            <Link href="/input" className={styles.ctaLink}>내 사주 입력하기</Link>
          </div>
        </main>
      </div>
    );
  }

  if (pageState === 'loading') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo}>사주해</Link>
        </header>
        <main className={styles.main}>
          <div className={styles.centerBox}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (pageState === 'streaming' || !result) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo}>사주해</Link>
        </header>
        <main className={styles.main}>
          <div className={styles.streamBox}>
            <p className={styles.streamText}>{streamText}<span className={styles.cursor} /></p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>사주해</Link>
      </header>

      <main className={styles.main}>
        <div className={styles.scoreCard}>
          <div className={styles.scoreValue}>{result.score}<span>점</span></div>
          <h1 className={styles.resultTitle}>{result.title}</h1>
          <p className={styles.summaryText}>
            {renderWithChips(result.summary, handleChipClick)}
          </p>
        </div>

        <div className={styles.divider} />

        <h2 className={styles.sectionTitle}>상세 흐름</h2>
        <div className={styles.detailsList}>
          {result.details.map((item, i) => (
            <div key={i} className={styles.detailCard}>
              <div className={styles.detailIndex}>{i + 1}</div>
              <div className={styles.detailContent}>
                <h3 className={styles.detailSubtitle}>{item.subtitle}</h3>
                <p className={styles.detailText}>
                  {renderWithChips(item.content, handleChipClick)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        <h2 className={styles.sectionTitle}>행동 가이드</h2>
        <ul className={styles.actionsList}>
          {result.actions.map((act, i) => (
            <li key={i} className={styles.actionItem}>
              <span className={styles.checkIcon}>✓</span>
              {act}
            </li>
          ))}
        </ul>

        <div className={styles.ctaSection}>
          <p className={styles.ctaHint}>내 사주를 더 자세히 알고 싶으신가요?</p>
          <Link href="/input" className={styles.ctaBtn}>내 사주 보기</Link>
        </div>
      </main>

      {selectedTerm && (
        <div className={styles.overlay} onClick={() => setSelectedTerm(null)}>
          <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h4 className={styles.sheetTerm}>{selectedTerm}</h4>
            {tooltips[selectedTerm] ? (
              <p className={styles.sheetExplanation}>{tooltips[selectedTerm]}</p>
            ) : (
              <p className={styles.sheetLoading}>설명을 불러오는 중...</p>
            )}
            <button className={styles.sheetClose} onClick={() => setSelectedTerm(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
