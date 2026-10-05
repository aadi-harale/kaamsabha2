"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/domain";
import { workerText } from "@/lib/worker-copy";
import { chooseWorkerVoice } from "@/lib/worker-guidance";

export function WorkerListen({ text, locale }: { text: string; locale: Locale }) {
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setSpeaking(false); setMessage("");
    const speech = window.speechSynthesis;
    const ready = () => { if (chooseWorkerVoice(speech.getVoices(), locale)) setMessage(""); };
    speech?.getVoices();
    speech?.addEventListener("voiceschanged", ready);
    return () => {
      speech?.removeEventListener("voiceschanged", ready);
      if (current.current) {
        current.current.onend = null; current.current.onerror = null;
        window.speechSynthesis?.cancel(); current.current = null;
      }
    };
  }, [text, locale]);

  function listen() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setMessage(workerText(locale, "voiceUnavailable")); return;
    }
    const speech = window.speechSynthesis;
    if (speaking) { speech.cancel(); current.current = null; setSpeaking(false); return; }
    // The device must provide the requested language. Never read Hindi/Marathi in an unrelated voice.
    const voice = chooseWorkerVoice(speech.getVoices(), locale);
    if (!voice) { setMessage(workerText(locale, "voiceMissing")); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang; utterance.voice = voice; utterance.rate = .9;
    utterance.onend = () => { if (current.current === utterance) { current.current = null; setSpeaking(false); } };
    utterance.onerror = event => {
      if (current.current !== utterance) return;
      current.current = null; setSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") setMessage(workerText(locale, "voiceUnavailable"));
    };
    setMessage(""); current.current = utterance; setSpeaking(true);
    try { speech.cancel(); speech.speak(utterance); }
    catch { current.current = null; setSpeaking(false); setMessage(workerText(locale, "voiceUnavailable")); }
  }

  return <div className="workerListen">
    <button type="button" className="secondary" aria-pressed={speaking} onClick={listen}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>
      {workerText(locale, speaking ? "stopListening" : "listen")}
    </button>
    {message && <p role="status">{message}</p>}
    <details className="workerListenText"><summary>{workerText(locale, "readSummary")}</summary><p>{text}</p></details>
  </div>;
}
