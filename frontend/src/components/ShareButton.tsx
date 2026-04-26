'use client';

import React, { useEffect, useRef, useState } from 'react';
import { OHAENG_TAGLINE, dominantElement } from '@/lib/lottery-utils';
import type { ProfileResponse } from '@/lib/api';

type Props = {
  numbers: number[];
  profile: ProfileResponse;
};

declare global {
  interface Window {
    Kakao: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (params: object) => void;
      };
    };
  }
}

export function ShareButton({ numbers, profile }: Props) {
  const [copied, setCopied] = useState(false);
  const sdkReady = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('kakao-sdk')) return;

    const script = document.createElement('script');
    script.id = 'kakao-sdk';
    script.src = 'https://t1.kakaocdn.net/kakaojs/2.7.2/kakao.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_APP_KEY!);
      }
      sdkReady.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const element = dominantElement(profile.elements);
  const tagline = OHAENG_TAGLINE[element];

  function handleShare() {
    const origin = window.location.origin;
    const ogUrl = `${origin}/og?numbers=${numbers.join(',')}&element=${element}`;

    if (sdkReady.current && window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '내 이번 주 행운의 번호',
          description: tagline,
          imageUrl: ogUrl,
          link: { webUrl: origin, mobileWebUrl: origin },
        },
        buttons: [
          { title: '나도 뽑기', link: { webUrl: origin, mobileWebUrl: origin } },
        ],
      });
      return;
    }

    // 폴백: Web Share API → 클립보드
    if (navigator.share) {
      navigator.share({ title: '내 이번 주 행운의 번호', text: tagline, url: origin });
    } else {
      navigator.clipboard.writeText(origin).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        marginTop: '16px',
        padding: '10px 24px',
        background: '#FEE500',
        color: '#191919',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span>카카오톡 공유</span>
      {copied && <span style={{ fontSize: '12px', color: '#666' }}>링크 복사됨</span>}
    </button>
  );
}
