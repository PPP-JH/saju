'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

import ProfileTab from './tabs/ProfileTab';
import FortuneTab from './tabs/FortuneTab';

type TabId = 'profile' | 'week' | 'money' | 'love' | 'work' | 'learn';

export default function MySajuHub() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock loading data
        const timer = setTimeout(() => {
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const dummyProfile = {
        summary_text: "단단한 나무처럼 흔들림 없는 형세",
        keywords: ["주도성", "성실함", "재물운 강점"]
    };

    const tabs: { id: TabId; label: string }[] = [
        { id: 'profile', label: '사주 풀이' },
        { id: 'week', label: '이번 주' },
        { id: 'money', label: '재물운' },
        { id: 'love', label: '애정운' },
        { id: 'work', label: '직장운' },
        { id: 'learn', label: '더 배우기' },
    ];

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>운명의 지도를 펼치는 중...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>사주 허브</Link>
                <button onClick={() => alert('공유하기 기능은 준비 중입니다.')} className={styles.iconBtn}>
                    공유
                </button>
            </header>

            <main className={styles.main}>
                {/* Summary Header */}
                <section className={styles.summaryHeader}>
                    <h1 className={styles.title}>{dummyProfile.summary_text}</h1>
                    <div className={styles.keywords}>
                        {dummyProfile.keywords.map((kw, i) => (
                            <span key={i} className={styles.chip}>#{kw}</span>
                        ))}
                    </div>
                </section>

                {/* Tabs Navigation */}
                <nav className={styles.tabNavWrapper}>
                    <div className={styles.tabScroll}>
                        {tabs.map(tab => (
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

                {/* Tab Content */}
                <section className={styles.tabContent}>
                    {activeTab === 'profile' && <ProfileTab />}
                    {['week', 'money', 'love', 'work'].includes(activeTab) && (
                        <FortuneTab type={activeTab as 'week' | 'money' | 'love' | 'work'} />
                    )}
                </section>

            </main>
        </div>
    );
}
