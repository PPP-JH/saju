import asyncio
import atexit
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
