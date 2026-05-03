'use client';

import { useState } from 'react';

type Props = {
  action: string;
  serviceId: string;
  startsAt: string;
  labels: {
    name: string;
    email: string;
    phone: string;
    notes: string;
    tos: string;
    submit: string;
    submitBusy: string;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingForm({ action, serviceId, startsAt, labels }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tos, setTos] = useState(false);

  const valid = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && tos;

  return (
    <form
      method="post"
      action={action}
      onSubmit={(e) => {
        if (!valid) {
          e.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
    >
      <input type="hidden" name="service_id" value={serviceId} />
      <input type="hidden" name="starts_at" value={startsAt} />

      <div className="field">
        <label className="label" htmlFor="name">
          {labels.name}
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="phone">
          {labels.phone}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          autoComplete="tel"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          {labels.notes}
        </label>
        <textarea id="notes" name="notes" className="textarea" maxLength={500} />
      </div>

      <label
        className="row"
        style={{ marginTop: 16, gap: 10, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          name="tos"
          checked={tos}
          onChange={(e) => setTos(e.target.checked)}
          required
        />
        <span style={{ fontSize: 14 }}>{labels.tos}</span>
      </label>

      <button
        type="submit"
        className="button primary full"
        disabled={!valid || submitting}
        style={{ marginTop: 20 }}
      >
        {submitting ? labels.submitBusy : labels.submit}
      </button>
    </form>
  );
}
