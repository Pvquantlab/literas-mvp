import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ReportsList from './reports-list'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  // Tüm raporları çek, en yeni önce
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      description,
      status,
      created_at,
      reviewed_at,
      reviewed_by,
      admin_note,
      reporter:profiles!reporter_id(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--coral-deep)',
          fontSize: '13px',
          marginBottom: '8px',
          letterSpacing: '0.05em',
        }}>
          Admin · Raporlar
        </p>
        <h1 className="serif" style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: 'var(--ink)',
          margin: 0,
        }}>
          Bekleyen raporlar
        </h1>
      </div>

      <ReportsList reports={reports ?? []} />
    </main>
  )
}
