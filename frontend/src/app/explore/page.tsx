import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function ExploreIndex() {
    const samples = [
        {
            id: '1',
            title: '💼 재물운이 돋보이는 사주',
            tags: ['편재', '오행 균형'],
            desc: '재물운 분석 탭이 어떻게 구성되어 있는지 구경하기 좋은 샘플입니다.'
        },
        {
            id: '2',
            title: '🔥 리더십과 직장운이 강한 사주',
            tags: ['편관', '불의 기운'],
            desc: '직장 내 갈등이나 승진운의 흐름을 살펴볼 수 있는 샘플입니다.'
        },
        {
            id: '3',
            title: '💖 표현력이 풍부한 사주',
            tags: ['식신', '물의 기운'],
            desc: '애정운과 대인 관계가 어떤 식으로 풀이되는지 확인해보세요.'
        },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>사주해</Link>
                <nav className={styles.nav}>
                    <Link href="/input">내 사주 보기</Link>
                    <Link href="/learn">사주 상식</Link>
                </nav>
            </header>

            <main className={styles.main}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>샘플 사주 둘러보기</h1>
                    <p className={styles.subtitle}>
                        개인정보 입력이 부담스러우신가요?
                        <br />
                        아래의 가상 샘플 프로필을 통해 사주해의 풀이 시스템을 미리 체험해보세요.
                    </p>
                </div>

                <div className={styles.sampleList}>
                    {samples.map(sample => (
                        <Card key={sample.id} className={styles.sampleCard}>
                            <div className={styles.sampleContent}>
                                <h2 className={styles.sampleTitle}>{sample.title}</h2>
                                <div className={styles.tags}>
                                    {sample.tags.map((tag, i) => (
                                        <span key={i} className={styles.tag}>#{tag}</span>
                                    ))}
                                </div>
                                <p className={styles.sampleDesc}>{sample.desc}</p>
                            </div>
                            <div className={styles.action}>
                                <Link href="/me">
                                    <Button variant="primary">결과 페이지 체험하기</Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
