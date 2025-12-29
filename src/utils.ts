export function getParisDateString(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());

  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  return `${year}-${month}-${day}`;
}


export const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")                 // sépare accents
    .replace(/[\u0300-\u036f]/g, "")  // supprime accents
    .replace(/[^a-z0-9]/g, "");       // supprime espaces, -, ', etc.
};