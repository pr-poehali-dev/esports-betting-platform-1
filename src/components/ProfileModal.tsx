import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, User, BetRecord, TxRecord } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
}

const PICK_STATUS: Record<string, string> = {
  open: 'В игре',
  won: 'Выигрыш',
  lost: 'Проигрыш',
};

export default function ProfileModal({ open, user, onClose, onLogout }: Props) {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      api.history()
        .then((d) => { setBets(d.bets); setTxs(d.transactions); })
        .catch(() => toast({ title: 'Не удалось загрузить историю', variant: 'destructive' }))
        .finally(() => setLoading(false));
    }
  }, [open, user]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass max-w-2xl border-border/60 p-0">
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
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
              <Icon name="LogOut" size={16} className="mr-1.5" /> Выйти
            </Button>
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

            <TabsContent value="bets" className="mt-4 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : bets.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Ставок пока нет</p>
              ) : (
                <div className="space-y-2">
                  {bets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/30 p-3">
                      <div>
                        <div className="font-display text-sm font-500">
                          {b.pick === 1 ? b.team1 : b.team2} <span className="text-muted-foreground">@ {b.odds.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{b.team1} vs {b.team2}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-600">{b.amount.toFixed(0)} ₽</div>
                        <div className={`text-xs ${b.status === 'won' ? 'text-emerald' : b.status === 'lost' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {PICK_STATUS[b.status] || b.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tx" className="mt-4 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : txs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Операций пока нет</p>
              ) : (
                <div className="space-y-2">
                  {txs.map((t, i) => (
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
