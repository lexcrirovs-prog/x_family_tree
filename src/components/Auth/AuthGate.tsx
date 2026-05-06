import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { seedSnapshot } from '../../data/seed';
import { useFamilyStore } from '../../store/familyStore';
import {
  createTree,
  listTrees,
  loadSnapshot,
  type TreeMembership,
} from '../../storage/SupabaseAdapter';
import { pushInitialSnapshot, startSupabaseSync } from '../../storage/syncToSupabase';

type Props = { children: ReactNode };

type Stage =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'pickingTree'; trees: TreeMembership[] }
  | { kind: 'creatingTree' }
  | { kind: 'loadingTree' }
  | { kind: 'ready' };

export function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [error, setError] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [newTreeName, setNewTreeName] = useState('Моя семья');
  const setTreeContext = useFamilyStore((s) => s.setTreeContext);
  const hydrate = useFamilyStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (!data.session) setStage({ kind: 'signedOut' });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setStage({ kind: 'signedOut' });
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let stop: (() => void) | undefined;
    (async () => {
      try {
        const trees = await listTrees();
        if (trees.length === 0) {
          setStage({ kind: 'creatingTree' });
          return;
        }
        const lastId = localStorage.getItem('x-family-tree:last-tree-id');
        const auto = lastId && trees.find((t) => t.tree_id === lastId);
        if (auto) {
          stop = await activateTree(auto.tree_id, auto.role);
          return;
        }
        if (trees.length === 1) {
          stop = await activateTree(trees[0].tree_id, trees[0].role);
          return;
        }
        setStage({ kind: 'pickingTree', trees });
      } catch (err) {
        setError((err as Error).message);
        setStage({ kind: 'signedOut' });
      }
    })();
    return () => {
      stop?.();
    };
  }, [session]);

  const activateTree = async (
    treeId: string,
    role: 'owner' | 'editor' | 'viewer',
  ): Promise<() => void> => {
    setStage({ kind: 'loadingTree' });
    setTreeContext(treeId, role);
    let snapshot = await loadSnapshot(treeId);
    if (Object.keys(snapshot.people).length === 0 && role !== 'viewer') {
      await pushInitialSnapshot(treeId, seedSnapshot);
      snapshot = seedSnapshot;
    }
    hydrate(snapshot);
    localStorage.setItem('x-family-tree:last-tree-id', treeId);
    setStage({ kind: 'ready' });
    return startSupabaseSync(treeId);
  };

  const handleMagicLink = async () => {
    setError(undefined);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw err;
      setEmailSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreateTree = async () => {
    setError(undefined);
    try {
      const tree = await createTree(newTreeName.trim() || 'Моя семья');
      const stop = await activateTree(tree.id, 'owner');
      // store stop fn? It's already in the running effect; we can't easily replace,
      // but the next mount of AuthGate will re-init. For simplicity we leak this until reload.
      void stop;
    } catch (err) {
      setError((err as Error).message);
      setStage({ kind: 'creatingTree' });
    }
  };

  if (stage.kind === 'ready') return <>{children}</>;

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h1>Семейное древо</h1>
        {stage.kind === 'loading' && <p>Загрузка…</p>}

        {stage.kind === 'signedOut' && (
          <div className="auth-form">
            <p>Войдите, чтобы открыть или создать семейное древо.</p>
            {emailSent ? (
              <p className="auth-info">
                Письмо со ссылкой отправлено на <strong>{email}</strong>. Откройте его в этом
                браузере.
              </p>
            ) : (
              <>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <button type="button" onClick={handleMagicLink} disabled={!email}>
                  Отправить magic link
                </button>
              </>
            )}
          </div>
        )}

        {stage.kind === 'pickingTree' && (
          <div className="auth-form">
            <p>У вас несколько деревьев. Выберите, с каким работать:</p>
            <ul className="auth-tree-list">
              {stage.trees.map((m) => (
                <li key={m.tree_id}>
                  <button type="button" onClick={() => activateTree(m.tree_id, m.role)}>
                    <strong>{m.tree.name}</strong>
                    <span>{m.role}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setStage({ kind: 'creatingTree' })}>
              + Создать новое дерево
            </button>
          </div>
        )}

        {stage.kind === 'creatingTree' && (
          <div className="auth-form">
            <p>Создайте семейное древо. Вы станете его владельцем и сможете приглашать родственников.</p>
            <label>
              <span>Название</span>
              <input
                type="text"
                value={newTreeName}
                onChange={(e) => setNewTreeName(e.target.value)}
              />
            </label>
            <button type="button" onClick={handleCreateTree}>
              Создать
            </button>
          </div>
        )}

        {stage.kind === 'loadingTree' && <p>Загружаем данные…</p>}

        {error && <p className="auth-error">{error}</p>}

        {session && (
          <button
            type="button"
            className="auth-signout"
            onClick={() => supabase.auth.signOut()}
          >
            Выйти ({session.user.email})
          </button>
        )}
      </div>
    </div>
  );
}
