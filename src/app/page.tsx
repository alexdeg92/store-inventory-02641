'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const USER_PIN = '2641';
const ADMIN_PIN = '0264199';

export default function LoginPage() {
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const hiddenRef = useRef<HTMLInputElement>(null);

  const pinLength = mode === 'admin' ? 7 : 4;
  const expectedPin = mode === 'admin' ? ADMIN_PIN : USER_PIN;

  // Already authed?
  useEffect(() => {
    if (sessionStorage.getItem('auth') === '1') router.replace('/inventaire');
    else if (sessionStorage.getItem('admin-auth') === '1') router.replace('/admin');
    else hiddenRef.current?.focus();
  }, [router]);

  function press(key: string) {
    if (key === '⌫') {
      setDigits(d => d.slice(0, -1));
      setError('');
      return;
    }
    const next = [...digits, key];
    setDigits(next);
    if (next.length === pinLength) {
      if (next.join('') === expectedPin) {
        if (mode === 'admin') {
          sessionStorage.setItem('admin-auth', '1');
          router.push('/admin');
        } else {
          sessionStorage.setItem('auth', '1');
          router.push('/inventaire');
        }
      } else {
        setShake(true);
        setError('NIP incorrect. Réessayez.');
        setTimeout(() => { setDigits([]); setShake(false); }, 700);
      }
    }
  }

  function switchMode(newMode: 'user' | 'admin') {
    setMode(newMode);
    setDigits([]);
    setError('');
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6 select-none">
      {/* Hidden input so device keyboard can still type if wanted */}
      <input
        ref={hiddenRef}
        className="sr-only"
        inputMode="numeric"
        onKeyDown={e => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); }}
        readOnly
      />

      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{mode === 'admin' ? '🔐' : '🎰'}</div>
          <h1 className="text-3xl font-black text-gray-900">
            {mode === 'admin' ? 'Accès Admin' : 'Inventaire Loterie'}
          </h1>
          <p className="text-gray-500 mt-1">Voisin Shell / IGA Bromont</p>
          <p className="text-gray-400 text-sm">Magasin #02641</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onPointerDown={e => { e.preventDefault(); switchMode('user'); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'user'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🎰 Employé
          </button>
          <button
            onPointerDown={e => { e.preventDefault(); switchMode('admin'); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'admin'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🔐 Admin
          </button>
        </div>

        {/* Dots */}
        <div
          className={`flex justify-center gap-3 mb-4 transition-all ${shake ? 'translate-x-2' : ''}`}
          style={{ transition: 'transform 0.07s ease', animation: shake ? 'shake 0.5s' : undefined }}
        >
          {Array.from({ length: pinLength }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                i < digits.length
                  ? (mode === 'admin' ? 'bg-purple-600 border-purple-600 scale-110' : 'bg-blue-600 border-blue-600 scale-110')
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {error
          ? <p className="text-center text-red-500 text-sm font-semibold mb-4">{error}</p>
          : <p className="text-center text-gray-400 text-sm mb-4">
              {mode === 'admin' ? 'Entrez le NIP administrateur (7 chiffres)' : 'Entrez votre NIP à 4 chiffres'}
            </p>
        }

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => k === '' ? <div key={i}/> : (
            <button
              key={k}
              onPointerDown={e => { e.preventDefault(); press(k); }}
              className={`h-20 rounded-2xl text-2xl font-bold shadow-sm active:scale-95 transition-transform duration-75 select-none
                ${k === '⌫'
                  ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                  : mode === 'admin'
                    ? 'bg-purple-50 text-gray-900 border border-purple-100 hover:bg-purple-100'
                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}
