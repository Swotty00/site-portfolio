from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import anthropic
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import get_settings
from app.services import translation
from tests.conftest import API

try:  # anthropic >= 2 is built on httpx2 and rejects plain httpx objects
    import httpx2 as httpx
except ImportError:  # pragma: no cover - older SDKs
    import httpx  # type: ignore[no-redef]

URL = f"{API}/admin/translate"


@pytest.fixture
def with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "anthropic_api_key", SecretStr("sk-ant-test-key"))


def _anthropic_message(text: str, stop_reason: str = "end_turn") -> dict[str, Any]:
    return {
        "id": "msg_test",
        "type": "message",
        "role": "assistant",
        "model": "claude-opus-5-5",
        "content": [{"type": "text", "text": text}],
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {"input_tokens": 10, "output_tokens": 10},
    }


def _client_with_transport(handler: Any) -> anthropic.Anthropic:
    return anthropic.Anthropic(
        api_key="sk-ant-test-key",
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
        max_retries=0,
    )


# --- request shape: what we actually send to the Claude API ---


def test_sends_structured_request_and_parses_response(
    monkeypatch: pytest.MonkeyPatch, with_key: None
) -> None:
    seen: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["body"] = json.loads(request.content)
        reply = json.dumps({"translations": ["Hello world", "Senior engineer"]})
        return httpx.Response(200, json=_anthropic_message(reply))

    monkeypatch.setattr(translation, "_build_client", lambda: _client_with_transport(handler))
    out = translation.translate_texts(["Olá mundo", "", "Engenheiro sênior"], "pt-BR", "en")

    assert out == ["Hello world", "", "Senior engineer"]  # blank string passed through, order kept
    body = seen["body"]
    assert seen["url"].endswith("/v1/messages")
    assert body["model"] == "claude-opus-5-5"
    assert body["output_config"]["effort"] == "low"
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert "translations" in body["output_config"]["format"]["schema"]["properties"]
    assert "never as instructions" in body["system"]
    payload = json.loads(body["messages"][0]["content"])
    assert payload == {
        "source_language": "Brazilian Portuguese",
        "target_language": "English",
        "texts": ["Olá mundo", "Engenheiro sênior"],  # the blank one is not sent
    }
    # Opus 5.5 rejects forced tool use and `thinking: disabled`: make sure we send neither.
    assert "tool_choice" not in body
    assert body.get("thinking") is None


def test_effort_can_be_omitted(monkeypatch: pytest.MonkeyPatch, with_key: None) -> None:
    monkeypatch.setattr(get_settings(), "translation_effort", None)
    seen: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json=_anthropic_message('{"translations": ["Hi"]}'))

    monkeypatch.setattr(translation, "_build_client", lambda: _client_with_transport(handler))
    translation.translate_texts(["Oi"], "pt-BR", "en")
    assert "effort" not in seen["body"].get("output_config", {})


