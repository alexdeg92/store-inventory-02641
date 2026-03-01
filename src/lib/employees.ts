import { supabase } from './supabase';

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'employee';
  active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  employee_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  employee?: { name: string; role: string } | null;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export function getSessionEmployee(): Employee | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('employee');
    return raw ? (JSON.parse(raw) as Employee) : null;
  } catch { return null; }
}

export function setSessionEmployee(emp: Employee): void {
  sessionStorage.setItem('employee', JSON.stringify(emp));
  // Legacy flags for compat
  if (emp.role === 'admin') {
    sessionStorage.setItem('admin-auth', '1');
  } else {
    sessionStorage.setItem('auth', '1');
  }
}

export function clearSession(): void {
  sessionStorage.clear();
}

// ─── PIN lookup ───────────────────────────────────────────────────────────────

export async function lookupPin(pin: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('pin', pin)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as Employee;
}

// ─── Employee CRUD ────────────────────────────────────────────────────────────

export async function listEmployees(): Promise<Employee[]> {
  const { data } = await supabase
    .from('employees')
    .select('*')
    .order('created_at');
  return (data as Employee[]) ?? [];
}

export async function createEmployee(name: string, pin: string, role: 'admin' | 'employee'): Promise<{ employee?: Employee; error?: string }> {
  const { data, error } = await supabase
    .from('employees')
    .insert({ name, pin, role })
    .select()
    .single();
  if (error) return { error: error.message };
  return { employee: data as Employee };
}

export async function updateEmployee(id: string, updates: Partial<Pick<Employee, 'name' | 'pin' | 'role' | 'active'>>): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function verifyPin(pin: string): Promise<Employee | null> {
  return lookupPin(pin);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function logAction(
  employeeId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      employee_id: employeeId,
      action,
      details: details ?? null,
    });
  } catch { /* non-blocking */ }
}

export async function getAuditLog(employeeId?: string, limit = 50): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_log')
    .select('*, employee:employees(name, role)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (employeeId) query = query.eq('employee_id', employeeId);
  const { data } = await query;
  return (data as AuditLog[]) ?? [];
}

// ─── Random PIN generator ─────────────────────────────────────────────────────

export function generatePin(length = 4): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}
