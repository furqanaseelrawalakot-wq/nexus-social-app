import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecordingResult {
  blob: Blob;
  base64: string;
  duration: string;
  url: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [formattedDuration, setFormattedDuration] = useState('0:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      cleanup();
      setAudioBlob(null);
      setAudioBase64(null);
      setAudioUrl(null);
      setRecordingSeconds(0);
      setFormattedDuration('0:00');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);
        setFormattedDuration(formatSeconds(elapsed));
      }, 500);
    } catch (err: any) {
      console.error('Audio recording start error:', err);
      setErrorMessage(err.message || 'Microphone access denied.');
      setIsRecording(false);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<AudioRecordingResult | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        cleanup();
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        const elapsedSecs = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const durationFormatted = formatSeconds(elapsedSecs);
        const objectUrl = URL.createObjectURL(finalBlob);

        setAudioBlob(finalBlob);
        setAudioUrl(objectUrl);
        setFormattedDuration(durationFormatted);
        setIsRecording(false);

        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          setAudioBase64(base64String);
          cleanup();
          resolve({
            blob: finalBlob,
            base64: base64String,
            duration: durationFormatted,
            url: objectUrl,
          });
        };
        reader.onerror = () => {
          cleanup();
          resolve(null);
        };
        reader.readAsDataURL(finalBlob);
      };

      mediaRecorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setAudioBlob(null);
    setAudioBase64(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setFormattedDuration('0:00');
    cleanup();
  }, [cleanup]);

  const resetRecording = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  return {
    isRecording,
    recordingSeconds,
    formattedDuration,
    audioBlob,
    audioBase64,
    audioUrl,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  };
}
