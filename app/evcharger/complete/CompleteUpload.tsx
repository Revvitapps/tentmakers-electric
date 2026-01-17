'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

const MAX_PHOTOS = 4;
const DEPOSIT_LINK = process.env.NEXT_PUBLIC_EV_DEPOSIT_LINK ?? 'https://buy.stripe.com/test_placeholder';

type PhotoInput = {
  name: string;
  type?: string;
  dataUrl: string;
};

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get('session_id') ?? '');
    setBookingId(params.get('booking_id') ?? '');
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS);
    setSelectedFiles(files);
    setStatus('idle');
    setMessage(null);
    setError(null);
    setSubmitted(false);
  };

  const handleUpload = async () => {
    if (!sessionId || !bookingId || !selectedFiles.length || submitted) return;
    setStatus('uploading');
    setMessage(null);
    setError(null);

    try {
      const photos = await Promise.all(selectedFiles.map(fileToPhoto));
      const res = await fetch('/api/evcharger/photos-after-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, bookingId, photos })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || 'Unable to send photo');
      }
      setStatus('ok');
      setMessage('Thanks! We shared the photo with the install and ops teams.');
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Unable to deliver the photos — please try again or email hello@tentmakerselectric.com.');
    }
  };

  return (
    <>
      <main className="complete-shell">
        <div className="complete-card">
          <div className="content-grid">
            <div className="message-panel">
              <p className="eyebrow">EV Charger Install</p>
              <h1>Thank you for reaching out!</h1>
          <p className="lead">
            We have your information and will get back to you shortly with a plan for the install.
            If you&apos;d like to lock in a time right now, pay the $100 deposit below and we&apos;ll treat it as
            a confirmed reservation.
          </p>
              <a className="book-btn" href={DEPOSIT_LINK} target="_blank" rel="noreferrer">
                <span className="icon">
                  <img src="/Tesla-Home-Charger-Kent-WA.jpeg" alt="EV charger icon" width={28} height={28} />
                </span>
                Book your time now
              </a>
            <p className="support">
              Prefer to keep chatting? Reply to the confirmation email or call (704) 555-1234 and we&apos;ll help plan the install.
            </p>
            </div>
            <div className="upload-panel">
              <h2>Send us a photo</h2>
              <p className="subhead">
                Upload new photos of the panel, parking area, or proposed charger location so the install team can lock in routing.
              </p>
              <label className="file-input">
                <span>Select up to {MAX_PHOTOS} photo{MAX_PHOTOS > 1 ? 's' : ''}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={status === 'uploading' || submitted}
                />
              </label>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFiles.length || status === 'uploading' || submitted}
              >
                {submitted ? 'Photos submitted' : 'Send photos'}
              </button>
              {status === 'uploading' && <p className="status">Uploading photos…</p>}
              {status === 'ok' && <p className="status success">{message}</p>}
              {status === 'error' && <p className="status error">{error}</p>}
              {!sessionId || !bookingId ? (
                <p className="alert">
                  Booking reference missing. Return to the calculator or email hello@tentmakerselectric.com with a screenshot.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <style jsx>{`
        .complete-shell {
          min-height: 100vh;
          background:
            linear-gradient(135deg, rgba(2, 6, 15, 0.8), rgba(2, 6, 15, 0.4)),
            url('/ev-fullscreen-hero-charlotte-skyline.png') center / cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
        }
        .complete-card {
          width: 100%;
          max-width: 1024px;
          padding: 48px;
          border-radius: 32px;
          background: rgba(3, 7, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
        }
        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 40px;
        }
        .message-panel h1 {
          margin-bottom: 12px;
          font-size: 34px;
        }
        .lead {
          margin: 0 0 24px;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.86);
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin-bottom: 12px;
        }
        .book-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 26px;
          border-radius: 999px;
          background: linear-gradient(135deg, #35d6ff, #0d3a7a);
          color: #fff;
          font-weight: 600;
          font-size: 18px;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          box-shadow: 0 16px 30px rgba(13, 59, 122, 0.55);
        }
        .book-btn:hover {
          transform: translateY(-1px);
        }
        .icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .icon img {
          width: 24px;
          height: auto;
          display: block;
        }
        .support {
          margin-top: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }
        .upload-panel {
          padding: 28px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .upload-panel h2 {
          margin: 0 0 8px;
          font-size: 24px;
        }
        .subhead {
          margin: 0 0 20px;
          color: rgba(255, 255, 255, 0.72);
        }
        .file-input {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #eaf3ff;
          margin-bottom: 16px;
        }
        .file-input input {
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
          color: #f2f6ff;
          cursor: pointer;
        }
        button {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 12px;
          font-weight: 600;
          font-size: 16px;
          background: linear-gradient(135deg, #35d6ff, #0d3a7a);
          color: #fff;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(13, 59, 122, 0.4);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .status {
          margin-top: 12px;
          font-size: 14px;
        }
        .status.success {
          color: #9df2c5;
        }
        .status.error {
          color: #ffb4b4;
        }
        .alert {
          margin-top: 16px;
          font-size: 13px;
          color: #ffb4b4;
        }
        @media (max-width: 720px) {
          .complete-card {
            padding: 32px;
          }
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
