import styles from "./page.module.css";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>사주 허브</div>
        <nav className={styles.nav}>
          <Link href="/me">내 사주</Link>
          <Link href="/learn">배우기</Link>
          <Link href="/explore">둘러보기</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.badge}>새로운 운세 경험</div>
          <h1 className={styles.title}>
            어렵기만 했던 사주를<br />
            <span className={styles.highlight}>내 손으로 읽다</span>
          </h1>
          <p className={styles.subtitle}>
            당신의 고유한 흐름을 풀이해 드립니다.<br />초보자도 쉽게 이해할 수 있는 친절한 용어 설명과 함께하세요.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/input" className={styles.primaryBtn}>
              내 사주 보기
            </Link>
            <Link href="/learn" className={styles.secondaryBtn}>
              사주 입문 10분
            </Link>
            <Link href="/explore" className={styles.ghostBtn}>
              예시로 둘러보기
            </Link>
          </div>
        </div>

        <section className={styles.features}>
          <div className={styles.featureGrid}>
            <Card className={styles.featureCard}>
              <div className={styles.iconWrapper}>✨</div>
              <h3 className={styles.cardTitle}>초보자를 위한 쉬운 풀이</h3>
              <p className={styles.cardDesc}>
                비견, 십성, 간지... 복잡한 용어는 그만! 클릭 한 번으로 제공되는 친절한 툴팁과 함께 당신의 사주를 바로 이해해보세요.
              </p>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.iconWrapper}>📅</div>
              <h3 className={styles.cardTitle}>매주 업데이트 되는 운세</h3>
              <p className={styles.cardDesc}>
                단 한 번의 사주 분석으로 끝나는 것이 아닙니다. 이번 주 재물운, 애정운, 직장운 등 주기적인 혜택을 제공합니다.
              </p>
            </Card>
            <Card className={styles.featureCard}>
              <div className={styles.iconWrapper}>📚</div>
              <h3 className={styles.cardTitle}>깊이있는 학습 허브</h3>
              <p className={styles.cardDesc}>
                내 사주를 더 똑똑하게 읽고 싶다면 다채로운 입문 가이드와 용어 사전을 활용하여 직접 해석해볼 수 있습니다.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
