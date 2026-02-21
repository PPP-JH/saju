import React from 'react';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './tabs.module.css';

export default function ProfileTab() {
    const dummyData = {
        pillars: [
            { name: '시주', top: '신', bottom: '미' },
            { name: '일주', top: '갑', bottom: '자', isMe: true },
            { name: '월주', top: '무', bottom: '인' },
            { name: '년주', top: '경', bottom: '오' },
        ],
        elements: [
            { name: '목', count: 2, color: '#4ade80' },
            { name: '화', count: 1, color: '#f87171' },
            { name: '토', count: 2, color: '#fbbf24' },
            { name: '금', count: 2, color: '#9ca3af' },
            { name: '수', count: 1, color: '#60a5fa' },
        ],
        tenGods: [
            { name: '비견/겁재', level: '보통', desc: '독립심과 주도성' },
            { name: '식신/상관', level: '약함', desc: '표현력과 활동성' },
            { name: '편재/정재', level: '강함', desc: '재물과 결과물' },
            { name: '편관/정관', level: '보통', desc: '책임감과 규율' },
            { name: '편인/정인', level: '약함', desc: '사고력과 수용성' },
        ]
    };

    return (
        <div className={styles.tabContainer}>
            <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>명식 (사주 8자)</h2>
                <p className={styles.sectionDesc}>
                    당신이 태어난 연월일시를 <Tooltip content="10개의 천간과 12개의 지지로 이루어진 기호">간지</Tooltip>로 변환한 고유의 바코드입니다.
                </p>
            </header>

            <Card className={styles.card}>
                <div className={styles.pillarsGrid}>
                    {dummyData.pillars.map((pillar, i) => (
                        <div key={i} className={`${styles.pillarCol} ${pillar.isMe ? styles.isMe : ''}`}>
                            <div className={styles.pillarName}>{pillar.name}</div>
                            <div className={styles.pillarCharTop}>{pillar.top}</div>
                            <div className={styles.pillarCharBottom}>{pillar.bottom}</div>
                            {pillar.isMe && <div className={styles.meLabel}>나(일간)</div>}
                        </div>
                    ))}
                </div>
            </Card>

            <div className={styles.divider} />

            <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>오행의 균형</h2>
                <p className={styles.sectionDesc}>
                    우주를 구성하는 5가지 기운(<Tooltip content="나무의 뻗어나가는 기운">목</Tooltip>, <Tooltip content="불의 확산하는 기운">화</Tooltip>, 토, 금, 수)의 분포입니다.
                </p>
            </header>

            <Card className={styles.card}>
                <div className={styles.elementsRow}>
                    {dummyData.elements.map(el => (
                        <div key={el.name} className={styles.elementItem}>
                            <div className={styles.elementCircle} style={{ borderColor: el.color, color: el.color }}>
                                {el.name}
                            </div>
                            <div className={styles.elementValue}>{el.count}개</div>
                        </div>
                    ))}
                </div>
                <div className={styles.interpretation}>
                    <strong>💡 해석:</strong> 오행이 골고루 분포되어 있어 성격이 원만하고 환경 적응력이 뛰어납니다. 특히 토(재성)와 금(관성)의 기운이 뚜렷하여 사회적인 성취를 이루기에 유리합니다.
                </div>
            </Card>

            <div className={styles.divider} />

            <header className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>십성 분석</h2>
                <p className={styles.sectionDesc}>
                    일간(나)를 기준으로 다른 글자들이 맺는 관계를 10가지 성질로 분류한 것입니다.
                </p>
            </header>

            <div className={styles.godsList}>
                {dummyData.tenGods.map(god => (
                    <Card key={god.name} className={styles.godCard}>
                        <div className={styles.godHeader}>
                            <h3 className={styles.godTitle}>{god.name}</h3>
                            <span className={`${styles.badge} ${god.level === '강함' ? styles.badgeStrong : ''}`}>{god.level}</span>
                        </div>
                        <p className={styles.godDesc}>{god.desc}</p>
                    </Card>
                ))}
            </div>

        </div>
    );
}
