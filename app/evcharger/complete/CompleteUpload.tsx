'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

type PhotoInput = {
  name: string;
  type?: string;
  dataUrl: string;
};

const MAX_PHOTOS = 4;

function fileToPhoto(file: File): Promise<PhotoInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result)
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompleteUpload() {
  const [sessionId, setSessionId] = useState('');
  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get('session_id') ?? '');
    setBookingId(params.get('booking_id') ?? '');
  }, []);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setStatus('idle');
    setMessage(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !sessionId || !bookingId || submitted) return;
    setStatus('uploading');
    setMessage(null);
    setError(null);

    try {
      const photo = await fileToPhoto(selectedFile);
      const res = await fetch('/api/evcharger/photos-after-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bookingId, photos: [photo] })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || 'Unable to send photo');
      }
      setStatus('ok');
      setMessage('Thanks! We shared the photo with install and ops.');
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Unable to deliver the photo — please try again or email hello@tentmakerselectric.com.');
    }
  };

  return (
    <section className="complete-shell">
      <div className="complete-card">
        <h1>Thanks for securing your install slot!</h1>
        <p className="lead">
          We received your deposit and will confirm the install window shortly. You can upload photos of your panel
          or proposed charger location so the install team can lock in the routing.
        </p>
        {!sessionId || !bookingId ? (
          <p className="alert">
            Looks like the booking reference is missing. Please return to the calculator, or email hello@tentmakerselectric.com with a screenshot.
          </p>
        ) : (
          <div className="uploader">
            <label>
              <span>Upload a photo of your panel or parking area</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={status === 'uploading' || submitted}
              />
            </label>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || status === 'uploading' || submitted}
            >
              {submitted ? 'Photo submitted' : 'Submit photo'}
            </button>
            <small>We’ll pair the photo with your booking and email it to the install team.</small>
            {status === 'uploading' && <p className="status">Uploading photo…</p>}
            {status === 'ok' && <p className="status success">{message}</p>}
            {status === 'error' && <p className="status error">{error}</p>}
          </div>
        )}
      </div>
      <style jsx>{`
        .complete-shell {
          min-height: 100vh;
          padding: 60px 24px;
          background: #02060f;
          color: #f2f6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .complete-card {
          max-width: 700px;
          width: 100%;
          border-radius: 24px;
          padding: 32px;
          background: rgba(6, 10, 20, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        h1 {
          margin-bottom: 8px;
          font-size: 32px;
        }
        .lead {
          margin: 0 0 16px;
          color: #c3d3eb;
          line-height: 1.6;
        }
        .alert {
          color: #fca5a5;
        }
        .uploader {
          margin-top: 24px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.4);
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #eaf3ff;
        }
        input[type='file'] {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
          color: #f2f6ff;
          cursor: pointer;
        }
        small {
          display: block;
          margin-top: 12px;
          color: #9cb3d9;
        }
        .status {
          margin-top: 12px;
          font-size: 13px;
        }
        .status.success {
          color: #a6ffd1;
        }
        .status.error {
          color: #ffb4b4;
        }
        button {
          margin-top: 12px;
          border-radius: 10px;
          padding: 10px 16px;
          background: #0d2e58;
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #f2f6ff;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .complete-shell {
            padding: 40px 16px;
          }
        }
      `}</style>
    </section>
  );
}
