'use client';
import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Sparkles,
  Heart,
  ChevronRight,
  X,
  Square,
  Info,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useAmma } from '@/lib/use-amma';
import { useVisibleViewport } from '@/lib/use-visible-viewport';
import { moods, scenarios, translate } from '@/lib/amma-engine';
import {
  SideNav,
  ScenarioCards,
  titles,
  type View,
} from '@/components/amma-shell';
import { Talk } from '@/components/amma-talk';
import { Memory, Permission, Settings } from '@/components/amma-views';
import { AlarmRinging } from '@/components/amma-alarm';
import { AchanCall } from '@/components/achan-call';
import { MicrophoneHelp } from '@/components/microphone-help';
export default function Home() {
  useVisibleViewport();
  const a = useAmma();
  const [view, setView] = useState<View>('talk'),
    [confirmReset, setConfirmReset] = useState(false);
  const current = useRef(a);
  current.current = a;
  const navigate = (v: View) => setView(v);
  const scenario = (input: string) => {
    setView('talk');
    void a.send(input, true);
  };
  const reset = () => {
    a.reset();
    setView('talk');
    setConfirmReset(false);
  };
  const askReset = () => (a.history.length ? setConfirmReset(true) : reset());
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const definitions: Tool[] = [
      {
        name: 'ask_amma_demo',
        description:
          'Submit a Malayalam, Manglish, English, or mixed-language question to Amma. Alarm requests keep Amma’s one-hour-early rule.',
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string', minLength: 1, maxLength: 1000 },
          },
          required: ['question'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input: unknown) => {
          const v = input as { question?: unknown };
          if (
            !v ||
            typeof v.question !== 'string' ||
            !v.question.trim() ||
            v.question.length > 1000 ||
            Object.keys(v).some((k) => k !== 'question')
          )
            throw new Error('A question of 1–1000 characters is required.');
          setView('talk');
          const result = await current.current.send(v.question);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          return result;
        },
      },
      {
        name: 'read_amma_conversation',
        description:
          'Read the current local demo conversation, mood, permission step, and saved in-app alarm.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({
          mood: moods[current.current.mood].name,
          permissionStep: current.current.permissionStep,
          aiMode: current.current.aiMode,
          alarm: current.current.alarms.alarm,
          turns: current.current.history.map((t) => ({
            question: t.input,
            reply: translate(t.reply, current.current.language),
            kind: t.kind,
            source: t.source || 'scripted',
          })),
        }),
      },
    ];
    for (const tool of definitions)
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Optional browser capability. */
      }
    return () => lifecycle.abort();
  }, []);
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '15.5rem' } as React.CSSProperties}
    >
      {/* Speech is captioned in the current response panel. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={a.audioRef}
        id="amma-voice-audio"
        aria-label="Amma voice playback"
        preload="metadata"
      />
      <AchanCall call={a.call} />
      <AlarmRinging a={a} />
      <SideNav
        view={view}
        navigate={navigate}
        onReset={askReset}
        count={a.history.length}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger
              className="mobile-toggle"
              aria-label="Open navigation"
            />
            <span>Your space</span>
            <ChevronRight size={14} />
            <strong>{titles[view]}</strong>
          </div>
          <span className="demo-pill">
            <span /> {a.aiMode === 'live' ? 'Live AI' : 'Smart fallback'}
          </span>
        </header>
        <main className="main-content" id="main-content">
          {a.notice && (
            <output className="notice">
              <Info size={18} />
              <span>{a.notice}</span>
              <button
                aria-label="Dismiss notice"
                onClick={() => a.setNotice('')}
              >
                <X size={17} />
              </button>
            </output>
          )}
          {view !== 'talk' && a.phase !== 'idle' && (
            <div className="notice">
              <AudioLines size={18} />
              <span>
                {a.phase === 'speaking'
                  ? 'Amma is speaking…'
                  : 'A conversation is in progress.'}
              </span>
              <button className="text-link" onClick={a.stop}>
                <Square size={14} /> Stop
              </button>
            </div>
          )}
          {view === 'talk' ? (
            <Talk a={a} navigate={navigate} onScenario={scenario} />
          ) : view === 'memory' ? (
            <Memory a={a} navigate={navigate} onClear={askReset} />
          ) : view === 'permission' ? (
            <Permission
              a={a}
              navigate={navigate}
              onStart={() => scenario('Can I go out with friends?')}
            />
          ) : view === 'settings' ? (
            <Settings a={a} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {scenarios.length} WAYS TO TEST HER PATIENCE.
                  </p>
                  <h1>
                    The demo playground. <span>Try your luck.</span>
                  </h1>
                  <p>
                    Pick a scenario. Hear the comeback. Watch the mood change.
                  </p>
                </div>
              </div>
              <div className="demo-guide">
                <Sparkles size={22} />
                <div>
                  <strong>A good place to start</strong>
                  <p>
                    Try “I’m studying”, then “Suggest a movie” to see memory in
                    action. “Can I go out?” begins the three-question permission
                    game. The new cards cover chores, missing clothes, haircuts,
                    gaming, fitness, careers, packages, and pets.
                  </p>
                </div>
              </div>
              <ScenarioCards
                items={scenarios}
                onSelect={scenario}
                disabled={a.phase !== 'idle'}
              />
              <div className="little-note">
                <Info size={19} />
                <span>
                  All scores, neighbour matches, lie detection, weather, and
                  location estimates are fictional comedy. Nothing outside this
                  conversation is monitored.
                </span>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              <Heart size={13} /> Made in Kerala. Approved by no Amma ever.
            </span>
            <span>100% opinionated · 0% useful</span>
          </footer>
        </main>
      </div>
      <MicrophoneHelp
        a={a}
        onType={() => {
          a.setMicrophoneHelp(false);
          setView('talk');
          a.setKeyboard(true);
        }}
        onListen={() => {
          setView('talk');
          a.listen();
        }}
      />
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogTitle>Give Amma a fresh start?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears the current conversation, mood, and permission
            interview. Your settings and scheduled alarm will stay.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep conversation</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Start fresh</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
