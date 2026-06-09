"use client";

interface SelectProps {
  value:     string;
  onChange:  (v: string) => void;
  options:   { value: string; label: string }[];
  className?: string;
}

export default function Select({ value, onChange, options, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input-base ${className ?? ""}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
