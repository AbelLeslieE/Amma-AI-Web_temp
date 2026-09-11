'use client';
import {
  Mic,
  AudioLines,
  Brain,
  ShieldQuestion,
  Sparkles,
  Settings2,
  ArrowUpRight,
  Heart,
  Plus,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { moods, scenarios } from '@/lib/amma-engine';
import type { useAmma } from '@/lib/use-amma';
export type Amma = ReturnType<typeof useAmma>;
export type View = 'talk' | 'memory' | 'permission' | 'playground' | 'settings';
export const titles: Record<View, string> = {
  talk: 'Talk to Amma',
  memory: 'Amma’s memory',
  permission: 'Permission desk',
  playground: 'Demo playground',
  settings: 'Amma settings',
};
const navigation = [
  { id: 'talk', label: 'Talk to Amma', icon: Mic },
  { id: 'memory', label: 'Amma’s memory', icon: Brain },
  { id: 'permission', label: 'Permission desk', icon: ShieldQuestion },
  { id: 'playground', label: 'Demo playground', icon: Sparkles },
] as const;
export function SideNav({
  view,
  navigate,
  onReset,
  count,
}: {
  view: View;
  navigate: (v: View) => void;
  onReset: () => void;
  count: number;
}) {
  const { setOpenMobile } = useSidebar();
  const go = (v: View) => {
    navigate(v);
    setOpenMobile(false);
  };
  return (
    <Sidebar className="app-sidebar">
      <SidebarHeader className="brand">
        <span className="brand-symbol">
          <AudioLines size={25} />
        </span>
        <span>
          amma<span className="brand-dot">.ai</span>
          <small>ALWAYS KNOWS BETTER.</small>
        </span>
      </SidebarHeader>
      <SidebarContent className="side-content">
        <button
          className="new-chat"
          onClick={() => {
            onReset();
            setOpenMobile(false);
          }}
        >
          <Plus size={17} /> New conversation <ArrowUpRight size={16} />
        </button>
        <p className="eyebrow nav-label">YOUR LITTLE WORLD</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={18} />
              {label}
              {id === 'memory' && count > 0 && (
                <span className="count-badge">{count}</span>
              )}
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <span className="small-star">✳</span>
          <p>
            Artificial intelligence.
            <br />
            <strong>Very real opinions.</strong>
          </p>
          <span>Made with love. And a little guilt.</span>
        </div>
      </SidebarContent>
      <SidebarFooter className="sidebar-bottom">
        <button
          className={`nav-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => go('settings')}
        >
          <Settings2 size={18} /> Amma settings
        </button>
        <div className="profile">
          <span className="profile-avatar">K</span>
          <div>
            Kuttan<small>Amma’s favourite. Probably.</small>
          </div>
          <Heart size={16} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export function Insights({
  a,
  navigate,
}: {
  a: Amma;
  navigate: (v: View) => void;
}) {
  const mood = moods[a.mood];
  return (
    <aside className="insights">
      <section className="mood-card">
        <div className="card-top">
          <p className="eyebrow">THE AMMA MOOD</p>
          <span className="live-text">LIVE</span>
        </div>
        <div className="mood-title" aria-live="polite">
          <span
            className="mood-face"
            style={{ borderColor: mood.color, color: mood.color }}
            aria-hidden="true"
          >
            {mood.face}
          </span>
          <div>
            <h3>{mood.name}</h3>
            <p>{mood.sub}</p>
          </div>
        </div>
        <div
          className="mood-track"
          aria-label={`Mood level ${a.mood + 1} of 5`}
        >
          {moods.map((m, i) => (
            <i
              key={m.name}
              style={{ background: i <= a.mood ? mood.color : '#ebece5' }}
            />
          ))}
        </div>
        <div className="meter-labels">
          <span>All good</span>
          <span>Calling Achan</span>
        </div>
        <div className="mood-quote">
          “Kazhicho?” <span>— Her love language.</span>
        </div>
      </section>
      <section className="confidence-card">
        <div className="card-top">
          <p className="eyebrow">CERTAINTY, AMMA STYLE</p>
          <Sparkles size={16} />
        </div>
        <div className="stat-row">
          <span>Amma confidence</span>
          <strong>
            100<small>%</small>
          </strong>
        </div>
        <Progress value={100} aria-label="Amma confidence, a joke score" />
        <div className="stat-row second">
          <span>Scientific evidence</span>
          <strong>
            0<small>%</small>
          </strong>
        </div>
        <Progress value={0} aria-label="Scientific evidence" />
        <p>Source: “Enikku ellam ariyam.”</p>
      </section>
      <section className="memory-teaser">
        <span className="memory-icon">
          <Brain size={21} />
        </span>
        <div>
          <h3>
            {a.history.length
              ? `${a.history.length} ${
                  a.history.length === 1 ? 'thing' : 'things'
                } she remembers.`
              : 'She remembers.'}
          </h3>
          <p>
            {a.history.length
              ? 'Your words may be used against you.'
              : 'Especially what you said 5 minutes ago.'}
          </p>
          <button onClick={() => navigate('memory')}>
            Open Amma’s memory <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </aside>
  );
}
export function ScenarioCards({
  items,
  onSelect,
  disabled,
}: {
  items: typeof scenarios;
  onSelect: (input: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="starter-grid">
      {items.map((s) => (
        <button
          className="starter-card"
          key={s.id}
          onClick={() => onSelect(s.input)}
          disabled={disabled}
        >
          <span className="starter-icon" aria-hidden="true">
            {s.emoji}
          </span>
          <ArrowUpRight className="starter-arrow" size={17} />
          <strong>{s.title}</strong>
          <span>{s.desc}</span>
        </button>
      ))}
    </div>
  );
}
