'use client';

export default function Page() {
  return (
    <section className="complete-shell">
      <div className="complete-card">
        <h1>Thanks for securing your install slot!</h1>
        <p>
          We received your deposit and are reviewing the details. A member of the Tentmakers team will
          reach out shortly to confirm the install window and answer any remaining questions.
        </p>
        <p className="prompt">
          If you need anything right away, send a note to <a href="mailto:hello@tentmakerselectric.com">hello@tentmakerselectric.com</a> or call (704) 555-1234.
        </p>
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
          max-width: 640px;
          width: 100%;
          border-radius: 24px;
          padding: 32px;
          background: rgba(6, 10, 20, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.65);
          text-align: center;
        }
        h1 {
          margin-bottom: 12px;
          font-size: 32px;
        }
        p {
          margin: 12px 0;
          line-height: 1.6;
          color: #c3d3eb;
        }
        .prompt a {
          color: #96d9ff;
          text-decoration: none;
          font-weight: 600;
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
