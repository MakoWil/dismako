import { useEffect } from 'react';

export function useAudioAnalyser(
  stream: MediaStream | null,
  onSpeakingChange: (isSpeaking: boolean) => void,
  isMuted: boolean
) {
  useEffect(() => {
    if (!stream || isMuted) {
      onSpeakingChange(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      onSpeakingChange(false);
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
      analyser.smoothingTimeConstant = 0.4;

      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let currentlySpeaking = false;

      const checkAudioLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Limiar de detecção de fala (volume médio > 15)
        const isSpeakingNow = average > 15;

        if (isSpeakingNow !== currentlySpeaking) {
          currentlySpeaking = isSpeakingNow;
          onSpeakingChange(isSpeakingNow);
        }

        animationFrameId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (e) {
      console.warn('Erro ao inicializar AudioContext para detecção de fala:', e);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isMuted, onSpeakingChange]);
}
