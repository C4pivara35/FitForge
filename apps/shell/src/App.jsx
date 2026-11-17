import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Dumbbell, Flame, LayoutDashboard, Menu, Target, X, Clock3 } from 'lucide-react';
import { Boundary, Button, Empty, Notice, PageHeader, WeekChart } from '@fitforge/shared/ui';
import { DAYS, localDate, weeklyBuckets, sortedSessions, formatDate } from '@fitforge/shared/domain';
import { API_STATUS_EVENT } from '@fitforge/shared/storage';
import { API_URL, AUTH_REQUIRED, clearGatewayCredentials, gatewayRequest, setGatewayCredentials } from '@fitforge/shared/gateway';
const Workouts = lazy(() => import('workouts/App'));
const Progress = lazy(() => import('progress/App'));
const pages = [{ id: 'overview', label: 'Visão geral', icon: LayoutDashboard }, { id: 'workouts', label: 'Meus treinos', icon: Dumbbell }, { id: 'progress', label: 'Meu progresso', icon: Activity }];
const route = () => pages.some(p => p.id === location.hash.slice(2)) ? location.hash.slice(2) : 'overview';
export default function App() {
  const [authenticated, setAuthenticated] = useState(!AUTH_REQUIRED);
  return authenticated ? <FitForgeApp/> : <GatewayLogin onLogin={() => setAuthenticated(true)}/>;
}

