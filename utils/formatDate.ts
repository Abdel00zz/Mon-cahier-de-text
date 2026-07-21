const FR_MA_DATE = new Intl.DateTimeFormat('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const parseISODate = (value: string): Date => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const formatDate = (date: Date | string): string => {
    const value = typeof date === 'string' ? parseISODate(date) : date;
    return Number.isNaN(value.getTime()) ? '' : FR_MA_DATE.format(value);
};

export const parseFrenchDateToISO = (value: string): string | null => {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
        parsed.getFullYear() !== Number(year) ||
        parsed.getMonth() !== Number(month) - 1 ||
        parsed.getDate() !== Number(day)
    ) {
        return null;
    }
    return `${year}-${month}-${day}`;
};
