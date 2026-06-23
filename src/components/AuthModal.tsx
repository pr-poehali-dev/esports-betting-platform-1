import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuth: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ open, onClose, onAuth, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, username, password);
      onAuth(user);
      toast({ title: mode === 'login' ? 'С возвращением!' : 'Аккаунт создан', description: `Привет, ${user.username}` });
      onClose();
      setEmail(''); setUsername(''); setPassword('');
    } catch (e) {
      toast({ title: 'Ошибка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass max-w-md border-border/60 p-0">
        <div className="p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald to-emerald/40">
              <Icon name="Hexagon" className="text-background" size={20} />
            </div>
            <span className="font-display text-2xl font-700 tracking-widest">A<span className="text-gold">P</span>EX</span>
          </div>

          <h2 className="mb-1 font-display text-3xl font-700 uppercase">
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {mode === 'login' ? 'Войдите, чтобы делать ставки' : 'Получите 1000 ₽ приветственного бонуса'}
          </p>

          <div className="space-y-3">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/40"
            />
            {mode === 'register' && (
              <Input
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary/40"
              />
            )}
            <Input
              placeholder="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="bg-secondary/40"
            />
          </div>

          <Button
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full bg-gold font-display font-600 uppercase tracking-wide text-accent-foreground hover:bg-gold/90"
          >
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-500 text-emerald hover:underline"
            >
              {mode === 'login' ? 'Регистрация' : 'Войти'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
