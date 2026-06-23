import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, User, Match, BetRecord, TxRecord } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const HERO_BG = 'https://cdn.poehali.dev/projects/537f4540-0f1f-432a-b32b-3617a032b9d1/files/b8d24735-3e17-4373-926d-64724f52baef.jpg';
const NAV = ['Главная', 'Матчи', 'Лидерборд', 'О нас'];

const DISCIPLINES = [
  { name: 'CS2', icon: 'Crosshair' },
  { name: 'Dota 2', icon: 'Swords' },
  { name: 'Valorant', icon: 'Target' },
  { name: 'League of Legends', icon: 'Shield' },
  { name: 'PUBG', icon: 'Crosshair' },
  { name: 'R6 Siege', icon: 'Lock' },
];

const LEADERS = [
  { rank: 1, name: 'CyberKing', profit: '+ 284 500 ₽', win: '78%' },
  { rank: 2, name: 'NeoStrike', profit: '+ 197 200 ₽', win: '71%' },
  { rank: 3, name: 'PhantomBet', profit: '+ 156 800 ₽', win: '69%' },
  { rank: 4, name: 'ApexHunter', profit: '+ 121 350 ₽', win: '64%' },
  { rank: 5, name: 'VortexPro', profit: '+ 98 700 ₽', win: '62%' },
];

const STATS = [
  { value: '2.4M+', label: 'Игроков' },
  { value: '180K', label: 'Матчей' },
  { value: '99.2%', label: 'Выплат' },
  { value: '24/7', label: 'Поддержка' },
];

const PICK_LABEL: Record<string, string> = { open: 'В игре', won: 'Выигрыш', lost: 'Проигрыш' };

