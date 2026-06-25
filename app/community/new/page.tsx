import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import NewCommunityForm from './new-community-form'

export default async function NewCommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="container">
      <div className="form-page">
        <p className="catalog-number">No. yeni</p>
        <h1 className="form-title">Bir topluluk kur</h1>
        <p className="form-subtitle">
          Bir araya gelmek için bir bahane yeter. Topluluğunu kur,
          insanlar etrafında toplansın.
        </p>

        <NewCommunityForm />
      </div>
    </main>
  )
}