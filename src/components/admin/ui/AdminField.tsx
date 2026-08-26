import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  WheelEvent,
} from 'react';

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/**
 * A scroll over a focused number field changes its value in every browser, and
 * a price that edits itself while you scroll past is a real way to publish the
 * wrong number. Blurring on wheel hands the scroll back to the page and leaves
 * the value alone.
 */
export function blurOnWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

export function AdminInput({
  label,
  error,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const numeric = rest.type === 'number';

  return (
    <AdminField label={label}>
      <input
        className={`input ${error ? 'inputInvalid' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        // Prices and counts are whole numbers, and phones should offer digits.
        {...(numeric ? { inputMode: 'numeric' as const, step: 1 } : null)}
        {...rest}
        onWheel={numeric ? (rest.onWheel ?? blurOnWheel) : rest.onWheel}
      />
      {error ? <span className="fieldError">{error}</span> : null}
    </AdminField>
  );
}

export function AdminTextarea({
  label,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <AdminField label={label}>
      <textarea className="textarea" {...rest} />
    </AdminField>
  );
}

export type AdminSelectOption = string | { value: string; label: string };

export function AdminSelect({
  label,
  options = [],
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: AdminSelectOption[] }) {
  return (
    <AdminField label={label}>
      <select className="select" {...rest}>
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </AdminField>
  );
}
