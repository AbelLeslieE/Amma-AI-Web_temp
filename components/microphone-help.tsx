'use client';
import { Mic, Keyboard, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Amma } from './amma-shell';

export function MicrophoneHelp({
  a,
  onType,
  onListen,
}: {
  a: Amma;
  onType: () => void;
  onListen: () => void;
}) {
  const ready = a.micAccess === 'granted';
  const supported = a.secureContext && a.canRequestMic && a.canRecognize;
  const status = !a.secureContext
    ? 'Open the HTTPS version of Amma AI to use the microphone.'
    : !a.canRecognize || !a.canRequestMic
      ? 'This browser cannot provide speech input here. You can still type or use your phone keyboard’s dictation microphone.'
      : a.micAccess === 'requesting'
        ? 'Choose Allow in your browser’s microphone prompt. If it does not appear, check the site’s microphone setting. You can cancel this step anytime.'
        : ready
          ? 'Microphone access is allowed. Tap Start speaking; your browser may also ask to use its speech service.'
          : a.micAccess === 'denied'
            ? 'Microphone access is blocked. Change the site’s microphone setting to Allow, then tap Try microphone again.'
            : a.micAccess === 'unavailable'
              ? 'No microphone was found. Connect one, or use the keyboard below.'
              : a.micAccess === 'error'
                ? 'The microphone could not open. Close other calls or recording apps, then try again.'
                : 'Tap Enable microphone, then choose Allow when your browser asks. Typing works without microphone access.';
  return (
    <Dialog open={a.micHelpOpen} onOpenChange={a.setMicrophoneHelp}>
      <DialogContent className="microphone-dialog">
        <span className="microphone-help-icon" aria-hidden="true">
          {ready ? <Check /> : <Mic />}
        </span>
        <DialogTitle>Talk to Amma on your device</DialogTitle>
        <DialogDescription>
          Your microphone turns speech into an editable message. Your browser’s
          speech service may process the audio online. Amma AI does not save
          microphone recordings.
        </DialogDescription>
        <output className="microphone-status">{status}</output>
        <details
          className="device-help"
          open={a.micAccess === 'denied' || a.micAccess === 'error'}
        >
          <summary>iPhone, Android & browser help</summary>
          <p>
            <strong>iPhone / iPad:</strong> Open this site in Safari. In the
            page menu, open Website Settings and allow Microphone. If speech
            still does not start, check Siri is enabled in device Settings.
          </p>
          <p>
            <strong>Android:</strong> In Chrome, open the site’s controls next
            to the address, then Permissions → Microphone → Allow. Also allow
            microphone access for Chrome in Android Settings.
          </p>
          <p>
            <strong>Inside another app?</strong> Use its menu to open this link
            in Safari or Chrome. Embedded browsers may not support speech input.
          </p>
          <p>
            <strong>Any browser:</strong> Choose Use keyboard. Your phone
            keyboard’s microphone can dictate into the text field if dictation
            supports your selected language. Malayalam speech availability
            varies by browser and device.
          </p>
          <p>
            Browsers remember your choice and may not ask again. A blocked
            permission must be changed in browser settings.
          </p>
        </details>
        <div className="microphone-help-actions">
          {supported &&
            (ready ? (
              <button className="ask-button" onClick={onListen}>
                <Mic size={18} /> Start speaking
              </button>
            ) : (
              <button
                className="ask-button"
                disabled={a.micAccess === 'requesting'}
                onClick={() => void a.enableMicrophone()}
              >
                <Mic size={18} />
                {a.micAccess === 'requesting'
                  ? 'Waiting for permission…'
                  : a.micAccess === 'unknown'
                    ? 'Enable microphone'
                    : 'Try microphone again'}
              </button>
            ))}
          <button className="outline-button" onClick={onType}>
            <Keyboard size={18} /> Use keyboard
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
