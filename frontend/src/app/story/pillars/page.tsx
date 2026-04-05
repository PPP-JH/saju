import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import styles from '../article.module.css';

export default function LearnPillars() {
    return (
        <div className={styles.container}>
            <SiteHeader />
            <main className={styles.main}>
                <Link href="/story" className={styles.backLink}>← 사주 상식으로</Link>

                <div className={styles.hero}>
                    <p className={styles.eyebrow}>사주 상식 02</p>
                    <h1 className={styles.title}>8글자의 운명 바코드</h1>
                    <p className={styles.lead}>
                        사주(四柱)는 네 개의 기둥, 팔자(八字)는 여덟 글자.
                        같은 말을 다르게 부르는 이 체계가 어떻게 구성되는지 살펴봅니다.
                    </p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>네 개의 기둥</h2>
                    <div className={styles.body}>
                        <p>
                            생년·생월·생일·생시, 각각을 하나의 "기둥(柱)"으로 봅니다.
                            각 기둥은 삶의 서로 다른 영역을 상징합니다.
                        </p>
                        <p>
                            <strong>년주(年柱)</strong>는 조상·초년의 환경과 사회적 배경을 나타냅니다.
                            <strong> 월주(月柱)</strong>는 부모·청년기를 반영하며, 4기둥 중 기운이 가장 강한 자리입니다.
                            <strong> 일주(日柱)</strong>는 나 자신과 배우자와의 관계를 보여줍니다.
                            <strong> 시주(時柱)</strong>는 자녀·말년·내가 이루고자 하는 것을 담습니다.
                        </p>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>천간과 지지: 각 기둥의 두 글자</h2>
                    <div className={styles.body}>
                        <p>
                            각 기둥은 천간(天干) 1자 + 지지(地支) 1자로 구성됩니다.
                            4기둥 × 2글자 = 총 8글자, 이것이 "팔자"입니다.
                        </p>
                        <p>
                            <strong>천간(天干)</strong>은 10개입니다: 갑·을·병·정·무·기·경·신·임·계.
                            오행(목·화·토·금·수) 각각의 양과 음으로 구성됩니다.
                            천간은 "하늘의 기운"으로, 드러나고 표면에 나타나는 성질을 나타냅니다.
                        </p>
                        <p>
                            <strong>지지(地支)</strong>는 12개입니다: 자·축·인·묘·진·사·오·미·신·유·술·해.
                            12달, 12방위, 12시진(時辰)과 대응됩니다.
                            지지는 "땅의 기운"으로, 내면에 감춰진 복잡한 성질을 담습니다.
                        </p>
                    </div>
                </div>

                <div className={styles.callout}>
                    천간 10개와 지지 12개는 같은 음양끼리만 짝이 됩니다. 그래서 조합은 60가지 — 이것이 60갑자(六十甲子)입니다.
                    60년이 지나면 같은 간지의 해가 돌아오는 이유입니다.
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>일간(日干)이 중요한 이유</h2>
                    <div className={styles.body}>
                        <p>
                            8글자 중 사주 분석의 기준점은 일주의 천간, 즉 <strong>일간(日干)</strong>입니다.
                            서자평이 분석 기준을 "태어난 해"에서 "태어난 날"로 바꾼 이후,
                            나머지 7글자와의 관계는 모두 일간을 중심으로 해석됩니다.
                        </p>
                        <p>
                            예를 들어 일간이 병화(丙火)라면, 나는 태양처럼 밝고 확산하는 기운의 사람입니다.
                            다른 글자들이 이 병화와 어떤 관계인지가 십성(十星)을 결정하고,
                            그것이 곧 나의 기질 지도가 됩니다.
                        </p>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>만세력과 절기</h2>
                    <div className={styles.body}>
                        <p>
                            생년월일시를 8글자로 변환하려면 <strong>만세력(萬歲曆)</strong>이 필요합니다.
                            만세력은 수백 년치의 연월일시를 간지(干支)로 표기한 달력입니다.
                        </p>
                        <p>
                            주의할 점: 월주는 음력이 아니라 <strong>24절기</strong> 기준으로 바뀝니다.
                            입춘(立春)이 지나야 인월(寅月)이 시작되는 식입니다.
                            음력 생일만으로 월주를 정하면 오류가 생기는 이유입니다.
                            사주해가 양력 생일을 입력받아 절기 기준으로 변환하는 것도 이 때문입니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
