// Saves the last successfully-fetched copy of something on the device
// itself (localStorage), so the next time the app needs it, it can show
// that immediately - before the network has answered, even with no
// connection at all - while a fresh copy loads quietly in the background
// and swaps in once it's ready.
//
// This is specifically for things like a league table, a scorers list,
// or a set of fixtures: confirmed football data that only changes when a
// match actually finishes, not from one app open to the next. Showing
// what was already confirmed a few hours or days ago isn't wrong, it's
// just occasionally a little behind - and a little behind beats a blank
// screen or a multi-second wait every single time the app opens.
//
// Wrapped in try/catch throughout: localStorage can fail (private
// browsing, storage disabled or full) and none of that should ever break
// the app - worst case, nothing gets remembered and a page just falls
// back to loading fresh every time, exactly like before this existed.

const PREFIX = "clubside:cache:";

export function readPersisted<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writePersisted<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not saved - this one thing just won't have an instant answer next
    // time, nothing else is affected.
  }
}
