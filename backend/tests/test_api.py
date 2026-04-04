import asyncio
import atexit
import json
import os
from pathlib import Path

from httpx import ASGITransport, AsyncClient

TEST_DB_PATH = Path(__file__).parent / 'test_saju.db'
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()
os.environ['DATABASE_URL'] = f'sqlite:///{TEST_DB_PATH}'

from app.main import app
from app.db import init_db

init_db()


@atexit.register
def cleanup_test_db() -> None:
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


async def api_request(method: str, path: str, json: dict | None = None):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as client:
        return await client.request(method, path, json=json)


def request(method: str, path: str, json: dict | None = None):
    return asyncio.run(api_request(method=method, path=path, json=json))


async def api_stream_request(path: str, json_body: dict):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://testserver') as client:
        async with client.stream('POST', path, json=json_body) as response:
            chunks: list[str] = []
            async for chunk in response.aiter_text():
                chunks.append(chunk)
            return response.status_code, ''.join(chunks)


def stream_request(path: str, json_body: dict):
    return asyncio.run(api_stream_request(path=path, json_body=json_body))


def parse_sse_events(stream_text: str) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    for block in stream_text.strip().split('\n\n'):
        if not block.strip():
            continue
        event_name = 'message'
        data_text = ''
        for line in block.splitlines():
            if line.startswith('event:'):
                event_name = line.split(':', 1)[1].strip()
            elif line.startswith('data:'):
                data_text += line.split(':', 1)[1].strip()
        payload = json.loads(data_text) if data_text else {}
        events.append((event_name, payload))
    return events


def test_healthz() -> None:
    response = request('GET', '/healthz')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_profile_create_and_get() -> None:
    create_payload = {
        'name': '홍길동',
        'gender': 'M',
        'birth_date': '1990-01-01',
        'birth_time': '14:30',
        'is_lunar': False,
    }

    create_resp = request('POST', '/api/profile', json=create_payload)
    assert create_resp.status_code == 200
    profile_id = create_resp.json()['profile_id']

    get_resp = request('GET', f'/api/profile/{profile_id}')
    assert get_resp.status_code == 200

    body = get_resp.json()
    assert body['profile_id'] == profile_id
    assert set(body['pillars'].keys()) == {'year', 'month', 'day', 'time'}
    assert set(body['elements'].keys()) == {'wood', 'fire', 'earth', 'metal', 'water'}
    assert len(body['keywords']) >= 1


def test_read_create_cached_and_get() -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '김테스트',
            'gender': 'F',
            'birth_date': '1992-09-09',
            'birth_time': None,
            'is_lunar': True,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    request_payload = {
        'profile_id': profile_id,
        'feature_type': 'week',
        'period_key': '2026-W08',
    }

    first = request('POST', '/api/read', json=request_payload)
    assert first.status_code == 200
    assert first.json()['cached'] is False
    read_id = first.json()['read_id']

    second = request('POST', '/api/read', json=request_payload)
    assert second.status_code == 200
    assert second.json()['cached'] is True
    assert second.json()['read_id'] == read_id

    get_read = request('GET', f'/api/read/{read_id}')
    assert get_read.status_code == 200
    read_body = get_read.json()
    assert read_body['feature_type'] == 'week'
    assert read_body['period_key'] == '2026-W08'
    assert 'score' in read_body['result_json']


def test_feedback_success_and_error() -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '이피드백',
            'gender': 'F',
            'birth_date': '1995-03-21',
            'birth_time': '09:20',
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']
    read_resp = request(
        'POST',
        '/api/read',
        json={
            'profile_id': profile_id,
            'feature_type': 'work_week',
            'period_key': '2026-W08',
        },
    )
    read_id = read_resp.json()['read_id']

    ok = request(
        'POST',
        '/api/feedback',
        json={
            'read_id': read_id,
            'rating': 5,
            'comment': '정확해요',
            'flag_inaccurate': False,
        },
    )
    assert ok.status_code == 200
    assert ok.json() == {'success': True}

    missing = request(
        'POST',
        '/api/feedback',
        json={
            'read_id': 'missing-read-id',
            'rating': 3,
            'comment': None,
            'flag_inaccurate': False,
        },
    )
    assert missing.status_code == 404


