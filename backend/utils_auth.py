# utils_auth.py
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from passlib.context import CryptContext
from jose import jwt

# Defensive bcrypt import: some environments expose different metadata which can cause passlib logs/errors.
try:
    import bcrypt as _bcrypt  # type: ignore
except Exception:
    _bcrypt = None

# config
SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key_change_me")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Use Argon2 for new hashes
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    if password is None:
        raise ValueError("Password cannot be None")
    return pwd_context.hash(password)

def _is_argon2_hash(h: str) -> bool:
    return h.startswith("$argon2")

def _is_bcrypt_hash(h: str) -> bool:
    return h.startswith("$2")  # $2a$ $2b$ $2y$ etc.

def verify_password(plain_password: str, hashed_password: str) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_valid, new_hash_if_upgrade_needed)
    - If stored hash is argon2: verify with passlib.
    - If stored hash is bcrypt ($2*): verify with bcrypt directly (apply 72-byte truncation).
      On success, return a new argon2 hash so caller can upgrade DB.
    """
    if not plain_password or not hashed_password:
        return False, None

    # Argon2 (preferred)
    try:
        if _is_argon2_hash(hashed_password):
            ok = pwd_context.verify(plain_password, hashed_password)
            if ok and pwd_context.needs_update(hashed_password):
                # rehash with current argon2 params
                return True, hash_password(plain_password)
            return ok, None
    except Exception as e:
        # Defensive: if argon2 verify fails, log and return false (do not crash).
        print("Warning: argon2 verify error:", e)
        return False, None

    # Legacy bcrypt fallback (only if bcrypt module present)
    if _bcrypt is None:
        # bcrypt module not available; can't verify legacy bcrypt hashes here.
        return False, None

    try:
        if _is_bcrypt_hash(hashed_password):
            plain_bytes = plain_password.encode("utf-8")
            truncated = plain_bytes[:72]  # bcrypt legacy truncation behaviour
            ok = _bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
            if ok:
                # Suggest upgrade: provide a new argon2 hash to store
                return True, hash_password(plain_password)
            return False, None
    except ValueError as ve:
        # e.g., bcrypt complaints about input length — handle gracefully
        print("Warning: bcrypt ValueError during verify_password:", ve)
        return False, None
    except Exception as e:
        print("Warning: bcrypt verify exception:", e)
        return False, None

    # Unknown scheme: fail
    return False, None

# JWT helpers
def create_access_token(data: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    if expires_minutes is None:
        expires_minutes = ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
