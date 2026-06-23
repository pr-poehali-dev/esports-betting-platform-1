import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import BetModal from '@/components/BetModal';
import ProfileModal from '@/components/ProfileModal';
import { api, User, Match } from '@/lib/api';

const HERO_BG = 'https://cdn.poehali.dev/projects/537f4540-0f1f-432a-b32b-3617a032b9d1/files/b8d24735-3e17-4373-926d-64724f52baef.jpg';

const NAV = ['Главная', 'Матчи', 'Турниры', 'Лидерборд', 'Новости', 'О нас'];

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
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-600">{value.toFixed(2)}</span>
    </button>
  );
}

export default function Index() {
  const [active, setActive] = useState('Главная');
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [betTarget, setBetTarget] = useState<{ match: Match; pick: number } | null>(null);

  const loadMatches = useCallback(() => {
    api.matches().then(setMatches).catch(() => {});
  }, []);

  useEffect(() => {
    loadMatches();
    if (api.hasToken()) {
      api.me().then(setUser).catch(() => api.logout());
    }
  }, [loadMatches]);

  const openAuth = (mode: 'login' | 'register') => { setAuthMode(mode); setAuthOpen(true); };

  const requireAuth = (cb: () => void) => {
    if (!user) { openAuth('login'); return; }
    cb();
  };

  const handleBet = (match: Match, pick: number) => {
    if (match.status !== 'upcoming') return;
    requireAuth(() => setBetTarget({ match, pick }));
  };

  const logout = () => { api.logout(); setUser(null); setProfileOpen(false); };

  const liveMatches = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming');

  return (
    <div className="grain min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-18 items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
              <Icon name="Hexagon" className="text-background" size={20} />
            </div>
            <span className="font-display text-2xl font-700 tracking-widest">A<span className="text-gold">P</span>EX</span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <button
                key={item}
                onClick={() => setActive(item)}
                className={`relative px-4 py-2 font-display text-sm font-500 uppercase tracking-wider transition-colors ${
                  active === item ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item}
                {active === item && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gold" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 py-1.5 pl-4 pr-1.5 transition-colors hover:border-emerald/50"
              >
                <span className="font-display font-600 text-gold">{user.balance.toFixed(0)} ₽</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40 font-display text-sm font-700 text-background">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => openAuth('login')} className="hidden font-display uppercase tracking-wide sm:flex">Войти</Button>
                <Button onClick={() => openAuth('register')} className="bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${HERO_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="container relative z-10 py-24 md:py-36">
          <div className="max-w-3xl animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/5 px-4 py-1.5">
              <span className="h-2 w-2 animate-live-blink rounded-full bg-emerald" />
              <span className="font-display text-xs uppercase tracking-widest text-emerald">{liveMatches.length} матчей в эфире прямо сейчас</span>
            </div>

            <h1 className="font-display text-5xl font-700 leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              СТАВКИ НА<br />
              <span className="gold-gradient">КИБЕРСПОРТ</span><br />
              <span className="font-serif text-4xl font-400 italic text-muted-foreground md:text-5xl">премиум-класса</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Лучшие коэффициенты на CS2, Dota 2, Valorant и League of Legends.
              Live-аналитика, мгновенные выплаты и элитный сервис для настоящих ценителей.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Button size="lg" onClick={() => user ? document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('register')} className="bg-emerald font-display text-base font-600 uppercase tracking-wide text-primary-foreground hover:bg-emerald/90">
                <Icon name="Zap" size={18} className="mr-2" />
                Начать играть
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' })} className="border-gold/40 font-display text-base font-500 uppercase tracking-wide text-gold hover:bg-gold/10">
                Смотреть Live
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

      <section className="container py-14">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {DISCIPLINES.map((d, i) => (
            <button key={d.name} style={{ animationDelay: `${i * 60}ms` }} className="glass glass-hover animate-scale-in flex items-center gap-3 rounded-xl px-5 py-3">
              <Icon name={d.icon} size={20} className="text-emerald" />
              <span className="font-display font-500 uppercase tracking-wide">{d.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="matches" className="container py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 animate-live-blink rounded-full bg-destructive" />
              <span className="font-display text-xs uppercase tracking-widest text-destructive">В эфире</span>
            </div>
            <h2 className="font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">Live матчи</h2>
          </div>
        </div>

        {liveMatches.length === 0 ? (
          <p className="text-muted-foreground">Сейчас нет матчей в эфире</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((m, i) => (
              <article key={m.id} style={{ animationDelay: `${i * 100}ms` }} className="glass glass-hover animate-fade-in overflow-hidden rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <DiscTag name={m.discipline} />
                  <span className="flex items-center gap-1.5 font-display text-xs uppercase tracking-wider text-destructive">
                    <span className="h-1.5 w-1.5 animate-live-blink rounded-full bg-destructive" /> LIVE
                  </span>
                </div>
                <div className="mb-5 text-xs text-muted-foreground">{m.tournament}</div>
                <div className="mb-5 space-y-3">
                  <div className="font-display text-lg font-500">{m.team1}</div>
                  <div className="divider-gold" />
                  <div className="font-display text-lg font-500">{m.team2}</div>
                </div>
                <div className="flex gap-2 opacity-60">
                  <div className="flex flex-1 flex-col items-center rounded-lg border border-border bg-secondary/40 py-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">П1</span>
                    <span className="font-display text-lg font-600">{m.odds1.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center rounded-lg border border-border bg-secondary/40 py-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">П2</span>
                    <span className="font-display text-lg font-600">{m.odds2.toFixed(2)}</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Ставки закрыты — матч идёт</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="container py-14">
        <h2 className="mb-8 font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">
          Ближайшие <span className="gold-gradient">события</span>
        </h2>

        <div className="glass overflow-hidden rounded-2xl">
          {upcoming.length === 0 ? (
            <p className="p-6 text-muted-foreground">Скоро здесь появятся новые матчи</p>
          ) : upcoming.map((m) => (
            <div key={m.id} className="flex flex-col gap-4 border-b border-border/40 p-5 transition-colors last:border-0 hover:bg-emerald/5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <DiscTag name={m.discipline} />
                <div>
                  <div className="font-display font-500">{m.team1} <span className="text-muted-foreground">vs</span> {m.team2}</div>
                  <div className="text-xs text-muted-foreground">{m.tournament}</div>
                </div>
              </div>
              <div className="flex gap-2 md:w-72">
                <OddsBtn label={`П1 · ${m.team1}`} value={m.odds1} onClick={() => handleBet(m, 1)} />
                <OddsBtn label={`П2 · ${m.team2}`} value={m.odds2} onClick={() => handleBet(m, 2)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 font-display text-4xl font-700 uppercase tracking-tight md:text-5xl">Лидерборд</h2>
            <p className="mb-8 text-muted-foreground">Лучшие игроки месяца по чистой прибыли</p>
            <div className="glass overflow-hidden rounded-2xl">
              {LEADERS.map((l) => (
                <div key={l.rank} className="flex items-center gap-4 border-b border-border/40 p-4 transition-colors last:border-0 hover:bg-gold/5">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg font-display text-lg font-700 ${
                    l.rank === 1 ? 'bg-gold/20 text-gold' : l.rank <= 3 ? 'bg-emerald/15 text-emerald' : 'bg-secondary text-muted-foreground'
                  }`}>{l.rank}</span>
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
              <h3 className="font-display text-3xl font-700 uppercase leading-tight">Турнир<br /><span className="gold-gradient"> APEX Champions</span></h3>
              <p className="mt-4 text-muted-foreground">Призовой фонд 5 000 000 ₽. Соревнуйтесь с лучшими игроками платформы и поднимайтесь в рейтинге каждую неделю.</p>
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
              <Button onClick={() => requireAuth(() => setProfileOpen(true))} className="mt-8 bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">Участвовать</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <div className="glass relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald/10 blur-3xl animate-glow-pulse" />
          <h2 className="relative font-display text-4xl font-700 uppercase tracking-tight md:text-6xl">Готовы сделать<br /><span className="emerald-gradient">первую ставку?</span></h2>
          <p className="relative mx-auto mt-5 max-w-lg text-muted-foreground">Зарегистрируйтесь сегодня и получите 1000 ₽ приветственного бонуса на баланс.</p>
          <Button size="lg" onClick={() => user ? document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('register')} className="relative mt-9 bg-gold font-display text-base font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90">
            <Icon name="Sparkles" size={18} className="mr-2" />
            {user ? 'Сделать ставку' : 'Получить бонус'}
          </Button>
        </div>
      </section>

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
                <button key={item} onClick={() => setActive(item)} className="cursor-pointer font-display text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-gold">{item}</button>
              ))}
            </div>
            <div className="flex gap-3">
              {['Send', 'Twitch', 'Youtube'].map((s) => (
                <button key={s} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-emerald hover:text-emerald">
                  <Icon name={s} size={16} />
                </button>
              ))}
            </div>
          </div>
          <div className="divider-gold my-8" />
          <p className="text-center text-xs text-muted-foreground">© 2026 APEX Esports Betting. 18+. Играйте ответственно. Все права защищены.</p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuth={setUser} initialMode={authMode} />
      <ProfileModal open={profileOpen} user={user} onClose={() => setProfileOpen(false)} onLogout={logout} />
      <BetModal
        match={betTarget?.match || null}
        pick={betTarget?.pick || 1}
        balance={user?.balance || 0}
        onClose={() => setBetTarget(null)}
        onPlaced={(b) => { setUser(user ? { ...user, balance: b } : null); loadMatches(); }}
      />
    </div>
  );
}
