// 오행 → 1~45 숫자 대응 (오행 고유 수리)
export const ELEMENT_NUMBERS: Record<string, number[]> = {
  wood:  [3, 8, 13, 18, 23, 28, 33, 38, 43],
  fire:  [2, 7, 12, 17, 22, 27, 32, 37, 42],
  earth: [5, 10, 15, 20, 25, 30, 35, 40, 45],
  metal: [4, 9, 14, 19, 24, 29, 34, 39, 44],
  water: [1, 6, 11, 16, 21, 26, 31, 36, 41],
};

// 로또볼 색상 (한국 로또 기준)
export function ballColor(n: number): string {
  if (n <= 10) return '#fbc400';
  if (n <= 20) return '#69c8f2';
  if (n <= 30) return '#ff7272';
  if (n <= 40) return '#aaaaaa';
  return '#b0d840';
}

export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}
