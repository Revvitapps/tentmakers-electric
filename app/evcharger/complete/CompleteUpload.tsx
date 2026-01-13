'use client';

import { useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const bookingId = searchParams.get('booking_id') ?? '';
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = Boolean(sessionId && bookingId);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS);
    if (!files.length || !canUpload) {
      return;
    }
    setStatus('uploading');
    setMessage(null);
    setError(null);

    try {
      const photos = await Promise.all(files.map((file) => fileToPhoto(file)));
      const res = await fetch('/api/evcharger/photos-after-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bookingId, photos })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || 'Unable to send photos');
      }
      setStatus('ok');
      setMessage('Thanks for the photos! We sent them to the install team.');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Unable to deliver the photos — please try again or email support.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <section className="complete-shell">
      <div className="complete-card">
        <h1>Thanks for securing your install slot!</h1>
        <p>
          We received your deposit and will follow up with a confirmation call soon.
          {canUpload && ' Share ceiling or panel photos below so we can lock in the routing.'}
        </p>
        {!canUpload && (
          <p className="alert">
            Missing booking reference. If you just paid, please return to the calculator or email hello@tentmakerselectric.com.
          </p>
        )}

        <div className="uploader">
          <label>
            <span>Upload up to {MAX_PHOTOS} photos</span>
            <input type="file" accept="image/*" multiple disabled={!canUpload} onChange={handleFileChange} />
          </label>
          <small>
            We’ll bundle the photos with your booking details and share them with the install team.
          </small>
          {status === 'uploading' && <p className="status">Uploading photos…</p>}
          {status === 'ok' && <p className="status success">{message}</p>}
          {status === 'error' && <p className="status error">{error}</p>}
        </div>
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
          background: rgba(6, 10, 20, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.65);
          text-align: center;
        }
        h1 {
          margin-bottom: 8px;
          font-size: 32px;
        }
        p {
          margin: 8px 0 16px;
          line-height: 1.6;
          color: #c3d3eb;
        }
        .alert {
          color: #fca5a5;
        }
        .uploader {
          margin-top: 24px;
          padding: 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.35);
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
        input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        @media (max-width: 640px) {
          .complete-card {
            padding: 24px;
          }
          h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </section>
  );
}
