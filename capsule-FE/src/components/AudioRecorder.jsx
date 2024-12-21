import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const MAX_RECORDING_TIME = 300; // 5 minutes in seconds

export function AudioRecorder() {
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const { user, accessToken } = useAuth();

  // Check supported MIME types
  const getSupportedMimeType = () => {
    const types = [
      'audio/mp4',
      'audio/x-m4a',
      'audio/webm',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // fallback
  };

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME - 1) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // 128 kbps for better quality
      });
      
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const currentMimeType = recorder.mimeType;
        setAudioChunks(chunks);
        await uploadRecording(chunks, currentMimeType);
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks([]);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const makeApiCall = async (data) => {
    if (!accessToken || !user?.id) {
      throw new Error('User not authenticated');
    }

    const { key } = data;
    const apiUrl = 'https://deepgram-integration-l5v0.onrender.com/startTranscription';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          key,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Response from server:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error making the API call:', error);
      throw error;
    }
  };

  const uploadRecording = async (chunks, mimeType) => {
    if (chunks.length === 0) return;

    try {
      setIsUploading(true);
      const fileExtension = mimeType.includes('mp4') || mimeType.includes('x-m4a') ? 'm4a' : 'webm';
      const audioBlob = new Blob(chunks, { type: mimeType });
      const fileName = `recording-${Date.now()}-${user.id}.${fileExtension}`;

      // Create the command for S3
      const command = new PutObjectCommand({
        Bucket: 'zillusion-capsule-audio-s3',
        Key: fileName,
        ContentType: mimeType,
      });

      try {
        // Get pre-signed URL
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        // Upload using pre-signed URL
        const response = await fetch(signedUrl, {
          method: 'PUT',
          body: audioBlob,
          headers: {
            'Content-Type': mimeType,
          },
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        console.log('File uploaded successfully');
        
        // Make API call to start transcription
        await makeApiCall({ key: fileName });
        
        alert('Recording uploaded successfully!');
      } catch (err) {
        console.error('Error uploading to S3:', err);
        throw err;
      }
    } catch (error) {
      console.error('Error uploading recording:', error);
      alert('Error uploading recording: ' + error.message);
    } finally {
      setIsUploading(false);
      setAudioChunks([]);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', // Subtract header height
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '3rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minWidth: '300px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          {isRecording && (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                animation: 'pulse 1.5s infinite',
              }}
            />
          )}
          <span
            style={{
              fontSize: '2.5rem',
              fontWeight: '500',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
            }}
          >
            {formatTime(recordingTime)}
          </span>
        </div>

        {isRecording && recordingTime >= MAX_RECORDING_TIME - 30 && (
          <div
            style={{
              color: '#e74c3c',
              fontSize: '0.875rem',
              marginTop: '-1rem',
            }}
          >
            {Math.max(0, MAX_RECORDING_TIME - recordingTime)}s remaining
          </div>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.125rem',
            fontWeight: '500',
            backgroundColor: isRecording ? '#e74c3c' : 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {isUploading ? 'Uploading...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        <div
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}
        >
          Maximum recording time: {formatTime(MAX_RECORDING_TIME)}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.5;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
