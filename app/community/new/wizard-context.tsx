'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { DraftData, WizardStep } from './actions'

type WizardContextValue = {
  draft: DraftData
  currentStep: WizardStep
  update: (patch: Partial<DraftData>) => void
  isSaving: boolean
  setSaving: (v: boolean) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({
  children,
  initialDraft,
  initialStep,
}: {
  children: ReactNode
  initialDraft: DraftData
  initialStep: WizardStep
}) {
  const [draft, setDraft] = useState<DraftData>(initialDraft)
  const [currentStep] = useState<WizardStep>(initialStep)
  const [isSaving, setSaving] = useState(false)

  const update = useCallback((patch: Partial<DraftData>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  return (
    <WizardContext.Provider
      value={{ draft, currentStep, update, isSaving, setSaving }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) {
    throw new Error('useWizard must be used inside WizardProvider')
  }
  return ctx
}

export const STEPS: { key: WizardStep; label: string; path: string }[] = [
  { key: 'konum',    label: 'Konum',       path: '/community/new/konum' },
  { key: 'konular',  label: 'Konular',     path: '/community/new/konular' },
  { key: 'ad',       label: 'Ad',          path: '/community/new/ad' },
  { key: 'aciklama', label: 'Açıklama',    path: '/community/new/aciklama' },
  { key: 'gonder',   label: 'Gönder',      path: '/community/new/gonder' },
]

export function getStepIndex(step: WizardStep): number {
  return STEPS.findIndex((s) => s.key === step)
}
