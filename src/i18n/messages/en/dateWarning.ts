// Traductions en — dateWarning.
export const messages: Record<string, string> = {
  'dateWarning.invalid': 'This date does not exist in the calendar.',
  'dateWarning.weeklyRest': 'This date falls on a Sunday (weekly rest). Confirm if this is an exceptional session.',
  'dateWarning.notScheduled': 'According to your timetable, you do not teach “{className}” on {weekday}.',
  'dateWarning.holiday': 'This date is a public holiday: {name}{estimate}.',
  'dateWarning.estimated': ' (estimated date)',
  'dateWarning.vacation': 'This date falls during “{name}”.',
  'dateWarning.absence': 'You were absent on this date{reason}.',
  'dateWarning.outOfYear': 'This date is outside the {year} school year.',
  'dateWarning.outOfKnownYears': 'This date is outside the school years covered by the calendar.',
  'dateWarning.studyEnded': 'Lessons for this class end on {date} according to the official bulletin.',
  'dateWarning.officialExam': 'An official exam is scheduled on this day for this class.',
  'dateWarning.beforePrevious': 'This date is before the session on {date}. Maintain chronological order.',
  'dateWarning.afterFollowing': 'This date is after the session on {date}. Maintain chronological order.',
};
