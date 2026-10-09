// Whether a value comes back identical after JSON.stringify → JSON.parse.
//
// The React Query cache is saved to the device as JSON (query-persistence.ts).
// Anything JSON can't represent comes back as something else, silently:
//
//   Map, Set           → {}            (.get / .forEach / .has then crash)
//   Date               → a string      (.getTime() then crashes)
//   class instances    → plain objects (their methods are gone)
//   NaN, Infinity      → null
//   undefined in lists → null
//   functions, bigint, symbols → dropped, or JSON.stringify throws
//
// Plain objects, arrays, strings, finite numbers, booleans and null are safe.
// (An `undefined` object property is dropped, which reads back the same.)

/** Where the first unsafe value sits, e.g. "[3].createdAt (Date)", or null
 *  when the whole value is JSON-safe. */
export function findJsonUnsafe(value: unknown): string | null {
  // The keys leading to the value being checked; only turned into a path
  // string when something unsafe is found (building one per value would
  // make the common, all-safe case several times slower).
  const keys: (string | number)[] = [];
  // Objects on the current branch: meeting one again is a cycle. (The same
  // object in two places isn't — JSON just writes it twice.)
  const branch = new Set<object>();
  let problem = "";

  const where = () =>
    keys
      .map((k, i) =>
        typeof k === "number" ? `[${k}]` : i === 0 ? k : `.${k}`,
      )
      .join("") || "value";

  const walk = (v: unknown, inArray: boolean): boolean => {
    if (v === null) return true;
    const type = typeof v;
    if (type === "string" || type === "boolean") return true;
    if (type === "number") {
      if (Number.isFinite(v)) return true;
      problem = String(v);
      return false;
    }
    if (type === "undefined") {
      if (!inArray) return true;
      problem = "undefined in a list";
      return false;
    }
    if (type !== "object") {
      problem = type;
      return false;
    }

    const obj = v as object;
    if (branch.has(obj)) {
      problem = "circular";
      return false;
    }

    if (Array.isArray(obj)) {
      branch.add(obj);
      for (let i = 0; i < obj.length; i++) {
        keys.push(i);
        if (!walk(obj[i], true)) return false;
        keys.pop();
      }
      branch.delete(obj);
      return true;
    }

    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      problem =
        (obj as { constructor?: { name?: string } }).constructor?.name ||
        "class instance";
      return false;
    }
    branch.add(obj);
    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
      keys.push(key);
      if (!walk(record[key], false)) return false;
      keys.pop();
    }
    branch.delete(obj);
    return true;
  };

  return walk(value, false) ? null : `${where()} (${problem})`;
}

// Query data only changes by being replaced, so a verdict per data object
// stays true for as long as that object is the query's data.
const verdicts = new WeakMap<object, string | null>();

/** findJsonUnsafe, remembered per object (the cache asks every second). */
export function findJsonUnsafeCached(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return findJsonUnsafe(value);
  if (verdicts.has(value)) return verdicts.get(value)!;
  const verdict = findJsonUnsafe(value);
  verdicts.set(value, verdict);
  return verdict;
}

const broken: number = 'oops';
