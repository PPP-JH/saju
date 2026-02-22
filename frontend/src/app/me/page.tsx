'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getCurrentWeekKey,
  getProfile,
  streamRead,
  type ProfileResponse,
  type ReadResult,
  type StreamDonePayload,
} from '@/lib/api';
import styles from './page.module.css';

import ProfileTab from './tabs/ProfileTab';
import FortuneTab from './tabs/FortuneTab';

type TabId = 'profile' | 'week' | 'money' | 'love' | 'work' | 'learn';
type FortuneTabId = 'week' | 'money' | 'love' | 'work';

type FortuneMap = Partial<Record<FortuneTabId, ReadResult>>;
type FortuneStreamTextMap = Partial<Record<FortuneTabId, string>>;
type FortuneStreamLoadingMap = Partial<Record<FortuneTabId, boolean>>;
type FortuneStreamErrorMap = Partial<Record<FortuneTabId, string | null>>;

const FEATURE_MAP: Record<FortuneTabId, string> = {
  week: 'week',
  money: 'money_week',
  love: 'love_week',
  work: 'work_week',
};

function MySajuHub() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStreamText, setProfileStreamText] = useState('');
  const [profileStreamLoading, setProfileStreamLoading] = useState(false);
  const [profileStreamError, setProfileStreamError] = useState<string | null>(null);
  const [profileStreamResult, setProfileStreamResult] = useState<StreamDonePayload | null>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [fortuneByTab, setFortuneByTab] = useState<FortuneMap>({});
  const [fortuneStreamTextByTab, setFortuneStreamTextByTab] = useState<FortuneStreamTextMap>({});
  const [fortuneStreamLoadingByTab, setFortuneStreamLoadingByTab] = useState<FortuneStreamLoadingMap>({});
  const [fortuneStreamErrorByTab, setFortuneStreamErrorByTab] = useState<FortuneStreamErrorMap>({});

  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);

      const queryProfileId = searchParams.get('profile_id');
      const savedProfileId = typeof window !== 'undefined' ? localStorage.getItem('saju_profile_id') : null;
      const profileId = queryProfileId ?? savedProfileId;

      if (!profileId) {
        setProfileError('프로필 정보가 없습니다. 입력 페이지에서 먼저 사주를 생성해주세요.');
        setLoadingProfile(false);
        return;
      }

      try {
        const data = await getProfile(profileId);
        setProfile(data);
        localStorage.setItem('saju_profile_id', profileId);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : '프로필 조회에 실패했습니다.');
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [searchParams]);

  useEffect(() => {
    if (!profile || activeTab !== 'profile' || profileStreamResult || profileStreamLoading) {
      return;
    }

    const controller = new AbortController();
    setProfileStreamText('');
    setProfileStreamError(null);
    setProfileStreamLoading(true);

    void streamRead(
      {
        profile_id: profile.profile_id,
        feature_type: 'profile_detail',
        period_key: currentWeekKey,
      },
      {
        onDelta: (text) => {
          setProfileStreamText((prev) => prev + text);
        },
        onDone: (donePayload) => {
          setProfileStreamResult(donePayload);
          setProfileStreamLoading(false);
        },
        onError: (message) => {
          setProfileStreamError(message);
        },
      },
      controller.signal,
    )
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        setProfileStreamError(err instanceof Error ? err.message : '스트리밍 호출에 실패했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProfileStreamLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeTab, currentWeekKey, profile, profileStreamLoading, profileStreamResult]);

  useEffect(() => {
    if (!profile || !['week', 'money', 'love', 'work'].includes(activeTab)) {
      return;
    }

    const key = activeTab as FortuneTabId;
    if (fortuneByTab[key] || fortuneStreamLoadingByTab[key]) {
      return;
    }

    const controller = new AbortController();
    setFortuneStreamTextByTab((prev) => ({ ...prev, [key]: '' }));
    setFortuneStreamErrorByTab((prev) => ({ ...prev, [key]: null }));
    setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: true }));

    void streamRead(
      {
        profile_id: profile.profile_id,
        feature_type: FEATURE_MAP[key],
        period_key: currentWeekKey,
      },
      {
        onDelta: (text) => {
          setFortuneStreamTextByTab((prev) => ({
            ...prev,
            [key]: (prev[key] ?? '') + text,
          }));
        },
        onDone: (payload) => {
          setFortuneByTab((prev) => ({
            ...prev,
            [key]: payload.result_json,
          }));
          setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: false }));
        },
        onError: (message) => {
          setFortuneStreamErrorByTab((prev) => ({ ...prev, [key]: message }));
        },
      },
      controller.signal,
    )
      .catch((err) => {
        if (!controller.signal.aborted) {
          setFortuneStreamErrorByTab((prev) => ({
            ...prev,
            [key]: err instanceof Error ? err.message : '운세를 불러오지 못했습니다.',
          }));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: false }));
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeTab, currentWeekKey, fortuneByTab, fortuneStreamLoadingByTab, profile]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: '사주 풀이' },
    { id: 'week', label: '이번 주' },
    { id: 'money', label: '재물운' },
    { id: 'love', label: '애정운' },
    { id: 'work', label: '직장운' },
    { id: 'learn', label: '사주 상식' },
  ];

  if (loadingProfile) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.errorText}>{profileError ?? '프로필을 찾을 수 없습니다.'}</p>
        <Link href="/input" className={styles.ctaLink}>사주 입력 페이지로 이동</Link>
      </div>
    );
  }

  const currentFortune = ['week', 'money', 'love', 'work'].includes(activeTab)
    ? fortuneByTab[activeTab as FortuneTabId]
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>사주 허브</Link>
        <button onClick={() => alert('공유하기 기능은 준비 중입니다.')} className={styles.iconBtn}>
          공유
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.summaryHeader}>
          <h1 className={styles.title}>{profile.summary_text}</h1>
          <div className={styles.keywords}>
            {profile.keywords.map((kw, i) => (
              <span key={`${kw}-${i}`} className={styles.chip}>#{kw}</span>
            ))}
          </div>
        </section>

        <nav className={styles.tabNavWrapper}>
          <div className={styles.tabScroll}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => {
                  if (tab.id === 'learn') {
                    router.push('/learn');
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <section className={styles.tabContent}>
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              streamText={profileStreamText}
              streamLoading={profileStreamLoading}
              streamError={profileStreamError}
              streamResult={profileStreamResult?.result_json ?? null}
            />
          )}
          {['week', 'money', 'love', 'work'].includes(activeTab) && (
            <FortuneTab
              data={currentFortune ?? null}
              streamText={fortuneStreamTextByTab[activeTab as FortuneTabId] ?? ''}
              streamLoading={fortuneStreamLoadingByTab[activeTab as FortuneTabId] ?? false}
              streamError={fortuneStreamErrorByTab[activeTab as FortuneTabId] ?? null}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default function MySajuHubPage() {
  return (
    <Suspense fallback={
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
      </div>
    }>
      <MySajuHub />
    </Suspense>
  );
}
