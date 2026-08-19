import { useEffect, useRef } from 'react';

export function useAudioAnalyser(
  stream: MediaStream | null,
  onSpeakingChange: (isSpeaking: boolean) => void,
  isMuted: boolean
) {
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!stream || isMuted) {
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        onSpeakingChange(false);
      }
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        onSpeakingChange(false);
      }
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrameId: number | null = null;

    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;

      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const SPEAKING_THRESHOLD = 18; // Volume mínimo para considerar fala
      const SILENCE_HANGOVER_MS = 400; // Tempo de retenção (evita piscadas rápidas)

      const checkAudioLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > SPEAKING_THRESHOLD) {
          // Se detectou fala, cancela o timer de silêncio
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }

          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            onSpeakingChange(true);
          }
        } else {
          // Se caiu abaixo do limiar, aguarda o tempo de retenção antes de desligar a fala
          if (isSpeakingRef.current && !speakingTimeoutRef.current) {
            speakingTimeoutRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              onSpeakingChange(false);
              speakingTimeoutRef.current = null;
            }, SILENCE_HANGOVER_MS);
          }
        }

        animationFrameId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (e) {
      console.warn('Erro ao inicializar AudioContext para detecção de fala:', e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isMuted, onSpeakingChange]);
}
