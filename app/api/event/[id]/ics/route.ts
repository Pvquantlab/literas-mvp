import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// ICS için tarih formatı: 20260714T193000Z (UTC)
function toIcsDate(iso: string): string {
  const d = new Date(iso)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const mins = String(d.getUTCMinutes()).padStart(2, '0')
  const secs = String(d.getUTCSeconds()).padStart(2, '0')
  return year + month + day + 'T' + hours + mins + secs + 'Z'
}

// ICS icin metin escape: virgul, noktali virgul, backslash, yeni satir
function escapeIcs(str: string): string {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('title, description, location, event_date, community:communities(name)')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const start = new Date(event.event_date)
  // Etkinlik süresi bilinmiyor, varsayılan 2 saat
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const communityName = (event.community as any)?.name || 'literaslab'
  const summary = escapeIcs(event.title)
  const description = escapeIcs(
    (event.description || '') +
    (event.description ? '\n\n' : '') +
    'Topluluk: ' + communityName + '\n' +
    'literaslab.com/event/' + id
  )
  const location = escapeIcs(event.location)
  const uid = id + '@literaslab.com'
  const now = toIcsDate(new Date().toISOString())

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//literaslab//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + now,
    'DTSTART:' + toIcsDate(start.toISOString()),
    'DTEND:' + toIcsDate(end.toISOString()),
    'SUMMARY:' + summary,
    'DESCRIPTION:' + description,
    'LOCATION:' + location,
    'URL:https://www.literaslab.com/event/' + id,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  // Dosya adı için başlığı sadeleştir
  const safeFilename = event.title
    .replace(/[^a-zA-Z0-9\u00c0-\u017f]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + safeFilename + '.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
