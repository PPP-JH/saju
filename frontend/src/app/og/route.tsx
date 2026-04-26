import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const TAGLINE: Record<string, string> = {
  wood:  '창의적 에너지가 넘치는 이번 주 행운의 번호',
  fire:  '열정이 빛나는 이번 주 행운의 번호',
  earth: '안정적 기운의 이번 주 행운의 번호',
  metal: '결단력이 강한 이번 주 행운의 번호',
  water: '직관이 날카로운 이번 주 행운의 번호',
};

function ballColor(n: number): string {
  if (n <= 10) return '#fbc400';
  if (n <= 20) return '#69c8f2';
  if (n <= 30) return '#ff7272';
  if (n <= 40) return '#aaaaaa';
  return '#b0d840';
}

const FALLBACK_IMAGE_URL = 'https://sajuhae.com/og-default.png';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const numbersParam = searchParams.get('numbers');
    const element = searchParams.get('element') ?? 'wood';

    if (!numbersParam) {
      return Response.redirect(FALLBACK_IMAGE_URL, 302);
    }

    const numbers = numbersParam
      .split(',')
      .map(Number)
      .filter((n) => n >= 1 && n <= 45)
      .slice(0, 6);

    if (numbers.length < 6) {
      return Response.redirect(FALLBACK_IMAGE_URL, 302);
    }

    const tagline = TAGLINE[element] ?? TAGLINE.wood;

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: '#0f0f1a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          {/* 브랜드 */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '56px',
              color: '#C0392B',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            사주해
          </div>

          {/* 태그라인 */}
          <div
            style={{
              color: '#e8e0d0',
              fontSize: '38px',
              fontWeight: 600,
              marginBottom: '52px',
              letterSpacing: '-0.01em',
            }}
          >
            {tagline}
          </div>

          {/* 로또볼 */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {numbers.map((n) => (
              <div
                key={n}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: ballColor(n),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: n <= 20 ? '#1a1a1a' : '#ffffff',
                  fontSize: '36px',
                  fontWeight: 800,
                }}
              >
                {n}
              </div>
            ))}
          </div>

          {/* 하단 CTA */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '56px',
              color: '#6b6b8a',
              fontSize: '22px',
            }}
          >
            나도 뽑기 → sajuhae.com
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return Response.redirect(FALLBACK_IMAGE_URL, 302);
  }
}
