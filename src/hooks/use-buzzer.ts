import { useEffect, useRef } from "react";

/** Square-wave tone via Web Audio. The context is created on first use, after a user gesture. */
export function useBuzzer(on: boolean, muted: boolean, hz = 2300, volume = 0.03, type: OscillatorType = "square") {
  const ctx = useRef<AudioContext | null>(null);
  const osc = useRef<OscillatorNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  useEffect(() => {
    const play = on && !muted;
    if (play && !osc.current) {
      ctx.current ??= new AudioContext();
      const c = ctx.current;
      void c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      o.type = type;
      o.frequency.value = hz;
      lp.type = "lowpass";
      lp.frequency.value = 5000;
      g.gain.value = volume;
      o.connect(lp).connect(g).connect(c.destination);
      o.start();
      osc.current = o;
      gain.current = g;
    } else if (play && osc.current) {
      osc.current.frequency.value = hz;
      const g = gain.current;
      if (g) g.gain.value = volume;
    } else if (!play && osc.current) {
      osc.current.stop();
      osc.current.disconnect();
      osc.current = null;
    }
  }, [on, muted, hz, volume, type]);
  useEffect(() => () => { osc.current?.stop(); void ctx.current?.close(); }, []);
}
