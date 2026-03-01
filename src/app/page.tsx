'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CORRECT_PIN = process.env.NEXT_PUBLIC_STORE_PIN || '2641';
const AUTH_KEY = 'lottery_auth';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Already authenticated?
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (auth === 'true') {
      router.replace('/inventaire');
    }
    inputRef.current?.focus();
  }, [router]);

  const handlePinChange = (val: string) => {
    if (val.length > 4) return;
    setPin(val);
    setError('');

    if (val.length === 4) {
      if (val === CORRECT_PIN) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        router.push('/inventaire');
      } else {
        setShake(true);
        setError('NIP incorrect. Réessayez.');
        setTimeout(() => {
          setPin('');
          setShake(false);
          inputRef.current?.focus();
        }, 600);
      }
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (digit === 'DEL') {
      setPin((p) => p.slice(0, -1));
      setError('');
    } else {
      handlePinChange(pin + digit);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎰</div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire Loterie</h1>
          <p className="text-gray-500 text-sm mt-1">Voisin Shell / IGA Bromont</p>
          <p className="text-gray-400 text-xs mt-0.5">Magasin #02641</p>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-6 ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Hidden input for mobile keyboard */}
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          className="sr-only"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
        />

        {/* Error message */}
        {error && (
          <p className="text-center text-red-500 text-sm font-medium mb-4">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key, i) => {
            if (!key) return <div key={i} />;
            return (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className={`
                  h-16 rounded-2xl text-xl font-semibold
                  transition-all duration-100 active:scale-95
                  ${key === 'DEL'
                    ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300'
                  }
                `}
              >
                {key === 'DEL' ? '⌫' : key}
              </button>
            );
          })}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Entrez votre NIP à 4 chiffres
        </p>
      </div>
    </div>
  );
}