function Overlay({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />;
}

function DiscTag({ name }: { name: string }) {
  return (
    <span className="rounded border border-gold/30 bg-gold/5 px-2 py-0.5 font-display text-[11px] font-500 uppercase tracking-widest text-gold">
      {name}
    </span>
  );
}

function OddsBtn({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="odds-btn flex flex-1 flex-col items-center rounded-lg border border-border bg-secondary/40 py-2.5 px-2">
      <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-600">{value.toFixed(2)}</span>
    </button>
  );
}

export default function Index() {
  const { toast } = useToast();
  const [navActive, setNavActive] = useState('Главная');
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [betTarget, setBetTarget] = useState<{ match: Match; pick: number } | null>(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [betAmount, setBetAmount] = useState('500');
  const [betLoading, setBetLoading] = useState(false);

  const [bets, setBets] = useState<BetRecord[]>([]);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadMatches = useCallback(() => {
    setMatchesLoading(true);
    api.matches()
      .then(setMatches)
      .catch(() => toast({ title: 'Не удалось загрузить матчи', variant: 'destructive' }))
      .finally(() => setMatchesLoading(false));
  }, []);

  useEffect(() => {
    loadMatches();
    if (api.hasToken()) {
      api.me().then(setUser).catch(() => api.logout());
    }
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthEmail(''); setAuthUsername(''); setAuthPassword('');
    setAuthMode(mode);
  };

  const submitAuth = async () => {
    if (!authEmail || !authPassword) { toast({ title: 'Заполните все поля', variant: 'destructive' }); return; }
    setAuthLoading(true);
    try {
      const u = authMode === 'login'
        ? await api.login(authEmail, authPassword)
        : await api.register(authEmail, authUsername, authPassword);
      setUser(u);
      toast({ title: authMode === 'login' ? 'С возвращением!' : 'Аккаунт создан!', description: `Привет, ${u.username}` });
      setAuthMode(null);
    } catch (e) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => { api.logout(); setUser(null); setProfileOpen(false); };

  const openProfile = () => {
    setProfileOpen(true);
    setHistoryLoading(true);
    api.history()
      .then((d) => { setBets(d.bets); setTxs(d.transactions); })
      .catch(() => toast({ title: 'Не удалось загрузить историю', variant: 'destructive' }))
      .finally(() => setHistoryLoading(false));
  };

  const requireAuth = (cb: () => void) => {
    if (!user) { openAuth('login'); return; }
    cb();
  };

  const openBet = (match: Match, pick: number) => {
    if (match.status !== 'upcoming') return;
    requireAuth(() => { setBetTarget({ match, pick }); setBetAmount('500'); });
  };

  const submitBet = async () => {
    if (!betTarget || !user) return;
    const amt = parseFloat(betAmount);
    if (!amt || amt <= 0) { toast({ title: 'Введите сумму', variant: 'destructive' }); return; }
    if (amt > user.balance) { toast({ title: 'Недостаточно средств', variant: 'destructive' }); return; }
    setBetLoading(true);
    try {
      const res = await api.placeBet(betTarget.match.id, betTarget.pick, amt);
      setUser({ ...user, balance: res.balance });
      toast({ title: 'Ставка принята!', description: `Возможный выигрыш: ${Number(res.potential_win).toFixed(2)} ₽` });
      setBetTarget(null);
      loadMatches();
    } catch (e) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBetLoading(false);
    }
  };

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const betOdds = betTarget ? (betTarget.pick === 1 ? betTarget.match.odds1 : betTarget.match.odds2) : 1;
  const betPotential = ((parseFloat(betAmount) || 0) * betOdds).toFixed(2);

  return (
    <div className="grain min-h-screen overflow-x-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-18 items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
              <Icon name="Hexagon" className="text-background" size={20} />
            </div>
            <span className="font-display text-2xl font-700 tracking-widest">A<span className="text-gold">P</span>EX</span>
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <button key={item} onClick={() => setNavActive(item)} className={`relative px-4 py-2 font-display text-sm font-500 uppercase tracking-wider transition-colors ${navActive === item ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {item}
                {navActive === item && <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gold" />}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={openProfile} className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 py-1.5 pl-4 pr-1.5 transition-all hover:border-emerald/50">
                <span className="font-display font-600 text-gold">{user.balance.toFixed(0)} ₽</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40 font-display text-sm font-700 text-background">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => openAuth('login')} className="hidden font-display uppercase tracking-wide sm:flex">Войти</Button>
                <Button onClick={() => openAuth('register')} className="bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">Регистрация</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="container relative z-10 py-24 md:py-36">
          <div className="max-w-3xl animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/5 px-4 py-1.5">
              <span className="h-2 w-2 animate-live-blink rounded-full bg-emerald" />
              <span className="font-display text-xs uppercase tracking-widest text-emerald">{live.length} матчей в эфире прямо сейчас</span>
            </div>
            <h1 className="font-display text-5xl font-700 leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              СТАВКИ НА<br /><span className="gold-gradient">КИБЕРСПОРТ</span><br />
              <span className="font-serif text-4xl font-400 italic text-muted-foreground md:text-5xl">премиум-класса</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Лучшие коэффициенты на CS2, Dota 2, Valorant и League of Legends. Live-аналитика, мгновенные выплаты.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button size="lg" onClick={() => requireAuth(() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' }))} className="bg-emerald font-display text-base font-600 uppercase tracking-wide text-primary-foreground hover:bg-emerald/90">
                <Icon name="Zap" size={18} className="mr-2" /> Начать играть
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' })} className="border-gold/40 font-display text-base font-500 uppercase tracking-wide text-gold hover:bg-gold/10">
                Смотреть матчи
              </Button>
            </div>
          </div>
          <div className="mt-20 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card/80 p-6 text-center backdrop-blur">
                <div className="font-display text-3xl font-700 emerald-gradient md:text-4xl">{s.value}</div>
                <div className="mt-1 font-display text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISCIPLINES */}
      <section className="container py-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DISCIPLINES.map((d, i) => (
            <button key={d.name} style={{ animationDelay: `${i * 60}ms` }} className="glass glass-hover animate-scale-in flex items-center gap-3 rounded-xl px-5 py-3">
              <Icon name={d.icon} size={20} className="text-emerald" />
              <span className="font-display font-500 uppercase tracking-wide">{d.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* LIVE MATCHES */}
      {live.length > 0 && (
        <section className="container py-10">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 animate-live-blink rounded-full bg-destructive" />
              <span className="font-display text-xs uppercase tracking-widest text-destructive">В эфире</span>
            </div>
            <h2 className="font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">Live матчи</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {live.map((m, i) => (
              <article key={m.id} style={{ animationDelay: `${i * 100}ms` }} className="glass animate-fade-in overflow-hidden rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <DiscTag name={m.discipline} />
                  <span className="flex items-center gap-1.5 font-display text-xs uppercase tracking-wider text-destructive">
                    <span className="h-1.5 w-1.5 animate-live-blink rounded-full bg-destructive" /> LIVE
                  </span>
                </div>
                <div className="mb-4 text-xs text-muted-foreground">{m.tournament}</div>
                <div className="space-y-3">
                  <div className="font-display text-lg font-500">{m.team1}</div>
                  <div className="divider-gold" />
                  <div className="font-display text-lg font-500">{m.team2}</div>
                </div>
                <div className="mt-4 rounded-lg border border-border/40 bg-secondary/30 py-2 text-center text-xs text-muted-foreground">
                  Ставки закрыты — матч идёт
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING MATCHES */}
      <section id="matches" className="container py-14">
        <h2 className="mb-8 font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">
          Ближайшие <span className="gold-gradient">события</span>
        </h2>
        <div className="glass overflow-hidden rounded-2xl">
          {matchesLoading ? (
            <div className="p-10 text-center text-muted-foreground">Загрузка матчей...</div>
          ) : upcoming.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Скоро появятся новые матчи</div>
          ) : upcoming.map((m) => (
            <div key={m.id} className="flex flex-col gap-4 border-b border-border/40 p-5 transition-colors last:border-0 hover:bg-emerald/5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <DiscTag name={m.discipline} />
                <div>
                  <div className="font-display font-500">{m.team1} <span className="text-muted-foreground">vs</span> {m.team2}</div>
                  <div className="text-xs text-muted-foreground">{m.tournament}</div>
                </div>
              </div>
              <div className="flex gap-2 md:w-80">
                <OddsBtn label={`П1`} value={m.odds1} onClick={() => openBet(m, 1)} />
                <OddsBtn label={`П2`} value={m.odds2} onClick={() => openBet(m, 2)} />
              </div>
            </div>
          ))}
        </div>
        {!user && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <button onClick={() => openAuth('login')} className="text-emerald hover:underline">Войдите</button> или <button onClick={() => openAuth('register')} className="text-gold hover:underline">зарегистрируйтесь</button>, чтобы сделать ставку
          </p>
        )}
      </section>

      {/* LEADERBOARD */}
      <section className="container py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">Лидерборд</h2>
            <p className="mb-8 text-muted-foreground">Лучшие игроки месяца по чистой прибыли</p>
            <div className="glass overflow-hidden rounded-2xl">
              {LEADERS.map((l) => (
                <div key={l.rank} className="flex items-center gap-4 border-b border-border/40 p-4 transition-colors last:border-0 hover:bg-gold/5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg font-display text-lg font-700 ${l.rank === 1 ? 'bg-gold/20 text-gold' : l.rank <= 3 ? 'bg-emerald/15 text-emerald' : 'bg-secondary text-muted-foreground'}`}>{l.rank}</span>
                  <div className="flex-1">
                    <div className="font-display font-500">{l.name}</div>
                    <div className="text-xs text-muted-foreground">Винрейт {l.win}</div>
                  </div>
                  <span className="font-display font-600 text-emerald">{l.profit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="glass relative overflow-hidden rounded-3xl p-10">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
              <Icon name="Trophy" size={40} className="mb-6 text-gold" />
              <h3 className="font-display text-3xl font-700 uppercase leading-tight">Турнир<br /><span className="gold-gradient">APEX Champions</span></h3>
              <p className="mt-4 text-muted-foreground">Призовой фонд 5 000 000 ₽. Соревнуйтесь с лучшими игроками платформы.</p>
              <div className="mt-8 flex flex-wrap gap-6">
                <div>
                  <div className="font-display text-3xl font-700 gold-gradient">5М ₽</div>
                  <div className="font-display text-xs uppercase tracking-widest text-muted-foreground">Призовой фонд</div>
                </div>
                <div>
                  <div className="font-display text-3xl font-700 emerald-gradient">14 дней</div>
                  <div className="font-display text-xs uppercase tracking-widest text-muted-foreground">До финала</div>
                </div>
              </div>
              <Button onClick={() => requireAuth(openProfile)} className="mt-8 bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">Участвовать</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="glass relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald/10 blur-3xl animate-glow-pulse" />
          <h2 className="relative font-display text-4xl font-700 uppercase tracking-tight md:text-6xl">Готовы сделать<br /><span className="emerald-gradient">первую ставку?</span></h2>
          <p className="relative mx-auto mt-5 max-w-lg text-muted-foreground">Зарегистрируйтесь и получите 1000 ₽ приветственного бонуса на баланс.</p>
          <Button size="lg" onClick={() => user ? document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('register')} className="relative mt-9 bg-gold font-display text-base font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">
            <Icon name="Sparkles" size={18} className="mr-2" />
            {user ? 'Сделать ставку' : 'Получить бонус'}
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60">
        <div className="container py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
                <Icon name="Hexagon" className="text-background" size={18} />
              </div>
              <span className="font-display text-xl font-700 tracking-widest">A<span className="text-gold">P</span>EX</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {NAV.map((item) => (
                <button key={item} onClick={() => setNavActive(item)} className="font-display text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-gold">{item}</button>
              ))}
            </div>
          </div>
          <div className="divider-gold my-8" />
          <p className="text-center text-xs text-muted-foreground">© 2026 APEX Esports Betting. 18+. Играйте ответственно. Все права защищены.</p>
        </div>
      </footer>

      {/* ===== AUTH MODAL ===== */}
      {authMode && (
        <>
          <Overlay onClose={() => setAuthMode(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="glass animate-scale-in overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
              <div className="p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
                      <Icon name="Hexagon" className="text-background" size={20} />
                    </div>
                    <span className="font-display text-2xl font-700 tracking-widest">A<span className="text-gold">P</span>EX</span>
                  </div>
                  <button onClick={() => setAuthMode(null)} className="text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={20} />
                  </button>
                </div>
                <h2 className="mb-1 font-display text-3xl font-700 uppercase">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  {authMode === 'login' ? 'Войдите, чтобы делать ставки' : 'Создайте аккаунт и получите 1000 ₽ бонуса'}
                </p>
                <div className="space-y-3">
                  <Input placeholder="Email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="bg-secondary/40" />
                  {authMode === 'register' && (
                    <Input placeholder="Имя пользователя" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} className="bg-secondary/40" />
                  )}
                  <Input placeholder="Пароль" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitAuth()} className="bg-secondary/40" />
                </div>
                <Button onClick={submitAuth} disabled={authLoading} className="mt-6 w-full bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">
                  {authLoading ? 'Загрузка...' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </Button>
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                  <button onClick={() => openAuth(authMode === 'login' ? 'register' : 'login')} className="font-500 text-emerald hover:underline">
                    {authMode === 'login' ? 'Регистрация' : 'Войти'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== BET MODAL ===== */}
      {betTarget && (
        <>
          <Overlay onClose={() => setBetTarget(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="glass animate-scale-in overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
              <div className="p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DiscTag name={betTarget.match.discipline} />
                    <span className="text-xs text-muted-foreground">{betTarget.match.tournament}</span>
                  </div>
                  <button onClick={() => setBetTarget(null)} className="text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={20} />
                  </button>
                </div>
                <h2 className="font-display text-2xl font-700 uppercase">
                  {betTarget.match.team1} <span className="text-muted-foreground">vs</span> {betTarget.match.team2}
                </h2>
                <div className="mt-6 rounded-xl border border-emerald/30 bg-emerald/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Ваш выбор</div>
                      <div className="font-display text-xl font-600 text-emerald">
                        {betTarget.pick === 1 ? betTarget.match.team1 : betTarget.match.team2}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Коэффициент</div>
                      <div className="font-display text-2xl font-700 text-gold">{betOdds.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Сумма ставки</span>
                    <span className="text-muted-foreground">Баланс: <span className="text-emerald">{user?.balance.toFixed(2)} ₽</span></span>
                  </div>
                  <Input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} className="bg-secondary/40 font-display text-lg" />
                  <div className="mt-3 flex gap-2">
                    {[100, 500, 1000, 5000].map((q) => (
                      <button key={q} onClick={() => setBetAmount(String(q))} className="flex-1 rounded-lg border border-border bg-secondary/40 py-1.5 text-sm transition-colors hover:border-emerald hover:text-emerald">{q}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary/40 p-4">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">Возможный выигрыш</span>
                  <span className="font-display text-2xl font-700 gold-gradient">{betPotential} ₽</span>
                </div>
                <Button onClick={submitBet} disabled={betLoading} className="mt-6 w-full bg-emerald font-display font-600 uppercase tracking-wide text-primary-foreground hover:bg-emerald/90">
                  <Icon name="Check" size={18} className="mr-2" />
                  {betLoading ? 'Принимаем...' : 'Подтвердить ставку'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== PROFILE MODAL ===== */}
      {profileOpen && user && (
        <>
          <Overlay onClose={() => setProfileOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="glass animate-scale-in overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
              <div className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald/40 font-display text-2xl font-700 text-background">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-700">{user.username}</h2>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="mt-1 inline-block rounded bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">Администратор</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                      <Icon name="LogOut" size={16} className="mr-1.5" /> Выйти
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setProfileOpen(false)} className="text-muted-foreground">
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Баланс</div>
                  <div className="font-display text-4xl font-700 gold-gradient">{user.balance.toFixed(2)} ₽</div>
                </div>
                <Tabs defaultValue="bets" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2 bg-secondary/40">
                    <TabsTrigger value="bets" className="font-display uppercase tracking-wide">Ставки</TabsTrigger>
                    <TabsTrigger value="tx" className="font-display uppercase tracking-wide">Транзакции</TabsTrigger>
                  </TabsList>
                  <TabsContent value="bets" className="mt-4 max-h-64 overflow-y-auto space-y-2">
                    {historyLoading ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
                    ) : bets.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Ставок пока нет — выберите матч!</p>
                    ) : bets.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/30 p-3">
                        <div>
                          <div className="font-display text-sm font-500">{b.pick === 1 ? b.team1 : b.team2} <span className="text-muted-foreground">@ {b.odds.toFixed(2)}</span></div>
                          <div className="text-xs text-muted-foreground">{b.team1} vs {b.team2} · {b.discipline}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-600">{b.amount.toFixed(0)} ₽</div>
                          <div className={`text-xs ${b.status === 'won' ? 'text-emerald' : b.status === 'lost' ? 'text-destructive' : 'text-muted-foreground'}`}>{PICK_LABEL[b.status] || b.status}</div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="tx" className="mt-4 max-h-64 overflow-y-auto space-y-2">
                    {historyLoading ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
                    ) : txs.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Операций пока нет</p>
                    ) : txs.map((t, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/30 p-3">
                        <div>
                          <div className="font-display text-sm font-500">{t.description}</div>
                          <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('ru-RU')}</div>
                        </div>
                        <div className={`font-display font-600 ${t.amount >= 0 ? 'text-emerald' : 'text-destructive'}`}>
                          {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)} ₽
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
