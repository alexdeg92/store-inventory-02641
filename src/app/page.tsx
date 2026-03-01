'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lookupPin, setSessionEmployee, getSessionEmployee } from '@/lib/employees';

export default function LoginPage() {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const router = useRouter();
  const hiddenRef = useRef<HTMLInputElement>(null);

  // Already authed?
  useEffect(() => {
    const emp = getSessionEmployee();
    if (emp) {
      if (emp.role === 'admin') router.replace('/admin');
      else router.replace('/inventaire');
    } else {
      hiddenRef.current?.focus();
    }
  }, [router]);

  async function submit(pin: string) {
    setLoading(true);
    const emp = await lookupPin(pin);
    setLoading(false);
    if (emp) {
      setGreeting(`Bonjour, ${emp.name} !`);
      setSessionEmployee(emp);
      setTimeout(() => {
        if (emp.role === 'admin') router.push('/admin');
        else router.push('/inventaire');
      }, 800);
    } else {
      setShake(true);
      setError('NIP incorrect ou inactif. Réessayez.');
      setTimeout(() => {
        setDigits([]);
        setShake(false);
        setError('');
      }, 700);
    }
  }

  function press(key: string) {
    if (loading) return;
    if (key === '⌫') {
      setDigits(d => d.slice(0, -1));
      setError('');
      return;
    }
    const next = [...digits, key];
    setDigits(next);
    // Try after 4 digits, or 7 (admin might have 7)
    if (next.length >= 4) {
      // Wait a tiny bit to allow longer PINs to keep being entered
      // but auto-submit after brief pause — we handle via explicit submit if needed
      // Actually just try at 4 and 7
      if (next.length === 7) {
        submit(next.join(''));
      } else if (next.length === 4) {
        // Could be a 4-digit PIN — try immediately
        // but also allow continuing to type for longer PINs
        // We'll auto-submit at 4 with a short delay to allow longer typing
        const current = next.join('');
        // Small delay so user can keep typing for longer PINs
        setTimeout(async () => {
          setDigits(prev => {
            if (prev.join('') === current && prev.length === 4) {
              // Still 4 digits, auto-submit
              submit(current);
            }
            return prev;
          });
        }, 600);
      }
    }
    if (next.length > 7) {
      // Reset if too long
      setDigits([]);
      setError('NIP trop long. Réessayez.');
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6 select-none">
      {/* Hidden input for hardware keyboard */}
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
          <div className="text-6xl mb-4">🎰</div>
          <h1 className="text-3xl font-black text-gray-900">Inventaire Loterie</h1>
          <p className="text-gray-500 mt-1">Voisin Shell / IGA Bromont</p>
          <p className="text-gray-400 text-sm">Magasin #02641</p>
        </div>

        {/* Greeting */}
        {greeting && (
          <div className="text-center mb-4 text-green-600 font-bold text-lg animate-pulse">
            {greeting}
          </div>
        )}

        {/* Dots — variable length up to 7 */}
        <div
          className={`flex justify-center gap-2 mb-4 transition-all`}
          style={{ animation: shake ? 'shake 0.5s' : undefined }}
        >
          {Array.from({ length: Math.max(4, digits.length) }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                i < digits.length
                  ? 'bg-blue-600 border-blue-600 scale-110'
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {error
          ? <p className="text-center text-red-500 text-sm font-semibold mb-4">{error}</p>
          : <p className="text-center text-gray-400 text-sm mb-4">
              {loading ? 'Vérification…' : 'Entrez votre NIP'}
            </p>
        }

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => k === '' ? <div key={i}/> : (
            <button
              key={k}
              onPointerDown={e => { e.preventDefault(); press(k); }}
              disabled={loading}
              className={`h-20 rounded-2xl text-2xl font-bold shadow-sm active:scale-95 transition-transform duration-75 select-none disabled:opacity-50
                ${k === '⌫'
                  ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
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
