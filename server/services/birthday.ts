import { FamilyMember } from '@prisma/client';
import { differenceInDays, addYears, isSameDay, parseISO, setYear, startOfToday } from 'date-fns';

export interface BirthdayEvent {
    id: string;
    title: string;
    date: Date;
    type: 'BIRTHDAY';
    memberId: string;
    photo?: string;
    age: number;
}

export function getUpcomingBirthdays(members: FamilyMember[], limit: number = 5): BirthdayEvent[] {
    const today = startOfToday();
    const currentYear = today.getFullYear();

    const events = members
        .filter(m => m.birthDate)
        .map(member => {
            const birthDate = new Date(member.birthDate!);
            let nextBirthday = setYear(birthDate, currentYear);

            if (differenceInDays(nextBirthday, today) < 0) {
                nextBirthday = addYears(nextBirthday, 1);
            }

            const age = nextBirthday.getFullYear() - birthDate.getFullYear();

            return {
                id: `bday-${member.id}-${nextBirthday.getFullYear()}`,
                title: `Cumpleaños de ${member.name}`,
                date: nextBirthday,
                type: 'BIRTHDAY' as const,
                memberId: member.id,
                photo: member.photo || undefined,
                age
            };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, limit);

    return events;
}
