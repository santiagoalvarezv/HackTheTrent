export const SERVER_UNREACHABLE = "Can't reach the account server, try again";

/** Rejects with SERVER_UNREACHABLE if the call takes longer than `ms` (default 15 s). */
export function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(SERVER_UNREACHABLE)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
