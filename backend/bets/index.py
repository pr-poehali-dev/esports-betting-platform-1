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


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


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


def get_auth(event):
    token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token', '')
    return verify_token(token)


def handler(event: dict, context) -> dict:
    '''Матчи и ставки: список матчей, размещение ставки, история ставок и транзакций.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'matches')

    if method == 'GET' and action == 'matches':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, discipline, tournament, team1, team2, odds1, odds2, status, winner, starts_at "
            f"FROM {SCHEMA}.matches ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, starts_at"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        matches = [{
            'id': r[0], 'discipline': r[1], 'tournament': r[2], 'team1': r[3], 'team2': r[4],
            'odds1': float(r[5]), 'odds2': float(r[6]), 'status': r[7], 'winner': r[8],
            'starts_at': r[9].isoformat() if r[9] else None
        } for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'matches': matches})}

    auth = get_auth(event)
    if not auth:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Войдите в аккаунт'})}
    uid = auth['uid']

    if method == 'GET' and action == 'history':
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT b.id, m.team1, m.team2, b.pick, b.amount, b.odds, b.potential_win, b.status, b.created_at, m.discipline "
            f"FROM {SCHEMA}.bets b JOIN {SCHEMA}.matches m ON m.id = b.match_id "
            f"WHERE b.user_id = %s ORDER BY b.created_at DESC LIMIT 50", (uid,)
        )
        rows = cur.fetchall()
        cur.execute(
            f"SELECT type, amount, balance_after, description, created_at FROM {SCHEMA}.transactions "
            f"WHERE user_id = %s ORDER BY created_at DESC LIMIT 50", (uid,)
        )
        txs = cur.fetchall()
        cur.close()
        conn.close()
        bets = [{
            'id': r[0], 'team1': r[1], 'team2': r[2], 'pick': r[3], 'amount': float(r[4]),
            'odds': float(r[5]), 'potential_win': float(r[6]), 'status': r[7],
            'created_at': r[8].isoformat() if r[8] else None, 'discipline': r[9]
        } for r in rows]
        transactions = [{
            'type': t[0], 'amount': float(t[1]), 'balance_after': float(t[2]),
            'description': t[3], 'created_at': t[4].isoformat() if t[4] else None
        } for t in txs]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'bets': bets, 'transactions': transactions})}

    if method == 'POST' and action == 'place':
        body = json.loads(event.get('body') or '{}')
        match_id = body.get('match_id')
        pick = body.get('pick')
        amount = body.get('amount')
        try:
            amount = round(float(amount), 2)
        except (TypeError, ValueError):
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неверная сумма'})}
        if pick not in (1, 2) or amount <= 0:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Проверьте данные ставки'})}

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(f"SELECT balance, is_banned FROM {SCHEMA}.users WHERE id = %s FOR UPDATE", (uid,))
            urow = cur.fetchone()
            if not urow:
                conn.rollback()
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}
            balance, banned = float(urow[0]), urow[1]
            if banned:
                conn.rollback()
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Аккаунт заблокирован'})}
            if amount > balance:
                conn.rollback()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Недостаточно средств'})}

            cur.execute(f"SELECT odds1, odds2, status FROM {SCHEMA}.matches WHERE id = %s", (match_id,))
            mrow = cur.fetchone()
            if not mrow:
                conn.rollback()
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Матч не найден'})}
            odds1, odds2, status = float(mrow[0]), float(mrow[1]), mrow[2]
            if status != 'upcoming':
                conn.rollback()
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Ставки на этот матч закрыты'})}

            odds = odds1 if pick == 1 else odds2
            potential = round(amount * odds, 2)
            new_balance = round(balance - amount, 2)

            cur.execute(f"UPDATE {SCHEMA}.users SET balance = %s WHERE id = %s", (new_balance, uid))
            cur.execute(
                f"INSERT INTO {SCHEMA}.bets (user_id, match_id, pick, amount, odds, potential_win) "
                f"VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (uid, match_id, pick, amount, odds, potential)
            )
            bet_id = cur.fetchone()[0]
            cur.execute(
                f"INSERT INTO {SCHEMA}.transactions (user_id, type, amount, balance_after, description) "
                f"VALUES (%s, 'bet', %s, %s, %s)",
                (uid, -amount, new_balance, f'Ставка #{bet_id}')
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'bet_id': bet_id, 'balance': new_balance, 'potential_win': potential
            })}
        except Exception as e:
            conn.rollback()
            return {'statusCode': 500, 'headers': CORS, 'body': json.dumps({'error': 'Ошибка обработки ставки'})}
        finally:
            cur.close()
            conn.close()

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Неизвестное действие'})}
