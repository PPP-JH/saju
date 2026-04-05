import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import styles from '../article.module.css';

const types = [
    {
        name: '비겁 (比劫)',
        sub: '비견 + 겁재 — 일간과 오행이 같은 것',
        desc: '독립심과 자기주장이 강합니다. 타인의 시선보다 자신의 기준으로 움직이고, 경쟁과 도전을 즐깁니다. 비겁이 강하면 자기주도적이지만 고집이 세고 협력이 어려울 수 있습니다.',
        tags: ['독립', '승부사', '자존심', '주도성'],
    },
    {
        name: '식상 (食傷)',
        sub: '식신 + 상관 — 일간이 생(生)하는 오행',
        desc: '표현욕과 창의력이 핵심입니다. 식신은 온화한 창작자(요리·예술·교육), 상관은 날카로운 혁신가(비판·개혁·퍼포먼스)입니다. 식상이 강하면 언변과 감성이 뛰어나지만 감정 기복이 있을 수 있습니다.',
        tags: ['창의력', '표현력', '예술', '언변'],
    },
    {
        name: '재성 (財星)',
        sub: '정재 + 편재 — 일간이 극(剋)하는 오행',
        desc: '현실 감각과 실행력이 강합니다. 정재는 성실한 저축형, 편재는 기회를 포착하는 사업형입니다. 재성이 강하면 결과 지향적이고 목표 달성 능력이 뛰어나지만, 지나치면 물질에 집착하거나 쉽게 지칩니다.',
        tags: ['현실감각', '실천력', '재물', '통제력'],
    },
    {
        name: '관성 (官星)',
        sub: '정관 + 편관 — 일간을 극(剋)하는 오행',
        desc: '책임감과 사회 규범을 중시합니다. 정관은 원칙·품위 지향의 엘리트형, 편관(칠살)은 강한 추진력과 카리스마를 가진 리더형입니다. 관성이 강하면 신뢰를 얻지만 스스로에게 지나치게 엄격해지기 쉽습니다.',
        tags: ['책임감', '규율', '명예', '리더십'],
    },
    {
        name: '인성 (印星)',
        sub: '정인 + 편인 — 일간을 생(生)하는 오행',
        desc: '학습욕과 사색을 즐깁니다. 정인은 학문·교육을 사랑하는 안정 지향형, 편인은 독특한 관점을 가진 비주류 천재형입니다. 인성이 강하면 깊이 있는 사고를 하지만 의존심이 높아질 수 있습니다.',
        tags: ['학습욕', '사색', '수용성', '명예'],
    },
];

export default function LearnTenGods() {
    return (
        <div className={styles.container}>
            <SiteHeader />
            <main className={styles.main}>
                <Link href="/learn" className={styles.backLink}>← 사주 상식으로</Link>

                <div className={styles.hero}>
                    <p className={styles.eyebrow}>사주 상식 03</p>
                    <h1 className={styles.title}>내 안의 숨겨진 성격</h1>
                    <p className={styles.lead}>
                        십성(十星)은 일간(나)과 나머지 7글자의 관계를 10가지로 분류한 것입니다.
                        MBTI처럼 나의 사회적 캐릭터를 보여주지만, 그 관계의 '로직'까지 설명합니다.
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>왜 10가지인가</h2>
                    <div className={styles.body}>
                        <p>
                            오행(목·화·토·금·수)은 생(生)하거나, 극(剋)하거나, 같거나의 세 관계를 맺습니다.
                            일간을 기준으로 나머지 글자가 어떤 오행인지, 그리고 음양이 같은지 다른지에 따라
                            성질이 달라져 총 10가지가 됩니다.
                        </p>
                        <p>
                            이 10가지를 성질이 가까운 것끼리 묶으면 5개 그룹(비겁·식상·재성·관성·인성)이 됩니다.
                            사주에서 어느 그룹이 강하게 나타나느냐가 그 사람의 기질 패턴을 결정합니다.
                        </p>
                    </div>
                </div>

                <div className={styles.callout}>
                    같은 그룹 안에서도 일간과 음양이 같으면 "편(偏, 강렬하고 치우친)", 다르면 "정(正, 균형 잡힌)"으로 나뉩니다.
                    예: 정관은 원칙을 지키는 엘리트형, 편관(칠살)은 카리스마 넘치는 돌파형.
                </div>

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>5가지 유형</h2>
                    <div className={styles.typeGrid}>
                        {types.map((t) => (
                            <div key={t.name} className={styles.typeCard}>
                                <div className={styles.typeHeader}>
                                    <span className={styles.typeName}>{t.name}</span>
                                    <span className={styles.typeSub}>{t.sub}</span>
                                </div>
                                <p className={styles.typeDesc}>{t.desc}</p>
                                <div>
                                    {t.tags.map((tag) => (
                                        <span key={tag} className={styles.typeTag}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>MBTI와 무엇이 다른가</h2>
                    <div className={styles.body}>
                        <p>
                            MBTI는 현재 드러나는 성향을 4가지 축으로 분류합니다.
                            십성은 그 성향이 어디서 오는지 — 오행의 생극 관계라는 로직 — 을 함께 설명합니다.
                        </p>
                        <p>
                            또한 8글자 조합은 이론상 수십만 가지 이상이라 개인별 유형이 훨씬 세밀합니다.
                            단순히 "나는 관성형"이 아니라, "관성이 강하고 식상이 약한 조합"처럼
                            복합적인 패턴으로 읽힙니다.
                        </p>
                        <p>
                            강한 십성이 반드시 강점은 아닙니다. 과잉되면 단점으로 나타납니다.
                            관성 과다는 규범 집착으로, 식상 과다는 감정 소모로 이어질 수 있습니다.
                            균형 상태가 건강한 발현입니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
