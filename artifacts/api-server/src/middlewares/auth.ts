import { type Request, type Response, type NextFunction } from "express";
import { getSession } from "../lib/session.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    fullName: string;
    role: string;
    departmentId: number | null;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.["session_token"] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Tizimga kirish talab etiladi" });
    return;
  }

  getSession(token)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: "Sessiya muddati tugagan" });
        return;
      }
      req.user = {
        id: session.userId,
        username: session.username,
        fullName: session.fullName,
        role: session.role,
        departmentId: session.departmentId,
      };
      next();
    })
    .catch((err) => {
      console.error("Session lookup error:", err);
      res.status(500).json({ error: "Server xatoligi" });
    });
}
