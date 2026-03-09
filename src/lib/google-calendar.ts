import { google } from 'googleapis';

export function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
    );
}

export function getAuthUrl() {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
        ],
    });
}

interface TokenData {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}

export function getAuthedClient(tokenData: TokenData) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokenData);
    return oauth2Client;
}

export async function getFreeBusy(
    tokenData: TokenData,
    calendarEmail: string,
    timeMin: string,
    timeMax: string,
    timeZone?: string
) {
    const auth = getAuthedClient(tokenData);
    const calendar = google.calendar({ version: 'v3', auth });

    const tz = timeZone || 'UTC';
    const res = await calendar.freebusy.query({
        requestBody: {
            timeMin,
            timeMax,
            timeZone: tz,
            items: [{ id: calendarEmail }],
        },
    });

    return res.data.calendars?.[calendarEmail]?.busy || [];
}

/**
 * Convert a date string (YYYY-MM-DD) and time string (HH:MM) to an
 * ISO 8601 / RFC 3339 datetime string using the given IANA timezone.
 * Falls back to appending +00:00 for UTC if Intl resolution fails.
 */
export function toTZDateTime(date: string, time: string, timeZone: string): string {
    // Build a Date object in UTC, then use Intl to find the offset in the target tz
    const dt = new Date(`${date}T${time}:00Z`);
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'longOffset',
        });
        const parts = formatter.formatToParts(dt);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        // offsetPart.value is like "GMT+05:30" or "GMT-08:00" or "GMT"
        let offset = offsetPart?.value?.replace('GMT', '') || '+00:00';
        if (offset === '') offset = '+00:00';
        return `${date}T${time}:00${offset}`;
    } catch {
        return `${date}T${time}:00+00:00`;
    }
}

export async function createCalendarEvent(
    tokenData: TokenData,
    event: {
        summary: string;
        description?: string;
        startDateTime: string;
        endDateTime: string;
        timeZone?: string;
        attendeeEmail?: string;
        status?: 'confirmed' | 'tentative';
    }
) {
    const auth = getAuthedClient(tokenData);
    const calendar = google.calendar({ version: 'v3', auth });

    const tz = event.timeZone || 'UTC';
    const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
            summary: event.summary,
            description: event.description,
            start: { dateTime: event.startDateTime, timeZone: tz },
            end: { dateTime: event.endDateTime, timeZone: tz },
            attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : [],
            reminders: { useDefault: true },
            status: event.status || 'confirmed',
        },
    });

    return res.data;
}

export async function updateCalendarEvent(
    tokenData: TokenData,
    eventId: string,
    updates: {
        status?: 'confirmed' | 'tentative' | 'cancelled';
        summary?: string;
        description?: string;
    }
) {
    const auth = getAuthedClient(tokenData);
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: updates,
    });

    return res.data;
}

export async function deleteCalendarEvent(
    tokenData: TokenData,
    eventId: string
) {
    const auth = getAuthedClient(tokenData);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
        calendarId: 'primary',
        eventId,
    });
}
