import pytest

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_hash_roundtrip():
    hashed = hash_password("correct-horse-battery-staple")
    assert verify_password("correct-horse-battery-staple", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip():
    token = create_access_token(subject="user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"


def test_tampered_token_is_rejected():
    token = create_access_token(subject="user-123")
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    with pytest.raises(Exception):
        decode_access_token(tampered)
