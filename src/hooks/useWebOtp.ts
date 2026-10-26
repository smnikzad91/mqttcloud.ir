import { useEffect, useRef } from "react";

// WebOTP API — lets Chrome on Android read a one-time code straight out of
// the incoming SMS and hand it to the page, no copy/paste. Requires the SMS
// text to end with "@<domain> #<code>" (see sendOtpSms in src/lib/sms.ts)
// and the input to have autoComplete="one-time-code". Only Chrome/Android
// actually implements this; everywhere else (desktop, iOS Safari) the
// `"OTPCredential" in window` check is false and this is a silent no-op —
// iOS still benefits from autoComplete="one-time-code" on its own.
interface OTPCredential extends Credential {
  code: string;
}

interface OTPCredentialRequestOptions extends CredentialRequestOptions {
  otp: { transport: string[] };
}

export function useWebOtp(active: boolean, onCode: (code: string) => void) {
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;

    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as OTPCredentialRequestOptions)
      .then((cred) => {
        const code = (cred as OTPCredential | null)?.code;
        if (code) onCodeRef.current(code);
      })
      .catch(() => {
        // AbortError on cleanup, or the user dismissed/denied the prompt —
        // both expected, nothing to surface.
      });

    return () => ac.abort();
  }, [active]);
}
