/*
  Email implementation is intentionally isolated from the renderer.
  For a production build, configure an Electron main-process IPC handler
  that uses Nodemailer and OS keychain storage for SMTP credentials.

  Do not put SMTP passwords in React/localStorage.
*/
export interface AlertConfig {
  enabled: boolean;
  recipient: string;
  threshold: number;
}

export function shouldAlert(
  config: AlertConfig,
  mismatchCount: number
): boolean {
  return config.enabled && mismatchCount >= config.threshold;
}