def test_input_validation() -> None:
    invalid_profile = request(
        'POST',
        '/api/profile',
        json={
            'name': '',
            'gender': 'X',
            'birth_date': '1990/01/01',
            'birth_time': '99:99',
            'is_lunar': False,
        },
    )
    assert invalid_profile.status_code == 422

    invalid_read = request(
        'POST',
        '/api/read',
        json={
            'profile_id': 'abc',
            'feature_type': 'week-1',
            'period_key': '2026-W08',
        },
    )
    assert invalid_read.status_code == 422


def test_read_uses_llm_when_available(monkeypatch) -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '박제미니',
            'gender': 'F',
            'birth_date': '1998-08-08',
            'birth_time': '08:08',
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    llm_result = {
        'title': 'LLM 생성 결과',
        'summary': 'LLM이 만든 요약입니다.',
        'score': 88,
        'details': [{'subtitle': '핵심', 'content': 'LLM detail'}],
        'actions': ['LLM action'],
    }

    monkeypatch.setattr('app.services.narrator.generate_result', lambda **_: llm_result)

    read_resp = request(
        'POST',
        '/api/read',
        json={
            'profile_id': profile_id,
            'feature_type': 'week',
            'period_key': '2026-W09',
        },
    )
    read_id = read_resp.json()['read_id']
    body = request('GET', f'/api/read/{read_id}').json()
    assert body['result_json']['title'] == 'LLM 생성 결과'


def test_read_fallback_when_llm_returns_none(monkeypatch) -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '최폴백',
            'gender': 'M',
            'birth_date': '1989-11-11',
            'birth_time': None,
            'is_lunar': True,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    monkeypatch.setattr('app.services.narrator.generate_result', lambda **_: None)

    read_resp = request(
        'POST',
        '/api/read',
        json={
            'profile_id': profile_id,
            'feature_type': 'love_week',
            'period_key': '2026-W10',
        },
    )
    read_id = read_resp.json()['read_id']
    body = request('GET', f'/api/read/{read_id}').json()
    assert body['result_json']['title'] != 'LLM 생성 결과'
    assert 'score' in body['result_json']


def test_read_stream_emits_delta_and_done(monkeypatch) -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '스트리밍사용자',
            'gender': 'F',
            'birth_date': '1991-01-11',
            'birth_time': '10:30',
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    full_json = (
        '{"title":"실시간 리딩","summary":"스트림 생성 결과","score":81,'
        '"details":[{"subtitle":"핵심","content":"실시간 설명"}],'
        '"actions":["행동 가이드"]}'
    )

    async def fake_stream_result_text(**_):
        yield full_json[:40]
        yield full_json[40:90]
        yield full_json[90:]

    monkeypatch.setattr('app.main.narrator.stream_result_text', fake_stream_result_text)

    status_code, stream_text = stream_request(
        '/api/read/stream',
        {
            'profile_id': profile_id,
            'feature_type': 'profile_detail',
            'period_key': '2026-W12',
        },
    )

    assert status_code == 200
    events = parse_sse_events(stream_text)
    assert any(name == 'delta' for name, _ in events)
    done_events = [payload for name, payload in events if name == 'done']
    assert len(done_events) == 1
    done = done_events[0]
    assert done['cached'] is False
    assert done['result_json']['title'] == '실시간 리딩'

    read_id = done['read_id']
    persisted = request('GET', f'/api/read/{read_id}')
    assert persisted.status_code == 200
    assert persisted.json()['result_json']['title'] == '실시간 리딩'


