# Cancha | Courtside Spanish

A private Grade 11 Spanish tutor with short Raptors-themed drills, hints, and review across class topics. The **NBA en español** section brings in Spanish headlines from publisher RSS feeds, with a Toronto Raptors filter, publication dates, source links, and vocabulary to help with reading. Rumors are marked separately.

## Development

Use Node 24. Run `npm ci` and then `npm run dev`. For local testing, set `CANCHA_LOCAL_DATA` to a private scratch directory, `CANCHA_ORIGIN` to the browser’s local origin, and set the two secrets described below. The local file adapter is disabled on Vercel.

## Deployment

Deploy as a Next.js project with a dedicated **private** Vercel Blob store. On production, set `CANCHA_ORIGIN` to the site’s canonical HTTPS origin and `CANCHA_SESSION_KEY` to a high-entropy secret. Set `CANCHA_SETUP_HASH` to the SHA-256 hash (hex) of a one-time, random 24-byte base64url setup token. The first parent opens `/join#setup=TOKEN` and chooses a password. The parent dashboard can then issue a seven-day student invitation. Both sign-ins can add a class topic. Practice state is accessible through the student sign-in.

The news section refreshes its cached publisher feeds on demand, with a 15-minute refresh interval. It uses feed headlines and published times rather than generated reports. No API key is needed for the news feeds.
