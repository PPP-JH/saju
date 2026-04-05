import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SiteHeader } from '@/components/SiteHeader';
import styles from './page.module.css';

const lessons = [
    {
        id: 'intro',
        eyebrow: '01',
        title: '내 사주는 왜 이럴까?',
        desc: '사주의 원리와 2,500년의 역사. 생년월일시가 기질을 읽는 도구가 된 이유.',
    },
    {
        id: 'pillars',
        eyebrow: '02',
        title: '8글자의 운명 바코드',
        desc: '4기둥·8글자가 무엇인지, 일간이 왜 기준점인지, 만세력과 절기의 차이.',
    },
    {
        id: 'ten-gods',
        eyebrow: '03',
        title: '내 안의 숨겨진 성격',
        desc: '비겁·식상·재성·관성·인성 — 십성으로 읽는 나의 사회적 캐릭터.',
    },
];

export default function LearnIndex() {
    return (
        <div className={styles.container}>
            <SiteHeader right={
                <nav className={styles.nav}>
                    <Link href="/me">내 사주</Link>
                    <Link href="/glossary">용어사전</Link>
                </nav>
            } />
            <main className={styles.main}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>사주 상식</h1>
                    <p className={styles.subtitle}>명리학의 핵심을 가볍게 읽습니다.</p>
                </div>
                <div className={styles.lessonList}>
                    {lessons.map(ls => (
                        <Link key={ls.id} href={`/learn/${ls.id}`} style={{ display: 'block' }}>
                            <Card className={styles.lessonCard}>
                                <div className={styles.lessonContent}>
                                    <p className={styles.lessonEyebrow}>{ls.eyebrow}</p>
                                    <h2 className={styles.lessonTitle}>{ls.title}</h2>
                                    <p className={styles.lessonDesc}>{ls.desc}</p>
                                </div>
                                <span className={styles.readBtn}>읽기 →</span>
                            </Card>
                        </Link>
                    ))}
                </div>
                <div className={styles.bottomLink}>
                    용어가 궁금하다면 <Link href="/glossary" className={styles.linkText}>용어사전 →</Link>
                </div>
            </main>
        </div>
    );
}
