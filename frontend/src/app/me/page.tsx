'use client';

import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
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
  const [profileStreamTitle, setProfileStreamTitle] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [fortuneByTab, setFortuneByTab] = useState<FortuneMap>({});
  const [fortuneStreamTextByTab, setFortuneStreamTextByTab] = useState<FortuneStreamTextMap>({});
  const [fortuneStreamLoadingByTab, setFortuneStreamLoadingByTab] = useState<FortuneStreamLoadingMap>({});
  const [fortuneStreamErrorByTab, setFortuneStreamErrorByTab] = useState<FortuneStreamErrorMap>({});
  const [fortuneStreamTitleByTab, setFortuneStreamTitleByTab] = useState<Partial<Record<FortuneTabId, string>>>({});

  const profileStreamLoadingRef = useRef(profileStreamLoading);
  const fortuneStreamLoadingByTabRef = useRef(fortuneStreamLoadingByTab);
  const profileStreamQueueRef = useRef('');
  const profileTypewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingProfileResultRef = useRef<StreamDonePayload | null>(null);
  const fortuneStreamQueueByTabRef = useRef<Partial<Record<FortuneTabId, string>>>({});
  const fortuneTypewriterByTabRef = useRef<Partial<Record<FortuneTabId, ReturnType<typeof setInterval>>>>({});
  const pendingFortuneResultByTabRef = useRef<Partial<Record<FortuneTabId, StreamDonePayload>>>({});

  profileStreamLoadingRef.current = profileStreamLoading;
  fortuneStreamLoadingByTabRef.current = fortuneStreamLoadingByTab;

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
    if (!profile || activeTab !== 'profile' || profileStreamResult || profileStreamLoadingRef.current) {
      return;
    }
    profileStreamLoadingRef.current = true; // synchronous guard — prevents StrictMode double-fire

    const controller = new AbortController();
    profileStreamQueueRef.current = '';
    pendingProfileResultRef.current = null;
    setProfileStreamText('');
    setProfileStreamTitle(null);
    setProfileStreamError(null);
    setProfileStreamLoading(true);

    // Typewriter: drain queue at ~60 chars/sec regardless of SSE delivery speed
    const CHARS_PER_TICK = 3;
    const TICK_MS = 50;
    profileTypewriterRef.current = setInterval(() => {
      const queue = profileStreamQueueRef.current;
      if (queue.length > 0) {
        const chunk = queue.slice(0, CHARS_PER_TICK);
        profileStreamQueueRef.current = queue.slice(CHARS_PER_TICK);
        setProfileStreamText((prev) => prev + chunk);
      } else if (pendingProfileResultRef.current) {
        // Queue drained and done payload waiting — finalize
        const pending = pendingProfileResultRef.current;
        pendingProfileResultRef.current = null;
        if (profileTypewriterRef.current) {
          clearInterval(profileTypewriterRef.current);
          profileTypewriterRef.current = null;
        }
        setProfileStreamResult(pending);
        setProfileStreamLoading(false);
        profileStreamLoadingRef.current = false;
      }
    }, TICK_MS);

    void streamRead(
      {
        profile_id: profile.profile_id,
        feature_type: 'profile_detail',
        period_key: currentWeekKey,
      },
      {
        onTitle: (title) => {
          setProfileStreamTitle(title);
        },
        onDelta: (text) => {
          profileStreamQueueRef.current += text;
        },
        onDone: (donePayload) => {
          // Don't finalize yet — let typewriter drain the queue first
          pendingProfileResultRef.current = donePayload;
        },
        onError: (message) => {
          if (profileTypewriterRef.current) {
            clearInterval(profileTypewriterRef.current);
            profileTypewriterRef.current = null;
          }
          setProfileStreamError(message);
          setProfileStreamLoading(false);
          profileStreamLoadingRef.current = false;
        },
      },
      controller.signal,
    )
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (profileTypewriterRef.current) {
            clearInterval(profileTypewriterRef.current);
            profileTypewriterRef.current = null;
          }
          setProfileStreamError(err instanceof Error ? err.message : '스트리밍 호출에 실패했습니다.');
          profileStreamLoadingRef.current = false;
        }
      })
      .finally(() => {
        setProfileStreamLoading(false);
      });

    return () => {
      controller.abort();
      if (profileTypewriterRef.current) {
        clearInterval(profileTypewriterRef.current);
        profileTypewriterRef.current = null;
      }
      profileStreamLoadingRef.current = false; // synchronous reset on cleanup
    };
  }, [activeTab, currentWeekKey, profile, profileStreamResult]);

  useEffect(() => {
    if (!profile || !['week', 'money', 'love', 'work'].includes(activeTab)) {
      return;
    }

    const key = activeTab as FortuneTabId;
    if (fortuneByTab[key] || fortuneStreamLoadingByTabRef.current[key]) {
      return;
    }
    fortuneStreamLoadingByTabRef.current = { ...fortuneStreamLoadingByTabRef.current, [key]: true };

    const CHARS_PER_TICK = 3;
    const TICK_MS = 50;

    const controller = new AbortController();
    fortuneStreamQueueByTabRef.current = { ...fortuneStreamQueueByTabRef.current, [key]: '' };
    pendingFortuneResultByTabRef.current = { ...pendingFortuneResultByTabRef.current };
    delete pendingFortuneResultByTabRef.current[key];
    setFortuneStreamTextByTab((prev) => ({ ...prev, [key]: '' }));
    setFortuneStreamTitleByTab((prev) => ({ ...prev, [key]: undefined }));
    setFortuneStreamErrorByTab((prev) => ({ ...prev, [key]: null }));
    setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: true }));

    fortuneTypewriterByTabRef.current[key] = setInterval(() => {
      const queue = fortuneStreamQueueByTabRef.current[key] ?? '';
      if (queue.length > 0) {
        const chunk = queue.slice(0, CHARS_PER_TICK);
        fortuneStreamQueueByTabRef.current[key] = queue.slice(CHARS_PER_TICK);
        setFortuneStreamTextByTab((prev) => ({ ...prev, [key]: (prev[key] ?? '') + chunk }));
      } else if (pendingFortuneResultByTabRef.current[key]) {
        const pending = pendingFortuneResultByTabRef.current[key]!;
        delete pendingFortuneResultByTabRef.current[key];
        if (fortuneTypewriterByTabRef.current[key]) {
          clearInterval(fortuneTypewriterByTabRef.current[key]);
          delete fortuneTypewriterByTabRef.current[key];
        }
        setFortuneByTab((prev) => ({ ...prev, [key]: pending.result_json }));
        setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: false }));
        fortuneStreamLoadingByTabRef.current = { ...fortuneStreamLoadingByTabRef.current, [key]: false };
      }
    }, TICK_MS);

    void streamRead(
      {
        profile_id: profile.profile_id,
        feature_type: FEATURE_MAP[key],
        period_key: currentWeekKey,
      },
      {
        onTitle: (title) => {
          setFortuneStreamTitleByTab((prev) => ({ ...prev, [key]: title }));
        },
        onDelta: (text) => {
          fortuneStreamQueueByTabRef.current[key] = (fortuneStreamQueueByTabRef.current[key] ?? '') + text;
        },
        onDone: (payload) => {
          pendingFortuneResultByTabRef.current[key] = payload;
        },
        onError: (message) => {
          if (fortuneTypewriterByTabRef.current[key]) {
            clearInterval(fortuneTypewriterByTabRef.current[key]);
            delete fortuneTypewriterByTabRef.current[key];
          }
          setFortuneStreamErrorByTab((prev) => ({ ...prev, [key]: message }));
          setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: false }));
          fortuneStreamLoadingByTabRef.current = { ...fortuneStreamLoadingByTabRef.current, [key]: false };
        },
      },
      controller.signal,
    )
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (fortuneTypewriterByTabRef.current[key]) {
            clearInterval(fortuneTypewriterByTabRef.current[key]);
            delete fortuneTypewriterByTabRef.current[key];
          }
          setFortuneStreamErrorByTab((prev) => ({
            ...prev,
            [key]: err instanceof Error ? err.message : '운세를 불러오지 못했습니다.',
          }));
          fortuneStreamLoadingByTabRef.current = { ...fortuneStreamLoadingByTabRef.current, [key]: false };
        }
      })
      .finally(() => {
        setFortuneStreamLoadingByTab((prev) => ({ ...prev, [key]: false }));
      });

    return () => {
      controller.abort();
      if (fortuneTypewriterByTabRef.current[key]) {
        clearInterval(fortuneTypewriterByTabRef.current[key]);
        delete fortuneTypewriterByTabRef.current[key];
      }
      fortuneStreamLoadingByTabRef.current = { ...fortuneStreamLoadingByTabRef.current, [key]: false };
    };
  }, [activeTab, currentWeekKey, fortuneByTab, profile]);

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
      <SiteHeader />

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
              streamTitle={profileStreamTitle}
            />
          )}
          {['week', 'money', 'love', 'work'].includes(activeTab) && (
            <FortuneTab
              data={currentFortune ?? null}
              streamText={fortuneStreamTextByTab[activeTab as FortuneTabId] ?? ''}
              streamTitle={fortuneStreamTitleByTab[activeTab as FortuneTabId] ?? null}
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
        <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
      </div>
    }>
      <MySajuHub />
    </Suspense>
  );
}
