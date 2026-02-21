'use client';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import styles from './page.module.css';

export default function LearnIndex() {
    const lessons = [
        { id: 'intro', title: '1. 사주란 무엇인가?', desc: '사주의 기본 개념과 생년월일시의 의미를 알아봅니다.' },
        { id: 'pillars', title: '2. 8자의 비밀, 만세력', desc: '네 개의 기둥(사주)과 여덟 개의 글자가 만들어지는 과정.' },
        { id: 'elements', title: '3. 오행의 상생상극', desc: '목, 화, 토, 금, 수의 성질과 서로 주고받는 영향.' },
        { id: 'ten-gods', title: '4. 사회성 읽기, 십성', desc: '비견, 식상, 재성, 관성, 인성이 의미하는 내 삶의 키워드.' },
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
                    <h1 className={styles.title}>사주 입문 코스</h1>
                    <p className={styles.subtitle}>10분 만에 끝내는 기본 개념. 내 사주를 더 깊이 이해해보세요!</p>
                </div>
                <div className={styles.lessonList}>
                    {lessons.map(ls => (
                        <Card key={ls.id} className={styles.lessonCard}>
                            <div className={styles.lessonContent}>
                                <h2 className={styles.lessonTitle}>{ls.title}</h2>
                                <p className={styles.lessonDesc}>{ls.desc}</p>
                            </div>
                            <button className={styles.readBtn} onClick={() => alert('학습 페이지는 준비 중입니다.')}>학습하기</button>
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
