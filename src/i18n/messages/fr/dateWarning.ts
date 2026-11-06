// Traductions fr — dateWarning.
export const messages: Record<string, string> = {
  'dateWarning.invalid': 'Cette date n’existe pas dans le calendrier.',
  'dateWarning.weeklyRest': 'Ce jour tombe un dimanche (repos hebdomadaire). Confirmez s’il s’agit d’une séance exceptionnelle.',
  'dateWarning.notScheduled': 'D’après votre emploi du temps, vous n’enseignez pas « {className} » le {weekday}.',
  'dateWarning.holiday': 'Cette date est un jour férié : {name}{estimate}.',
  'dateWarning.estimated': ' (date estimée)',
  'dateWarning.vacation': 'Cette date tombe pendant « {name} ».',
  'dateWarning.absence': 'Vous étiez absent(e) à cette date{reason}.',
  'dateWarning.outOfYear': 'Cette date est en dehors de l’année scolaire {year}.',
  'dateWarning.outOfKnownYears': 'Cette date est en dehors des années scolaires connues du calendrier.',
  'dateWarning.studyEnded': 'Les cours de cette classe se terminent le {date} d’après le bulletin officiel.',
  'dateWarning.officialExam': 'Un examen officiel est prévu ce jour-là pour cette classe.',
  'dateWarning.beforePrevious': 'Cette date précède la séance du {date}. Respectez l’ordre chronologique.',
  'dateWarning.afterFollowing': 'Cette date suit la séance du {date}. Respectez l’ordre chronologique.',
};
