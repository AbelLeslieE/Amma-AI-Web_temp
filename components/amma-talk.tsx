'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  AudioLines,
  Brain,
  ArrowUpRight,
  Volume2,
  VolumeX,
  ChevronRight,
  Keyboard,
  ArrowUp,
  Square,
  Play,
  MessageCircle,
} from 'lucide-react';
import { AlarmCard } from './amma-alarm';
import { NativeSelect } from '@/components/ui/native-select';
import { Insights, ScenarioCards, type Amma, type View } from './amma-shell';
import { scenarios, translate, type Language } from '@/lib/amma-engine';
export function Talk({
  a,
  navigate,
  onScenario,
}: {
  a: Amma;
  navigate: (v: View) => void;
  onScenario: (input: string) => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (a.keyboard) inputRef.current?.focus();
  }, [a.keyboard]);
  const last = a.history.at(-1),
    busy = a.phase !== 'idle',
    showText = a.captions || !a.voice || a.autoTranscript;
  const phaseText = {
    idle: last ? 'READY FOR YOUR NEXT QUESTION' : 'AMMA IS HERE',
    listening: 'LISTENING…',
    thinking: 'JUDGING YOUR LIFE CHOICES…',
    speaking: 'AMMA HAS SOMETHING TO SAY',
  }[a.phase];
  const submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !busy) {
      inputRef.current?.blur();
      void a.send(input);
      setInput('');
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE LOVE. A LOT OF QUESTIONS.</p>
          <h1>
            Entha, Kutta? <span>What now?</span>
          </h1>
          <p>Go on. Amma is listening. And possibly judging.</p>
        </div>
        <div className="language-select">
          <label htmlFor="language">CONVERSATION LANGUAGE</label>
          <NativeSelect
            id="language"
            aria-label="Conversation language"
            value={a.language}
            onChange={(e) => a.setLanguage(e.target.value as Language)}
            disabled={busy}
          >
            <option>Manglish</option>
            <option>English</option>
            <option>Malayalam</option>
          </NativeSelect>
        </div>
      </div>
      <div className="conversation-grid">
        <section className={`voice-room phase-${a.phase}`}>
          <div className="room-top">
            <output className="live-label">
              <span />
              {phaseText}
            </output>
            <button className="room-tag" onClick={() => navigate('settings')}>
              {a.personality}
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="voice-center">
            <p className="malayalam" lang="ml">
              അമ്മ
            </p>
            <div className="orb-wrap">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <button
                className="voice-orb"
                onClick={a.listen}
                aria-label={
                  busy
                    ? 'Stop current interaction'
                    : 'Ask Amma using microphone'
                }
              >
                {busy ? (
                  <span className="waveform" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </span>
                ) : (
                  <AudioLines size={56} strokeWidth={1.35} />
                )}
              </button>
              <span className="orb-star" aria-hidden="true">
                ✳
              </span>
            </div>
            {last || a.pendingInput ? (
              <div className="current-response">
                <span className="you-said">YOU SAID</span>
                <p className="user-quote">“{a.pendingInput || last?.input}”</p>
                {a.phase === 'thinking' ? (
                  <h2 className="thinking-copy">Thinking like Amma…</h2>
                ) : (
                  last && (
                    <>
                      <div className="response-labels">
                        <span className="response-category">{last.kind}</span>
                        <span
                          className={`response-source ${last.source === 'ai' ? 'is-live' : ''}`}
                        >
                          {last.source === 'ai'
                            ? 'AI response'
                            : 'Offline response'}
                        </span>
                      </div>
                      {showText ? (
                        <p
                          className="reply-text"
                          lang={a.language === 'Malayalam' ? 'ml' : 'en'}
                          aria-live="polite"
                        >
                          “{translate(last.reply, a.language)}”
                        </p>
                      ) : (
                        <h2>
                          {a.phase === 'speaking'
                            ? 'Listen to Amma.'
                            : 'Amma has spoken.'}
                          <br />
                          <span>
                            {a.phase === 'speaking'
                              ? 'She has a point. Apparently.'
                              : 'Your turn, Kutta.'}
                          </span>
                        </h2>
                      )}
                      <div className="reply-actions">
                        <button
                          disabled={busy || !a.voice}
                          onClick={() =>
                            a.speak(
                              last.voiceReply || last.reply,
                              a.language,
                              last.personality,
                            )
                          }
                        >
                          <Play size={14} /> Replay
                        </button>
                        <button
                          onClick={() => a.setCaptions(!a.captions)}
                          aria-pressed={a.captions}
                        >
                          <MessageCircle size={14} />
                          {a.captions ? 'Hide' : 'Show'} subtitles
                        </button>
                      </div>
                    </>
                  )
                )}
              </div>
            ) : (
              <>
                <h2>
                  Ask anything.
                  <br />
                  <span>Expect everything.</span>
                </h2>
                <p>Speak Malayalam. Amma will answer in Malayalam.</p>
              </>
            )}
            <button className="ask-button" onClick={a.listen}>
              {busy ? <Square size={16} /> : <Mic size={19} />}{' '}
              {a.phase === 'listening'
                ? 'Done speaking'
                : busy
                  ? 'Stop'
                  : last
                    ? 'Ask Amma again'
                    : 'Ask Amma'}
            </button>
            <span className="mic-help">
              {a.phase === 'listening'
                ? a.speechEngine === 'ai'
                  ? 'Speak naturally in Malayalam, Manglish, English, or a mix. Tap Done speaking when you finish.'
                  : `Speak in ${a.language === 'English' ? 'English' : 'Malayalam'}. A pause may finish the recording; you can also tap Done speaking.`
                : 'Speak · Check your words · Hear Amma reply'}
            </span>
            {(a.phase === 'listening' || a.reviewSpeech) && (
              <section
                className="speech-review"
                aria-label="Review microphone transcript"
              >
                <p className="eyebrow">
                  {a.phase === 'listening'
                    ? 'HEARING YOU…'
                    : 'DID I HEAR THAT RIGHT?'}
                </p>
                {a.phase === 'listening' ? (
                  <p
                    className="live-transcript"
                    aria-live="polite"
                    lang={a.language === 'English' ? 'en' : 'ml'}
                  >
                    {[a.speechDraft, a.interimText].filter(Boolean).join(' ') ||
                      (a.speechEngine === 'ai'
                        ? 'Recording for Malayalam-aware transcription…'
                        : 'Listening…')}
                  </p>
                ) : (
                  <>
                    <label className="sr-only" htmlFor="speech-draft">
                      What Amma heard
                    </label>
                    <textarea
                      id="speech-draft"
                      value={a.speechDraft}
                      onChange={(e) => a.setSpeechDraft(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      enterKeyHint="done"
                      lang={a.language === 'English' ? 'en' : 'ml'}
                    />
                    <p>Edit any missed words, then send it to Amma.</p>
                    <div className="speech-review-actions">
                      <button className="outline-button" onClick={a.listen}>
                        <Mic size={15} /> Try again
                      </button>
                      <button
                        className="ask-button"
                        disabled={!a.speechDraft.trim()}
                        onClick={() => void a.send(a.speechDraft)}
                      >
                        <ArrowUp size={16} /> Send to Amma
                      </button>
                    </div>
                  </>
                )}
                <button
                  className="text-link"
                  onClick={() => {
                    a.stop();
                    a.discardSpeech();
                  }}
                >
                  Cancel recording
                </button>
              </section>
            )}
            <div className="input-methods">
              <button
                className="keyboard-toggle"
                onClick={() => a.setKeyboard(!a.keyboard)}
                aria-expanded={a.keyboard}
              >
                <Keyboard size={14} />{' '}
                {a.keyboard ? 'Hide keyboard' : 'Rather type?'}
              </button>
              <button
                className="text-link"
                onClick={() => a.setMicrophoneHelp(true)}
              >
                Microphone help
              </button>
            </div>
            {a.keyboard && (
              <form className="composer" onSubmit={submit}>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  enterKeyHint="send"
                  lang={a.language === 'Malayalam' ? 'ml' : 'en'}
                  aria-label="Your question for Amma"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    a.permissionStep > 0 && a.permissionStep < 4
                      ? 'അമ്മയുടെ ചോദ്യത്തിന് മറുപടി പറയൂ…'
                      : a.language === 'English'
                        ? 'Amma, I have a question…'
                        : 'അമ്മേ, ഒരു കാര്യം ചോദിക്കട്ടെ…'
                  }
                  maxLength={1000}
                  disabled={busy}
                />
                <button
                  type="submit"
                  aria-label="Send question"
                  disabled={busy || !input.trim()}
                >
                  <ArrowUp size={18} />
                </button>
              </form>
            )}
          </div>
          <div className="room-bottom">
            <button onClick={() => a.setVoice(!a.voice)} aria-pressed={a.voice}>
              {a.voice ? <Volume2 size={15} /> : <VolumeX size={15} />} Voice
              replies {a.voice ? 'on' : 'off'}
            </button>
            <span>{a.voiceLabel}</span>
          </div>
        </section>
        <Insights a={a} navigate={navigate} />
      </div>
      <AlarmCard a={a} />
      {last && (
        <section className="logic-panel">
          <Brain size={18} />
          <div>
            <p className="eyebrow">AMMA LOGIC ENGINE</p>
            <p>{last.logic}</p>
            <small>{last.detail}</small>
          </div>
        </section>
      )}
      <section className="starters">
        <div className="section-heading">
          <h2>Famous last words</h2>
          <button className="text-link" onClick={() => navigate('playground')}>
            Explore all scenarios <ArrowUpRight size={14} />
          </button>
        </div>
        <ScenarioCards
          items={scenarios.slice(0, 4)}
          onSelect={onScenario}
          disabled={busy}
        />
      </section>
    </>
  );
}
