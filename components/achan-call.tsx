'use client';
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { angerLabels, angerStage } from '@/lib/achan-call';
import { translate } from '@/lib/amma-engine';
import type { useAchanCall } from '@/lib/use-achan-call';

export function AchanCall({ call }: { call: ReturnType<typeof useAchanCall> }) {
  const { ringRef, audioRef } = call;
  const connected = call.phase === 'connected';
  const ringing = call.phase === 'ringing';
  return (
    <>
      {/* Ringtone has no speech; its equivalent is the visible incoming-call status. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={ringRef}
        id="achan-ringtone"
        src="/audio/achan-ring.wav"
        loop
        preload="auto"
        aria-label="Achan ringtone"
      />
      {/* Full speech captions are rendered in .call-caption below, including when audio fails. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        id="achan-voice-audio"
        preload="auto"
        aria-label="Achan voice playback"
      />
      <Dialog
        open={call.active}
        onOpenChange={(open) => {
          if (!open) call.end();
        }}
      >
        <DialogContent className="achan-call" showCloseButton={false}>
          <div className="call-body">
            <p className="call-eyebrow">
              AMMA HAS ESCALATED THIS · {call.personality}
            </p>
            <div
              className={`call-avatar ${ringing ? 'is-ringing' : ''}`}
              aria-hidden="true"
            >
              അ
            </div>
            <DialogTitle className="call-title">Achan</DialogTitle>
            <DialogDescription className="call-description">
              {connected
                ? 'Connected · simulated call'
                : ringing
                  ? 'Incoming call · simulated'
                  : 'Call declined · calling back shortly…'}
            </DialogDescription>
            <output className="call-anger">
              <span>
                Call {call.attempt} · {angerLabels[angerStage(call.attempt)]}
              </span>
              <span className="call-anger-bars" aria-hidden="true">
                {angerLabels.map((label, index) => (
                  <i
                    key={label}
                    className={
                      index <= angerStage(call.attempt) ? 'filled' : ''
                    }
                  />
                ))}
              </span>
            </output>
            {connected && (
              <>
                <p
                  className="call-caption"
                  lang={call.language === 'Malayalam' ? 'ml' : 'en'}
                >
                  {translate(call.reply, call.language)}
                </p>
                <output className="call-status">{call.audioStatus}</output>
              </>
            )}
            {!connected && !ringing && (
              <p className="call-status">
                He noticed. The next call will be less patient.
              </p>
            )}
            <p className="call-footnote">
              An in-app comedy call. No phone number or microphone needed.
            </p>
          </div>
          <div className="call-controls">
            {connected ? (
              <>
                <button className="call-action decline" onClick={call.end}>
                  <PhoneOff size={22} /> End call
                </button>
                <button
                  className="call-replay"
                  onClick={() => void call.playReply()}
                >
                  <Volume2 size={18} /> Hear Achan again
                </button>
              </>
            ) : (
              <>
                {ringing ? (
                  <div className="call-actions">
                    <button
                      className="call-action decline"
                      onClick={call.decline}
                    >
                      <PhoneOff size={25} /> Decline
                    </button>
                    <button
                      className="call-action answer"
                      onClick={call.answer}
                    >
                      <Phone size={25} /> Answer
                    </button>
                  </div>
                ) : null}
                {ringing && (
                  <button
                    className="call-replay"
                    onClick={() => {
                      if (call.ringBlocked) call.playRing();
                      else call.setMuted(!call.muted);
                    }}
                  >
                    {call.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    {call.ringBlocked
                      ? 'Enable ringtone'
                      : call.muted
                        ? 'Unmute ringtone'
                        : 'Silence ringtone'}
                  </button>
                )}
                <button className="call-stop" onClick={call.end}>
                  Stop call simulation
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
