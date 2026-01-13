'use client';

import { Space_Grotesk } from 'next/font/google';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { BookRequest, BookingPipelineResult } from '@/lib/sfTypes';

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
  across: { label: 'Across the room / different wall', min: 1489, max: 1689 }
};

const PERMIT_FEE = 89;
const TIME_WINDOWS = {
  morning: { label: 'Morning (8:00–11:00)', start: '08:00', end: '11:00' },
  afternoon: { label: 'Afternoon (11:00–15:00)', start: '11:00', end: '15:00' }
} as const;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    google?: typeof google;
  }
}

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

export default function EvChargerEstimator() {
  const [run, setRun] = useState<RunKey | ''>('');
  const [panelLoc, setPanelLoc] = useState<PanelLoc | ''>('');
  const [permit, setPermit] = useState(true);
  const [outsideOutlet, setOutsideOutlet] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [depositChoice, setDepositChoice] = useState<'deposit' | 'questions'>('questions');
  const formRef = useRef<HTMLFormElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [stepValidationErrors, setStepValidationErrors] = useState<Record<number, string[]>>({});
  const addressRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);
  const stateRef = useRef<HTMLInputElement | null>(null);
  const postalRef = useRef<HTMLInputElement | null>(null);
  const scrollCardToTop = () => {
    cardRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [highlightStep, setHighlightStep] = useState<number | null>(null);
  const handleContactInput = () => {
    clearStepError(1);
  };
  const [preferredDay, setPreferredDay] = useState('');
  const [preferredSlot, setPreferredSlot] = useState<keyof typeof TIME_WINDOWS | ''>('');
  const dayOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
    const options: Array<{ value: string; label: string }> = [];
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    while (options.length < 14) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) {
        const value = date.toISOString().slice(0, 10);
        options.push({ value, label: formatter.format(date) });
      }
      date.setDate(date.getDate() + 1);
    }
    return options;
  }, []);

  const getSelectedSchedule = () => {
    if (!preferredDay || !preferredSlot) return null;
    const window = TIME_WINDOWS[preferredSlot];
    const start = toIsoWithOffset(preferredDay, window.start);
    const end = toIsoWithOffset(preferredDay, window.end);
    if (!start || !end) return null;
    return { start, end };
  };

  const estimate = useMemo(() => {
    const activeRun: RunKey = run ? run : 'next';
    const activePanel = (panelLoc || 'inside') as PanelLoc;
    const runOption = RUN_OPTIONS[activeRun];
    const permitValue = permit ? PERMIT_FEE : 0;
    const needsCustom = activePanel === 'interior-other';
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
      activePanel === 'outside' ? 'Panel is outside the garage: weatherproof routing noted.' : null,
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

  // Google Maps key is static, so load the Places script only once on the client.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || typeof window === 'undefined') {
      return;
    }

    let listener: google.maps.MapsEventListener | null = null;
    const scriptId = 'tmx-google-maps-places';

    const getComponentValue = (place: google.maps.places.PlaceResult, type: string) =>
      place.address_components?.find((component) => component.types.includes(type))?.long_name;

    const fillAddressFields = (place: google.maps.places.PlaceResult) => {
      const cityValue =
        getComponentValue(place, 'locality') ||
        getComponentValue(place, 'postal_town') ||
        getComponentValue(place, 'sublocality') ||
        getComponentValue(place, 'neighborhood');
      const stateValue = getComponentValue(place, 'administrative_area_level_1');
      const postalValue = getComponentValue(place, 'postal_code');

      if (cityValue && cityRef.current) {
        cityRef.current.value = cityValue;
      }
      if (stateValue && stateRef.current) {
        stateRef.current.value = stateValue;
      }
      if (postalValue && postalRef.current) {
        postalRef.current.value = postalValue;
      }
    };

    const setupAutocomplete = () => {
      if (!addressRef.current || !window.google?.maps?.places?.Autocomplete) {
        return;
      }
      const autocomplete = new window.google.maps.places.Autocomplete(addressRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'US' }
      });
      autocomplete.setFields(['address_component']);
      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        fillAddressFields(place);
      });
    };

    const ensureScriptLoaded = () =>
      new Promise<void>((resolve, reject) => {
        if (window.google?.maps?.places?.Autocomplete) {
          resolve();
          return;
        }
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener(
            'error',
            () => reject(new Error('Failed to load Google Maps script')),
            { once: true }
          );
          return;
        }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener(
          'error',
          () => reject(new Error('Failed to load Google Maps script')),
          { once: true }
        );
        document.head.appendChild(script);
      });

    let cancelled = false;
    (async () => {
      try {
        await ensureScriptLoaded();
        if (!cancelled) {
          setupAutocomplete();
        }
      } catch (err) {
        console.warn('Google Maps autocomplete unavailable:', err);
      }
    })();

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  const clearStepError = (targetStep: number) => {
    setStepValidationErrors((prev) => {
      if (!prev[targetStep]) return prev;
      const next = { ...prev };
      delete next[targetStep];
      return next;
    });
    if (highlightStep === targetStep) {
      setHighlightStep(null);
    }
  };

  const validateStepFields = (stepNumber: number) => {
    const formEl = formRef.current;
    if (!formEl) return [];
    const formData = new FormData(formEl);
    const missing: string[] = [];
    if (stepNumber === 1) {
      const requiredFields = [
        ['custName', 'name'],
        ['custEmail', 'email'],
        ['custPhone', 'phone']
      ] as const;
      requiredFields.forEach(([field, label]) => {
        if (!String(formData.get(field) ?? '').trim()) {
          missing.push(label);
        }
      });
    }
    if (stepNumber === 2) {
      const runValue = String(formData.get('run') ?? '');
      const panelValue = String(formData.get('panelLoc') ?? '');
      if (!runValue) missing.push('charger location');
      if (!panelValue) missing.push('panel location');
    }
    if (stepNumber === 3) {
      const chargerValue = String(formData.get('chargerBrand') ?? '');
      const ampsValue = String(formData.get('amps') ?? '');
      const supplyValue = String(formData.get('chargerSupply') ?? '');
      if (!chargerValue) missing.push('charger hardware');
      if (!ampsValue) missing.push('desired amperage');
      if (!supplyValue) missing.push('charger supply');
    }
    if (stepNumber === 4) {
      if (!preferredDay) missing.push('preferred day');
      if (!preferredSlot) missing.push('preferred window');
    }
    return missing;
  };

  const handleNext = () => {
    const errors = validateStepFields(step);
    if (errors.length > 0) {
      setStepValidationErrors((prev) => ({
        ...prev,
        [step]: errors
      }));
      setHighlightStep(step);
      scrollCardToTop();
      return;
    }
    setStepValidationErrors((prev) => {
      if (!prev[step]) return prev;
      const next = { ...prev };
      delete next[step];
      return next;
    });
    setHighlightStep(null);
    setStep((s) => Math.min(totalSteps, s + 1));
    scrollCardToTop();
  };

  async function buildPayload(options?: {
    includePhotos?: boolean;
    stageLabel?: string;
  }) {
    const formEl = formRef.current;
    if (!formEl) return null;

    const formData = new FormData(formEl);
    const fullName = String(formData.get('custName') ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastName = rest.join(' ') || 'Customer';
    const email = String(formData.get('custEmail') ?? '').trim();
    const phone = String(formData.get('custPhone') ?? '').trim();

    if (!firstName && !lastName && !email && !phone) {
      return null;
    }

    const chargerHardware = String(formData.get('chargerBrand') ?? '');
    const ampsValue = String(formData.get('amps') ?? '');
    const chargerSupply = String(formData.get('chargerSupply') ?? '');

    const selectedSchedule = getSelectedSchedule();
    let scheduleStart = selectedSchedule?.start ?? null;
    let scheduleEnd = selectedSchedule?.end ?? null;
    if (!scheduleStart || !scheduleEnd) {
      const startFallback = new Date();
      startFallback.setDate(startFallback.getDate() + 1);
      startFallback.setHours(9, 0, 0, 0);
      const endFallback = new Date(startFallback);
      endFallback.setHours(endFallback.getHours() + 2);
      scheduleStart = startFallback.toISOString();
      scheduleEnd = endFallback.toISOString();
    }
    const dayLabel = dayOptions.find((day) => day.value === preferredDay)?.label;
    const windowLabel = preferredSlot ? TIME_WINDOWS[preferredSlot].label : '';

    const activeRun: RunKey = run ? run : 'next';
    const activePanel = (panelLoc || 'inside') as PanelLoc;
    const supplyLabel =
      chargerSupply === 'customer'
        ? 'Customer will supply the charger'
        : chargerSupply === 'tentmakers'
          ? 'Tentmakers to provide the charger'
          : chargerSupply;

    const notes = [
      `Run: ${RUN_OPTIONS[activeRun].label}`,
      `Panel location: ${
        activePanel === 'inside'
          ? 'Inside the garage'
          : activePanel === 'outside'
            ? 'Outside the garage'
            : 'Interior (not in garage)'
      }`,
      `Charger hardware: ${chargerHardware || 'Unspecified'}`,
      `Desired amperage: ${ampsValue || 'Not sure'}`,
      `Permit included: ${permit ? 'Yes' : 'No'}`,
      chargerSupply ? `Charger supply: ${supplyLabel}` : null,
      preferredDay ? `Preferred day: ${dayLabel ?? preferredDay}` : null,
      preferredSlot ? `Preferred window: ${windowLabel}` : null,
      outsideOutlet ? 'Outside outlet requested' : null,
      formData.get('notes'),
      options?.stageLabel ? `Lead stage: ${options.stageLabel}` : null
    ]
      .filter(Boolean)
      .map(String)
      .join('\n');

    const estimateStatus =
      options?.stageLabel ??
      (depositChoice === 'deposit' ? 'Deposit Initiated' : 'Estimate Requested');

    return {
      source: 'website-calculator',
      marketingSource: 'meta-boosted-ev',
      customer: {
        firstName: firstName || 'Customer',
        lastName,
        email: email || undefined,
        phone: phone || undefined,
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
          chargerSupply: chargerSupply || undefined,
          preferredDay: preferredDay || undefined,
          preferredWindow: preferredSlot || undefined,
          estimateStatus,
          paymentPreference: depositChoice,
          depositAmount: depositChoice === 'deposit' ? 100 : undefined,
          sessionId
        }
      },
      schedule: {
        start: scheduleStart!,
        end: scheduleEnd!
      }
    };
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    if (step < totalSteps) {
      e.preventDefault();
      setStep((s) => Math.min(totalSteps, s + 1));
      scrollCardToTop();
      return;
    }
    e.preventDefault();
    setSubmitError(null);
    setSubmitState('idle');
    setSubmitting(true);
    setHighlightStep(null);

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const requiredFields = ['custName', 'custEmail', 'custPhone'] as const;
    const missingRequired = requiredFields.filter(
      (field) => !String(formData.get(field) ?? '').trim()
    );
    if (missingRequired.length > 0) {
      const labels: Record<string, string> = {
        custName: 'name',
        custEmail: 'email',
        custPhone: 'phone'
      };
      const missingLabels = missingRequired.map((field) => labels[field] ?? field);
      setSubmitting(false);
      setSubmitState('error');
      setValidationErrors(missingLabels);
      setSubmitError('Fill all areas in red.');
      setHighlightStep(1);
      setStep(1);
      scrollCardToTop();
      setTimeout(() => {
        const fieldEl = document.getElementById(missingRequired[0]) as HTMLInputElement | null;
        fieldEl?.focus();
      }, 0);
      return;
    }
    setValidationErrors([]);
    const payload = await buildPayload();
    if (!payload) {
      setSubmitting(false);
      setSubmitState('error');
      setSubmitError('Please fill your name, email, and phone to continue.');
      setStep(1);
      return;
    }

    try {
      if (depositChoice === 'deposit') {
        if (checkoutStarted) return;
        setCheckoutStarted(true);
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
      const result = await res.json().catch(() => ({} as BookingPipelineResult));
      if (!res.ok) {
        throw new Error(result?.error || 'API error');
      }
      setSubmitState('ok');
      setValidationErrors([]);
      setHighlightStep(null);
      setPreferredDay('');
      setPreferredSlot('');
      formEl.reset();
      setRun('samewall');
      setPanelLoc('inside');
      setPermit(true);
      setOutsideOutlet(false);
    } catch (err) {
      setCheckoutStarted(false);
      console.error(err);
      setSubmitState('error');
      setSubmitError('Something went wrong. Please try again or call us.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${spaceGrotesk.className} evx-shell`}>
      <div className="evx-grid-bg" aria-hidden />
      <div className="evx-hero-glow" aria-hidden />
      <div className="evx-corner-logo" aria-hidden>
        <img
          src="/Tentmakers%20Logo%20White%20%26%20Orange.png"
          alt=""
        />
      </div>
      <div className="evx-card" ref={cardRef}>
        <header className="evx-head">
          <h1>EV Charger Install Estimator</h1>
          <p className="lead">
            Clean installs with smart routing. Pricing follows the distance from your panel plus permit.
          </p>
          <div className="evx-badges">
            <span className="badge">Tesla Certified Installer</span>
            <span className="badge badge-ghost">Charlotte Metro</span>
            <span className="badge badge-ghost">Fast scheduling</span>
          </div>
          <div className="logo-tile">
            <img
              src="/wordmark-pill-dark.png"
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

        <form className="tmx-form" onSubmit={handleSubmit} ref={formRef}>
          <div className={`tmx-alert error ${submitState === 'error' ? 'show' : ''}`}>
            {submitError ?? 'Something went wrong. Please try again or call us.'}
            {validationErrors.length > 0 && (
              <ul className="field-alert">
                {validationErrors.map((field) => (
                  <li key={field}>{`Please provide your ${field}.`}</li>
                ))}
              </ul>
            )}
          </div>
          <div
            className={`section ${step === 1 ? 'active' : 'hidden-section'} ${
              highlightStep === 1 ? 'highlight-error' : ''
            }`}
          >
            <div className="section-head">
              <span className="section-tag">Step 1</span>
              <div>
                <h3>Contact</h3>
                <p>So we can confirm your install window.</p>
              </div>
            </div>
            {stepValidationErrors[1]?.length && (
              <div className="tmx-alert error show">
                <p>Please complete the required contact fields before moving on.</p>
                <ul className="field-alert">
                  {stepValidationErrors[1]?.map((field) => (
                    <li key={field}>{`Please provide your ${field}.`}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="tmx-grid">
              <div>
                <label htmlFor="custName">Your full name</label>
                <input
                  id="custName"
                  name="custName"
                  type="text"
                  placeholder="Jordan Smith"
                  required
                  onInput={handleContactInput}
                />
              </div>
              <div>
                <label htmlFor="custEmail">Email</label>
                <input
                  id="custEmail"
                  name="custEmail"
                  type="email"
                  placeholder="you@email.com"
                  required
                  onInput={handleContactInput}
                />
              </div>
              <div>
                <label htmlFor="custPhone">Phone</label>
                <input
                  id="custPhone"
                  name="custPhone"
                  type="tel"
                  placeholder="(704) 555-1234"
                  required
                  onInput={handleContactInput}
                />
              </div>
              <div>
                <label htmlFor="address1">Address line 1</label>
                <input
                  id="address1"
                  name="address1"
                  type="text"
                  placeholder="123 Main St"
                  ref={addressRef}
                />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input id="city" name="city" type="text" placeholder="Charlotte" ref={cityRef} />
              </div>
              <div>
                <label htmlFor="state">State</label>
                <input id="state" name="state" type="text" placeholder="NC" ref={stateRef} />
              </div>
              <div>
                <label htmlFor="postalCode">ZIP</label>
                <input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  placeholder="28202"
                  ref={postalRef}
                />
              </div>
            </div>
          </div>

          <div
            className={`section ${step === 2 ? 'active' : 'hidden-section'} ${
              highlightStep === 2 ? 'highlight-error' : ''
            }`}
          >
            <div className="section-head">
              <span className="section-tag">Step 2</span>
              <div>
                <h3>Location & routing</h3>
                <p>Tell us how far the charger will be from the panel.</p>
              </div>
            </div>
            {stepValidationErrors[2]?.length && (
              <div className="tmx-alert error show">
                <p>Fill all areas in red.</p>
                <ul className="field-alert">
                  {stepValidationErrors[2].map((field) => (
                    <li key={field}>{`Please provide your ${field}.`}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="tmx-grid">
              <div>
                <label htmlFor="run">
                  Charger location vs panel
                  <span className="required-note">* make a selection in red</span>
                </label>
                <select
                  id="run"
                  name="run"
                  value={run}
                  onChange={(e) => {
                    setRun(e.target.value as RunKey);
                    clearStepError(2);
                  }}
                >
                  <option value="" disabled hidden>
                    Choose how far the charger will be from the panel
                  </option>
                  <option value="next">Next to panel (same wall, within 12&quot;)</option>
                  <option value="samewall">Same wall run up to ~12 ft</option>
                  <option value="across">Across the room / different wall</option>
                </select>
                <div className="tmx-help">Pick how far the charger will be from the electrical panel.</div>
              </div>
              <div>
                <label htmlFor="panelLoc">
                  Where is the panel?
                  <span className="required-note">* make a selection</span>
                </label>
                <select
                  id="panelLoc"
                  name="panelLoc"
                  value={panelLoc}
                  onChange={(e) => {
                    setPanelLoc(e.target.value as PanelLoc);
                    clearStepError(2);
                  }}
                >
                  <option value="" disabled hidden>
                    Select panel location
                  </option>
                  <option value="inside">Inside the garage</option>
                  <option value="outside">Outside the garage</option>
                  <option value="interior-other">Somewhere other than the garage (custom quote)</option>
                </select>
                <div className="tmx-help">If not in the garage, we&apos;ll need a custom route; we&apos;ll follow up with exact next steps.</div>
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
                  <span>Add city/county permit estimate ($89)</span>
                </label>
                <div className="tmx-help">Charlotte metro. We&apos;ll confirm exact city/county fees if different.</div>
              </div>
            </div>
          </div>

          <div
            className={`section ${step === 3 ? 'active' : 'hidden-section'} ${
              highlightStep === 3 ? 'highlight-error' : ''
            }`}
          >
            <div className="section-head">
              <span className="section-tag">Step 3</span>
              <div>
                <h3>Charger details</h3>
                <p>Hardware, amperage, and any notes.</p>
              </div>
            </div>
            {stepValidationErrors[3]?.length && (
              <div className="tmx-alert error show">
                <p>Fill all areas in red.</p>
                <ul className="field-alert">
                  {stepValidationErrors[3].map((field) => (
                    <li key={field}>{`Please provide your ${field}.`}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="tmx-grid">
              <div>
                <label htmlFor="chargerBrand">Charger hardware</label>
                <select
                  id="chargerBrand"
                  name="chargerBrand"
                  defaultValue=""
                  onInput={() => clearStepError(3)}
                >
                  <option value="" disabled hidden>
                    Choose charger hardware
                  </option>
                  <option value="tesla-wall">Tesla Wall Connector</option>
                  <option value="tesla-universal">Tesla Universal Wall Connector</option>
                  <option value="nacs">NACS-ready (other brand)</option>
                  <option value="j1772">J1772 Level 2</option>
                  <option value="other">Other / not sure</option>
                </select>
              </div>
              <div>
                <label htmlFor="amps">Desired charging amperage</label>
                <select
                  id="amps"
                  name="amps"
                  defaultValue=""
                  onInput={() => clearStepError(3)}
                >
                  <option value="" disabled hidden>
                    Select the amperage you want
                  </option>
                  <option value="60">60A / 48A charging (typical Tesla)</option>
                  <option value="50">50A / 40A charging</option>
                  <option value="40">40A / 32A charging</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="chargerSupply">Charger supply</label>
                <select
                  id="chargerSupply"
                  name="chargerSupply"
                  defaultValue=""
                  onInput={() => clearStepError(3)}
                >
                  <option value="" disabled hidden>
                    Who is supplying the charger?
                  </option>
                  <option value="customer">I am providing the charger</option>
                  <option value="tentmakers">Please provide and deliver the charger</option>
                </select>
                <div className="tmx-help">
                  Let us know whether you are supplying the hardware or want us to include it.
                </div>
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

          <div
            className={`section ${step === 4 ? 'active' : 'hidden-section'} ${
              highlightStep === 4 ? 'highlight-error' : ''
            }`}
          >
            <div className="section-head">
              <span className="section-tag">Step 4</span>
              <div>
                <h3>Schedule & finish</h3>
                <p>Pick a preferred day/time and choose how to finalize.</p>
              </div>
            </div>
            {stepValidationErrors[4]?.length && (
              <div className="tmx-alert error show">
                <p>Fill all areas in red.</p>
                <ul className="field-alert">
                  {stepValidationErrors[4].map((field) => (
                    <li key={field}>{`Please provide your ${field}.`}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="tmx-grid">
              <div>
                <label htmlFor="preferredDay">Preferred day</label>
                <select
                  id="preferredDay"
                  name="preferredDay"
                  value={preferredDay}
                  onChange={(e) => {
                    setPreferredDay(e.target.value);
                    clearStepError(4);
                  }}
                >
                  <option value="" disabled hidden>
                    Choose a day
                  </option>
                  {dayOptions.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="preferredWindow">Preferred window</label>
                <select
                  id="preferredWindow"
                  name="preferredWindow"
                  value={preferredSlot}
                  onChange={(e) => {
                    setPreferredSlot(e.target.value as keyof typeof TIME_WINDOWS);
                    clearStepError(4);
                  }}
                >
                  <option value="" disabled hidden>
                    Choose a window
                  </option>
                  {Object.entries(TIME_WINDOWS).map(([key, window]) => (
                    <option key={key} value={key}>
                      {window.label}
                    </option>
                  ))}
                </select>
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
              Online estimate based on panel distance. Final pricing confirmed after deposit processing and a quick walkthrough.
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
              <button type="button" onClick={handleNext}>
                Next
              </button>
            )}
            {step === totalSteps && (
            <button
              type="submit"
              disabled={submitting || (depositChoice === 'deposit' && checkoutStarted)}
            >
                {submitting ? 'Sending…' : 'Send My EV Charger Estimate'}
              </button>
            )}
          </div>
          <div className={`tmx-alert success ${submitState === 'ok' ? 'show' : ''}`}>
            Thanks! We received your EV charger request and will reach out shortly.
          </div>

          <div className="duke-credit">
            <h3>Duke Energy Charger Prep Credit (up to $1,133 per charger)</h3>
            <p>
              Get reimbursed for prepping your home to charge. One-time credit per EV registered to your address;
              we&apos;ll help document the install so you can claim what you need.
            </p>
            <ul>
              <li>Does not cover charger or permit fees.</li>
            </ul>
            <p>
              <a
                href="https://www.duke-energy.com/home/products/ev-complete/charger-prep-credit/customer-credit-option"
                target="_blank"
                rel="noreferrer"
              >
                See Duke Energy program details
              </a>
            </p>
          </div>

          <div className="tmx-legal">
            Pricing assumes standard garage installs. Panel located elsewhere triggers a custom quote; we&apos;ll review the layout after the deposit is collected.
            Permit estimate defaults to $89 for city/county in Charlotte metro; we&apos;ll confirm exact fees. Across-room
            routing depends on path options. Final price confirmed by Tentmakers Electric after review.
          </div>
        </form>
      </div>

      <style jsx global>{`
        :root {
          color-scheme: dark;
          --brand-orange: #f7941d;
        }
        :global(html, body) {
          margin: 0;
          padding: 0;
          background: #02060f;
          overflow: hidden;
        }
        .evx-shell {
          min-height: 100vh;
          height: 100vh;
          padding: 22px 16px 32px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, rgba(3, 7, 14, 0.35), rgba(5, 9, 18, 0.25), rgba(3, 6, 12, 0.35)),
            url('/ev-fullscreen-hero-charlotte-skyline.png') center 14% / cover no-repeat;
          background-attachment: scroll;
          background-color: #02060f;
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
          width: 170px;
          height: auto;
          display: block;
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
        @media (max-width: 720px) {
          .evx-shell {
            height: auto;
            min-height: 100vh;
            padding: 16px 12px 24px;
            overflow: auto;
            background-color: #02060f;
            background-image:
              linear-gradient(135deg, rgba(3, 7, 14, 0.25), rgba(5, 9, 18, 0.2), rgba(3, 6, 12, 0.25)),
              url('/ev-mobile-hero-charlotte-skyline.png');
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center 16%;
          }
          .evx-card {
            max-height: none;
            margin: 12px auto 16px;
            overflow: visible;
          }
          .evx-head h1 {
            font-size: 26px;
          }
          .evx-corner-logo img {
            width: 125px;
          }
        }
        .logo-tile {
          width: fit-content;
          margin: 0 auto 14px auto;
          padding: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          border: none;
        }
        .evx-head img {
          height: 56px;
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
        .highlight-error {
          border-color: rgba(248, 113, 113, 0.7);
          background: rgba(248, 113, 113, 0.12);
        }
        .highlight-error label {
          color: #f87171;
        }
        .required-note {
          display: block;
          font-size: 12px;
          color: #f87171;
          margin-top: 2px;
          font-weight: 500;
        }
        .highlight-error input,
        .highlight-error select,
        .highlight-error textarea {
          border-color: #f87171;
          box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.2);
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
        .field-alert {
          margin: 8px 0 0;
          padding-left: 20px;
          font-size: 12px;
          line-height: 1.5;
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
          border: 1px solid rgba(124, 255, 179, 0.5);
          background: rgba(2, 4, 8, 0.96);
          box-shadow: 0 22px 52px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(124, 255, 179, 0.14);
          border-radius: 14px;
          padding: 14px;
          backdrop-filter: blur(18px);
          opacity: 0;
          animation: introCard 0.8s ease forwards;
          animation-delay: 1.1s;
          position: relative;
        }
        .duke-credit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(2, 4, 8, 0.96), rgba(4, 9, 16, 0.96));
          border-radius: 14px;
          pointer-events: none;
        }
        .duke-credit > * {
          position: relative;
          z-index: 1;
        }
        .duke-credit h3 {
          margin: 0 0 6px;
          font-size: 18px;
          color: #e8fff4;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
        }
        .duke-credit p {
          margin: 4px 0 10px;
          color: #ffffff;
          font-size: 14px;
          line-height: 1.65;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
        }
        .duke-credit ul {
          margin: 0 0 8px 16px;
          padding: 0;
          color: #ffffff;
          font-size: 14px;
          line-height: 1.6;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
        }
        .duke-credit li + li {
          margin-top: 4px;
        }
        .duke-credit a {
          color: #4cf0ff;
          font-weight: 700;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.65);
        }
        @media (max-width: 640px) {
          .duke-credit {
            padding: 12px;
          }
          .duke-credit h3 {
            font-size: 16px;
          }
          .duke-credit p,
          .duke-credit ul {
            font-size: 13px;
            line-height: 1.55;
          }
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
            background-color: #02060f;
            background-image:
              linear-gradient(135deg, rgba(3, 7, 14, 0.25), rgba(5, 9, 18, 0.2), rgba(3, 6, 12, 0.25)),
              url('/ev-mobile-hero-charlotte-skyline.png');
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center 16%;
          }
          .evx-corner-logo {
            top: 12px;
            right: 14px;
          }
          .evx-corner-logo img {
            width: 125px;
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
