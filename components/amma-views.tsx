'use client';
import { personalities, profiles } from '@/lib/amma-personalities';
import {
  Brain,
  ShieldQuestion,
  ArrowUpRight,
  Heart,
  Volume2,
  RotateCcw,
  Play,
  Clock3,
  Check,
  Download,
  Info,
  CircleHelp,
  Mic,
} from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { translate, type Language, type Personality } from '@/lib/amma-engine';
import type { Amma, View } from './amma-shell';
export function Memory({
  a,
  navigate,
  onClear,
}: {
  a: Amma;
  navigate: (v: View) => void;
  onClear: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHE TOLD YOU SHE’D REMEMBER.</p>
          <h1>
            Amma’s memory <span>Never forgets.</span>
          </h1>
          <p>
            This conversation only. The last 60 exchanges, kept until you
            refresh or reset.
          </p>
        </div>
        {a.history.length > 0 && (
          <button className="outline-button" onClick={onClear}>
            <RotateCcw size={16} /> Clear conversation
          </button>
        )}
      </div>
      {!a.history.length ? (
        <Empty className="empty-state">
          <EmptyHeader>
            <EmptyMedia>
              <Brain size={37} />
            </EmptyMedia>
            <EmptyTitle>No evidence. Yet.</EmptyTitle>
            <EmptyDescription>
              Tell Amma you are studying. Then ask for a movie. She’ll connect
              the dots.
            </EmptyDescription>
          </EmptyHeader>
          <button className="ask-button" onClick={() => navigate('talk')}>
            Talk to Amma <ArrowUpRight size={16} />
          </button>
        </Empty>
      ) : (
        <div className="memory-list">
          {[...a.history].reverse().map((t) => (
            <article
              className={`memory-entry ${t.kind === 'Memory callback' ? 'caught' : ''}`}
              key={t.id}
            >
              <div className="memory-entry-top">
                <span className="response-category">{t.kind}</span>
                <time>
                  <Clock3 size={13} />
                  {new Date(t.time).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p className="memory-user">You: “{t.input}”</p>
              <p
                className="memory-reply"
                lang={a.language === 'Malayalam' ? 'ml' : 'en'}
              >
                “{translate(t.reply, a.language)}”
              </p>
              <div className="memory-entry-bottom">
                <span>
                  <Brain size={14} />
                  {t.logic}
                </span>
                <button
                  className="text-link"
                  disabled={a.phase !== 'idle' || !a.voice}
                  onClick={() =>
                    a.speak(t.voiceReply || t.reply, a.language, t.personality)
                  }
                >
                  <Volume2 size={16} /> Listen
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function Permission({
  a,
  onStart,
  navigate,
}: {
  a: Amma;
  onStart: () => void;
  navigate: (v: View) => void;
}) {
  const steps = [
    'Where are you going?',
    'Who is coming with you?',
    'When will you be back?',
  ];
  const done = a.permissionStep === 4;
  const download = () => {
    const report = `AMMA AI — UNOFFICIAL PERMISSION CERTIFICATE\n\nApplicant: Kuttan\nDecision: DENIED\nReason: Amma said so.\nAmma confidence: 100%\nAppeals: Ask again after doing the dishes.\n\nThis is a comedy demo certificate, not an official document.\nIssued: ${new Date().toLocaleString('en-IN')}\n`;
    const link = document.createElement('a');
    const url = URL.createObjectURL(
      new Blob([report], { type: 'text/plain;charset=utf-8' }),
    );
    link.href = url;
    link.download = 'amma-permission-certificate.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Leave time for mobile browsers to hand off to their download UI.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DEPARTMENT OF UNNECESSARY APPROVALS</p>
          <h1>
            The permission desk. <span>Good luck.</span>
          </h1>
          <p>Three questions. One very predictable decision.</p>
        </div>
      </div>
      <div className="permission-layout">
        <section className="permission-card">
          <span className="large-icon">
            <ShieldQuestion size={30} />
          </span>
          <h2>{done ? 'Application reviewed.' : 'So, you want to go out?'}</h2>
          <p>
            {done
              ? 'Every answer was considered. None of them mattered.'
              : 'Amma has a few questions. She always has a few questions.'}
          </p>
          <ol className="permission-steps">
            {steps.map((s, i) => (
              <li
                key={s}
                className={
                  a.permissionStep > i + 1
                    ? 'complete'
                    : a.permissionStep === i + 1
                      ? 'current'
                      : ''
                }
              >
                <span>
                  {a.permissionStep > i + 1 ? <Check size={16} /> : i + 1}
                </span>
                <div>
                  <strong>{s}</strong>
                  <small>
                    {a.permissionStep > i + 1
                      ? 'Answer recorded'
                      : a.permissionStep === i + 1
                        ? 'Awaiting your answer'
                        : 'Pending investigation'}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <Progress
            value={done ? 100 : (Math.max(0, a.permissionStep - 1) / 3) * 100}
            aria-label="Permission interview progress"
          />
          {done ? (
            <div className="permission-result">
              <span>THE FINAL VERDICT</span>
              <h3>
                Venda. <em>Denied.</em>
              </h3>
              <p>“Veettil irunnaal mathi.” Stay home.</p>
              <button className="outline-button" onClick={download}>
                <Download size={16} /> Get your rejection certificate
              </button>
              <button
                className="text-link"
                onClick={onStart}
                disabled={a.phase !== 'idle'}
              >
                Submit another hopeless application <ArrowUpRight size={15} />
              </button>
            </div>
          ) : (
            <button
              className="ask-button"
              disabled={a.phase !== 'idle'}
              onClick={a.permissionStep ? () => navigate('talk') : onStart}
            >
              {a.permissionStep ? 'Continue with Amma' : 'Ask permission'}
              <ArrowUpRight size={17} />
            </button>
          )}
          {a.permissionStep > 0 && !done && (
            <button
              className="text-link cancel-case"
              onClick={a.cancelPermission}
            >
              Cancel this investigation
            </button>
          )}
        </section>
        <aside className="permission-notes">
          <h3>Before you apply</h3>
          <p>“With friends” is not a complete answer.</p>
          <p>“Soon” is not a return time.</p>
          <p>“But everyone is going” will make things worse.</p>
          <div className="little-note">
            <Info size={19} />
            <span>
              This is a pretend permission game. No family members are
              contacted.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Settings({ a }: { a: Amma }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOU CAN CHANGE THE SETTINGS. NOT HER MIND.</p>
          <h1>
            Meet your Amma. <span>Your way.</span>
          </h1>
          <p>A few preferences to make the scolding feel like home.</p>
        </div>
      </div>
      <div className="settings-card">
        <h2>
          <Heart size={20} /> Personality & language
        </h2>
        <div className="setting-row">
          <div>
            <label htmlFor="personality">Amma personality</label>
            <p>{profiles[a.personality].description}</p>
            <p className="personality-signature">
              {profiles[a.personality].signature}
            </p>
          </div>
          <NativeSelect
            id="personality"
            value={a.personality}
            disabled={a.phase !== 'idle'}
            onChange={(e) => a.setPersonality(e.target.value as Personality)}
          >
            {personalities.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="settings-language">Conversation language</label>
            <p>
              Manglish displays Latin letters, but the voice still speaks
              Malayalam.
            </p>
          </div>
          <NativeSelect
            id="settings-language"
            value={a.language}
            disabled={a.phase !== 'idle'}
            onChange={(e) => a.setLanguage(e.target.value as Language)}
          >
            {['Manglish', 'English', 'Malayalam'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="settings-card">
        <h2>
          <Volume2 size={20} /> Voice & conversation
        </h2>
        <div className="setting-row">
          <div>
            <strong>Microphone & device access</strong>
            <p>
              Allow your microphone when you want to speak. You can also type or
              use keyboard dictation.
            </p>
          </div>
          <button
            className="outline-button"
            disabled={a.phase !== 'idle'}
            onClick={() => a.setMicrophoneHelp(true)}
          >
            <Mic size={18} /> Microphone setup
          </button>
        </div>
        <div className="setting-row">
          <div>
            <strong>Learned speech corrections</strong>
            <p>
              {a.speechCorrectionCount
                ? `${a.speechCorrectionCount} confirmed correction${a.speechCorrectionCount === 1 ? '' : 's'} saved only on this device. They guide later Malayalam and Manglish transcription.`
                : 'When you fix a microphone transcript, Amma can use that correction as a hint next time.'}
            </p>
          </div>
          <button
            className="outline-button"
            disabled={a.phase !== 'idle' || !a.speechCorrectionCount}
            onClick={a.clearSpeechCorrections}
          >
            <RotateCcw size={16} /> Clear corrections
          </button>
        </div>
        {[
          {
            key: 'voice',
            label: 'Voice replies',
            desc: 'Let Amma say it out loud.',
            value: a.voice,
            set: a.setVoice,
          },
          {
            key: 'captions',
            label: 'Show subtitles',
            desc: 'Keep written replies visible alongside the voice.',
            value: a.captions,
            set: a.setCaptions,
          },
          {
            key: 'nagging',
            label: 'Unsolicited advice',
            desc: 'After 25 seconds of silence, Amma checks in. Once per exchange.',
            value: a.nagging,
            set: a.setNagging,
          },
        ].map((s) => (
          <div className="setting-row" key={s.key}>
            <div>
              <label htmlFor={s.key}>{s.label}</label>
              <p>{s.desc}</p>
            </div>
            <Switch id={s.key} checked={s.value} onCheckedChange={s.set} />
          </div>
        ))}
        <div className="setting-row">
          <div>
            <span id="speed-label">Speaking speed</span>
            <p>A little slower, or a little more urgency.</p>
          </div>
          <div className="speed-control">
            <span>{a.speed.toFixed(2)}×</span>
            <Slider
              aria-labelledby="speed-label"
              min={0.75}
              max={1.25}
              step={0.05}
              value={[a.speed]}
              onValueChange={(v) => a.setSpeed(Array.isArray(v) ? v[0] : v)}
            />
          </div>
        </div>
        <div className="voice-check">
          <button
            className="outline-button"
            disabled={a.phase !== 'idle' || !a.voice}
            onClick={() => a.speak(profiles[a.personality].sample)}
          >
            <Play size={15} /> Test Amma’s voice
          </button>
          <span>{a.voiceLabel}</span>
        </div>
      </div>
      <div className="little-note">
        <CircleHelp size={21} />
        <div>
          <strong>Voice and Malayalam support</strong>
          <p>
            Each Amma has her own vocabulary, reaction style, pacing, delivery,
            and Achan escalation dialogue. Malayalam and Manglish are spoken
            from Malayalam script so Manglish is never read with English
            phonetics.{' '}
            {a.aiMode === 'live'
              ? 'Live AI is connected for free-form replies, Malayalam-aware transcription, and generated speech. '
              : 'The app is using its built-in responses until the private AI connection is configured. '}
            {a.canRecognize
              ? 'Microphone transcription is supported on this device. Review the transcript before sending.'
              : 'Use Safari on iPhone/iPad or Chrome on Android for the best chance of speech support. Typing and keyboard dictation remain available.'}{' '}
            Generated voices are synthetic, and regional accents remain an
            approximation. If the live service is unavailable, the built-in
            conversation continues automatically.
          </p>
        </div>
      </div>
    </>
  );
}
