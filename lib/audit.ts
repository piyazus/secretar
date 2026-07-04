// lib/audit.ts
// Запись в audit_log (обязательное требование ТЗ §5).
// Ошибка записи аудита не должна ронять основное действие — логируем в консоль.

import { query } from "./db";

export interface AuditEntry {
  actor: string; // 'director' | 'agent' | email сотрудника
  action: string; // 'calendar.create', 'mail.send', ...
  target?: string; // id встречи / письма / получатель
  details?: Record<string, unknown>;
  success?: boolean;
  error?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (actor, action, target, details, success, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.actor,
        entry.action,
        entry.target ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.success ?? true,
        entry.error ?? null,
      ]
    );
  } catch (e) {
    console.error("audit_log write failed:", e, "entry:", entry);
  }
}
