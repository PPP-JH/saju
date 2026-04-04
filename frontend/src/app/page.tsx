import styles from "./page.module.css";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className={styles.container}>
      <SiteHeader right={
        <nav className={styles.nav}>
          <Link href="/input">내 사주 보기</Link>
          <Link href="/learn">사주 상식</Link>
          <Link href="/glossary">용어 사전</Link>
        </nav>
      } />

      <main className={styles.main}>
        <section className={styles.editorial}>
          <p className={styles.eyebrow}>사주 풀이 · 인라인 해설</p>

          <h1 className={styles.display}>
            당신이 태어난 순간,<br />
            하늘과 땅이 교차하며<br />
            사주팔자가 세워졌습니다.
          </h1>

          <p className={styles.body}>
            우리는 그것이 무엇을 의미하는지<br />
            — 왜 그런지까지 — 설명합니다.
          </p>

          <p className={styles.bodyMuted}>
            일간(日干), 오행(五行), 십성(十星).
            결과만 전달하는 것이 아니라, 풀이 안의 모든 용어에
            인라인 해설이 붙습니다. 사주를 처음 접하는 분도
            읽으면서 이해할 수 있습니다.
          </p>

          <div className={styles.ctaRow}>
            <Link href="/input" className={styles.primaryBtn}>
              내 사주 풀이 보기 →
            </Link>
            <Link href="/learn" className={styles.ghostLink}>
              사주 상식 보기
            </Link>
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.proofRow}>
          <div className={styles.proofItem}>
            <span className={styles.proofNum}>3,000년</span>
            <span className={styles.proofLabel}>명리학 전통</span>
          </div>
          <div className={styles.proofItem}>
            <span className={styles.proofNum}>왜까지</span>
            <span className={styles.proofLabel}>결과가 아닌 이유</span>
          </div>
          <div className={styles.proofItem}>
            <span className={styles.proofNum}>무료</span>
            <span className={styles.proofLabel}>계정 없이 바로</span>
          </div>
        </section>
      </main>
    </div>
  );
}
