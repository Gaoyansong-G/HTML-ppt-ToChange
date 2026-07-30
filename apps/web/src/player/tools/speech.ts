/**
 * Speech synthesis utilities for the player.
 *
 * Wraps window.speechSynthesis with:
 * - zh-CN voice preference for Chinese text
 * - toggle semantics (speaking the same text again stops it)
 * - a tiny pub/sub so UI can reflect speaking state
 */

export interface SpeakOptions {
  /** BCP-47 language tag, defaults to 'zh-CN'. */
  lang?: string;
  /** Speech rate, defaults to 1. */
  rate?: number;
  /** Pitch, defaults to 1. */
  pitch?: number;
}

export type SpeakStateListener = (speaking: boolean) => void;

const listeners = new Set<SpeakStateListener>();

let currentUtterance: SpeechSynthesisUtterance | null = null;

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function emit(speaking: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(speaking);
    } catch {
      // Listener errors must not break speech flow.
    }
  });
}

/**
 * Subscribe to speaking-state changes. Returns an unsubscribe function.
 */
export function onSpeakStateChange(listener: SpeakStateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSpeaking(): boolean {
  return isSupported() && window.speechSynthesis.speaking;
}

/**
 * Pick the best matching voice for the requested language.
 * Voices load asynchronously in most browsers, so this may return
 * undefined on the very first call; the utterance lang still applies.
 */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!isSupported()) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const normalized = lang.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === normalized) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(normalized.split('-')[0] ?? '')) ||
    // Fallback: any Chinese voice when zh-CN was requested but unavailable.
    (normalized.startsWith('zh')
      ? voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
      : undefined)
  );
}

/**
 * Speak the given text. If speech is currently in progress, it is stopped
 * first (toggle behaviour: clicking a speaking element stops playback).
 */
export function speakText(text: string, options?: SpeakOptions): boolean {
  if (!isSupported()) return false;

  const trimmed = text.trim();
  if (!trimmed) return false;

  // Toggle: any in-flight speech is cancelled before starting anew.
  stopSpeak();

  const lang = options?.lang ?? 'zh-CN';
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = lang;
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;

  const voice = pickVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
      emit(false);
    }
  };
  utterance.onerror = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
      emit(false);
    }
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  emit(true);
  return true;
}

/**
 * Stop any in-flight speech.
 */
export function stopSpeak(): void {
  if (!isSupported()) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  if (currentUtterance) {
    currentUtterance = null;
    emit(false);
  }
}
