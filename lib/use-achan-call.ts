'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  achanReply,
  callReducer,
  initialCall,
  type CallEvent,
} from './achan-call';
import { AmmaAudioPlayer } from './amma-audio';
import { findAchanClip } from './amma-voice';
import type { Language, Personality } from './amma-engine';

export function useAchanCall({
  mood,
  ready,
  language,
  personality,
  aiMode,
  voice,
  beforeCall,
}: {
  mood: number;
  ready: boolean;
  language: Language;
  personality: Personality;
  aiMode: 'live' | 'fallback';
  voice: boolean;
  beforeCall: () => void;
}) {
  const [state, setState] = useState(initialCall);
  const stateRef = useRef(initialCall);
  const [callLanguage, setCallLanguage] = useState(language);
  const [callPersonality, setCallPersonality] = useState(personality);
  const [audioStatus, setAudioStatus] = useState('');
  const [ringBlocked, setRingBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const ringRef = useRef<HTMLAudioElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const player = useRef<AmmaAudioPlayer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latched = useRef(false);
  const generation = useRef(0);
  const options = useRef({
    voice,
    language,
    callLanguage,
    personality,
    callPersonality,
    aiMode,
    muted,
  });
  useEffect(() => {
    options.current = {
      voice,
      language,
      callLanguage,
      personality,
      callPersonality,
      aiMode,
      muted,
    };
  }, [
    voice,
    language,
    callLanguage,
    personality,
    callPersonality,
    aiMode,
    muted,
  ]);
  const transition = useCallback((event: CallEvent) => {
    stateRef.current = callReducer(stateRef.current, event);
    setState(stateRef.current);
  }, []);
  const silence = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    ringRef.current?.pause();
    player.current?.stop();
  }, []);
  const end = useCallback(() => {
    silence();
    transition('end');
    setAudioStatus('');
  }, [silence, transition]);
  useEffect(() => {
    if (audioRef.current)
      player.current = new AmmaAudioPlayer(audioRef.current);
    const leave = () => end();
    const visibility = () => {
      if (document.hidden) leave();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leave);
    return () => {
      silence();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', leave);
    };
  }, [end, silence]);
  const playRing = useCallback(() => {
    const audio = ringRef.current;
    if (!audio || !options.current.voice || options.current.muted) return;
    const token = generation.current;
    audio.currentTime = 0;
    audio.volume = 0.35;
    void audio
      .play()
      .then(() => {
        if (token === generation.current) setRingBlocked(false);
      })
      .catch(() => {
        if (token === generation.current) setRingBlocked(true);
      });
  }, []);
  useEffect(() => {
    if (mood < 4) latched.current = false;
    if (
      mood === 4 &&
      ready &&
      !latched.current &&
      stateRef.current.phase === 'idle' &&
      !document.hidden
    ) {
      latched.current = true;
      beforeCall();
      setCallLanguage(language);
      setCallPersonality(personality);
      setAudioStatus('');
      setRingBlocked(false);
      setMuted(false);
      transition('start');
    }
  }, [mood, ready, language, personality, beforeCall, transition]);
  useEffect(() => {
    const ring = ringRef.current;
    if (state.phase === 'ringing' && voice && !muted) playRing();
    else ring?.pause();
    return () => {
      ring?.pause();
    };
  }, [state.phase, state.attempt, voice, muted, playRing]);
  const decline = useCallback(() => {
    if (stateRef.current.phase !== 'ringing') return;
    silence();
    transition('decline');
    const token = generation.current;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (token !== generation.current || document.hidden) return;
      transition('redial');
    }, 2800);
  }, [silence, transition]);
  const playReply = useCallback(async () => {
    silence();
    const token = generation.current;
    const reply = achanReply(
      options.current.callPersonality,
      stateRef.current.attempt,
    );
    if (!options.current.voice) {
      setAudioStatus('Voice is off. Read Achan’s words below.');
      return;
    }
    const clip = findAchanClip(reply, options.current.callLanguage);
    if (!player.current) {
      setAudioStatus('Audio unavailable. Achan’s words are shown below.');
      return;
    }
    setAudioStatus('Achan is speaking…');
    let source = clip?.src || '';
    let generatedUrl = '';
    if (!source && options.current.aiMode === 'live') {
      try {
        const response = await fetch('/api/ai/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text:
              options.current.callLanguage === 'English' ? reply.en : reply.ml,
            language: options.current.callLanguage,
            personality: options.current.callPersonality,
            speaker: 'Achan',
          }),
        });
        if (response.ok) {
          generatedUrl = URL.createObjectURL(await response.blob());
          source = generatedUrl;
        }
      } catch {
        /* The caption remains available. */
      }
    }
    if (!source) {
      setAudioStatus('Audio unavailable. Achan’s words are shown below.');
      return;
    }
    if (token !== generation.current) {
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
      return;
    }
    const result = await player.current.play(source, 1);
    if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    if (token !== generation.current) return;
    setAudioStatus(
      result === 'ended'
        ? 'Achan has said his piece.'
        : 'Tap Hear Achan again to retry the audio.',
    );
  }, [silence]);
  const answer = useCallback(() => {
    if (stateRef.current.phase !== 'ringing') return;
    transition('answer');
    // Initiate audio directly in the Answer tap for iPhone playback permission.
    void playReply();
  }, [transition, playReply]);
  return {
    ...state,
    active: state.phase !== 'idle',
    isActive: () => stateRef.current.phase !== 'idle',
    language: callLanguage,
    personality: callPersonality,
    reply: achanReply(callPersonality, state.attempt),
    audioStatus,
    ringBlocked,
    muted,
    setMuted,
    ringRef,
    audioRef,
    answer,
    decline,
    end,
    playReply,
    playRing,
  };
}
