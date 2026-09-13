import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Video, Play, Pause, RotateCcw, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVideo: (data: {
    base64: string;
    duration?: string;
    fileSize?: string;
  }) => Promise<void>;
}

const MAX_RECORDING_SECONDS = 60;

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVideo,
}) => {
  const { showToast } = useToast();

  const [status, setStatus] = useState<'requesting' | 'ready' | 'recording' | 'recorded' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const videoLiveRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Helper to stop all tracks from hardware
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  }, []);

  // Initialize camera and microphone stream
  const initializeCamera = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage('');
    stopAllTracks();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera recording.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.muted = true;
        try {
          await videoLiveRef.current.play();
        } catch {}
      }

      setStatus('ready');
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const isNotFound = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';

      const msg = isDenied
        ? 'Camera or microphone permission was denied. Please allow access in browser settings.'
        : isNotFound
        ? 'No camera or microphone device found on your system.'
        : err.message || 'Could not access camera/microphone.';

      setErrorMessage(msg);
      setStatus('error');
      showToast('Camera Access Error', msg, 'error');
    }
  }, [showToast, stopAllTracks]);

  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
      setRecordedBlob(null);
      setRecordingSeconds(0);
      setStatus('requesting');
    }

    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, initializeCamera, stopAllTracks]);

  // Start recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setStatus('recorded');
        stopAllTracks();
      };

      mediaRecorder.start(200); // 200ms slices
      setStatus('recording');
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      showToast('Recording Failed', err.message || 'Could not start video recorder.', 'error');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Re-record (discard recorded video and re-open camera)
  const handleReRecord = () => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);
    setRecordedBlob(null);
    setRecordingSeconds(0);
    initializeCamera();
  };

  // Send recorded video
  const handleSend = async () => {
    if (!recordedBlob) return;
    setIsSending(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const minutes = Math.floor(recordingSeconds / 60);
        const seconds = recordingSeconds % 60;
        const durationFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        const sizeFormatted = `${(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB`;

        await onSendVideo({
          base64,
          duration: durationFormatted,
          fileSize: sizeFormatted,
        });

        setIsSending(false);
        onClose();
        showToast('Video Sent! 🎥', 'Your video message has been delivered.', 'success');
      };

      reader.readAsDataURL(recordedBlob);
    } catch (err: any) {
      setIsSending(false);
      showToast('Failed to Send', 'Could not process video note.', 'error');
    }
  };

  const togglePreviewPlay = () => {
    if (!videoPreviewRef.current) return;
    if (videoPreviewRef.current.paused) {
      videoPreviewRef.current.play();
      setIsPlayingPreview(true);
    } else {
      videoPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-in fade-in select-none">
      <div
        className="w-full max-w-lg bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col animate-in zoom-in-95 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">
              {status === 'recorded' ? 'Review Video Note' : 'Record Video Message'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {status === 'requesting' && (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Starting camera...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-xs font-medium text-slate-300 leading-relaxed">{errorMessage}</p>
              <button
                type="button"
                onClick={initializeCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Live Camera View */}
          <video
            ref={videoLiveRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${
              status === 'ready' || status === 'recording' ? 'block' : 'hidden'
            }`}
          />

          {/* Recorded Preview View */}
          {status === 'recorded' && recordedVideoUrl && (
            <div className="relative w-full h-full group cursor-pointer" onClick={togglePreviewPlay}>
              <video
                ref={videoPreviewRef}
                src={recordedVideoUrl}
                playsInline
                onEnded={() => setIsPlayingPreview(false)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                <button
                  type="button"
                  className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                >
                  {isPlayingPreview ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Recording Timer & Progress Overlay */}
          {status === 'recording' && (
            <>
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-rose-500/50">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-white">
                  0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds} / 1:00
                </span>
              </div>

              {/* Progress Bar (60s max) */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-1000"
                  style={{ width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-900 flex items-center justify-between gap-3">
          {status === 'ready' && (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span>Start Recording</span>
              </button>
            </div>
          )}

          {status === 'recording' && (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all active:scale-95"
              >
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}

          {status === 'recorded' && (
            <>
              <button
                type="button"
                onClick={handleReRecord}
                disabled={isSending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Re-record</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Video Message</span>
                  </>
                )}
              </button>
            </>
          )}

          {status === 'error' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
