import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import styles from './page.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <SiteHeader />
      <main className={styles.main}>
        <h1 className={styles.title}>개인정보처리방침</h1>
        <p className={styles.updated}>최종 수정일: 2026년 4월 5일</p>

        <section className={styles.section}>
          <h2 className={styles.heading}>1. 수집하는 정보</h2>
          <p>사주해(四柱解)는 사주 풀이 서비스 제공을 위해 다음 정보를 수집합니다.</p>
          <ul className={styles.list}>
            <li>생년월일 및 출생 시간 (사주 계산 목적)</li>
            <li>성별 (사주 계산 목적)</li>
            <li>서비스 이용 기록 및 서버 접속 로그</li>
          </ul>
          <p>회원 가입이나 이메일 수집은 없습니다. 생성된 프로필 식별자(profile_id)는 브라우저 localStorage에 저장됩니다.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>2. 정보의 이용 목적</h2>
          <ul className={styles.list}>
            <li>사주 풀이 결과 생성 및 제공</li>
            <li>이전 풀이 결과 재조회</li>
            <li>서비스 품질 개선</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>3. 제3자 광고 서비스</h2>
          <p>
            본 사이트는 Google LLC가 제공하는 광고 서비스인 <strong>Google AdSense</strong>를 사용합니다.
            Google AdSense는 사용자의 관심사에 맞는 광고를 제공하기 위해 쿠키(Cookie)를 사용할 수 있습니다.
          </p>
          <p>
            Google의 광고 쿠키 사용 방식 및 옵트아웃 방법은{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Google 광고 정책
            </a>
            에서 확인할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>4. 정보의 보유 및 파기</h2>
          <p>
            수집된 정보는 서비스 제공 목적이 달성될 때까지 보관하며, 이용자가 삭제를 요청하거나
            서비스가 종료되는 경우 지체 없이 파기합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>5. 문의</h2>
          <p>개인정보 관련 문의는 아래로 연락 바랍니다.</p>
          <p className={styles.contact}>이메일: contact@sajuhae.com</p>
        </section>

        <div className={styles.backRow}>
          <Link href="/" className={styles.backLink}>← 홈으로</Link>
        </div>
      </main>
    </div>
  );
}
