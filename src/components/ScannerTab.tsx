'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PRODUCTS } from '@/lib/products';
import { lookupBarcode, assignBarcode, uuidToProductId } from '@/lib/storage';
import StepperInput from './StepperInput';

interface ScanResult {
  barcode: string;
  productId: number | null;  // null = unrecognized
}

interface Props {
  onCount: (productId: number, count: number) => void;
}

export default function ScannerTab({ onCount }: Props) {
  // The div#qr-reader is ALWAYS in the DOM (just hidden) so Html5Qrcode can find it
  const html5QrcodeRef = useRef<unknown>(null);
  const [scanning, setScanning] = useState(false);
  const [startQueued, setStartQueued] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [count, setCount] = useState<number>(1);
  const [assignTarget, setAssignTarget] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const lastBarcode = useRef<string>('');
  const processingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrcodeRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (html5QrcodeRef.current as any).stop();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (html5QrcodeRef.current as any).clear();
        html5QrcodeRef.current = null;
      }
    } catch { /* ignore */ }
    setScanning(false);
  }, []);

  // Actually start the scanner — called from useEffect after DOM renders with scanning=true
  const doStartScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Make sure the element exists in the DOM
      const el = document.getElementById('qr-reader');
      if (!el) {
        setError('Élément du scanner introuvable. Rechargez la page.');
        setScanning(false);
        return;
      }

      const qr = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 160 }, aspectRatio: 1.7 },
        async (decodedText: string) => {
          if (processingRef.current || decodedText === lastBarcode.current) return;
          lastBarcode.current = decodedText;
          processingRef.current = true;

          if (navigator.vibrate) navigator.vibrate(80);

          await stopScanner();

          const uuid = await lookupBarcode(decodedText);
          const productId = uuid ? uuidToProductId(uuid) : null;

          setResult({ barcode: decodedText, productId });
          setCount(1);
          setAssignTarget(productId);
          processingRef.current = false;
        },
        () => { /* ignore decode errors */ }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Impossible d'accéder à la caméra. " + msg);
      setScanning(false);
    }
  }, [stopScanner]);

  // After scanning=true renders the div into view, kick off the actual scanner init
  useEffect(() => {
    if (!startQueued || !scanning) return;
    setStartQueued(false);
    doStartScanner();
  }, [startQueued, scanning, doStartScanner]);

  // Queue up a scanner start — sets scanning=true first so the div is visible/mounted
  const startScanner = useCallback(() => {
    if (scanning) return;
    setError('');
    setResult(null);
    lastBarcode.current = '';
    processingRef.current = false;
    setScanning(true);
    setStartQueued(true);
  }, [scanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  async function handleAssign() {
    if (!result || assignTarget === null) return;
    await assignBarcode(result.barcode, assignTarget);
    setResult({ ...result, productId: assignTarget });
    setStatusMsg('Barcode associé !');
    setTimeout(() => setStatusMsg(''), 2500);
  }

  function handleApply() {
    const pid = result?.productId ?? assignTarget;
    if (pid === null || pid === undefined) return;
    onCount(pid, count);
    setStatusMsg(`✓ ${PRODUCTS.find(p => p.id === pid)?.name ?? ''} → ${count} enregistré`);
    setTimeout(() => setStatusMsg(''), 3000);
    setResult(null);
    setCount(1);
    setAssignTarget(null);
    lastBarcode.current = '';
  }

  const resolvedProduct = result?.productId != null
    ? PRODUCTS.find(p => p.id === result.productId)
    : null;

  return (
    <div className="flex flex-col items-center px-4 py-6 gap-6 max-w-md mx-auto">
      <div className="text-center">
        <p className="text-2xl font-black text-gray-900">📷 Scanner</p>
        <p className="text-sm text-gray-500 mt-1">Scannez un code-barres de paquet de cigarettes</p>
      </div>

      {/* Scanner viewport — always in DOM, shown/hidden via CSS */}
      <div className={`w-full ${scanning ? 'block' : 'hidden'}`}>
        <div
          id="qr-reader"
          className="w-full rounded-2xl overflow-hidden border-4 border-blue-400 shadow-xl"
        />
        <button
          onPointerDown={e => { e.preventDefault(); stopScanner(); }}
          className="mt-3 w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold text-base active:scale-95 transition-transform"
        >
          Annuler
        </button>
      </div>

      {/* Start scan button */}
      {!scanning && !result && (
        <button
          onPointerDown={e => { e.preventDefault(); startScanner(); }}
          className="w-full py-6 rounded-2xl bg-blue-600 text-white font-black text-xl shadow-lg active:scale-95 transition-transform"
        >
          📷 Lancer le scanner
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
          <button
            onPointerDown={e => { e.preventDefault(); setError(''); }}
            className="mt-2 w-full py-2 rounded-xl bg-red-100 text-red-600 font-bold text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Scan result */}
      {result && (
        <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-400 font-mono break-all">Code: {result.barcode}</p>

          {/* Known product */}
          {resolvedProduct ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-0.5">Produit reconnu</p>
              <p className="text-lg font-black text-gray-900">{resolvedProduct.name}</p>
              {resolvedProduct.priceCategory > 0 && (
                <p className="text-sm text-gray-500">{resolvedProduct.priceCategory}$ • Emb. {resolvedProduct.packQty}</p>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wide mb-2">Produit inconnu — Associer à :</p>
              <select
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={assignTarget ?? ''}
                onChange={e => setAssignTarget(e.target.value ? parseInt(e.target.value, 10) : null)}
              >
                <option value="">— Choisir un produit —</option>
                {PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.category === 'lottery' ? `[Loterie ${p.priceCategory}$]` : '[Cigarette]'} {p.name}
                  </option>
                ))}
              </select>
              <button
                onPointerDown={e => { e.preventDefault(); handleAssign(); }}
                disabled={assignTarget === null}
                className="mt-2 w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
              >
                Associer ce barcode
              </button>
            </div>
          )}

          {/* Count input */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-gray-700">Quantité en stock</p>
            <StepperInput value={count} onChange={setCount} min={0} />
          </div>

          {/* Apply button */}
          <button
            onPointerDown={e => { e.preventDefault(); handleApply(); }}
            disabled={result.productId === null && assignTarget === null}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-lg active:scale-95 transition-transform disabled:opacity-40 shadow"
          >
            ✓ Enregistrer
          </button>

          {/* Scan another */}
          <button
            onPointerDown={e => { e.preventDefault(); setResult(null); startScanner(); }}
            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold text-base active:scale-95 transition-transform"
          >
            Scanner un autre
          </button>
        </div>
      )}

      {/* Status */}
      {statusMsg && (
        <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-700 font-semibold text-sm text-center">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
