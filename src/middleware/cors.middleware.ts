import type { Express } from "express";
import cors from "cors";

/** Allows requests from any origin (browser `fetch` / cross-origin clients). */
export function configureCors(app: Express): void {
  app.use(cors());
}
