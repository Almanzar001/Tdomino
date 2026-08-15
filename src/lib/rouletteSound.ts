let audioCtx: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function scheduleTick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1400, time)
  gain.gain.setValueAtTime(0.001, time)
  gain.gain.exponentialRampToValueAtTime(0.18, time + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.05)
}

/** Ticking sound that starts fast and slows down, like a decelerating wheel. */
export function playSpinTicks(durationMs: number) {
  const ctx = getContext()
  const now = ctx.currentTime
  const durationSec = durationMs / 1000
  const tickCount = 28
  for (let i = 0; i < tickCount; i++) {
    const progress = i / (tickCount - 1)
    const eased = Math.pow(progress, 2.4)
    scheduleTick(ctx, now + eased * durationSec)
  }
}

/** Bright two-note chime for when a winner is drawn. */
export function playWinChime() {
  const ctx = getContext()
  const now = ctx.currentTime
  const notes = [880, 1318.5]
  notes.forEach((freq, i) => {
    const start = now + i * 0.1
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}
