import { AlertCircle } from 'lucide-react';

/**
 * Champ de formulaire : libellé, contrôle, puis — juste en dessous — l'erreur
 * précise (en rouge, avec icône) ou, à défaut, l'aide.
 * Quand `error` est renseigné, le contour du champ passe aussi en rouge.
 */
export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | false | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className ?? ''} ${error ? '[&_.input]:border-danger [&_.input:focus]:shadow-none' : ''}`}>
      <span className="label">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

/** Bandeau d'erreur en haut d'un formulaire (erreur qui ne concerne aucun champ précis). */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

export function FormSection({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${className ?? ''}`}>
      {(title || hint) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}