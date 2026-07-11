import { redirect } from 'next/navigation'
import { loadDraft } from './actions'

export default async function NewCommunityIndex() {
  const draft = await loadDraft()
  const step = draft?.current_step ?? 'konum'
  redirect(`/community/new/${step}`)
}
