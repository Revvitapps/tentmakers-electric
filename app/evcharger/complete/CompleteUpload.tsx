'use client';

const DEPOSIT_LINK = process.env.NEXT_PUBLIC_EV_DEPOSIT_LINK ?? 'https://buy.stripe.com/test_placeholder';

export default function CompleteUpload() {
  return (
    <>
      <main className="complete-shell">
        <div className="complete-card">
          <p className="eyebrow">EV Charger Install</p>
          <h1>Thank you for reaching out!</h1>
          <p className="lead">
            We have your information and will get back to you shortly with a plan for the install.
            If you&apos;d like to lock in a time right now, you can pay the $100 deposit below and we will treat
            it as a confirmed reservation.
          </p>
          <div className="actions">
            <a
              className="book-btn"
              href={DEPOSIT_LINK}
              target="_blank"
              rel="noreferrer"
            >
              <span className="icon">
                <img
                  src="/Tesla-Home-Charger-Kent-WA.jpeg"
                  alt="EV charger icon"
                  width={28}
                  height={28}
                />
              </span>
              Book your time now
            </a>
            <p className="support">
              Prefer to keep chatting? Reply to the confirmation email or call us at (704) 555-1234 and we&apos;ll help you plan the install.
            </p>
          </div>
        </div>
      </main>
      <style jsx>{`
        .complete-shell {
          min-height: 100vh;
          padding: 0;
          background:
            linear-gradient(135deg, rgba(2, 6, 15, 0.8), rgba(2, 6, 15, 0.4)),
            url('/ev-fullscreen-hero-charlotte-skyline.png') center / cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .complete-card {
          max-width: 720px;
          width: 100%;
          margin: 0 16px;
          padding: 48px 36px;
          background: rgba(4, 9, 19, 0.9);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.65);
          color: #f4f7ff;
          text-align: left;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 12px;
          margin: 0 0 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        h1 {
          margin: 0 0 12px;
          font-size: 36px;
        }
        .lead {
          margin: 0 0 28px;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.84);
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .book-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 28px;
          border-radius: 999px;
          background: linear-gradient(135deg, #35d6ff, #0d3a7a);
          color: #fff;
          font-weight: 600;
          font-size: 18px;
          text-transform: uppercase;
          text-decoration: none;
          box-shadow: 0 12px 30px rgba(13, 59, 122, 0.6);
          border: none;
        }
        .book-btn:hover {
          transform: translateY(-1px);
        }
        .icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .icon img {
          width: 22px;
          height: auto;
          display: block;
        }
        .support {
          margin: 0;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }
        @media (max-width: 640px) {
          .complete-card {
            padding: 32px 22px;
          }
          h1 {
            font-size: 32px;
          }
          .book-btn {
            font-size: 16px;
            padding: 12px 22px;
          }
        }
      `}</style>
    </>
  );
}
