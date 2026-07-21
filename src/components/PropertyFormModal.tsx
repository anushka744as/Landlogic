import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Property } from '../types/property';
import { propertiesApi } from '../lib/api';

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot'];

type FormState = {
  title: string;
  locality: string;
  price_inr: string;
  price_per_sqft: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  property_type: string;
  latitude: string;
  longitude: string;
};

function toFormState(p: Property | null): FormState {
  return {
    title: p?.title ?? '',
    locality: p?.locality ?? '',
    price_inr: p ? String(p.price_inr) : '',
    price_per_sqft: p ? String(p.price_per_sqft) : '',
    bedrooms: p ? String(p.bedrooms) : '0',
    bathrooms: p ? String(p.bathrooms) : '0',
    area_sqft: p ? String(p.area_sqft) : '',
    property_type: p?.property_type ?? PROPERTY_TYPES[0],
    latitude: p ? String(p.latitude) : '22.7925',
    longitude: p ? String(p.longitude) : '86.1842',
  };
}

export function PropertyFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Property | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial;

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        locality: form.locality,
        price_inr: Number(form.price_inr),
        price_per_sqft: Number(form.price_per_sqft),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area_sqft: Number(form.area_sqft),
        property_type: form.property_type,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };
      if (isEdit && initial) {
        await propertiesApi.update(initial.id, payload);
      } else {
        await propertiesApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-ink-800 rounded-2xl shadow-2xl border border-ink-100 dark:border-ink-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-lg text-ink-900 dark:text-white">
            {isEdit ? 'Edit listing' : 'Add listing'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Title">
            <input required value={form.title} onChange={set('title')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Locality">
              <input required value={form.locality} onChange={set('locality')} className={inputClass} />
            </Field>
            <Field label="Property type">
              <select value={form.property_type} onChange={set('property_type')} className={inputClass}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (INR)">
              <input required type="number" min={0} value={form.price_inr} onChange={set('price_inr')} className={inputClass} />
            </Field>
            <Field label="Price / sqft (INR)">
              <input required type="number" min={0} value={form.price_per_sqft} onChange={set('price_per_sqft')} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bedrooms">
              <input required type="number" min={0} value={form.bedrooms} onChange={set('bedrooms')} className={inputClass} />
            </Field>
            <Field label="Bathrooms">
              <input required type="number" min={0} value={form.bathrooms} onChange={set('bathrooms')} className={inputClass} />
            </Field>
            <Field label="Area (sqft)">
              <input required type="number" min={0} value={form.area_sqft} onChange={set('area_sqft')} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input required type="number" step="any" value={form.latitude} onChange={set('latitude')} className={inputClass} />
            </Field>
            <Field label="Longitude">
              <input required type="number" step="any" value={form.longitude} onChange={set('longitude')} className={inputClass} />
            </Field>
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            <Save className="h-4 w-4" />
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create listing'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-sm text-ink-800 dark:text-ink-100 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
