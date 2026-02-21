import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './tabs.module.css';

interface FortuneTabProps {
    type: 'week' | 'money' | 'love' | 'work';
}

export default function FortuneTab({ type }: FortuneTabProps) {
    const dummyData = {
        week: {
            title: "기회가 현실이 되는 한 주",
            score: 85,
            summary: `이번 주는 오행 중 <Tooltip content="나무의 성질, 성장을 의미합니다">목(木)</Tooltip>의 기운이 강해져 의욕이 샘솟습니다. 그동안 미뤄둔 일을 시작하기 좋은 시기입니다.`,
            details: [
                { subtitle: "재물", content: "작은 이득이 모여 큰 돈이 됩니다. 소소한 투자나 저축에 유리합니다." },
                { subtitle: "애정", content: "새로운 인연보다는 내 곁에 있는 사람의 소중함을 깨닫게 됩니다." },
                { subtitle: "직장", content: "새로운 아이디어를 제시하기 좋은 시기입니다. 윗사람의 인정을 받을 수 있습니다." }
            ],
            actions: ["중요한 결정은 목요일 이후로 미루세요.", "아침에 따뜻한 차 한 잔으로 하루를 시작하세요."]
        },
        money: {
            title: "견고한 저축 운",
            score: 75,
            summary: "재성을 나타내는 토(土) 기운이 안정적으로 받쳐주고 있습니다. 큰 지출은 피하고 모으는 것에 집중하면 유리합니다.",
            details: [
                { subtitle: "투자", content: "고위험군 투자보다는 원금이 보장되는 형태가 좋습니다." },
                { subtitle: "지출", content: "나를 위한 작은 보상 정도의 지출은 나쁘지 않습니다." },
            ],
            actions: ["예산 가계부를 점검해보세요.", "충동구매를 피하기 위해 장바구니에 24시간 정도 담아두세요."]
        },
        love: {
            title: "잔잔하고 편안한 시기",
            score: 60,
            summary: "이번 주는 특별한 이벤트보다는 평온한 일상이 이어집니다. 무리해서 관계를 진전시키려 하기보다 상대의 말을 잘 들어주세요.",
            details: [
                { subtitle: "싱글", content: "자연스러운 모임에서 뜻밖의 대화 상대가 생길 수 있습니다." },
                { subtitle: "커플", content: "서로의 일상적인 고민을 나누는 시간이 필요합니다." },
            ],
            actions: ["금요일 저녁, 가벼운 식사 약속을 잡아보세요."]
        },
        work: {
            title: "리더십을 발휘할 타이밍",
            score: 90,
            summary: "편관의 흐름이 좋아 책임을 맡았을 때 오히려 빛이 납니다. 피하지 말고 당당하게 부딪혀보세요.",
            details: [
                { subtitle: "업무", content: "처리 속도가 매우 빠르고 정확합니다. 마감일을 여유있게 맞출 수 있겠습니다." },
                { subtitle: "인간관계", content: "동료들의 고민을 들어주며 신뢰를 쌓을 수 있습니다." },
            ],
            actions: ["회의에서 먼저 의견을 내보세요.", "오후 3시쯤 가벼운 스트레칭으로 긴장을 풀어주세요."]
        },
    };

    const data = dummyData[type];

    // Helper text replacement to render tooltips from string
    const renderSummary = (text: string) => {
        if (text.includes('<Tooltip')) {
            // Very naive implementation for dummy layout purpose
            return (
                <>
                    이번 주는 오행 중 <Tooltip content="나무의 성질, 성장을 의미합니다">목(木)</Tooltip>의 기운이 강해져 의욕이 샘솟습니다. 그동안 미뤄둔 일을 시작하기 좋은 시기입니다.
                </>
            );
        }
        return text;
    };

    return (
        <div className={styles.tabContainer}>
            <Card className={styles.scoreCard}>
                <div className={styles.scoreHeader}>
                    <div className={styles.scoreValue}>{data.score}<span>점</span></div>
                    <h2 className={styles.scoreTitle}>{data.title}</h2>
                </div>
                <div className={styles.summaryText}>
                    {renderSummary(data.summary)}
                </div>
            </Card>

            <div className={styles.divider} />

            <h3 className={styles.sectionSubTitle}>상세 흐름</h3>
            <div className={styles.detailsList}>
                {data.details.map((item, i) => (
                    <Card key={i} className={styles.detailCard}>
                        <div className={styles.detailIcon}>📌</div>
                        <div className={styles.detailContent}>
                            <h4 className={styles.detailSubTitle}>{item.subtitle}</h4>
                            <p className={styles.detailText}>{item.content}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionSubTitle}>행동 가이드</h3>
            <div className={styles.actionsList}>
                {data.actions.map((act, i) => (
                    <div key={i} className={styles.actionItem}>
                        <div className={styles.checkIcon}>✓</div>
                        <span>{act}</span>
                    </div>
                ))}
            </div>

            <div className={styles.footerCta}>
                <p className={styles.footerHint}>결과에 등장한 단어가 궁금하시다면?</p>
                <Button variant="secondary" onClick={() => window.location.href = '/learn'}>
                    용어사전 살펴보기
                </Button>
            </div>

        </div>
    );
}