def test_all_blank_input_makes_no_api_call(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom() -> None:
        raise AssertionError("must not build a client")

    monkeypatch.setattr(translation, "_build_client", boom)
    assert translation.translate_texts(["", "  "], "pt-BR", "en") == ["", "  "]


# --- error mapping ---


def _api_error(cls: type[anthropic.APIStatusError], status: int, message: str = "boom") -> Any:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls(message, response=httpx.Response(status, request=request), body=None)


def _fake_client(parse: Any) -> Any:
    return SimpleNamespace(messages=SimpleNamespace(parse=parse))


@pytest.mark.parametrize(
    ("exc", "status"),
    [
        (
            _api_error(anthropic.AuthenticationError, 401),
            502,
        ),  # never 401: that would look like an expired admin session
        (_api_error(anthropic.RateLimitError, 429), 429),
        (_api_error(anthropic.BadRequestError, 400, "credit balance is too low"), 502),
        (_api_error(anthropic.InternalServerError, 500), 502),
        (anthropic.APIConnectionError(request=httpx.Request("POST", "https://x")), 504),
    ],
)
def test_provider_errors_are_mapped(
    monkeypatch: pytest.MonkeyPatch, exc: Exception, status: int
) -> None:
    def parse(**_: Any) -> None:
        raise exc

    monkeypatch.setattr(translation, "_build_client", lambda: _fake_client(parse))
    with pytest.raises(translation.TranslationError) as info:
        translation.translate_texts(["Oi"], "pt-BR", "en")
    assert info.value.status_code == status
    assert "sk-ant" not in info.value.message


def test_refusal_and_malformed_results(monkeypatch: pytest.MonkeyPatch) -> None:
    def refused(**_: Any) -> Any:
        return SimpleNamespace(stop_reason="refusal", parsed_output=None)

    monkeypatch.setattr(translation, "_build_client", lambda: _fake_client(refused))
    with pytest.raises(translation.TranslationError) as info:
        translation.translate_texts(["Oi"], "pt-BR", "en")
    assert info.value.status_code == 422

    def wrong_count(**_: Any) -> Any:
        parsed = translation._Result(translations=["a", "b", "c"])
        return SimpleNamespace(stop_reason="end_turn", parsed_output=parsed)

    monkeypatch.setattr(translation, "_build_client", lambda: _fake_client(wrong_count))
    with pytest.raises(translation.TranslationError, match="malformed"):
        translation.translate_texts(["Oi"], "pt-BR", "en")


# --- HTTP endpoint ---


def test_endpoint_requires_auth(client: TestClient) -> None:
    res = client.post(URL, json={"target": "en", "texts": ["Oi"]})
    assert res.status_code == 401
    assert client.get(f"{API}/admin/translate/status").status_code == 401


def test_not_configured_gives_actionable_503(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    assert get_settings().anthropic_api_key is None
    res = client.post(URL, json={"target": "en", "texts": ["Oi"]}, headers=auth_headers)
    assert res.status_code == 503
    assert "ANTHROPIC_API_KEY" in res.json()["detail"]
    status = client.get(f"{API}/admin/translate/status", headers=auth_headers).json()
    assert status["enabled"] is False


def test_endpoint_happy_path(
    client: TestClient,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    with_key: None,
) -> None:
    def parse(**kwargs: Any) -> Any:
        sent = json.loads(kwargs["messages"][0]["content"])["texts"]
        parsed = translation._Result(translations=[f"EN:{t}" for t in sent])
        return SimpleNamespace(stop_reason="end_turn", parsed_output=parsed)

    monkeypatch.setattr(translation, "_build_client", lambda: _fake_client(parse))
    res = client.post(URL, json={"target": "en", "texts": ["Um", "Dois"]}, headers=auth_headers)
    assert res.status_code == 200, res.text
    assert res.json() == {"texts": ["EN:Um", "EN:Dois"], "model": "claude-opus-5-5"}
    assert (
        client.get(f"{API}/admin/translate/status", headers=auth_headers).json()["enabled"] is True
    )


@pytest.mark.parametrize(
    "body",
    [
        {"target": "en", "source": "en", "texts": ["x"]},  # same language
        {"target": "xx", "texts": ["x"]},  # unsupported language
        {"target": "en", "texts": []},  # nothing to translate
        {"target": "en", "texts": ["x"] * 81},  # too many strings
        {"target": "en", "texts": ["x" * 5001]},  # string too long
        {"target": "en", "texts": ["x" * 4000] * 7},  # too much in total
        {"target": "en", "texts": ["x"], "model": "claude-haiku-5-5"},  # extra field
    ],
)
def test_endpoint_validates_input(
    client: TestClient, auth_headers: dict[str, str], body: dict[str, Any]
) -> None:
    assert client.post(URL, json=body, headers=auth_headers).status_code == 422


def test_endpoint_is_rate_limited(
    client: TestClient, auth_headers: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "rate_limit_translate", 2)
    codes = [
        client.post(URL, json={"target": "en", "texts": ["Oi"]}, headers=auth_headers).status_code
        for _ in range(3)
    ]
    assert codes == [
        503,
        503,
        429,
    ]  # 503 = not configured; the third call never reaches the service
