export type ProfileResponse = {
  profile_id: string;
  pillars: {
    year: [string, string];
    month: [string, string];
    day: [string, string];
    time: [string, string];
  };
  elements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  ten_gods_summary: Record<string, string>;
  summary_text: string;
  keywords: string[];
};

export type ReadResult = {
  title: string;
  summary: string;
  score: number;
  details: { subtitle: string; content: string }[];
  actions: string[];
};

export type ReadResponse = {
  read_id: string;
  feature_type: string;
  period_key: string;
  result_json: ReadResult;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let detail = `요청 실패 (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export async function createProfile(payload: {
  name: string;
  gender: 'M' | 'F';
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
}): Promise<{ profile_id: string }> {
  return apiFetch<{ profile_id: string }>('/api/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProfile(profileId: string): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(`/api/profile/${profileId}`);
}

export async function createRead(payload: {
  profile_id: string;
  feature_type: string;
  period_key: string;
}): Promise<{ read_id: string; cached: boolean }> {
  return apiFetch<{ read_id: string; cached: boolean }>('/api/read', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getRead(readId: string): Promise<ReadResponse> {
  return apiFetch<ReadResponse>(`/api/read/${readId}`);
}

export function getCurrentWeekKey(now: Date = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
