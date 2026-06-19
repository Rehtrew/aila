# Aila — Feature Build-out Design

**Date:** 2026-06-10
**Status:** Approved by delegation (user granted full decision authority; "adjust later")

## Goal

Turn the working login + profile screen into a real, Apple-feeling parent app for
Aula. Simple, beautiful, easy. First features: **Dashboard**, **Presence** (renamed
from "Komme/gå"), **Messages**, **Gallery**. Must handle families with multiple kids
gracefully even though the primary user currently has one child.

## Key decisions

### Information architecture — multi-child model
Chosen: **Hybrid (Concept C)**. Dashboard gives an at-a-glance overview with a
compact chip per child; drilling into a feature focuses one child. The activity
**feed is combined across all children**, each item tagged with the child/context it
belongs to (per user preference). Scales 1 → many kids with no redesign; a
single-child family simply sees one chip and no switching chrome.

### Navigation
Bottom tab bar (iOS-native feel), 4 tabs:
- **Hjem** (dashboard)
- **Fremmøde** (presence — the renamed "Komme/gå"; covers attendance + pickup)
- **Beskeder** (messages)
- **Galleri** (gallery)

Detail screens (message thread, photo album) are pushed on a stack above the tabs.

> Name choice: "Komme/gå" → **Fremmøde** (Danish for attendance/presence). Warm
> enough, clear, works for both daycare and school. Easy to change later.

### Visual language
- Large bold titles, generous whitespace, rounded cards, subtle shadows, friendly
  tone — drawn from the two reference screenshots.
- iOS system palette: blue tint `#007AFF`, semantic green/orange/red, grouped-bg
  `#F2F2F7`. System font (SF Pro via `-apple-system`).
- **Per-child color coding**: each child gets a stable accent color (by index),
  reused across chips, feed tags, and avatars — the multi-child wayfinding cue.

### Quick actions (dashboard)
Meld syg · Hold fri · Beskeder · Galleri. The first two are **write** actions
against the live school system (see safety note).

## Architecture

- `src/theme/` — design tokens + per-child color assignment.
- `src/components/ui/` — reusable primitives: Screen, Card, Avatar, SectionHeader,
  ListRow, Tag, QuickAction, ChildChip, StatusPill, Skeleton, ErrorState.
- `src/lib/aula-api.ts` — extended with presence/messaging/gallery **reads**.
- `src/lib/aula-types.ts` — response types for the above.
- `src/app/(app)/(tabs)/` — tab screens; `src/app/(app)/besked/[id].tsx`,
  `album/[id].tsx` — detail screens.

## Data sources (all confirmed-reliable GET reads, token-auth)

From the two reference Python clients, verified against API v23:
- `presence.getDailyOverview&childIds[]=…` — per-child daily attendance/pickup.
- `messaging.getThreads&sortOn=date&orderDirection=desc&page=0` — message threads.
- `messaging.getMessagesForThread&threadId=…&page=0` — thread messages.
- `gallery.getAlbums&institutionProfileIds=…&page=0` — albums.
- `gallery.getAlbum&id=…` — album media.

Combined dashboard feed = recent message threads + recent albums, merged by date.
(Posts/"opslag" and calendar use methods not in our references — calendar needs a
CSRF cookie we don't have under token auth — so they're deferred until we capture
the exact requests from the official app.)

## Write actions — safety note

Reporting a child sick / on vacation / setting pickup writes to a **live school
system**. The exact `presence.*` write method signatures are **not** in our
references, and guessing could send bad data to the institution. So: the write
**UI/flows are built**, but the actual network send is **guarded** (disabled, shows
a clear "needs verification" state) until we capture the real request from the
official app. Reads are fully wired.

## Out of scope (this pass)
Posts feed, calendar, contacts, gallery upload, message compose/reply, push
notifications, the standalone release build.