function GatewayLogin({ onLogin }) {
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  function changeMode(register) {
    setRegistering(register);
    setError('');
    setNotice('');
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const login = username.trim();
    const password = data.get('password');
    setError('');
    setNotice('');

    if (registering && password !== data.get('passwordConfirmation')) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    if (registering && new TextEncoder().encode(password).length > 72) {
      setError('A senha ultrapassa o limite de 72 bytes.');
      return;
    }

    setPending(true);
    try {
      if (registering) {
        await gatewayRequest('/api/auth/register', { method: 'POST', body: { username: login, password } });
        form.reset();
        setUsername(login);
        changeMode(false);
        setNotice('Conta criada. Entre com seu usuário e senha.');
      } else {
        setGatewayCredentials(login, password);
        await gatewayRequest('/api/auth/check');
        onLogin();
      }
    } catch (error) {
      clearGatewayCredentials();
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return <main className="main-content login-screen">
    <section className="panel login-panel">
      <h1>{registering ? 'Criar conta no FitForge' : 'Entrar no FitForge'}</h1>
      <form key={registering ? 'register' : 'login'} onSubmit={submit}>
        <Notice error>{error}</Notice>
        <Notice>{notice}</Notice>
        <label>Usuário<input name="username" autoComplete="username" required
          minLength={registering ? 3 : undefined} maxLength={registering ? 64 : 100}
          value={username} onChange={event => setUsername(event.target.value)}/></label>
        <label>Senha<input name="password" type="password" required maxLength={72}
          minLength={registering ? 8 : undefined}
          autoComplete={registering ? 'new-password' : 'current-password'}/></label>
        {registering && <label>Confirmar senha
          <input name="passwordConfirmation" type="password" autoComplete="new-password" required maxLength={72}/>
        </label>}
        <Button type="submit" disabled={pending}>{pending ? 'Aguarde…' : registering ? 'Cadastrar' : 'Entrar'}</Button>
        <button type="button" className="text-link" disabled={pending} onClick={() => changeMode(!registering)}>
          {registering ? 'Voltar para o login' : 'Criar conta'}
        </button>
      </form>
    </section>
  </main>;
}

function FitForgeApp() {
  const [page, setPage] = useState(route); const [mobile, setMobile] = useState(false); const [workouts, setWorkouts] = useState([]); const [sessions, setSessions] = useState([]); const [workoutError, setWorkoutError] = useState(''); const [sessionError, setSessionError] = useState(''); const [pendingWorkout, setPendingWorkout] = useState(null); const [loading, setLoading] = useState(true); const [api, setApi] = useState({ online: null, message: '' });
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(Boolean(API_URL));
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const navigate = useCallback(id => { location.hash = `/${id}`; setPage(id); setMobile(false); }, []);
  const consume = useCallback(() => setPendingWorkout(null), []);
  const start = id => { setPendingWorkout(id); navigate('progress'); };
  useEffect(() => { const update = () => { setPage(route()); setMobile(false); }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  useEffect(() => { if (!API_URL) return; const onStatus = e => setApi({ online: e.detail.online, message: e.detail.message }); window.addEventListener(API_STATUS_EVENT, onStatus); return () => window.removeEventListener(API_STATUS_EVENT, onStatus); }, []);
  useEffect(() => { document.title = `${pages.find(p => p.id === page)?.label} · FitForge`; }, [page]);
  useEffect(() => {
    if (!API_URL || page !== 'overview') return;
    const controller = new AbortController();
    setDashboardLoading(true);
    setDashboardError('');
    gatewayRequest('/api/bff/dashboard', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)])
    }).then(data => {
      setDashboard(data);
      setApi({ online: Object.values(data.statusMicrosservicos).every(status => status === 'ONLINE'), message: '' });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setDashboard(null);
      setDashboardError(error.message);
      setApi({ online: false, message: error.message });
    }).finally(() => { if (!controller.signal.aborted) setDashboardLoading(false); });
    return () => controller.abort();
  }, [page, dashboardRefresh]);

  useEffect(() => {
    if (API_URL && page !== 'progress') return;
    let active = true;
    const loadWorkouts = async () => { try { const api = await import('workouts/api'); const rows = api.listWorkouts(); if (active) { setWorkouts(rows); setWorkoutError(''); } } catch (err) { if (active) setWorkoutError(`Fichas indisponíveis: ${err.message}`); } };
    const loadSessions = async () => { try { const api = await import('progress/api'); const rows = api.listSessions(); if (active) { setSessions(rows); setSessionError(''); } } catch (err) { if (active) setSessionError(`Histórico indisponível: ${err.message}`); } };
    const initialWorkouts = API_URL
      ? import('workouts/api').then(api => api.repository.refresh()).catch(error => {
        if (active) setWorkoutError(error.message);
      })
      : loadWorkouts();
    Promise.allSettled(API_URL ? [initialWorkouts] : [initialWorkouts, loadSessions()]).then(() => { if (active) setLoading(false); });
    const sync = e => { if (e.key === null || e.key === 'fitforge.workouts.v1') loadWorkouts(); if (e.key === null || e.key === 'fitforge.sessions.v1') loadSessions(); };
    window.addEventListener('fitforge:workouts-updated', loadWorkouts); window.addEventListener('fitforge:sessions-updated', loadSessions); window.addEventListener('storage', sync);
    return () => { active = false; window.removeEventListener('fitforge:workouts-updated', loadWorkouts); window.removeEventListener('fitforge:sessions-updated', loadSessions); window.removeEventListener('storage', sync); };
  }, [page]);
  return <div className="app-shell"><a className="skip-link" href="#main">Pular para o conteúdo</a><div className="mobile-header"><Brand/><button className="icon-btn" aria-label={mobile ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button></div>
    {mobile && <button className="sidebar-shade" aria-label="Fechar menu" onClick={() => setMobile(false)}/>}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}><Brand/><p className="nav-label">SEU ESPAÇO DE TREINO</p><nav aria-label="Navegação principal">{pages.map(({ id, label, icon: Icon }) => <a href={`#/${id}`} key={id} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20}/>{label}{page === id && <span className="nav-dot"/>}</a>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><Flame size={22}/><strong>Um treino de cada vez.</strong><p>Consistência constrói resultado.</p></div><div className="user-row"><span className="avatar"><Dumbbell size={19}/></span><div><strong>Meu espaço</strong><small>{!API_URL ? 'Salvo neste navegador' : api.online === false ? 'Conexão indisponível' : api.online ? 'Sincronizado com a nuvem' : 'Conectando ao servidor…'}</small></div><span className={`local-dot${API_URL && api.online === false ? ' offline' : ''}`} title={!API_URL ? 'Armazenamento local' : api.online === false ? api.message : `API: ${API_URL}`}/></div>{AUTH_REQUIRED && <button className="text-link" onClick={() => { clearGatewayCredentials(); location.reload(); }}>Sair</button>}</div></aside>
    <div className="main-shell"><div className="topbar"><span>Meu espaço <ChevronRight size={14}/> <strong>{pages.find(p => p.id === page)?.label}</strong></span><span className="topbar-date"><CalendarDays size={16}/>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span></div>
      <main id="main" className="main-content"><Notice error>{workoutError || sessionError ? [workoutError, sessionError].filter(Boolean).join(' · ') : ''}</Notice>
        {page === 'overview' && <>
          {API_URL && <button className="text-link" disabled={dashboardLoading} onClick={() => setDashboardRefresh(value => value + 1)}>Atualizar painel</button>}
          {API_URL && dashboardLoading ? <Loading/> : API_URL && dashboardError ? <Notice error>{dashboardError}</Notice> :
            <Overview dashboard={dashboard} workouts={workouts} sessions={sessions} navigate={navigate} start={start}
              loading={API_URL ? false : loading}
              workoutError={API_URL ? (dashboard?.statusMicrosservicos['treinos-service'] !== 'ONLINE') : workoutError}
              sessionError={API_URL ? (dashboard?.statusMicrosservicos['progresso-service'] !== 'ONLINE' || dashboard?.semana.length !== 7) : sessionError}/>}
        </>}
        {page === 'workouts' && <Boundary key="workouts"><Suspense fallback={<Loading/>}><Workouts onStart={start}/></Suspense></Boundary>}
        {page === 'progress' && <Boundary key="progress"><Suspense fallback={<Loading/>}><Progress workouts={workouts} initialWorkoutId={pendingWorkout} onConsumeStart={consume} onNavigateWorkouts={() => navigate('workouts')}/></Suspense></Boundary>}
      </main><footer className="app-footer"><span>FITFORGE <span className="accent">/</span> CONSTRUA SUA MELHOR VERSÃO.</span><span>React + Module Federation</span></footer>
    </div>
  </div>;
}
function Brand() { return <a className="brand" href="#/overview" aria-label="FitForge, visão geral"><span className="brand-icon"><Dumbbell size={25} strokeWidth={2.4}/></span><span>FIT<span className="accent">FORGE</span><small>TRAINING SPACE</small></span></a>; }
function Loading() { return <div className="loading" role="status"><span className="spinner"/>Carregando seu espaço...</div>; }
function Overview({ dashboard, workouts, sessions, navigate, start, loading, workoutError, sessionError }) {
  const buckets = dashboard?.semana ?? weeklyBuckets(sessions); const total = dashboard?.sessoesNaSemana ?? buckets.reduce((n, d) => n + d.count, 0); const minutes = dashboard?.minutosNaSemana ?? buckets.reduce((n, d) => n + d.minutes, 0);
  const today = dashboard?.hoje ?? DAYS[(new Date().getDay() + 6) % 7]; const scheduled = dashboard?.treinosDeHoje ?? workouts.filter(w => w.days.includes(today)); const recent = (dashboard?.ultimasSessoes?.map(item => item.sessao) ?? sortedSessions(sessions)).slice(0, 3); const trainedDays = buckets.filter(d => d.count > 0).length;
  const count = value => loading ? '…' : value;
  return <><PageHeader eyebrow="PRONTO PARA EVOLUIR?" title="Seu próximo nível começa hoje." description="Organize seu plano. Registre seu esforço. Veja sua evolução."/>
    <section className="hero"><div className="hero-copy"><span className="hero-label"><span/> SEU TREINO. SEU RITMO.</span><h2>Mais constância.<br/><span>Mais evolução.</span></h2><p>O melhor treino é aquele que faz parte da sua rotina.<br className="desktop-break"/> Seu plano está aqui. Vamos dar o próximo passo?</p><Button onClick={() => navigate('workouts')}>Ver meus treinos<ArrowRight size={18}/></Button></div><div className="hero-art" aria-hidden="true"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><span className="art-word">FORGE</span><Dumbbell className="hero-dumbbell" size={160} strokeWidth={1.5}/><span className="art-caption">FOCO / FORÇA / CONSTÂNCIA</span></div></section>
    <div className="stats-grid"><DashboardStat icon={<Dumbbell/>} title="Fichas de treino" value={count(workoutError ? '—' : (dashboard?.totalFichas ?? workouts.length))} detail="Seu plano organizado"/><DashboardStat icon={<Flame/>} title="Sessões na semana" value={count(sessionError ? '—' : total)} detail="Segunda a domingo"/><DashboardStat icon={<Clock3/>} title="Minutos na semana" value={count(sessionError ? '—' : minutes)} detail="Tempo dedicado a você"/><DashboardStat icon={<Target/>} title="Dias ativos" value={count(sessionError ? '—' : trainedDays)} detail="Dias com sessão nesta semana"/></div>
    <div className="overview-grid"><section className="panel today-panel"><div className="section-line"><div><p className="eyebrow">SEU PLANO</p><h2>Treinos de hoje <span className="muted">/ {today}</span></h2></div><CalendarDays size={22} className="accent"/></div>{loading ? <Loading/> : scheduled.length ? scheduled.map(w => <div className="today-workout" key={w.id}><div className="today-workout-info"><span className="mini-icon"><Dumbbell size={20}/></span><div><h3>{w.name}</h3><p className="muted small">{w.exercises.length} exercícios · {w.exercises.reduce((n, e) => n + e.sets, 0)} séries</p></div></div><button className="icon-btn orange" title="Registrar sessão realizada" aria-label={`Registrar sessão de ${w.name}`} onClick={() => start(w.id)}><ArrowUpRight size={22}/></button></div>) : <div className="rest-day"><Check size={24}/><h3>{workoutError ? 'Plano indisponível' : 'Sem ficha programada hoje'}</h3><p className="muted small">Consulte suas fichas para organizar o próximo treino.</p></div>}<button className="text-link" onClick={() => navigate('workouts')}>Ver todas as fichas<ArrowRight size={15}/></button></section>
      <section className="panel chart-panel"><div className="section-line"><div><p className="eyebrow">CONSTÂNCIA</p><h2>Sua semana em movimento</h2><p className="muted small">Minutos de treino por dia</p></div><Activity size={22} className="accent"/></div><WeekChart buckets={buckets}/></section></div>
    <section className="panel recent-panel"><div className="section-line"><div><p className="eyebrow">UM PASSO DE CADA VEZ</p><h2>Últimas sessões</h2></div><button className="text-link" onClick={() => navigate('progress')}>Ver histórico<ArrowUpRight size={16}/></button></div>{loading ? <Loading/> : recent.length ? recent.map(s => <div className="recent-row" key={s.id}><span className="mini-icon"><Check size={18}/></span><div><strong>{s.workoutName}</strong><p className="muted small">{formatDate(s.date)} · Esforço {s.effort}/10</p></div><span className="tag">{s.duration} min</span></div>) : <div className="recent-empty"><CalendarDays size={24}/><div><strong>{sessionError ? 'Histórico indisponível' : 'Seu histórico ainda está em branco.'}</strong><p className="muted small">{sessionError ? 'Verifique a disponibilidade do módulo de progresso.' : 'Registre uma sessão depois de treinar e acompanhe seus próximos passos.'}</p></div><Button variant="secondary" disabled={!(dashboard?.totalFichas ?? workouts.length) || !!sessionError} onClick={() => navigate('progress')}>Registrar sessão<PlusIcon/></Button></div>}</section>
  </>;
}
function DashboardStat({ icon, title, value, detail }) { return <article className="panel stat"><div className="stat-top"><span>{title}</span>{icon}</div><p className="stat-value">{value}</p><p className="muted small">{detail}</p></article>; }
function PlusIcon() { return <span aria-hidden="true" className="plus-symbol">+</span>; }
