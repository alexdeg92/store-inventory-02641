'use client';

interface Props {
  value: number | undefined;
  onChange: (val: number) => void;
  min?: number;
  placeholder?: string;
}

export default function StepperInput({ value, onChange, min = 0, placeholder = '—' }: Props) {
  const num = value ?? 0;

  return (
    <div className="flex items-center gap-1 touch-manipulation">
      <button
        onPointerDown={e => { e.preventDefault(); onChange(Math.max(min, num - 1)); }}
        className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xl font-bold
                   active:scale-90 transition-transform select-none flex items-center justify-center"
        aria-label="Diminuer"
      >
        −
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={e => {
          const v = e.target.value === '' ? 0 : Math.max(min, parseInt(e.target.value, 10) || 0);
          onChange(v);
        }}
        className="w-16 h-11 text-center text-lg font-bold border-2 border-gray-200 rounded-xl
                   focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                   [appearance:textfield] bg-white"
      />

      <button
        onPointerDown={e => { e.preventDefault(); onChange(num + 1); }}
        className="w-11 h-11 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xl font-bold
                   active:scale-90 transition-transform select-none flex items-center justify-center"
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  );
}
