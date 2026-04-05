import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import styles from '../article.module.css';

export default function LearnIntro() {
    return (
        <div className={styles.container}>
            <SiteHeader />
            <main className={styles.main}>
                <Link href="/story" className={styles.backLink}>← 사주 상식으로</Link>

                <div className={styles.hero}>
                    <p className={styles.eyebrow}>사주 상식 01</p>
                    <h1 className={styles.title}>내 사주는 왜 이럴까?</h1>
                    <p className={styles.lead}>
                        사주명리학은 점술이 아니라 동양 철학의 한 갈래입니다.
                        생년월일시라는 네 가지 시간 정보에서 기질과 흐름을 읽어내는 해석 체계입니다.
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>2,500년의 시간</h2>
                    <div className={styles.body}>
                        <p>
                            음양오행 사상은 기원전 5세기 춘추전국시대에 형성됐습니다.
                            하늘과 땅, 나무·불·흙·쇠·물이라는 다섯 기운이 만물을 구성한다는 이 관점은
                            의학·천문·정치까지 동아시아 문명 전체를 관통했습니다.
                        </p>
                        <p>
                            천간과 지지로 날짜를 기록하는 방식은 상나라(기원전 1600년경) 갑골문에서 이미 확인됩니다.
                            당나라 이허중(761~813)이 이 체계를 사람의 운명에 적용해 생년·월·일 3기둥으로
                            기질을 분석하는 방법론을 처음 확립했습니다.
                        </p>
                        <p>
                            이후 송나라 서자평이 생시(태어난 시각)를 추가해 4기둥 8글자 체계를 완성했고,
                            분석의 중심을 태어난 해(년주)에서 태어난 날(일주, 일간)로 전환했습니다.
                            지금 우리가 아는 사주명리학은 이 서자평 방식을 따릅니다.
                        </p>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>왜 생년월일시인가</h2>
                    <div className={styles.body}>
                        <p>
                            사주명리학은 사람이 태어나는 순간의 우주적 시간 좌표를 기록합니다.
                            동양 철학에서 자연의 기운은 연·월·일·시에 따라 달라진다고 봤고,
                            그 시점에 태어난 사람은 그 기운의 영향을 받아 특정한 기질 구조를 갖는다고 해석합니다.
                        </p>
                        <p>
                            이것은 천문학적 사실(계절, 시간대)과 철학적 해석이 결합된 체계입니다.
                            현대 과학의 인과론으로 증명하기는 어렵지만,
                            수천 년의 관찰과 유형화를 통해 구축된 방대한 해석 전통입니다.
                        </p>
                    </div>
                </div>

                <div className={styles.callout}>
                    조선 초기에 사주명리학은 과거시험 과목으로 편입되어 국가 공인 학문으로 취급됐습니다.
                    민간의 미신이 아니라 동아시아 문명의 공식적인 지식 체계였습니다.
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>운명을 결정하는 것이 아닙니다</h2>
                    <div className={styles.body}>
                        <p>
                            명리학의 고전은 말합니다: "命在天, 運在人" — 타고난 기질은 하늘에 있지만,
                            그 위에서의 선택은 사람에게 있다.
                        </p>
                        <p>
                            사주는 MBTI나 에니어그램처럼 자기이해의 도구입니다.
                            내가 어떤 기운을 강하게 갖고 태어났는지, 어떤 방향으로 흐를 때 편안한지,
                            어떤 것이 나에게 과잉이거나 부족한지를 읽어내는 것입니다.
                            "좋은 사주"와 "나쁜 사주"는 없습니다. 각자 다른 조합이 있을 뿐입니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
