export type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  constructor(private debugEnabled = false) {}
  setDebug(enabled: boolean) { this.debugEnabled = enabled; }
  debug(...args: unknown[]) { if (this.debugEnabled) console.debug("[NovelUI]", ...args); }
  info(...args: unknown[]) { console.info("[NovelUI]", ...args); }
  warn(...args: unknown[]) { console.warn("[NovelUI]", ...args); }
  error(...args: unknown[]) { console.error("[NovelUI]", ...args); }
}

export const logger = new Logger(false);
