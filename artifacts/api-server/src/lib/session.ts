import { randomBytes } from "crypto";
import { pool } from "@workspace/db";

export interface SessionData {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  departmentId: number | null;
}

export function createSession(data: SessionData): Promise<string> {
  const token = randomBytes(32).toString("hex");
  return pool
    .query(
      `INSERT INTO user_sessions (token, user_id, username, full_name, role, department_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')`,
      [token, data.userId, data.username, data.fullName, data.role, data.departmentId ?? null],
    )
    .then(() => token);
}

export async function getSession(token: string): Promise<SessionData | null> {
  const res = await pool.query<{
    user_id: number;
    username: string;
    full_name: string;
    role: string;
    department_id: number | null;
  }>(
    `SELECT user_id, username, full_name, role, department_id
     FROM user_sessions
     WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    departmentId: row.department_id,
  };
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query(`DELETE FROM user_sessions WHERE token = $1`, [token]);
}
