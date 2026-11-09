// All history timestamps are monotonic seconds, not wall-clock time.
export const WINDOW_SECONDS = 30;
export function recordSample(samples, now, fraction) {
    const recent = samples.filter(s => s.time >= now - WINDOW_SECONDS && s.time <= now);
    if (Number.isFinite(fraction))
        recent.push({time: now, value: Math.max(0, Math.min(1, fraction))});
    return recent;
}
export function sampleX(time, now, width, padding = 2) {
    const fraction = Math.max(0, Math.min(1, (time - now + WINDOW_SECONDS) / WINDOW_SECONDS));
    return padding + fraction * (width - 2 * padding);
}
