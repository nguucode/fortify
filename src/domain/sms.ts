/** US-INB-006: texting windows by the Account's state, in the Contact's local time. */
export const STOP_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
export const START_WORDS = ['START', 'UNSTOP']

/** Central for TX and the western FL Panhandle (324xx, 325xx), Eastern for the rest of FL. */
export const timeZoneFor = (state: string, zip: string) => (state === 'FL' && !/^32[45]/.test(zip) ? 'America/New_York' : 'America/Chicago')

export function localParts(now: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]))
  return { hour: Number(p.hour) + Number(p.minute) / 60, weekday: p.weekday as string, label: now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }) }
}

/** Null when texting is fine now; otherwise the local time to show in "It's {time} for {name}. Send anyway?". */
export function outsideTextingWindow(state: string, zip: string, now: Date = new Date()): string | null {
  const { hour, weekday, label } = localParts(now, timeZoneFor(state, zip))
  const [from, to] = state === 'TX' ? [weekday === 'Sun' ? 12 : 9, 21] : state === 'FL' ? [8, 20] : [8, 21]
  return hour >= from && hour < to ? null : label
}
