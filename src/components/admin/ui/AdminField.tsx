import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AdminInput({
  label,
  error,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <AdminField label={label}>
      <input
        className={`input ${error ? 'inputInvalid' : ''} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        {...rest}
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