def test_read_stream_returns_cached_done() -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '캐시스트림',
            'gender': 'M',
            'birth_date': '1993-05-05',
            'birth_time': None,
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    read_resp = request(
        'POST',
        '/api/read',
        json={
            'profile_id': profile_id,
            'feature_type': 'week',
            'period_key': '2026-W15',
        },
    )
    read_id = read_resp.json()['read_id']

    status_code, stream_text = stream_request(
        '/api/read/stream',
        {
            'profile_id': profile_id,
            'feature_type': 'week',
            'period_key': '2026-W15',
        },
    )

    assert status_code == 200
    events = parse_sse_events(stream_text)
    assert len(events) == 1
    event_name, payload = events[0]
    assert event_name == 'done'
    assert payload['cached'] is True
    assert payload['read_id'] == read_id


def test_read_stream_emits_fallback_delta_when_llm_stream_empty(monkeypatch) -> None:
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': '무응답스트림',
            'gender': 'F',
            'birth_date': '1990-07-07',
            'birth_time': None,
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    async def empty_stream(**_):
        if False:
            yield ''

    monkeypatch.setattr('app.main.narrator.stream_result_text', empty_stream)
    monkeypatch.setattr('app.main.narrator.parse_result_text', lambda *_: None)

    status_code, stream_text = stream_request(
        '/api/read/stream',
        {
            'profile_id': profile_id,
            'feature_type': 'week',
            'period_key': '2026-W16',
        },
    )

    assert status_code == 200
    events = parse_sse_events(stream_text)
    assert any(name == 'delta' for name, _ in events)
    done_events = [payload for name, payload in events if name == 'done']
    assert len(done_events) == 1


# ── Lane A tests ──────────────────────────────────────────────────────────────

def test_profile_name_is_optional() -> None:
    """name=None으로 프로필 생성이 성공해야 한다."""
    resp = request(
        'POST',
        '/api/profile',
        json={
            'name': None,
            'gender': 'M',
            'birth_date': '2000-06-15',
            'birth_time': None,
            'is_lunar': False,
        },
    )
    assert resp.status_code == 200
    assert 'profile_id' in resp.json()


def test_profile_name_excluded_from_hash() -> None:
    """name이 달라도 동일 생년월일/성별이면 같은 profile_id가 반환되어야 한다."""
    base = {
        'gender': 'F',
        'birth_date': '1997-12-25',
        'birth_time': '10:00',
        'is_lunar': False,
    }
    r1 = request('POST', '/api/profile', json={**base, 'name': None})
    r2 = request('POST', '/api/profile', json={**base, 'name': '공유링크사용자'})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()['profile_id'] == r2.json()['profile_id']


def test_birth_date_validation_invalid() -> None:
    """달력에 존재하지 않는 날짜는 422를 반환해야 한다."""
    for bad_date in ('1990-02-30', '2023-04-31', '2023-13-01'):
        resp = request(
            'POST',
            '/api/profile',
            json={
                'name': None,
                'gender': 'M',
                'birth_date': bad_date,
                'birth_time': None,
                'is_lunar': False,
            },
        )
        assert resp.status_code == 422, f"{bad_date} should be 422"


def test_fortune_result_expanded_limits(monkeypatch) -> None:
    """확장된 FortuneResult 한도(details=10, actions=12, summary=2000)로 저장되어야 한다."""
    profile_resp = request(
        'POST',
        '/api/profile',
        json={
            'name': None,
            'gender': 'M',
            'birth_date': '1985-03-15',
            'birth_time': None,
            'is_lunar': False,
        },
    )
    profile_id = profile_resp.json()['profile_id']

    long_summary = 'A' * 1500
    llm_result = {
        'title': '확장 한도 테스트',
        'summary': long_summary,
        'score': 70,
        'details': [{'subtitle': f'항목{i}', 'content': f'내용{i}'} for i in range(10)],
        'actions': [f'행동{i}' for i in range(12)],
    }
    monkeypatch.setattr('app.services.narrator.generate_result', lambda **_: llm_result)

    read_resp = request(
        'POST',
        '/api/read',
        json={
            'profile_id': profile_id,
            'feature_type': 'week',
            'period_key': '2026-W20',
        },
    )
    read_id = read_resp.json()['read_id']
    body = request('GET', f'/api/read/{read_id}').json()
    assert len(body['result_json']['details']) == 10
    assert len(body['result_json']['actions']) == 12
    assert len(body['result_json']['summary']) == 1500


