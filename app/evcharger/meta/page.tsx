'use client';

import { Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

const SUPPORT_PHONE = '(704) 555-1234';

export default function MetaEvChargerLanding() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    zip: ''
  });

  const handleChange = (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const trackLead = () => {
    if (typeof window === 'undefined') return;
    const fbq = (window as typeof window & { fbq?: (...args: any[]) => void }).fbq;
    if (fbq) {
      fbq('track', 'Lead');
    }
  };

  const trackCallClick = () => {
    if (typeof window === 'undefined') return;
    const fbq = (window as typeof window & { fbq?: (...args: any[]) => void }).fbq;
    if (fbq) {
      fbq('trackCustom', 'CallClick');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitState === 'sending') return;
    setSubmitState('sending');
    setErrorMessage(null);

    const fullName = formData.name.trim();
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastName = rest.join(' ') || 'Customer';

    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const payload = {
      source: 'meta-ev-landing',
      customer: {
        firstName: firstName || 'Customer',
        lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        postalCode: formData.zip || undefined
      },
      service: {
        type: 'ev-charger-install',
        notes: 'Meta landing page lead - requesting EV charger quote.',
        options: {
          leadSource: 'meta-landing'
        }
      },
      schedule: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    };

    try {
      const res = await fetch('/api/sf/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to submit');
      }
      setSubmitState('ok');
      trackLead();
    } catch (err) {
      console.error(err);
      setSubmitState('error');
      setErrorMessage('Something went wrong. Please try again or call us.');
    }
  };

  return (
    <div className={`${spaceGrotesk.className} evx-shell meta-shell`}>
      {pixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              alt="Meta Pixel"
            />
          </noscript>
        </>
      )}

      <div className="evx-grid-bg" aria-hidden />
      <div className="evx-hero-glow" aria-hidden />
      <div className="evx-corner-logo" aria-hidden>
        <img src="/wordmark-pill-dark.png" alt="" />
      </div>

      <div className="evx-card meta-card">
        <header className="evx-head meta-hero">
          <p className="eyebrow">Charlotte EV Charger Install</p>
          <h1>Get a Professional EV Charger Installed - Fast, Clean, Permitted</h1>
          <p className="lead">
            Tesla-certified electricians serving the Charlotte metro. No sales pressure. Clean installs. Fully permitted.
          </p>
          <div className="hero-pill-stack">
            <span className="badge">Tesla Certified</span>
            <span className="badge badge-ghost">Licensed Electricians</span>
            <span className="badge badge-ghost">Charlotte Metro</span>
            <a className="primary-cta" href="#lead-form">
              Get My EV Charger Quote -&gt;
            </a>
          </div>
          <p className="microcopy">Takes ~60 seconds | No obligation | Licensed &amp; insured</p>
        </header>

        <section className="meta-panel">
        <h2>How It Works</h2>
        <ul className="steps">
          <li><strong>1)</strong> Tell us about your home</li>
          <li><strong>2)</strong> We confirm details and pricing</li>
          <li><strong>3)</strong> You schedule when ready</li>
        </ul>
        <p className="reinforce">No surprise pricing. No pushy sales calls. Everything is confirmed before install.</p>
        </section>

        <section className="meta-panel dark">
        <h2>Why Homeowners Trust Us</h2>
        <ul className="bullet-grid">
          <li>Licensed and insured electricians - no subcontractor roulette</li>
          <li>Clean, code-compliant installs with proper conduit and breakers</li>
          <li>Permits handled for you in the Charlotte metro</li>
          <li>Tesla and Level 2 charging station experience daily</li>
          <li>Local team you can reach directly - not a national call center</li>
        </ul>
        </section>

        <section className="meta-panel">
        <h2>You May Qualify to Have Your Install Fully Covered</h2>
        <ul className="bullet-grid">
          <li>Duke Energy EV charger credit (if applicable)</li>
          <li>We help document the install for your submission</li>
          <li>Some homeowners may qualify for full install coverage (approval-based)</li>
          <li>Any credit is paid directly to you</li>
        </ul>
        </section>

        <section className="meta-panel form-section" id="lead-form">
        <h2>Get Your EV Charger Quote</h2>
        <form className="lead-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange('name')} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange('phone')} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange('email')} />
          </div>
          <div className="field">
            <label htmlFor="zip">Zip Code</label>
            <input id="zip" name="zip" type="text" required value={formData.zip} onChange={handleChange('zip')} />
          </div>
          <button type="submit" disabled={submitState === 'sending'}>
            {submitState === 'sending' ? 'Sending...' : 'Get My EV Charger Quote'}
          </button>
          <div className="form-secondary">
            <a className="secondary-cta" href="/evcharger">
              I want to book now (instant estimator)
            </a>
          </div>
          <p className="microcopy">No spam | No obligation | We&apos;ll confirm details before install</p>
          {submitState === 'ok' && (
            <p className="success">Thanks! We received your request and will reach out shortly.</p>
          )}
          {submitState === 'error' && (
            <p className="error">{errorMessage}</p>
          )}
        </form>
        </section>

        <section className="meta-panel dark">
        <h2>Questions, answered</h2>
        <div className="faq">
          <div>
            <h3>Do I need a permit?</h3>
            <p>In most Charlotte-area municipalities, yes. We handle permitting and keep you informed.</p>
          </div>
          <div>
            <h3>How long does an install take?</h3>
            <p>Most installs take a few hours once the plan is confirmed.</p>
          </div>
          <div>
            <h3>Will pricing be confirmed before install?</h3>
            <p>Yes. We review your details and confirm pricing before scheduling.</p>
          </div>
          <div>
            <h3>Do you install Tesla chargers?</h3>
            <p>Yes. We install Tesla Wall Connectors and other Level 2 chargers.</p>
          </div>
          <div>
            <h3>How soon can I schedule?</h3>
            <p>We&apos;ll share the next available windows after we review your details.</p>
          </div>
        </div>
        </section>

        <footer className="footer">
        <span>Need to talk? </span>
        <a href={`tel:${SUPPORT_PHONE.replace(/[^0-9]/g, '')}`} onClick={trackCallClick}>
          {SUPPORT_PHONE}
        </a>
        </footer>
      </div>

      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          background: #02060f;
          color: #f3f7ff;
          overflow-x: hidden;
          overflow-y: auto;
        }
        .meta-shell {
          min-height: 100vh;
          position: relative;
          padding: 22px 16px 40px;
          background:
            linear-gradient(135deg, rgba(3, 7, 14, 0.35), rgba(5, 9, 18, 0.25), rgba(3, 6, 12, 0.35)),
            url('/ev-fullscreen-hero-charlotte-skyline.png') center 14% / cover no-repeat;
          background-attachment: fixed;
          background-color: #02060f;
        }
        .evx-hero-glow {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1200px 800px at 50% 0%, rgba(76, 240, 255, 0.18), transparent 60%),
            radial-gradient(900px 600px at 80% 40%, rgba(124, 255, 179, 0.12), transparent 55%),
            radial-gradient(700px 500px at 10% 35%, rgba(93, 124, 255, 0.14), transparent 60%);
          mix-blend-mode: screen;
          animation: pulseGlow 12s ease-in-out infinite alternate;
          opacity: 0.85;
        }
        @keyframes pulseGlow {
          0% { opacity: 0.75; transform: translateY(0px); }
          50% { opacity: 0.95; transform: translateY(-10px); }
          100% { opacity: 0.75; transform: translateY(0px); }
        }
        .evx-grid-bg {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 38px 38px;
          opacity: 0.25;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .evx-corner-logo {
          position: fixed;
          top: 18px;
          right: 22px;
          z-index: 4;
          pointer-events: none;
          opacity: 0.92;
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));
        }
        .evx-corner-logo img {
          width: 160px;
          height: auto;
          display: block;
        }
        .evx-card {
          position: relative;
          max-width: 960px;
          margin: 18px auto 40px;
          background: transparent;
          border: none;
          border-radius: 24px;
          padding: 10px 0;
          z-index: 2;
        }
        .meta-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .meta-hero {
          text-align: center;
          position: relative;
          z-index: 2;
          padding: 22px 18px;
          border-radius: 18px;
          background: rgba(8, 12, 22, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.28em;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 12px;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 30px;
          font-weight: 800;
        }
        .lead {
          margin: 0 0 20px;
          color: rgba(255, 255, 255, 0.82);
          line-height: 1.6;
        }
        .hero-pill-stack {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(76, 240, 255, 0.6);
          color: #061024;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(120deg, rgba(76, 240, 255, 0.95), rgba(124, 255, 179, 0.9));
          box-shadow: 0 10px 24px rgba(76, 240, 255, 0.35);
        }
        .badge-ghost {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #eaf3ff;
        }
        .primary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 22px;
          border-radius: 999px;
          background: linear-gradient(135deg, #35d6ff, #0d3a7a);
          color: #fff;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 16px 30px rgba(13, 59, 122, 0.55);
        }
        .secondary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid rgba(247, 148, 29, 0.55);
          color: #1f1300;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          background: linear-gradient(130deg, rgba(247, 148, 29, 0.95), rgba(255, 189, 96, 0.9));
          box-shadow: 0 10px 24px rgba(247, 148, 29, 0.35);
          width: 100%;
        }
        .form-secondary {
          display: flex;
          justify-content: center;
          margin-top: 10px;
          width: 100%;
        }
        .microcopy {
          margin-top: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }
        .meta-panel {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(12, 16, 26, 0.5);
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
        }
        .meta-panel h2 {
          margin: 0 0 16px;
          font-size: 20px;
          color: #eaf3ff;
        }
        .meta-panel.dark {
          background: rgba(8, 12, 22, 0.65);
        }
        .steps {
          list-style: none;
          padding: 0;
          margin: 0 0 12px;
          display: grid;
          gap: 10px;
        }
        .steps li {
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          color: #eaf3ff;
        }
        .reinforce {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
        }
        .bullet-grid {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }
        .bullet-grid li {
          padding-left: 16px;
          position: relative;
        }
        .bullet-grid li::before {
          content: '-';
          position: absolute;
          left: 0;
          color: #35d6ff;
        }
        .form-section {
          background: rgba(8, 12, 22, 0.65);
        }
        .lead-form {
          display: grid;
          gap: 14px;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }
        input {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(3, 7, 12, 0.75);
          color: #fff;
          font-size: 15px;
        }
        button {
          margin-top: 6px;
          padding: 14px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #35d6ff, #0d3a7a);
          color: #fff;
          font-weight: 600;
          font-size: 16px;
        }
        button:disabled {
          opacity: 0.6;
        }
        .success {
          color: #9df2c5;
          font-size: 14px;
        }
        .error {
          color: #ffb4b4;
          font-size: 14px;
        }
        .faq {
          display: grid;
          gap: 16px;
        }
        .faq h3 {
          margin: 0 0 6px;
          font-size: 16px;
        }
        .faq p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
        }
        .footer {
          padding: 10px 18px 30px;
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
        }
        .footer a {
          color: #35d6ff;
          text-decoration: none;
        }
        @media (max-width: 720px) {
          .meta-shell {
            padding: 14px 12px 32px;
            background:
              linear-gradient(135deg, rgba(3, 7, 14, 0.25), rgba(5, 9, 18, 0.2), rgba(3, 6, 12, 0.25)),
              url('/ev-mobile-hero-charlotte-skyline.png') center 16% / cover no-repeat;
            background-attachment: scroll;
          }
          .evx-card {
            margin: 12px auto 28px;
          }
          h1 {
            font-size: 26px;
          }
          .evx-corner-logo img {
            width: 120px;
          }
          .hero-pill-stack {
            flex-direction: column;
            align-items: stretch;
          }
          .hero-pill-stack > * {
            width: 100%;
          }
          .primary-cta {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
