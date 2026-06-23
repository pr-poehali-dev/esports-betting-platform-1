const AUTH_URL = 'https://functions.poehali.dev/56a027ce-29d8-4328-88a4-1b4ae4345e09';
const BETS_URL = 'https://functions.poehali.dev/739a0003-8b37-4c6f-909c-67e2dc85759f';

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  balance: number;
}

export interface Match {
  id: number;
  discipline: string;
  tournament: string;
  team1: string;
  team2: string;
  odds1: number;
  odds2: number;
  status: string;
  winner: number | null;
  starts_at: string | null;
}

export interface BetRecord {
  id: number;
  team1: string;
  team2: string;
  pick: number;
  amount: number;
  odds: number;
  potential_win: number;
  status: string;
  created_at: string;
  discipline: string;
}

export interface TxRecord {
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

function token() {
  return localStorage.getItem('apex_token') || '';
}

async function req(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token(),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const api = {
  async register(email: string, username: string, password: string) {
    const data = await req(`${AUTH_URL}?action=register`, {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    localStorage.setItem('apex_token', data.token);
    return data.user as User;
  },
  async login(email: string, password: string) {
    const data = await req(`${AUTH_URL}?action=login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('apex_token', data.token);
    return data.user as User;
  },
  async me() {
    return (await req(`${AUTH_URL}?action=me`)) as User;
  },
  logout() {
    localStorage.removeItem('apex_token');
  },
  hasToken() {
    return !!token();
  },
  async matches() {
    const data = await req(`${BETS_URL}?action=matches`);
    return data.matches as Match[];
  },
  async placeBet(match_id: number, pick: number, amount: number) {
    return await req(`${BETS_URL}?action=place`, {
      method: 'POST',
      body: JSON.stringify({ match_id, pick, amount }),
    });
  },
  async history() {
    const data = await req(`${BETS_URL}?action=history`);
    return data as { bets: BetRecord[]; transactions: TxRecord[] };
  },
};
