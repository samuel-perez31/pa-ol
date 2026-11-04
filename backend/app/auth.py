"""Utilidades de contraseñas y tokens de sesión.

Se usa solo la biblioteca estándar para no sumar dependencias al proyecto.
Las contraseñas se guardan con PBKDF2-SHA256 + sal aleatoria.
"""

import base64
import hashlib
import hmac
import secrets

ITERACIONES = 200_000


def hash_password(password: str) -> str:
    sal = secrets.token_bytes(16)
    derivada = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), sal, ITERACIONES)
    return "pbkdf2_sha256${}${}${}".format(
        ITERACIONES,
        base64.b64encode(sal).decode("ascii"),
        base64.b64encode(derivada).decode("ascii"),
    )


def verificar_password(password: str, guardado: str) -> bool:
    try:
        algoritmo, iteraciones, sal_b64, hash_b64 = guardado.split("$", 3)
        if algoritmo != "pbkdf2_sha256":
            return False
        sal = base64.b64decode(sal_b64)
        esperado = base64.b64decode(hash_b64)
        derivada = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), sal, int(iteraciones)
        )
        return hmac.compare_digest(derivada, esperado)
    except (ValueError, TypeError):
        return False


def token_nuevo() -> str:
    return secrets.token_urlsafe(48)
