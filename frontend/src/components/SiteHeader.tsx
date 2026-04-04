import Link from 'next/link';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  right?: React.ReactNode;
}

export function SiteHeader({ right }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        사주해<span className={styles.hanja}>四柱解</span>
      </Link>
      {right}
    </header>
  );
}
