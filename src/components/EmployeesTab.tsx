'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Employee,
  AuditLog,
  listEmployees,
  createEmployee,
  updateEmployee,
  getAuditLog,
  generatePin,
  getSessionEmployee,
  verifyPin,
} from '@/lib/employees';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 text-purple-700 font-semibold text-sm text-center">
      {msg}
    </div>
  );
}

function Badge({ active, role }: { active: boolean; role: string }) {
  if (!active) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">Inactif</span>;
  if (role === 'admin') return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Admin</span>;
  return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Employé</span>;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog({ employeeId, employeeName, onBack }: { employeeId?: string; employeeName?: string; onBack: () => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog(employeeId, 100).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [employeeId]);

  function actionLabel(action: string): string {
    switch (action) {
      case 'inventory_save': return 'Sauvegarde inventaire';
      case 'employee_create': return 'Ajout employé';
      case 'employee_update': return 'Modif. employé';
      case 'employee_pin_change': return 'Changement NIP';
      case 'employee_deactivate': return 'Désactivation employé';
      case 'employee_activate': return 'Réactivation employé';
      default: return action;
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button
          onPointerDown={e => { e.preventDefault(); onBack(); }}
          className="text-purple-600 hover:text-purple-800 font-bold text-sm px-3 py-2 bg-purple-50 rounded-xl active:scale-95 transition-transform"
        >
          ← Retour
        </button>
        <h2 className="text-lg font-black text-gray-900">
          {employeeName ? `Activité — ${employeeName}` : 'Activité récente'}
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <span className="animate-spin mr-2 text-2xl">⏳</span>
          <span>Chargement…</span>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <p className="text-center text-gray-400 py-12">Aucune activité enregistrée</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="flex flex-col gap-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{actionLabel(log.action)}</p>
                  {log.employee && (
                    <p className="text-xs text-purple-600 font-semibold">{(log.employee as { name: string; role: string }).name}</p>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {new Date(log.created_at).toLocaleString('fr-CA', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PIN Change Modal ─────────────────────────────────────────────────────────

function PinChangeModal({
  employee,
  isCurrentUser,
  onClose,
  onSaved,
}: {
  employee: Employee;
  isCurrentUser: boolean;
  onClose: () => void;
  onSaved: (newPin: string) => void;
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [useGenerated, setUseGenerated] = useState(false);

  function generate() {
    const p = generatePin(4);
    setNewPin(p);
    setConfirmPin(p);
    setUseGenerated(true);
  }

  async function handleSave() {
    setError('');
    // If changing own PIN, verify current first
    if (isCurrentUser) {
      if (!currentPin) { setError('Entrez votre NIP actuel'); return; }
      const verified = await verifyPin(currentPin);
      if (!verified || verified.id !== employee.id) {
        setError('NIP actuel incorrect');
        return;
      }
    }
    if (!newPin) { setError('Entrez le nouveau NIP'); return; }
    if (newPin.length < 4) { setError('NIP minimum 4 chiffres'); return; }
    if (!/^\d+$/.test(newPin)) { setError('NIP doit contenir uniquement des chiffres'); return; }
    if (!useGenerated && newPin !== confirmPin) { setError('Les NIPs ne correspondent pas'); return; }

    setSaving(true);
    const { error: err } = await updateEmployee(employee.id, { pin: newPin });
    setSaving(false);
    if (err) {
      if (err.includes('unique') || err.includes('duplicate')) {
        setError('Ce NIP est déjà utilisé par un autre employé');
      } else {
        setError('Erreur: ' + err);
      }
      return;
    }
    onSaved(newPin);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-1">Changer le NIP</h3>
        <p className="text-sm text-gray-500 mb-4">{employee.name}</p>

        {isCurrentUser && (
          <div className="mb-3">
            <label className="text-xs font-bold text-gray-600 block mb-1">NIP actuel *</label>
            <input
              type="password"
              inputMode="numeric"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Votre NIP actuel"
              maxLength={10}
            />
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-600">Nouveau NIP *</label>
            <button
              onPointerDown={e => { e.preventDefault(); generate(); }}
              className="text-xs text-purple-600 font-bold hover:text-purple-800"
            >
              🎲 Générer
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono tracking-widest"
            value={newPin}
            onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setUseGenerated(false); }}
            placeholder="ex: 1234"
            maxLength={10}
          />
        </div>

        {!useGenerated && (
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-600 block mb-1">Confirmer le NIP *</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono tracking-widest"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Répéter le NIP"
              maxLength={10}
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>}

        {useGenerated && newPin && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-xs text-green-600 font-semibold mb-1">NIP généré — notez-le !</p>
            <p className="text-2xl font-black text-green-700 tracking-widest">{newPin}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onPointerDown={e => { e.preventDefault(); handleSave(); }}
            disabled={saving}
            className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : '✓ Sauvegarder'}
          </button>
          <button
            onPointerDown={e => { e.preventDefault(); onClose(); }}
            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm active:scale-95"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({ onClose, onAdded }: { onClose: () => void; onAdded: (emp: Employee) => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  function generate() {
    setPin(generatePin(4));
    setGenerated(true);
  }

  async function handleAdd() {
    setError('');
    if (!name.trim()) { setError('Nom requis'); return; }
    if (!pin) { setError('NIP requis'); return; }
    if (pin.length < 4) { setError('NIP minimum 4 chiffres'); return; }
    if (!/^\d+$/.test(pin)) { setError('NIP: chiffres uniquement'); return; }

    setSaving(true);
    const { employee, error: err } = await createEmployee(name.trim(), pin, role);
    setSaving(false);
    if (err) {
      if (err.includes('unique') || err.includes('duplicate')) {
        setError('Ce NIP est déjà utilisé');
      } else {
        setError('Erreur: ' + err);
      }
      return;
    }
    if (employee) onAdded(employee);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-4">Nouvel employé</h3>

        <div className="mb-3">
          <label className="text-xs font-bold text-gray-600 block mb-1">Nom *</label>
          <input
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex: Marie"
            autoFocus
          />
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-600">NIP *</label>
            <button
              onPointerDown={e => { e.preventDefault(); generate(); }}
              className="text-xs text-purple-600 font-bold hover:text-purple-800"
            >
              🎲 Générer
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono tracking-widest"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setGenerated(false); }}
            placeholder="ex: 5678"
            maxLength={10}
          />
          {generated && pin && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-2 text-center">
              <p className="text-xs text-green-600 font-semibold mb-0.5">NIP généré — notez-le !</p>
              <p className="text-xl font-black text-green-700 tracking-widest">{pin}</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-600 block mb-1">Rôle</label>
          <select
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'employee')}
          >
            <option value="employee">Employé</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onPointerDown={e => { e.preventDefault(); handleAdd(); }}
            disabled={saving}
            className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Création…' : '+ Créer'}
          </button>
          <button
            onPointerDown={e => { e.preventDefault(); onClose(); }}
            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm active:scale-95"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({
  emp,
  isCurrentUser,
  onPinChange,
  onToggleActive,
  onRoleChange,
  onViewActivity,
  onNameEdit,
}: {
  emp: Employee;
  isCurrentUser: boolean;
  onPinChange: (emp: Employee) => void;
  onToggleActive: (emp: Employee) => void;
  onRoleChange: (emp: Employee) => void;
  onViewActivity: (emp: Employee) => void;
  onNameEdit: (emp: Employee) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(emp.name);
  const [saving, setSaving] = useState(false);

  async function saveName() {
    if (!nameVal.trim()) return;
    setSaving(true);
    await updateEmployee(emp.id, { name: nameVal.trim() });
    setSaving(false);
    setEditingName(false);
    onNameEdit({ ...emp, name: nameVal.trim() });
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm ${!emp.active ? 'opacity-60 border-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 border border-purple-400 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameVal(emp.name); } }}
                autoFocus
              />
              <button onClick={saveName} disabled={saving} className="text-green-600 font-bold text-sm px-1">✓</button>
              <button onClick={() => { setEditingName(false); setNameVal(emp.name); }} className="text-gray-400 font-bold text-sm px-1">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-black text-gray-900 text-base">{emp.name}</p>
              {isCurrentUser && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">moi</span>}
              <button
                onPointerDown={e => { e.preventDefault(); setEditingName(true); }}
                className="text-gray-400 hover:text-blue-500 text-xs"
              >✏️</button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge active={emp.active} role={emp.role} />
            <span className="text-xs text-gray-400 font-mono">NIP: {'•'.repeat(Math.min(emp.pin.length, 4))}{emp.pin.length > 4 ? '•••' : ''}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onPointerDown={e => { e.preventDefault(); onPinChange(emp); }}
          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 active:scale-95 transition-transform"
        >
          🔑 NIP
        </button>
        {!isCurrentUser && (
          <>
            <button
              onPointerDown={e => { e.preventDefault(); onRoleChange(emp); }}
              className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-100 active:scale-95 transition-transform"
            >
              {emp.role === 'admin' ? '👤 → Employé' : '🔐 → Admin'}
            </button>
            <button
              onPointerDown={e => { e.preventDefault(); onToggleActive(emp); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95 transition-transform border ${
                emp.active
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}
            >
              {emp.active ? '🚫 Désactiver' : '✅ Réactiver'}
            </button>
          </>
        )}
        <button
          onPointerDown={e => { e.preventDefault(); onViewActivity(emp); }}
          className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 active:scale-95 transition-transform"
        >
          📋 Activité
        </button>
      </div>
    </div>
  );
}

// ─── Main EmployeesTab ────────────────────────────────────────────────────────

export default function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pinChangeFor, setPinChangeFor] = useState<Employee | null>(null);
  const [activityFor, setActivityFor] = useState<{ id?: string; name?: string } | null>(null);

  const currentEmployee = getSessionEmployee();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const data = await listEmployees();
    setEmployees(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3500); }

  async function handleToggleActive(emp: Employee) {
    const newState = !emp.active;
    const action = newState ? 'employee_activate' : 'employee_deactivate';
    if (!newState && !confirm(`Désactiver "${emp.name}" ? Ils ne pourront plus se connecter.`)) return;
    await updateEmployee(emp.id, { active: newState });
    if (currentEmployee) {
      const { logAction } = await import('@/lib/employees');
      await logAction(currentEmployee.id, action, { target: emp.name });
    }
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: newState } : e));
    flash(newState ? `✓ ${emp.name} réactivé` : `✓ ${emp.name} désactivé`);
  }

  async function handleRoleChange(emp: Employee) {
    const newRole = emp.role === 'admin' ? 'employee' : 'admin';
    if (!confirm(`Changer le rôle de "${emp.name}" → ${newRole === 'admin' ? 'Administrateur' : 'Employé'} ?`)) return;
    await updateEmployee(emp.id, { role: newRole });
    if (currentEmployee) {
      const { logAction } = await import('@/lib/employees');
      await logAction(currentEmployee.id, 'employee_update', { target: emp.name, role: newRole });
    }
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, role: newRole } : e));
    flash(`✓ Rôle mis à jour`);
  }

  function handleNameEdit(updated: Employee) {
    setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, name: updated.name } : e));
    flash(`✓ Nom mis à jour`);
  }

  async function handlePinSaved(emp: Employee, newPin: string) {
    setPinChangeFor(null);
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, pin: newPin } : e));
    if (currentEmployee) {
      const { logAction } = await import('@/lib/employees');
      await logAction(currentEmployee.id, 'employee_pin_change', { target: emp.name });
    }
    // If they changed their own PIN, update session
    if (currentEmployee?.id === emp.id) {
      const { setSessionEmployee } = await import('@/lib/employees');
      setSessionEmployee({ ...currentEmployee, pin: newPin });
    }
    flash('✓ NIP mis à jour');
  }

  function handleEmployeeAdded(emp: Employee) {
    setShowAdd(false);
    setEmployees(prev => [...prev, emp]);
    if (currentEmployee) {
      import('@/lib/employees').then(({ logAction }) => {
        logAction(currentEmployee.id, 'employee_create', { name: emp.name, role: emp.role });
      });
    }
    flash(`✓ ${emp.name} ajouté avec le NIP ${emp.pin}`);
  }

  if (activityFor !== null) {
    return (
      <ActivityLog
        employeeId={activityFor.id}
        employeeName={activityFor.name}
        onBack={() => setActivityFor(null)}
      />
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-10">
      {msg && <Toast msg={msg} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-gray-900">Gestion des employés</h2>
        <div className="flex gap-2">
          <button
            onPointerDown={e => { e.preventDefault(); setActivityFor({}); }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow-sm"
          >
            📋 Toute l&apos;activité
          </button>
          <button
            onPointerDown={e => { e.preventDefault(); setShowAdd(true); }}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <span className="animate-spin mr-2 text-2xl">⏳</span>
          <span>Chargement…</span>
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          {employees.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              isCurrentUser={emp.id === currentEmployee?.id}
              onPinChange={setPinChangeFor}
              onToggleActive={handleToggleActive}
              onRoleChange={handleRoleChange}
              onViewActivity={e => setActivityFor({ id: e.id, name: e.name })}
              onNameEdit={handleNameEdit}
            />
          ))}
          {employees.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun employé</p>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onAdded={handleEmployeeAdded}
        />
      )}
      {pinChangeFor && (
        <PinChangeModal
          employee={pinChangeFor}
          isCurrentUser={pinChangeFor.id === currentEmployee?.id}
          onClose={() => setPinChangeFor(null)}
          onSaved={newPin => handlePinSaved(pinChangeFor, newPin)}
        />
      )}
    </div>
  );
}
