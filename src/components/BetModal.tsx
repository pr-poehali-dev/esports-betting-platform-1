import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, Match } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  match: Match | null;
  pick: number;
  balance: number;
  onClose: () => void;
  onPlaced: (newBalance: number) => void;
}

const QUICK = [100, 500, 1000, 5000];

export default function BetModal({ match, pick, balance, onClose, onPlaced }: Props) {
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (match) setAmount('500');
  }, [match]);

  if (!match) return null;

  const team = pick === 1 ? match.team1 : match.team2;
  const odds = pick === 1 ? match.odds1 : match.odds2;
  const num = parseFloat(amount) || 0;
  const potential = (num * odds).toFixed(2);

  const place = async () => {
    if (num <= 0) {
      toast({ title: 'Введите сумму', variant: 'destructive' });
      return;
    }
    if (num > balance) {
      toast({ title: 'Недостаточно средств', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.placeBet(match.id, pick, num);
      toast({ title: 'Ставка принята!', description: `Возможный выигрыш ${res.potential_win.toFixed(2)} ₽` });
      onPlaced(res.balance);
      onClose();
    } catch (e) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!match} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass max-w-md border-border/60 p-0">
        <div className="p-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded border border-gold/30 bg-gold/5 px-2 py-0.5 font-display text-[11px] font-500 uppercase tracking-widest text-gold">
              {match.discipline}
            </span>
            <span className="text-xs text-muted-foreground">{match.tournament}</span>
          </div>

          <h2 className="font-display text-2xl font-700 uppercase">{match.team1} <span className="text-muted-foreground">vs</span> {match.team2}</h2>

          <div className="mt-6 rounded-xl border border-emerald/30 bg-emerald/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ваш выбор</div>
                <div className="font-display text-xl font-600 text-emerald">{team}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Коэф.</div>
                <div className="font-display text-2xl font-700 text-gold">{odds.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Сумма ставки</span>
              <span className="text-muted-foreground">Баланс: <span className="text-emerald">{balance.toFixed(2)} ₽</span></span>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/40 font-display text-lg"
            />
            <div className="mt-3 flex gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="flex-1 rounded-lg border border-border bg-secondary/40 py-1.5 text-sm transition-colors hover:border-emerald hover:text-emerald"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary/40 p-4">
            <span className="text-sm uppercase tracking-wider text-muted-foreground">Возможный выигрыш</span>
            <span className="font-display text-2xl font-700 gold-gradient">{potential} ₽</span>
          </div>

          <Button
            onClick={place}
            disabled={loading}
            className="mt-6 w-full bg-emerald font-display font-600 uppercase tracking-wide text-primary-foreground hover:bg-emerald/90"
          >
            <Icon name="Check" size={18} className="mr-2" />
            {loading ? 'Принимаем...' : 'Подтвердить ставку'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
