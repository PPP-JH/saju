'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import styles from './page.module.css';

export default function Glossary() {
    const [search, setSearch] = useState('');

    const terms = [
        { title: '간지 (干支)', desc: '천간과 지지. 사주를 표기하는 60갑자의 기본 문자.' },
        { title: '목 (木)', desc: '오행 중 하나. 나무처럼 성장하고 위로 뻗어나가는 기운.' },
        { title: '화 (火)', desc: '오행 중 하나. 불처럼 확산하고 밝고 열정적인 기운.' },
        { title: '토 (土)', desc: '오행 중 하나. 흙처럼 포용하고 중심을 잡는 기운.' },
        { title: '금 (金)', desc: '오행 중 하나. 쇠나 바위처럼 단단하고 결단력 있는 기운.' },
        { title: '수 (水)', desc: '오행 중 하나. 물처럼 유연하고 지혜로우며 스며드는 기운.' },
        { title: '비견 / 겁재', desc: '일간과 오행이 같은 글자. 자존심, 독립, 형제/친구, 주도성을 의미.' },
        { title: '식신 / 상관', desc: '일간이 생(生)하는 글자. 의식주, 표현력, 창의성, 감성을 의미.' },
        { title: '정재 / 편재', desc: '일간이 극(剋)하는 글자. 재물, 결과, 목표 달성 능력, 통제력을 의미.' },
        { title: '정관 / 편관', desc: '일간을 극(剋)하는 글자. 직장, 명예, 책임감, 규율, 인내심을 의미.' },
        { title: '정인 / 편인', desc: '일간을 생(生)하는 글자. 학문, 수용성, 사고력, 자격증, 문서 운을 의미.' },
    ];

    const filteredTerms = terms.filter(t =>
        t.title.includes(search) || t.desc.includes(search)
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>사주 허브</Link>
                <nav className={styles.nav}>
                    <Link href="/me">내 사주</Link>
                    <Link href="/learn">배우기</Link>
                </nav>
            </header>
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>용어 사전</h1>
                    <p className={styles.subtitle}>사주 풀이에 자주 나오는 단어들을 쉽게 찾아보세요.</p>
                </div>

                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="검색어 입력 (예: 재성, 오행)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div className={styles.termList}>
                    {filteredTerms.map((term, i) => (
                        <Card key={i} className={styles.termCard}>
                            <h3 className={styles.termTitle}>{term.title}</h3>
                            <p className={styles.termDesc}>{term.desc}</p>
                        </Card>
                    ))}
                    {filteredTerms.length === 0 && (
                        <div className={styles.empty}>검색 결과가 없습니다.</div>
                    )}
                </div>
            </main>
        </div>
    );
}
