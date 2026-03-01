'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const PIN = '2641';

export default function LoginPage() {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const hiddenRef = useRef<HTMLInputElement>(null);

  // Already authed?
  useEffect(() => {
    if (sessionStorage.getItem('auth') === '1') router.replace('/inventaire');
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
    if (next.length === 4) {
      if (next.join('') === PIN) {
        sessionStorage.setItem('auth', '1');
        router.push('/inventaire');
      } else {
        setShake(true);
        setError('NIP incorrect. Réessayez.');
        setTimeout(() => { setDigits([]); setShake(false); }, 700);
      }
    }
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
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🎰</div>
          <h1 className="text-3xl font-black text-gray-900">Inventaire Loterie</h1>
          <p className="text-gray-500 mt-1">Voisin Shell / IGA Bromont</p>
          <p className="text-gray-400 text-sm">Magasin #02641</p>
        </div>

        {/* Dots */}
        <div className={`flex justify-center gap-5 mb-4 transition-all ${shake ? 'translate-x-2' : ''}`}
          style={{ transition: 'transform 0.07s ease', animation: shake ? 'shake 0.5s' : undefined }}>
          {[0,1,2,3].map(i => (
            <div key={i}
              className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${
                i < digits.length ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {error
          ? <p className="text-center text-red-500 text-sm font-semibold mb-4">{error}</p>
          : <p className="text-center text-gray-400 text-sm mb-4">Entrez votre NIP à 4 chiffres</p>
        }

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => k === '' ? <div key={i}/> : (
            <button key={k}
              onPointerDown={e => { e.preventDefault(); press(k); }}
              className={`h-20 rounded-2xl text-2xl font-bold shadow-sm active:scale-95 transition-transform duration-75 select-none
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
