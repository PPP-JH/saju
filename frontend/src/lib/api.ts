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

export type StreamDonePayload = {
  read_id: string;
  cached: boolean;
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

export async function streamRead(
  payload: {
    profile_id: string;
    feature_type: string;
    period_key: string;
  },
  handlers: {
    onDelta?: (text: string) => void;
    onDone: (payload: StreamDonePayload) => void;
    onError?: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const timeoutMs = 25000;
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  timeoutController.signal.addEventListener('abort', abortRequest, { once: true });
  signal?.addEventListener('abort', abortRequest, { once: true });
  try {
    const response = await fetch(`${API_BASE_URL}/api/read/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: requestController.signal,
      cache: 'no-store',
    });

    if (!response.ok || !response.body) {
      throw new Error(`스트리밍 요청 실패 (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let hasDone = false;

  const emitEvent = (chunk: string) => {
    const lines = chunk.split(/\r?\n/);
    let eventName = 'message';
    let dataText = '';

    for (const rawLine of lines) {
      const line = rawLine.trimStart();
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataText += line.slice(5).trim();
      }
    }

    if (!dataText) {
      return;
    }

    try {
      const payloadData = JSON.parse(dataText) as Record<string, unknown>;
      if (eventName === 'delta' && typeof payloadData.text === 'string') {
        handlers.onDelta?.(payloadData.text);
        return;
      }
      if (eventName === 'done') {
        hasDone = true;
        handlers.onDone(payloadData as StreamDonePayload);
        return;
      }
      if (eventName === 'error') {
        const detail = typeof payloadData.detail === 'string' ? payloadData.detail : '스트리밍 오류';
        handlers.onError?.(detail);
      }
    } catch {
      handlers.onError?.('스트리밍 응답 파싱 실패');
    }
  };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const separatorIndex = buffer.search(/\r?\n\r?\n/);
        if (separatorIndex === -1) {
          break;
        }
        const separatorMatch = buffer.slice(separatorIndex).match(/^\r?\n\r?\n/);
        const separatorLength = separatorMatch ? separatorMatch[0].length : 2;
        const eventChunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + separatorLength);
        emitEvent(eventChunk);
      }
    }

    if (buffer.trim()) {
      emitEvent(buffer);
    }

    if (!hasDone) {
      handlers.onError?.('스트림이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
    }
  } finally {
    clearTimeout(timeout);
    timeoutController.signal.removeEventListener('abort', abortRequest);
    signal?.removeEventListener('abort', abortRequest);
  }
}

export function getCurrentWeekKey(now: Date = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
