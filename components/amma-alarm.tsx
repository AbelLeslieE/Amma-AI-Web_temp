'use client';
import { useEffect, useRef, useState } from 'react';
import { AlarmClock, BellRing, Volume2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { alarmTime, alarmDate, alarmPhrases } from '@/lib/amma-alarm';
import { personalize } from '@/lib/amma-personalities';
import { translate } from '@/lib/amma-engine';
import { findVoiceClip } from '@/lib/amma-voice';
import type { Amma } from './amma-shell';

export function AlarmCard({ a }: { a: Amma }) {
  const alarm = a.alarms.alarm;
  return (
    <section className="alarm-card" aria-label="Amma alarm">
      <div className="alarm-card-heading">
        <AlarmClock size={22} />
        <div>
          <p className="eyebrow">AMMA’S ALARM CLOCK</p>
          <h2>
            {alarm?.status === 'missed'
              ? 'You missed Amma’s alarm.'
              : alarm
                ? 'One hour early. Obviously.'
                : 'Ask for six. Get five.'}
          </h2>
        </div>
      </div>
      {alarm ? (
        <>
          <div className="alarm-times">
            <div>
              <span>You asked for</span>
              <strong>{alarmTime(alarm.requestedAt)}</strong>
              <small>{alarmDate(alarm.requestedAt)}</small>
            </div>
            <span aria-hidden="true">→</span>
            <div className="alarm-chosen">
              <span>
                {alarm.status === 'missed' ? 'Missed alarm' : 'Alarm set for'}
              </span>
              <strong>{alarmTime(alarm.at)}</strong>
              <small>{alarmDate(alarm.at)}</small>
            </div>
          </div>
          <p className="alarm-explanation">
            One hour earlier, because “five more minutes” takes you an hour.
          </p>
          <p className="alarm-meta">
            Device local time · {alarm.timezone}
            {alarm.assumedMorning
              ? ' · Morning assumed because AM/PM was not specified.'
              : ''}
          </p>
          {alarm.status === 'missed' && (
            <p className="alarm-meta">
              The alarm window passed. Amma stops ringing after one minute; the
              browser may also have been closed or asleep.
            </p>
          )}
          <button className="outline-button" onClick={a.alarms.cancel}>
            <X size={16} />
            {alarm.status === 'missed' ? 'Clear missed alarm' : 'Cancel alarm'}
          </button>
        </>
      ) : (
        <>
          <p>
            Say “Set an alarm for 6 a.m.” or “അമ്മേ, എന്നെ ആറു മണിക്ക് വിളിക്കോ”. Amma
            will set it for 5 a.m.
          </p>
          <button
            className="outline-button"
            disabled={a.phase !== 'idle' || a.call.active}
            onClick={() => void a.send('Set an alarm for 6 AM')}
          >
            <AlarmClock size={17} /> Ask Amma for 6 a.m.
          </button>
        </>
      )}
      <p className="alarm-browser-note">
        In-app alarm: keep this page open and your device awake. It cannot set
        your phone’s Clock alarm or reliably ring with the screen locked. A new
        alarm replaces the current one.
      </p>
      {a.alarms.storageWarning && (
        <p role="alert" className="alarm-meta">
          {a.alarms.storageWarning}
        </p>
      )}
    </section>
  );
}

export function AlarmRinging({ a }: { a: Amma }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [message, setMessage] = useState('');
  const alarm = a.alarms.alarm;
  const reply = alarm
    ? personalize(alarmPhrases.wake, alarm.personality)
    : alarmPhrases.wake;
  const clipSrc = alarm
    ? findVoiceClip(reply, alarm.language, alarm.personality)?.src
    : undefined;
  const alarmAt = alarm?.at;
  const ringing = a.alarms.ringing;
  useEffect(() => {
    const audio = audioRef.current;
    const play = () => playAlarmAudio(audio, ringing, alarmAt, setMessage);
    if (ringing && !document.hidden) play();
    else audio?.pause();
    const visibility = () => {
      if (document.hidden) audio?.pause();
      else if (ringing) play();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      audio?.pause();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [ringing, alarmAt, clipSrc]);
  return (
    <>
      {/* The spoken alarm is fully transcribed in the dialog below. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        id="amma-alarm-audio"
        src={clipSrc}
        loop
        preload="metadata"
      />
      <Dialog
        open={a.alarms.ringing}
        onOpenChange={(open) => {
          if (!open) a.alarms.cancel();
        }}
      >
        <DialogContent className="alarm-dialog" showCloseButton={false}>
          <div className="alarm-dialog-body">
            <BellRing size={36} />
            <DialogTitle>എഴുന്നേൽക്ക്! Wake up!</DialogTitle>
            <DialogDescription>
              Amma’s alarm · {alarm ? alarmTime(alarm.at) : ''} · One hour
              earlier than you asked.
            </DialogDescription>
            <p
              className="alarm-wake-words"
              lang={alarm?.language === 'Malayalam' ? 'ml' : 'en'}
            >
              {translate(reply, alarm?.language || 'Malayalam')}
            </p>
            <output>{message}</output>
          </div>
          <div className="alarm-dialog-actions">
            <button className="primary-button" onClick={a.alarms.cancel}>
              I’m awake · Stop alarm
            </button>
            <button
              className="outline-button"
              onClick={() =>
                playAlarmAudio(audioRef.current, ringing, alarmAt, setMessage)
              }
            >
              <Volume2 size={18} /> Play alarm sound
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function playAlarmAudio(
  audio: HTMLAudioElement | null,
  ringing: boolean,
  at: number | undefined,
  message: (text: string) => void,
) {
  if (!ringing || at === undefined || Date.now() - at >= 60000) return;
  if (!audio || !audio.getAttribute('src')) {
    message('Wake-up audio is unavailable. Your alarm is shown here.');
    return;
  }
  audio.volume = 0.7;
  void audio
    .play()
    .then(() => message('Amma is calling you to get up.'))
    .catch(() => message('Your browser blocked sound. Tap Play alarm sound.'));
}
