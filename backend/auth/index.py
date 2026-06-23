import json
import os
import hashlib
import hmac
import base64
import time
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p849728_esports_betting_plat')
JWT_SECRET = os.environ.get('JWT_SECRET', os.environ.get('AWS_SECRET_ACCESS_KEY', 'apex-fallback-secret'))

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return base64.b64encode(salt).decode() + '$' + base64.b64encode(dk).decode()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, dk_b64 = stored.split('$')
        salt = base64.b64decode(salt_b64)
        dk = base64.b64decode(dk_b64)
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(dk, check)
    except Exception:
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def make_token(user_id: int, role: str) -> str:
    header = _b64url(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    payload_data = {'uid': user_id, 'role': role, 'exp': int(time.time()) + 7 * 24 * 3600}
    payload = _b64url(json.dumps(payload_data).encode())
    signing_input = f'{header}.{payload}'.encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f'{header}.{payload}.{_b64url(sig)}'


def verify_token(token: str):
    try:
        header, payload, sig = token.split('.')
        signing_input = f'{header}.{payload}'.encode()
        expected = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url(expected), sig):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get('exp', 0) < int(time.time()):
            return None
        return data
    except Exception:
        return None


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    '''Авторизация: регистрация, вход и получение профиля пользователя с балансом.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if method == 'GET' and action == 'me':
        token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token', '')
        data = verify_token(token)
        if not data:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, email, username, role, balance, is_banned FROM {SCHEMA}.users WHERE id = %s", (data['uid'],))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
            'id': row[0], 'email': row[1], 'username': row[2], 'role': row[3],
            'balance': float(row[4]), 'is_banned': row[5]
        })}

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        email = (body.get('email') or '').strip().lower()
        password = body.get('password') or ''

        if action == 'register':
            username = (body.get('username') or '').strip()
            if not email or not password or not username:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
            if cur.fetchone():
                cur.close()
                conn.close()
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}
            ph = hash_password(password)
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (email, username, password_hash) VALUES (%s, %s, %s) RETURNING id, role, balance",
                (email, username, ph)
            )
            uid, role, balance = cur.fetchone()
            cur.execute(
                f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, balance_after, description) VALUES (%s, 'bonus', %s, %s, %s)",
                (uid, float(balance), float(balance), 'Приветственный бонус')
            )
            conn.commit()
            cur.close()
            conn.close()
            token = make_token(uid, role)
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': token,
                'user': {'id': uid, 'email': email, 'username': username, 'role': role, 'balance': float(balance)}
            })}

        if action == 'login':
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT id, username, password_hash, role, balance, is_banned FROM {SCHEMA}.users WHERE email = %s", (email,))
            row = cur.fetchone()
            cur.close()
            conn.close()
            if not row or not verify_password(password, row[2]):
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            if row[5]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Аккаунт заблокирован'})}
            token = make_token(row[0], row[3])
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': token,
                'user': {'id': row[0], 'email': email, 'username': row[1], 'role': row[3], 'balance': float(row[4])}
            })}

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неизвестное действие'})}
