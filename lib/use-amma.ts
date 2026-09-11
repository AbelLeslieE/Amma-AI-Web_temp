'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  respond,
  advice,
  translate,
  type Turn,
  type Phrase,
  type Language,
  type Personality,
  type Result,
} from './amma-engine';
import { useAmmaAlarm } from './use-amma-alarm';
import { scheduleAlarm, alarmTime, alarmDate } from './amma-alarm';
import { useAchanCall } from './use-achan-call';
import { personalities, personalize } from './amma-personalities';
import { AmmaAudioPlayer } from './amma-audio';
import { findVoiceClip, voiceName } from './amma-voice';
import { parseAiResult, type AiMode } from './amma-ai';
import {
  AmmaSpeechSession,
  MicrophonePermissionRequest,
  microphoneError,
  speechErrorMessage,
  type Recognition,
  type MicrophoneAccess,
} from './amma-microphone';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function useAmma() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [language, setLanguage] = useState<Language>('Malayalam'),
    [personality, setPersonality] = useState<Personality>('Normal Amma');
  const [voice, setVoice] = useState(true),
    [captions, setCaptions] = useState(true),
    [nagging, setNagging] = useState(false),
    [speed, setSpeed] = useState(1);
  const [mood, setMood] = useState(0),
    [permissionStep, setPermissionStep] = useState(0),
    [phase, setPhase] = useState<Phase>('idle');
  const [notice, setNotice] = useState(''),
    [keyboard, setKeyboard] = useState(false),
    [autoTranscript, setAutoTranscript] = useState(false),
    [canRecognize, setCanRecognize] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [micAccess, setMicAccess] = useState<MicrophoneAccess>('unknown');
  const [micHelpOpen, setMicHelpOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('fallback');
  const [speechEngine, setSpeechEngine] = useState<'ai' | 'browser'>('browser');
  const [canRequestMic, setCanRequestMic] = useState(false);
  const [secureContext, setSecureContext] = useState(true);
  const micRequest = useRef(new MicrophonePermissionRequest());
  const [pendingInput, setPendingInput] = useState(''),
    [speechDraft, setSpeechDraft] = useState(''),
    [interimText, setInterimText] = useState(''),
    [reviewSpeech, setReviewSpeech] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null),
    player = useRef<AmmaAudioPlayer | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    recorderStream = useRef<MediaStream | null>(null),
    recorderChunks = useRef<Blob[]>([]),
    recorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0),
    recognition = useRef<AmmaSpeechSession | null>(null),
    guard = useRef(false),
    nagged = useRef(false);
  const live = useRef({
    history,
    language,
    personality,
    voice,
    speed,
    mood,
    permissionStep,
    phase,
    aiMode,
  });
  live.current = {
    history,
    language,
    personality,
    voice,
    speed,
    mood,
    permissionStep,
    phase,
    aiMode,
  };
  useEffect(() => {
    if (audioRef.current)
      player.current = new AmmaAudioPlayer(audioRef.current);
    const w = window as SpeechWindow;
    setCanRequestMic(Boolean(navigator.mediaDevices?.getUserMedia));
    setSecureContext(window.isSecureContext);
    setCanRecognize(
      Boolean(
        w.SpeechRecognition ||
        w.webkitSpeechRecognition ||
        (navigator.mediaDevices && window.MediaRecorder),
      ),
    );
    void fetch('/api/ai/status', { cache: 'no-store' })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ enabled?: boolean }>)
          : null,
      )
      .then((status) => setAiMode(status?.enabled ? 'live' : 'fallback'))
      .catch(() => setAiMode('fallback'));
    try {
      const p = JSON.parse(localStorage.getItem('amma-preferences') || 'null');
      if (p) {
        // Migrate the old English/Manglish voice defaults once; preserve explicit v2 choices.
        if (
          p.version === 2 &&
          ['English', 'Manglish', 'Malayalam'].includes(p.language)
        )
          setLanguage(p.language);
        if (personalities.includes(p.personality))
          setPersonality(p.personality);
        if (typeof p.voice === 'boolean') setVoice(p.voice);
        if (p.version === 2 && typeof p.captions === 'boolean')
          setCaptions(p.captions);
        if (typeof p.nagging === 'boolean') setNagging(p.nagging);
        if (typeof p.speed === 'number' && p.speed >= 0.75 && p.speed <= 1.25)
          setSpeed(p.speed);
      }
    } catch {
      /* Storage is optional. */
    }
    setLoaded(true);
    return () => {
      generation.current++;
      recognition.current?.cancel();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      recorderStream.current?.getTracks().forEach((track) => track.stop());
      if (recorderTimer.current) clearTimeout(recorderTimer.current);
      micRequest.current.cancel();
      player.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(
          'amma-preferences',
          JSON.stringify({
            version: 2,
            language,
            personality,
            voice,
            captions,
            nagging,
            speed,
          }),
        );
      } catch {
        /* Preferences remain in memory. */
      }
  }, [loaded, language, personality, voice, captions, nagging, speed]);
  const stop = useCallback(() => {
    generation.current++;
    const r = recognition.current;
    recognition.current = null;
    r?.cancel();
    const activeRecorder = recorder.current;
    recorder.current = null;
    if (activeRecorder?.state === 'recording') activeRecorder.stop();
    recorderStream.current?.getTracks().forEach((track) => track.stop());
    recorderStream.current = null;
    recorderChunks.current = [];
    if (recorderTimer.current) clearTimeout(recorderTimer.current);
    recorderTimer.current = null;
    micRequest.current.cancel();
    setMicAccess((state) => (state === 'requesting' ? 'unknown' : state));
    player.current?.stop();
    guard.current = false;
    setPhase('idle');
    setPendingInput('');
    setInterimText('');
  }, []);
  const alarms = useAmmaAlarm();
  const alarmsLive = useRef(alarms);
  alarmsLive.current = alarms;
  const call = useAchanCall({
    mood,
    ready: phase === 'idle' && !micHelpOpen && !alarms.ringing,
    language,
    personality,
    aiMode,
    voice,
    beforeCall: stop,
  });
  const callLive = useRef(call);
  callLive.current = call;
  useEffect(() => {
    if (alarms.ringing) {
      stop();
      call.end();
      setMicHelpOpen(false);
    }
  }, [alarms.ringing, stop, call.end]);
  const speak = useCallback(
    async (
      p: Phrase,
      requestedLanguage?: Language,
      requestedPersonality?: Personality,
    ) => {
      if (callLive.current.isActive() || alarmsLive.current.ringing) return;
      const token = ++generation.current;
      player.current?.stop();
      if (!live.current.voice) {
        guard.current = false;
        setPhase('idle');
        return;
      }
      const lang = requestedLanguage || live.current.language,
        clip = findVoiceClip(
          p,
          lang,
          requestedPersonality || live.current.personality,
        );
      if (!player.current) {
        setNotice(
          'This reply’s female voice recording is unavailable. The reply is shown below; please try Replay.',
        );
        setAutoTranscript(true);
        guard.current = false;
        setPhase('idle');
        return;
      }
      let source = clip?.src || '';
      let generatedUrl = '';
      if (!source && live.current.aiMode === 'live') {
        try {
          const text = lang === 'English' ? p.en : p.ml;
          const response = await fetch('/api/ai/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              language: lang,
              personality: requestedPersonality || live.current.personality,
            }),
          });
          if (response.ok) {
            generatedUrl = URL.createObjectURL(await response.blob());
            source = generatedUrl;
          }
        } catch {
          /* The written response remains available. */
        }
      }
      if (!source) {
        setNotice(
          'Amma’s voice could not be generated. Her reply is shown below; tap Replay to try again.',
        );
        setAutoTranscript(true);
        guard.current = false;
        setPhase('idle');
        return;
      }
      if (token !== generation.current) {
        if (generatedUrl) URL.revokeObjectURL(generatedUrl);
        return;
      }
      guard.current = true;
      setPhase('speaking');
      const result = await player.current.play(source, live.current.speed);
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
      if (token !== generation.current) return;
      guard.current = false;
      setPhase('idle');
      if (result === 'blocked') {
        setNotice('Tap Replay to allow Amma’s voice to play in this browser.');
        setAutoTranscript(true);
      } else if (result === 'error' || result === 'timeout') {
        setNotice(
          'Amma’s audio could not play. Try Replay; the Malayalam reply is shown below.',
        );
        setAutoTranscript(true);
      }
    },
    [],
  );
  const send = useCallback(
    async (input: string, newScenario = false) => {
      if (
        guard.current ||
        callLive.current.isActive() ||
        alarmsLive.current.ringing
      )
        return { error: 'Amma is busy. Stop the current interaction first.' };
      const clean = input.trim();
      if (!clean || clean.length > 1000)
        return { error: 'Please enter between 1 and 1,000 characters.' };
      guard.current = true;
      setNotice('');
      setPendingInput(clean);
      setReviewSpeech(false);
      setSpeechDraft('');
      setInterimText('');
      setPhase('thinking');
      nagged.current = false;
      const token = ++generation.current,
        snapshot = live.current;
      // Keep play() inside the Send/scenario tap: iOS rejects delayed playback.
      if (token !== generation.current) return { cancelled: true };
      try {
        let result: Result = respond(clean, {
          history: snapshot.history,
          permissionStep: newScenario ? 0 : snapshot.permissionStep,
          personality: snapshot.personality,
          mood: snapshot.mood,
        });
        let source: Turn['source'] = 'scripted';
        if (!result.alarmRequest && snapshot.aiMode === 'live') {
          try {
            const response = await fetch('/api/ai/respond', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input: clean,
                language: snapshot.language,
                personality: snapshot.personality,
                mood: snapshot.mood,
                permissionStep: newScenario ? 0 : snapshot.permissionStep,
                history: snapshot.history
                  .slice(-8)
                  .map(({ input, reply, kind }) => ({
                    input,
                    reply,
                    kind,
                  })),
                baseline: result,
              }),
            });
            const candidate = response.ok
              ? parseAiResult(await response.json())
              : null;
            if (candidate) {
              result = {
                ...result,
                ...candidate,
                permissionStep: result.permissionStep,
              };
              source = 'ai';
            }
          } catch {
            /* Keep the local response so the conversation never dead-ends. */
          }
        }
        if (result.alarmRequest?.action === 'set') {
          const alarm = scheduleAlarm(
            result.alarmRequest,
            new Date(),
            snapshot.personality,
            snapshot.language,
          );
          alarmsLive.current.set(alarm);
          result.voiceReply = result.reply;
          const time = alarmTime(alarm.at),
            requested = alarmTime(alarm.requestedAt),
            date = alarmDate(alarm.at);
          result.reply = {
            en: `Alarm set for ${time} (${date}). You asked for ${requested}; I set it one hour earlier!`,
            mg: `Alarm ${time} (${date}) nu vechu. Nee paranjathu ${requested}; njan oru manikkoor nerathe vechu!`,
            ml: `അലാറം ${time} (${date}) ന് വെച്ചു. നീ പറഞ്ഞത് ${requested}; ഞാൻ ഒരു മണിക്കൂർ നേരത്തെ വെച്ചു!`,
          };
          result.detail = `Alarm set for ${time} · ${date} · ${alarm.timezone}. Keep the app open and device awake. A new alarm replaces the previous one.`;
        } else if (result.alarmRequest?.action === 'cancel')
          alarmsLive.current.cancel();
        const turn: Turn = {
          id: Date.now(),
          input: clean,
          reply: result.reply,
          voiceReply: result.voiceReply,
          kind: result.kind,
          mood: result.mood,
          logic: result.logic,
          time: Date.now(),
          detail: result.detail,
          language: snapshot.language,
          personality: snapshot.personality,
          source,
        };
        // Update the action snapshot immediately as well as React state for sequential tool calls.
        live.current = {
          ...live.current,
          history: [...snapshot.history, turn].slice(-60),
          mood: result.mood,
          permissionStep: result.permissionStep,
        };
        setHistory((h) => [...h, turn].slice(-60));
        setMood(result.mood);
        setPermissionStep(result.permissionStep);
        setPendingInput('');
        void speak(
          result.voiceReply || result.reply,
          snapshot.language,
          snapshot.personality,
        );
        return {
          kind: result.kind,
          reply: translate(result.reply, snapshot.language),
          mood: result.mood,
          permissionStep: result.permissionStep,
        };
      } catch {
        guard.current = false;
        setPhase('idle');
        setPendingInput('');
        setNotice(
          'Amma couldn’t process that. Please try saying it another way.',
        );
        return { error: 'Could not process the question.' };
      }
    },
    [speak],
  );
  const finishListening = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    else recognition.current?.stop();
  }, []);
  const beginAiRecording = useCallback(async (token: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (token !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recorderStream.current = stream;
      const media = new MediaRecorder(stream);
      recorder.current = media;
      recorderChunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) recorderChunks.current.push(event.data);
      };
      media.onstop = async () => {
        if (recorderTimer.current) clearTimeout(recorderTimer.current);
        recorderTimer.current = null;
        stream.getTracks().forEach((track) => track.stop());
        recorderStream.current = null;
        recorder.current = null;
        const chunks = recorderChunks.current;
        recorderChunks.current = [];
        if (token !== generation.current) return;
        setPhase('thinking');
        setNotice('Checking your Malayalam and Manglish…');
        try {
          const blob = new Blob(chunks, {
            type: media.mimeType || 'audio/webm',
          });
          const form = new FormData();
          form.set(
            'audio',
            blob,
            media.mimeType.includes('mp4') ? 'question.m4a' : 'question.webm',
          );
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: form,
          });
          const body = (await response.json()) as {
            text?: unknown;
            error?: unknown;
          };
          if (!response.ok || typeof body.text !== 'string')
            throw new Error(
              typeof body.error === 'string'
                ? body.error
                : 'No speech was detected.',
            );
          setSpeechDraft(body.text);
          setReviewSpeech(true);
          setNotice('Review what Amma heard, then send it.');
        } catch (error) {
          setKeyboard(true);
          setNotice(
            error instanceof Error
              ? error.message
              : 'I couldn’t understand that recording. Please try again or type it.',
          );
        } finally {
          if (token === generation.current) {
            guard.current = false;
            setPhase('idle');
          }
        }
      };
      media.start();
      recorderTimer.current = setTimeout(() => {
        if (media.state === 'recording') media.stop();
      }, 30_000);
    } catch (error) {
      recorderStream.current?.getTracks().forEach((track) => track.stop());
      recorderStream.current = null;
      recorder.current = null;
      recorderChunks.current = [];
      if (recorderTimer.current) clearTimeout(recorderTimer.current);
      recorderTimer.current = null;
      if (token !== generation.current) return;
      guard.current = false;
      setPhase('idle');
      const state = microphoneError(error);
      setMicAccess(state);
      setMicHelpOpen(true);
    }
  }, []);
  const listen = useCallback(() => {
    if (callLive.current.isActive() || alarmsLive.current.ringing) return;
    if (guard.current) {
      if (live.current.phase === 'listening') finishListening();
      else stop();
      return;
    }
    const win = window as SpeechWindow,
      API = win.SpeechRecognition || win.webkitSpeechRecognition;
    const canRecordForAi =
      live.current.aiMode === 'live' &&
      Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
    if (
      !window.isSecureContext ||
      (!API && !canRecordForAi) ||
      micAccess !== 'granted'
    ) {
      setMicHelpOpen(true);
      return;
    }
    setMicHelpOpen(false);
    setNotice('');
    player.current?.stop();
    setSpeechDraft('');
    setInterimText('');
    setReviewSpeech(false);
    const token = ++generation.current;
    guard.current = true;
    setPhase('listening');
    if (canRecordForAi) {
      setSpeechEngine('ai');
      void beginAiRecording(token);
      return;
    }
    if (!API) {
      guard.current = false;
      setPhase('idle');
      setMicHelpOpen(true);
      return;
    }
    setSpeechEngine('browser');
    try {
      const session = new AmmaSpeechSession(new API(), {
        onTranscript: (final, interim) => {
          if (token !== generation.current) return;
          setSpeechDraft(final);
          setInterimText(interim);
        },
        onFinish: (text, error) => {
          if (token !== generation.current) return;
          recognition.current = null;
          guard.current = false;
          setPhase('idle');
          setInterimText('');
          if (text) {
            setSpeechDraft(text);
            setReviewSpeech(true);
          }
          if (error) {
            if (error === 'not-allowed' || error === 'service-not-allowed')
              setMicAccess('denied');
            setNotice(speechErrorMessage(error));
            setKeyboard(true);
          } else if (!text) {
            setNotice(
              'I didn’t catch any words. Tap the microphone and try again, or use keyboard dictation.',
            );
          }
        },
      });
      recognition.current = session;
      // Call start in this tap, not after awaiting a permissions request.
      session.start(live.current.language === 'English' ? 'en-IN' : 'ml-IN');
    } catch {
      recognition.current = null;
      guard.current = false;
      setPhase('idle');
      setKeyboard(true);
      setNotice(speechErrorMessage('start-failed'));
    }
  }, [finishListening, stop, micAccess, beginAiRecording]);
  const setMicrophoneHelp = useCallback(
    (open: boolean) => {
      if (open && guard.current) stop();
      setMicHelpOpen(open);
      if (!open) {
        micRequest.current.cancel();
        setMicAccess((state) => (state === 'requesting' ? 'unknown' : state));
      }
    },
    [stop],
  );
  const enableMicrophone = useCallback(async () => {
    if (micAccess === 'requesting') return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMicAccess('unavailable');
      return;
    }
    setMicAccess('requesting');
    const result = await micRequest.current.request(() =>
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    );
    if (result !== 'cancelled') setMicAccess(result);
  }, [micAccess]);
  useEffect(() => {
    const leave = () => {
      if (guard.current || micAccess === 'requesting') {
        const captured = recognition.current?.getTranscript();
        stop();
        setMicHelpOpen(false);
        if (captured) {
          setSpeechDraft(captured);
          setReviewSpeech(true);
        }
        setNotice(
          'Paused when you left the app. Review any captured words, or tap the microphone to start again.',
        );
      }
    };
    const visibility = () => {
      if (document.hidden) leave();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', leave);
    };
  }, [stop, micAccess]);
  const discardSpeech = () => {
    setReviewSpeech(false);
    setSpeechDraft('');
    setInterimText('');
  };
  const reset = useCallback(() => {
    callLive.current.end();
    stop();
    live.current = { ...live.current, history: [], mood: 0, permissionStep: 0 };
    setHistory([]);
    setMood(0);
    setPermissionStep(0);
    setNotice('');
    setAutoTranscript(false);
    setReviewSpeech(false);
    setSpeechDraft('');
    nagged.current = false;
  }, [stop]);
  useEffect(() => {
    if (
      alarms.ringing ||
      call.active ||
      !nagging ||
      !history.length ||
      phase !== 'idle' ||
      reviewSpeech ||
      nagged.current
    )
      return;
    const timer = setTimeout(() => {
      if (
        document.hidden ||
        guard.current ||
        callLive.current.isActive() ||
        alarmsLive.current.ringing
      )
        return;
      nagged.current = true;
      const reply = personalize(
        advice[history.length % advice.length],
        live.current.personality,
      );
      setHistory((h) =>
        [
          ...h,
          {
            id: Date.now(),
            input: '(Unsolicited advice)',
            reply,
            kind: 'Unsolicited advice',
            mood,
            logic: 'Silence detected. Advice supplied without a request.',
            time: Date.now(),
            detail: 'Unsolicited advice can be switched off in Amma settings.',
            language,
            personality: live.current.personality,
          },
        ].slice(-60),
      );
      void speak(reply);
    }, 25000);
    return () => clearTimeout(timer);
  }, [
    nagging,
    history.length,
    phase,
    reviewSpeech,
    mood,
    language,
    speak,
    call.active,
    alarms.ringing,
  ]);
  useEffect(() => {
    if (!voice && phase === 'speaking') stop();
  }, [voice, phase, stop]);
  const cancelPermission = () => {
    stop();
    setPermissionStep(0);
    live.current.permissionStep = 0;
    setNotice('Permission investigation closed. Amma still has opinions.');
  };
  return {
    alarms,
    call,
    history,
    language,
    setLanguage,
    personality,
    setPersonality,
    voice,
    setVoice,
    captions,
    setCaptions,
    nagging,
    setNagging,
    speed,
    setSpeed,
    mood,
    permissionStep,
    phase,
    notice,
    setNotice,
    keyboard,
    setKeyboard,
    autoTranscript,
    canRecognize,
    canRequestMic,
    secureContext,
    micAccess,
    micHelpOpen,
    setMicrophoneHelp,
    enableMicrophone,
    pendingInput,
    send,
    listen,
    stop,
    speak,
    reset,
    cancelPermission,
    audioRef,
    voiceLabel: voiceName(language, personality),
    aiMode,
    speechEngine,
    speechDraft,
    setSpeechDraft,
    interimText,
    reviewSpeech,
    discardSpeech,
  };
}
