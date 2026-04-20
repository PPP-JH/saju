import styles from "./page.module.css";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className={styles.container}>
      <SiteHeader right={
        <nav className={styles.nav}>
          <Link href="/input">내 사주 보기</Link>
          <Link href="/lottery">행운 번호</Link>
          <Link href="/story">사주 상식</Link>
          <Link href="/glossary">용어 사전</Link>
        </nav>
      } />

      <main className={styles.main}>
        <section className={styles.editorial}>
          <p className={styles.eyebrow}>사주 풀이 · 용어 해설</p>

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
            뜻풀이가 함께 붙습니다. 사주를 처음 접하는 분도
            읽으면서 이해할 수 있습니다.
          </p>

          <div className={styles.ctaStack}>
            <div className={styles.ctaRow}>
              <Link href="/input" className={styles.primaryBtn}>
                내 사주 풀이 보기 →
              </Link>
              <Link href="/story" className={styles.ghostLink}>
                사주 상식 보기
              </Link>
            </div>

            <div className={styles.ctaRow}>
              <Link href="/lottery" className={styles.secondaryBtn}>
                오늘의 사주 행운 번호 보기 →
              </Link>
              <span className={styles.ghostLabel}>오늘 나의 행운 번호를 확인해보세요</span>
            </div>
          </div>
        </section>

      </main>

      <footer className={styles.footer}>
        <Link href="/privacy" className={styles.footerLink}>개인정보처리방침</Link>
      </footer>
    </div>
  );
}