# ── Lane B tests ──────────────────────────────────────────────────────────────

def test_tooltips_with_mock_llm(monkeypatch) -> None:
    """LLM이 용어 설명을 반환하면 /api/tooltips가 해당 설명을 돌려줘야 한다."""
    profile_resp = request(
        'POST',
        '/api/profile',
        json={'name': None, 'gender': 'M', 'birth_date': '1988-04-10', 'birth_time': None, 'is_lunar': False},
    )
    profile_id = profile_resp.json()['profile_id']

    def fake_tooltips(profile, terms):
        return {t: f'{t}에 대한 설명입니다.' for t in terms}

    monkeypatch.setattr('app.services.narrator.generate_tooltips', fake_tooltips)

    resp = request('POST', '/api/tooltips', json={'profile_id': profile_id, 'terms': ['일간', '대운']})
    assert resp.status_code == 200
    tooltips = resp.json()['tooltips']
    assert '일간' in tooltips
    assert '대운' in tooltips
    assert '일간에 대한 설명' in tooltips['일간']


def test_tooltips_cache_hit(monkeypatch) -> None:
    """동일 용어 두 번째 요청은 LLM을 호출하지 않고 캐시를 반환해야 한다."""
    profile_resp = request(
        'POST',
        '/api/profile',
        json={'name': None, 'gender': 'F', 'birth_date': '1999-11-11', 'birth_time': None, 'is_lunar': False},
    )
    profile_id = profile_resp.json()['profile_id']

    call_count = {'n': 0}

    def counting_tooltips(profile, terms):
        call_count['n'] += 1
        return {t: f'{t} 설명' for t in terms}

    monkeypatch.setattr('app.services.narrator.generate_tooltips', counting_tooltips)

    r1 = request('POST', '/api/tooltips', json={'profile_id': profile_id, 'terms': ['비겁']})
    assert r1.status_code == 200

    r2 = request('POST', '/api/tooltips', json={'profile_id': profile_id, 'terms': ['비겁']})
    assert r2.status_code == 200
    assert r2.json()['tooltips']['비겁'] == r1.json()['tooltips']['비겁']
    # LLM은 최초 한 번만 호출되어야 한다
    assert call_count['n'] == 1


def test_tooltips_profile_not_found() -> None:
    """/api/tooltips에 존재하지 않는 profile_id를 전달하면 404가 반환되어야 한다."""
    resp = request('POST', '/api/tooltips', json={'profile_id': 'nonexistent-id', 'terms': ['일간']})
    assert resp.status_code == 404


def test_events_create() -> None:
    """/api/events는 이벤트를 저장하고 success=true를 반환해야 한다."""
    resp = request(
        'POST',
        '/api/events',
        json={'session_id': 'test-session-001', 'event_type': 'reading_view'},
    )
    assert resp.status_code == 200
    assert resp.json() == {'success': True}


def test_events_with_term() -> None:
    """/api/events는 term 필드가 있어도 성공해야 한다."""
    resp = request(
        'POST',
        '/api/events',
        json={'session_id': 'test-session-002', 'event_type': 'tooltip_view', 'term': '일간'},
    )
    assert resp.status_code == 200
    assert resp.json()['success'] is True


def test_events_input_validation() -> None:
    """/api/events에 필수 필드 누락 시 422가 반환되어야 한다."""
    # session_id 누락
    resp = request('POST', '/api/events', json={'event_type': 'reading_view'})
    assert resp.status_code == 422

    # event_type 누락
    resp = request('POST', '/api/events', json={'session_id': 'abc'})
    assert resp.status_code == 422
