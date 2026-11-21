/**
 * Monday of the week containing `date` (local time), weeks running
 * Monday..Sunday. getDay() is 0 on Sunday, so `date - getDay() + 1` would
 * jump to the NEXT Monday on Sundays; offset by (getDay() + 6) % 7 instead.
 */
export function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday;
}
