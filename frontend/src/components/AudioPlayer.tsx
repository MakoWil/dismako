import React, { useEffect, useRef } from 'react';
import { Participant } from '../types';

interface AudioPlayerProps {
  participant: Participant;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ participant }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream;
      audioRef.current.play().catch(err => {
        console.warn('Autoplay de áudio bloqueado pelo navegador:', err);
      });
    }
  }, [participant.stream]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};
