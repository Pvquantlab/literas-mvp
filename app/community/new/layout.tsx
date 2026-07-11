import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadDraft } from './actions'
import { WizardProvider } from './wizard-context'
import WizardShell from './wizard-shell'

export const metadata = {
  title: 'Topluluk kur — literaslab',
  description: 'Adım adım kendi topluluğunu oluştur.',
}

export default async function NewCommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/community/new')
  }

  const draft = await loadDraft()
  const initialDraft = draft?.data ?? {}
  const initialStep = draft?.current_step ?? 'konum'

  return (
    <WizardProvider initialDraft={initialDraft} initialStep={initialStep}>
      <WizardShell>{children}</WizardShell>
    </WizardProvider>
  )
}
