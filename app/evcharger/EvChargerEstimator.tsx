'use client';

import { Space_Grotesk } from 'next/font/google';
import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

type RunKey = 'next' | 'samewall' | 'across';
type PanelLoc = 'inside' | 'outside' | 'interior-other';

const RUN_OPTIONS: Record<
  RunKey,
  { label: string; min: number; max: number }
> = {
  next: { label: 'Next to panel (same wall, within 12")', min: 600, max: 750 },
  samewall: { label: 'Same wall run up to ~12 ft', min: 1000, max: 1200 },
  across: { label: 'Across the room / different wall', min: 1600, max: 1600 }
};

const PERMIT_FEE = 50;

function toIsoWithOffset(dateStr?: string | null, timeStr?: string | null) {
  if (!dateStr || !timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h || 0, m || 0, 0, 0);
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const offsetMin = d.getTimezoneOffset();
  const sign = offsetMin > 0 ? '-' : '+';
  const hoursOffset = pad(Math.floor(Math.abs(offsetMin) / 60));
  const minsOffset = pad(Math.abs(offsetMin) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hoursOffset}:${minsOffset}`;
}

async function readPhotos(files: File[]) {
  if (!files.length) return [];
  const slice = files.slice(0, 4);
  return Promise.all(
    slice.map(
      (file) =>
        new Promise<{ name: string; size: number; type: string; dataUrl: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: String(reader.result)
              });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }
        )
    )
  );
}

export default function EvChargerEstimator() {
  const [run, setRun] = useState<RunKey>('next');
  const [panelLoc, setPanelLoc] = useState<PanelLoc>('inside');
  const [permit, setPermit] = useState(true);
  const [outsideOutlet, setOutsideOutlet] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitState, setSubmitState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [depositChoice, setDepositChoice] = useState<'deposit' | 'questions'>('questions');

  const estimate = useMemo(() => {
    const runOption = RUN_OPTIONS[run];
    const permitValue = permit ? PERMIT_FEE : 0;
    const needsCustom = panelLoc === 'interior-other';
    const dukeCredit = 1133;

    if (needsCustom) {
      const refRange =
        runOption.min === runOption.max
          ? `$${runOption.max.toLocaleString()}`
          : `$${runOption.min.toLocaleString()}–$${runOption.max.toLocaleString()}`;
      const lines = [
        `Custom routing (panel not in garage). Reference range: ${refRange}.`,
        permit ? `Permit estimate: $${PERMIT_FEE}` : null,
        outsideOutlet ? 'Outside outlet requested (quoted after review).' : null
      ].filter(Boolean) as string[];
      return {
        label: 'Custom quote',
        estimatedPrice: undefined,
        lines
      };
    }

    const minTotal = runOption.min + permitValue;
    const maxTotal = runOption.max + permitValue;
    const netAfterCredit = Math.max(0, minTotal - dukeCredit);
    const lines = [
      `Range reference (${runOption.label}): $${minTotal.toLocaleString()}–$${maxTotal.toLocaleString()}`,
      panelLoc === 'outside' ? 'Panel is outside the garage: weatherproof routing noted.' : null,
      permit ? `Permit estimate: $${PERMIT_FEE}` : null,
      outsideOutlet ? 'Outside outlet requested (quoted after review).' : null,
      `Potential Duke Energy credit (rebate): -$${dukeCredit.toLocaleString()}`,
      `As low as: $${netAfterCredit.toLocaleString()} after credit (if approved)`
    ].filter(Boolean) as string[];

    return {
      label: `$${minTotal.toLocaleString()}`,
      estimatedPrice: minTotal,
      lines
    };
  }, [run, panelLoc, permit, outsideOutlet]);

  const handlePhotos = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files ?? []));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    if (step < totalSteps) {
      e.preventDefault();
      setStep((s) => Math.min(totalSteps, s + 1));
      return;
    }
    e.preventDefault();
    setSubmitState('idle');
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const requiredFields = ['custName', 'custEmail', 'custPhone'] as const;
    const missingRequired = requiredFields.find(
      (field) => !String(formData.get(field) ?? '').trim()
    );
    if (missingRequired) {
      setSubmitting(false);
      setSubmitState('error');
      setStep(1);
      const fieldEl = document.getElementById(missingRequired) as HTMLInputElement | null;
      fieldEl?.focus();
      return;
    }
    const fullName = String(formData.get('custName') ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastName = rest.join(' ') || 'Customer';
    const chargerHardware = String(formData.get('chargerBrand') ?? '');
    const ampsValue = String(formData.get('amps') ?? '');
    const depositPref = depositChoice;

    const startIso = toIsoWithOffset(
      String(formData.get('prefDate') ?? '') || undefined,
      String(formData.get('prefStart') ?? '') || undefined
    );
    let scheduleStart = startIso;
    let scheduleEnd: string | null = null;
    if (startIso) {
      const endDate = new Date(startIso);
      endDate.setHours(endDate.getHours() + 2);
      scheduleEnd = endDate.toISOString();
    } else {
      const startFallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endFallback = new Date(startFallback.getTime() + 2 * 60 * 60 * 1000);
      scheduleStart = startFallback.toISOString();
      scheduleEnd = endFallback.toISOString();
    }

    const photoFiles =
      photos.length > 0
        ? photos
        : (formData
            .getAll('photos')
            .filter((f): f is File => f instanceof File && f.size > 0) as File[]);
    const photoPayload = await readPhotos(photoFiles);

    const notes = [
      `Run: ${RUN_OPTIONS[run].label}`,
      `Panel location: ${
        panelLoc === 'inside'
          ? 'Inside the garage'
          : panelLoc === 'outside'
            ? 'Outside the garage'
            : 'Interior (not in garage)'
      }`,
      `Charger hardware: ${chargerHardware || 'Unspecified'}`,
      `Desired amperage: ${ampsValue || 'Not sure'}`,
      `Permit included: ${permit ? 'Yes' : 'No'}`,
      outsideOutlet ? 'Outside outlet requested' : null,
      formData.get('notes')
    ]
      .filter(Boolean)
      .map(String)
      .join('\n');

    const estimateStatus = depositPref === 'deposit' ? 'Estimate Won' : 'Estimate Requested';
    const payload = {
      source: 'website-calculator',
      marketingSource: 'meta-boosted-ev',
      customer: {
        firstName: firstName || 'Customer',
        lastName,
        email: (formData.get('custEmail') as string) || undefined,
        phone: (formData.get('custPhone') as string) || undefined,
        addressLine1: (formData.get('address1') as string) || undefined,
        city: (formData.get('city') as string) || undefined,
        state: (formData.get('state') as string) || undefined,
        postalCode: (formData.get('postalCode') as string) || undefined
      },
      service: {
        type: 'ev-charger-install',
        notes,
        estimatedPrice: estimate.estimatedPrice,
        options: {
          run,
          panelLocation: panelLoc,
          permit,
          outsideOutlet: outsideOutlet || undefined,
          chargerHardware: chargerHardware || undefined,
          amps: ampsValue || undefined,
          photos: photoPayload.length ? photoPayload : undefined,
          estimateStatus,
          paymentPreference: depositPref,
          depositAmount: depositPref === 'deposit' ? 100 : undefined
        }
      },
      schedule: {
        start: scheduleStart!,
        end: scheduleEnd!
      }
    };

    try {
      if (depositPref === 'deposit') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'Unable to start payment');
        }
        window.location.href = data.url;
        return;
      }

      const res = await fetch('/api/sf/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'API error');
      }
      setSubmitState('ok');
      e.currentTarget.reset();
      setRun('samewall');
      setPanelLoc('inside');
      setPermit(true);
      setOutsideOutlet(false);
      setPhotos([]);
    } catch (err) {
      console.error(err);
      setSubmitState('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${spaceGrotesk.className} evx-shell`}>
      <div className="evx-grid-bg" aria-hidden />
      <div className="evx-hero-glow" aria-hidden />
      <div className="evx-card">
        <header className="evx-head">
          <h1>EV Charger Install Estimator</h1>
          <p className="lead">
            Clean installs with smart routing. Pricing follows the distance from your panel
            plus permit. Share a couple photos and we&apos;ll lock it in.
          </p>
          <div className="evx-badges">
            <span className="badge">Tesla Certified Installer</span>
            <span className="badge badge-ghost">Level 2 • Charlotte Metro</span>
            <span className="badge badge-ghost">Fast photo review</span>
          </div>
          <div className="logo-tile">
            <img
              src="https://static.wixstatic.com/media/466b09_38f375647c9040c68a3138baac578e62~mv2.png"
              alt="Tentmakers Electric word mark"
            />
          </div>
          <div className="stepper">
            <div className="stepper-track">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`stepper-dot ${idx + 1 <= step ? 'active' : ''}`}
                  aria-label={`Step ${idx + 1}`}
                />
              ))}
            </div>
            <div className="stepper-label">Step {step} of {totalSteps}</div>
          </div>
        </header>

        <form className="tmx-form" onSubmit={handleSubmit}>
          <div className={`section ${step === 1 ? 'active' : 'hidden-section'}`}>
            <div className="section-head">
              <span className="section-tag">Step 1</span>
              <div>
                <h3>Contact</h3>
                <p>So we can confirm your install window.</p>
              </div>
            </div>
            <div className="tmx-grid">
              <div>
                <label htmlFor="custName">Your full name</label>
                <input id="custName" name="custName" type="text" placeholder="Jordan Smith" required />
              </div>
              <div>
                <label htmlFor="custEmail">Email</label>
                <input id="custEmail" name="custEmail" type="email" placeholder="you@email.com" required />
              </div>
              <div>
                <label htmlFor="custPhone">Phone</label>
                <input id="custPhone" name="custPhone" type="tel" placeholder="(704) 555-1234" required />
              </div>
              <div>
                <label htmlFor="address1">Address line 1</label>
                <input id="address1" name="address1" type="text" placeholder="123 Main St" />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input id="city" name="city" type="text" placeholder="Charlotte" />
              </div>
              <div>
                <label htmlFor="state">State</label>
                <input id="state" name="state" type="text" placeholder="NC" />
              </div>
              <div>
                <label htmlFor="postalCode">ZIP</label>
                <input id="postalCode" name="postalCode" type="text" placeholder="28202" />
              </div>
            </div>
          </div>

          <div className={`section ${step === 2 ? 'active' : 'hidden-section'}`}>
            <div className="section-head">
              <span className="section-tag">Step 2</span>
              <div>
                <h3>Location & routing</h3>
                <p>Tell us how far the charger will be from the panel.</p>
              </div>
            </div>
            <div className="tmx-grid">
              <div>
                <label htmlFor="run">Charger location vs panel</label>
                <select
                  id="run"
                  name="run"
                  value={run}
                  onChange={(e) => setRun(e.target.value as RunKey)}
                >
                  <option value="next">Next to panel (same wall, within 12&quot;)</option>
                  <option value="samewall">Same wall run up to ~12 ft</option>
                  <option value="across">Across the room / different wall</option>
                </select>
                <div className="tmx-help">Pick how far the charger will be from the electrical panel.</div>
              </div>
              <div>
                <label htmlFor="panelLoc">Where is the panel?</label>
                <select
                  id="panelLoc"
                  name="panelLoc"
                  value={panelLoc}
                  onChange={(e) => setPanelLoc(e.target.value as PanelLoc)}
                >
                  <option value="inside">Inside the garage</option>
                  <option value="outside">Outside the garage</option>
                  <option value="interior-other">Somewhere other than the garage (custom quote)</option>
                </select>
                <div className="tmx-help">If not in the garage, we&apos;ll need a custom route and photos.</div>
              </div>
              <div>
                <label className="inline">
                  <input
                    id="outsideOutlet"
                    name="outsideOutlet"
                    type="checkbox"
                    checked={outsideOutlet}
                    onChange={(e) => setOutsideOutlet(e.target.checked)}
                  />
                  <span>Outside outlet needed?</span>
                </label>
                <div className="tmx-help">Weatherproof outlet add-on (quoted after review).</div>
              </div>
              <div>
                <label className="inline">
                  <input
                    id="permit"
                    name="permit"
                    type="checkbox"
                    checked={permit}
                    onChange={(e) => setPermit(e.target.checked)}
                  />
                  <span>Add city/county permit estimate ($50)</span>
                </label>
                <div className="tmx-help">Charlotte metro. We&apos;ll confirm exact city/county fees if different.</div>
              </div>
              <div className="tmx-photo-wrap" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="photos">
                  Upload photos of the panel and parking area {panelLoc === 'interior-other' ? '(required)' : '(optional)'}
                </label>
                <input
                  id="photos"
                  name="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                  required={panelLoc === 'interior-other'}
                />
                <div className="tmx-help">
                  {panelLoc === 'interior-other'
                    ? 'Custom route: please add clear photos of the panel and parking spot.'
                    : 'Photos help us confirm routing and final price faster.'}
                </div>
              </div>
            </div>
          </div>

          <div className={`section ${step === 3 ? 'active' : 'hidden-section'}`}>
            <div className="section-head">
              <span className="section-tag">Step 3</span>
              <div>
                <h3>Charger details</h3>
                <p>Hardware, amperage, and any notes.</p>
              </div>
            </div>
            <div className="tmx-grid">
              <div>
                <label htmlFor="chargerBrand">Charger hardware</label>
                <select id="chargerBrand" name="chargerBrand" defaultValue="tesla-wall">
                  <option value="tesla-wall">Tesla Wall Connector</option>
                  <option value="tesla-universal">Tesla Universal Wall Connector</option>
                  <option value="nacs">NACS-ready (other brand)</option>
                  <option value="j1772">J1772 Level 2</option>
                  <option value="other">Other / not sure</option>
                </select>
              </div>
              <div>
                <label htmlFor="amps">Desired charging amperage</label>
                <select id="amps" name="amps" defaultValue="60">
                  <option value="60">60A / 48A charging (typical Tesla)</option>
                  <option value="50">50A / 40A charging</option>
                  <option value="40">40A / 32A charging</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="notes">Anything else? (panel upgrades, routing preferences, vehicle)</label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Vehicle make/model, parking spot, ceiling height, obstacles."
                />
              </div>
            </div>
          </div>

          <div className={`section ${step === 4 ? 'active' : 'hidden-section'}`}>
            <div className="section-head">
              <span className="section-tag">Step 4</span>
              <div>
                <h3>Schedule & finish</h3>
                <p>Pick a preferred day/time and choose how to finalize.</p>
              </div>
            </div>
            <div className="tmx-grid">
              <div>
                <label htmlFor="prefDate">Preferred date</label>
                <input id="prefDate" name="prefDate" type="date" />
              </div>
              <div>
                <label htmlFor="prefStart">Preferred start time</label>
                <input id="prefStart" name="prefStart" type="time" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>How do you want to book?</label>
                <div className="radio-row">
                  <label className={`radio-pill ${depositChoice === 'deposit' ? 'on' : ''}`}>
                    <input
                      type="radio"
                      name="depositChoice"
                      value="deposit"
                      checked={depositChoice === 'deposit'}
                      onChange={() => setDepositChoice('deposit')}
                    />
                    <div>
                      <strong>Pay $100 deposit & reserve</strong>
                      <div className="tmx-help">Secure the slot now (Stripe-ready). Balance due after install.</div>
                    </div>
                  </label>
                  <label className={`radio-pill ${depositChoice === 'questions' ? 'on' : ''}`}>
                    <input
                      type="radio"
                      name="depositChoice"
                      value="questions"
                      checked={depositChoice === 'questions'}
                      onChange={() => setDepositChoice('questions')}
                    />
                    <div>
                      <strong>I still have questions</strong>
                      <div className="tmx-help">Submit details and we&apos;ll text/email from Service Fusion.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="tmx-summary">
            <p className="tmx-summary-headline">Estimated total</p>
            <p className="tmx-money">{estimate.label}</p>
            <div className="tmx-breakdown">
              {estimate.lines.map((line) => (
                <div key={line}>• {line}</div>
              ))}
            </div>
            <div className="tmx-note">
              Online estimate based on panel distance. Final pricing confirmed after photo review and a quick walkthrough.
              Tesla certified installer. Clean conduit runs and properly sized breakers included.
            </div>
          </div>

          <div className="tmx-cta">
            {step > 1 && (
              <button
                type="button"
                className="ghost"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={submitting}
              >
                Back
              </button>
            )}
            {step < totalSteps && (
              <button type="button" onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}>
                Next
              </button>
            )}
            {step === totalSteps && (
              <button type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send My EV Charger Estimate'}
              </button>
            )}
          </div>
          <div className={`tmx-alert success ${submitState === 'ok' ? 'show' : ''}`}>
            Thanks! We received your EV charger request and will reach out shortly.
          </div>
          <div className={`tmx-alert error ${submitState === 'error' ? 'show' : ''}`}>
            Something went wrong. Please try again or call us.
          </div>

          <div className="duke-credit">
            <h3>Duke Energy Charger Prep Credit (up to $1,133 per charger)</h3>
            <p>
              Get reimbursed for prepping your home to charge. One-time credit per EV registered to your address;
              we&apos;ll help document the install.
            </p>
            <ul>
              <li>Covers conduit, wiring, outlets supplying the charger.</li>
              <li>Covers panel upgrades and breaker installation.</li>
              <li>Covers EV charger hardware.</li>
              <li>Does not cover hardware mounting/commissioning or permit fees.</li>
              <li>
                Rarely, Duke may require a Line Extension Plan if upstream service needs an upgrade (not covered by the
                credit).
              </li>
            </ul>
            <p>
              <a
                href="https://www.duke-energy.com/home/products/ev-complete/charger-prep-credit"
                target="_blank"
                rel="noreferrer"
              >
                See Duke Energy program details
              </a>
            </p>
          </div>

          <div className="tmx-legal">
            Pricing assumes standard garage installs. Panel located elsewhere triggers a custom quote and photo review.
            Permit estimate defaults to $50 for city/county in Charlotte metro; we&apos;ll confirm exact fees. Across-room
            routing depends on path options. Final price confirmed by Tentmakers Electric after review.
          </div>
        </form>
      </div>

      <style jsx global>{`
        :root {
          color-scheme: dark;
          --brand-orange: #f7941d;
        }
        .evx-shell {
          min-height: 100vh;
          height: 100vh;
          padding: 22px 16px 32px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(3, 7, 14, 0.35), rgba(5, 9, 18, 0.25), rgba(3, 6, 12, 0.35)),
            url('/ev-charger-install-meta.png') center 65% / 90% auto no-repeat;
          background-attachment: scroll;
          z-index: 0;
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
        .evx-card {
          position: relative;
          max-width: 940px;
          margin: 22px auto;
          background: transparent;
          border: none;
          border-radius: 24px;
          padding: 20px 18px;
          box-shadow: none;
          overflow: hidden;
          z-index: 2;
          backdrop-filter: none;
          opacity: 0;
          transform: translateY(14px);
          animation: introCard 0.9s ease forwards;
          animation-delay: 0.9s;
          max-height: 92vh;
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .evx-card::-webkit-scrollbar {
          width: 6px;
        }
        .evx-card::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
        }
        .evx-card::after { display: none; }
        .evx-head {
          text-align: center;
          position: relative;
          z-index: 2;
          margin-bottom: 18px;
          padding: 16px 14px;
          border-radius: 18px;
          background: rgba(8, 12, 22, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
          max-width: 860px;
          margin-left: auto;
          margin-right: auto;
        }
        .logo-tile {
          width: fit-content;
          margin: 0 auto 14px auto;
          padding: 12px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94));
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.95);
        }
        .evx-head img {
          height: 50px;
          width: auto;
          display: block;
        }
        .evx-head h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.01em;
          color: #e8f4ff;
          text-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
        }
        .evx-head .lead {
          margin: 8px auto 12px;
          color: #9cb3d9;
          font-size: 15px;
          line-height: 1.6;
          max-width: 820px;
        }
        .evx-badges {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
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
        .meta-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
          margin: 14px auto 6px;
          max-width: 880px;
        }
        .meta-chip {
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
          padding: 11px 12px;
          border-radius: 14px;
          color: #eaf3ff;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .meta-chip strong {
          color: #4cf0ff;
          font-size: 15px;
        }
        .tmx-form {
          position: relative;
          z-index: 2;
          margin-top: 18px;
          gap: 14px;
          display: flex;
          flex-direction: column;
          opacity: 0;
          animation: introCard 0.8s ease forwards;
          animation-delay: 1s;
        }
        .section {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(12, 16, 26, 0.5);
          border-radius: 14px;
          padding: 14px 14px 6px;
          margin-bottom: 12px;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
        }
        .section-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .section-head h3 {
          margin: 0;
          font-size: 15px;
          color: #eaf3ff;
          letter-spacing: 0.01em;
        }
        .section-head p {
          margin: 2px 0 0;
          color: #9cb3d9;
          font-size: 12px;
        }
        .radio-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .radio-pill {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .radio-pill.on {
          border-color: rgba(76, 240, 255, 0.5);
          box-shadow: 0 10px 28px rgba(76, 240, 255, 0.25);
          background: rgba(76, 240, 255, 0.08);
        }
        .radio-pill input {
          margin-top: 4px;
        }
        .section-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(135deg, rgba(76, 240, 255, 0.9), rgba(124, 255, 179, 0.9));
          color: #061024;
          border: 1px solid rgba(76, 240, 255, 0.45);
          box-shadow: 0 8px 18px rgba(76, 240, 255, 0.25);
        }
        .tmx-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .hidden-section {
          display: none;
        }
        .stepper {
          margin: 14px auto 0;
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .stepper-track {
          display: flex;
          gap: 6px;
        }
        .stepper-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .stepper-dot.active {
          background: linear-gradient(135deg, #4cf0ff, #7cffb3);
          box-shadow: 0 0 0 3px rgba(76, 240, 255, 0.25);
          border-color: transparent;
        }
        .stepper-label {
          font-size: 12px;
          color: #9cb3d9;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .tmx-grid > * {
          min-width: 0;
        }
        label {
          display: block;
          font-weight: 800;
          margin: 8px 0 6px 0;
          font-size: 13px;
          color: #f8fcff;
          letter-spacing: 0.01em;
        }
        select,
        input[type='number'],
        input[type='text'],
        input[type='email'],
        input[type='tel'],
        input[type='date'],
        input[type='time'],
        textarea {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          background: linear-gradient(180deg, rgba(12, 16, 26, 0.8), rgba(12, 16, 26, 0.7));
          color: #f7fbff;
          font-weight: 600;
          box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.08), 0 10px 24px rgba(0, 0, 0, 0.28);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        }
        select:focus,
        input:focus,
        textarea:focus {
          outline: none;
          border-color: #4cf0ff;
          box-shadow: 0 0 0 2px rgba(76, 240, 255, 0.25), 0 12px 26px rgba(76, 240, 255, 0.18);
          color: #ffffff;
        }
        select option {
          color: #0a0f22;
        }
        input::placeholder,
        textarea::placeholder {
          color: rgba(247, 251, 255, 0.7);
        }
        textarea {
          min-height: 80px;
          resize: vertical;
        }
        .tmx-help {
          font-size: 12px;
          color: #9cb3d9;
          line-height: 1.5;
          margin-top: 4px;
        }
        .inline {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inline input[type='checkbox'] {
          width: auto;
        }
        .tmx-photo-wrap {
          border: 1px dashed rgba(76, 240, 255, 0.35);
          background: rgba(76, 240, 255, 0.04);
          border-radius: 12px;
          padding: 14px;
          margin-top: 4px;
        }
        .tmx-photo-wrap input[type='file'] {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          color: #eaf3ff;
        }
        .tmx-summary {
          margin-top: 20px;
          background: rgba(12, 16, 26, 0.52);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 16px 16px 14px;
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(8px);
          position: relative;
          overflow: hidden;
          isolation: isolate;
          opacity: 0;
          animation: introCard 0.8s ease forwards;
          animation-delay: 1.05s;
        }
        .tmx-summary-headline {
          font-size: 15px;
          font-weight: 700;
          color: #9cb3d9;
          margin: 0 0 6px 0;
          letter-spacing: 0.02em;
        }
        .tmx-money {
          font-size: 32px;
          font-weight: 900;
          color: #7cffb3;
          margin: 0;
          line-height: 1.2;
        }
        .tmx-breakdown {
          font-size: 13px;
          color: #eaf3ff;
          margin-top: 10px;
          line-height: 1.6;
        }
        .tmx-note {
          font-size: 12px;
          color: #9cb3d9;
          margin-top: 12px;
          line-height: 1.6;
        }
        .tmx-cta {
          margin-top: 22px;
          text-align: center;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .tmx-cta button {
          background: linear-gradient(135deg, #45e1ff, #6c8cff);
          color: #0a0f22;
          font-weight: 800;
          padding: 13px 18px;
          border-radius: 12px;
          display: inline-block;
          border: none;
          font-size: 16px;
          line-height: 1.2;
          cursor: pointer;
          min-width: 200px;
          box-shadow: 0 12px 30px rgba(76, 240, 255, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
          transition: transform 0.12s ease;
        }
        .tmx-cta button.ghost {
          background: rgba(255, 255, 255, 0.08);
          color: #eaf3ff;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }
        .tmx-cta button:hover:enabled {
          transform: translateY(-1px);
        }
        .tmx-cta button:disabled {
          opacity: 0.7;
          cursor: progress;
        }
        .tmx-alert {
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.4;
          display: none;
        }
        .tmx-alert.show {
          display: block;
        }
        .tmx-alert.success {
          background: rgba(124, 255, 179, 0.1);
          color: #a6ffd1;
          border: 1px solid rgba(124, 255, 179, 0.6);
        }
        .tmx-alert.error {
          background: rgba(255, 114, 114, 0.08);
          color: #ffc3c3;
          border: 1px solid rgba(255, 114, 114, 0.4);
        }
        .duke-credit {
          margin-top: 24px;
          border: 1px solid rgba(124, 255, 179, 0.35);
          background: rgba(124, 255, 179, 0.06);
          border-radius: 14px;
          padding: 14px;
          opacity: 0;
          animation: introCard 0.8s ease forwards;
          animation-delay: 1.1s;
        }
        .duke-credit h3 {
          margin: 0 0 6px;
          font-size: 16px;
          color: #7cffb3;
        }
        .duke-credit p {
          margin: 4px 0 10px;
          color: #eaf3ff;
          font-size: 13px;
          line-height: 1.6;
        }
        .duke-credit ul {
          margin: 0 0 8px 16px;
          padding: 0;
          color: #eaf3ff;
          font-size: 13px;
          line-height: 1.5;
        }
        .duke-credit li + li {
          margin-top: 4px;
        }
        .duke-credit a {
          color: #4cf0ff;
          font-weight: 700;
        }
        .tmx-legal {
          font-size: 11.5px;
          color: #9cb3d9;
          line-height: 1.6;
          margin-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 12px;
          opacity: 0;
          animation: introCard 0.8s ease forwards;
          animation-delay: 1.15s;
        }
        .evx-card > * + * {
          margin-top: 14px;
        }
        @keyframes introCard {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .tmx-grid {
            grid-template-columns: 1fr;
          }
          .tmx-cta button {
            width: 100%;
          }
        }
        @media (max-width: 640px) {
          .evx-shell {
          padding: 18px 12px 36px;
          background:
            linear-gradient(135deg, rgba(3, 7, 14, 0.45), rgba(5, 9, 18, 0.28), rgba(3, 6, 12, 0.4)),
            url('/ev-charger-mobile.png') center top / 100% auto no-repeat;
        }
        .evx-hero-glow {
          opacity: 0.65;
        }
          .evx-card {
            padding: 20px;
            max-height: 90vh;
          }
          .evx-head h1 {
            font-size: 26px;
          }
          .evx-head .lead {
            font-size: 14px;
          }
          .meta-row {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
