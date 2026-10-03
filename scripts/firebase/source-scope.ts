/** This Redis database is shared with older modules. Match only this API's keys. */
export function isCahierRecord(key: string): boolean {
  return /^(user|classes):\d{6,15}$/.test(key)
    || /^lessons:\d{6,15}:.+$/.test(key)
    || /^revision:account:\d{6,15}$/.test(key)
    || /^admin:(messages|inbox-clock|timetable-clock):\d{6,15}$/.test(key)
    || /^admin:(snapshots|calendar|official-events|timetable-clock)$/.test(key)
    || /^push:(subs|endpoint-owners|native-owners)$/.test(key)
    || /^push:native:\d{6,15}$/.test(key);
}
