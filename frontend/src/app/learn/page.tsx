'use client';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import styles from './page.module.css';

export default function LearnIndex() {
    const lessons = [
        { id: 'intro', title: '1. 내 사주는 왜 이럴까?', desc: '사주의 원리와 생년월일시가 숨기고 있는 재미있는 비밀들' },
        { id: 'pillars', title: '2. 8글자의 운명 바코드', desc: '네 개의 기둥(사주)과 여덟 개의 글자가 무슨 뜻일까?' },
        { id: 'elements', title: '3. 나무, 불, 물의 티키타카', desc: '내 사주에 물이 많으면? 오행의 상생상극 썰' },
        { id: 'ten-gods', title: '4. 내안의 숨겨진 성격 테스트', desc: '비견, 식상, 재성... 나도 몰랐던 나의 사회적 캐릭터' },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>사주 허브</Link>
                <nav className={styles.nav}>
                    <Link href="/me">내 사주</Link>
                    <Link href="/glossary">용어사전</Link>
                </nav>
            </header>
            <main className={styles.main}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>재미있는 사주 상식</h1>
                    <p className={styles.subtitle}>가볍게 읽고 끄덕이는 사주 이야기. 내 사주의 비밀을 파헤쳐보세요!</p>
                </div>
                <div className={styles.lessonList}>
                    {lessons.map(ls => (
                        <Card key={ls.id} className={styles.lessonCard}>
                            <div className={styles.lessonContent}>
                                <h2 className={styles.lessonTitle}>{ls.title}</h2>
                                <p className={styles.lessonDesc}>{ls.desc}</p>
                            </div>
                            <button className={styles.readBtn} onClick={() => alert('조만간 재미있는 코너가 추가됩니다!')}>읽어보기</button>
                        </Card>
                    ))}
                </div>
                <div className={styles.bottomLink}>
                    궁금한 단어가 있다면 언제든 열어보세요! <Link href="/glossary" className={styles.linkText}>용어사전 보러가기 →</Link>
                </div>
            </main>
        </div>
    );
}
