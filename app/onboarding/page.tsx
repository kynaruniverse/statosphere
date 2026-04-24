'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', gold: '#6B8C3A',
  rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

type StatCategory = { id: string; name: string; icon: string; description: string | null }

const TOTAL_STEPS = 4

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 16px',
  border: `1.5px solid ${VR.border}`, borderRadius: 10,
  fontSize: 14, color: VR.text, background: VR.card,
  outline: 'none', boxSizing: 'border-box', fontFamily: VR.body,
  transition: 'border-color 0.15s',
}

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep]               = useState(1)
  const [userId, setUserId]           = useState('')
  const [categories, setCategories]   = useState<StatCategory[]>([])
  const [loading, setLoading]         = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  // Step fields
  const [fullName, setFullName]         = useState('')
  const [username, setUsername]         = useState('')
  const [becoming, setBecoming]         = useState('')
  const [selectedStats, setSelected]   = useState<string[]>([])
  const [councilOpen, setCouncilOpen]   = useState(true)
  const [profilePublic, setProfilePublic] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('onboarding_complete').eq('id', user.id).single()
      if (profile?.onboarding_complete) { router.replace('/dashboard'); return }

      const { data: cats } = await supabase.from('stat_categories').select('*').order('name')
      if (cats) setCategories(cats)
      setPageLoading(false)
    }
    load()
  }, [router])

  const toggleStat = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : prev.length < 5 ? [...prev, id] : prev
    )
  }

  const validateStep = () => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!fullName.trim())   e.fullName = 'Please enter your name'
      if (username.trim().length < 3) e.username = 'Username must be at least 3 characters'
      if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Letters, numbers and underscores only'
    }
    if (step === 2 && !becoming.trim()) e.becoming = 'Please complete your becoming statement'
    if (step === 3 && selectedStats.length === 0) e.stats = 'Choose at least one stat to train'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = async () => {
    if (!validateStep()) return

    if (step === 1) {
      // Check username uniqueness
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).neq('id', userId).single()
      if (existing) { setErrors({ username: 'That username is already taken' }); return }
    }

    if (step < TOTAL_STEPS) { setStep(s => s + 1); return }

    // Final submit
    setLoading(true)

    await supabase.from('profiles').update({
      full_name: fullName.trim(),
      username: username.toLowerCase().trim(),
      becoming_statement: becoming.trim(),
      council_requests_open: councilOpen,
      profile_public: profilePublic,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    // Create user_stats rows
    const statRows = selectedStats.map(id => ({
      user_id: userId,
      stat_category_id: id,
      current_value: 0,
    }))
    await supabase.from('user_stats').insert(statRows)

    // Create council
    const { data: council } = await supabase
      .from('councils').insert({ owner_id: userId }).select('id').single()

    setLoading(false)
    router.replace('/dashboard')
  }

  const progress = (step / TOTAL_STEPS) * 100

  const stepMeta = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Mission' },
    { num: 3, label: 'Stats' },
    { num: 4, label: 'Privacy' },
  ]

  if (pageLoading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  return (
    <main style={{
      minHeight: '100svh', background: VR.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', fontFamily: VR.body,
    }}>
      {/* Ambient */}
      <div style={{ position: 'fixed', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(45,106,63,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(107,140,58,0.07)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 390, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `linear-gradient(135deg, ${VR.accent}, ${VR.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: VR.display, fontWeight: 900, fontSize: 15, color: '#FFFFFF',
          }}>S</div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted }}>Statosphere</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {stepMeta.map(s => (
              <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: step >= s.num ? VR.accent : VR.surface,
                  border: `1.5px solid ${step >= s.num ? VR.accent : VR.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: VR.display,
                  color: step >= s.num ? '#FFFFFF' : VR.muted,
                  transition: 'all 0.2s',
                }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: VR.display, color: step === s.num ? VR.accent : VR.muted }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: VR.surface, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${VR.accent}, ${VR.gold})`, borderRadius: 2, transition: 'width 0.35s ease' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: VR.card, border: `1px solid ${VR.border}`,
          borderRadius: 20, padding: '26px 24px',
          boxShadow: '0 4px 32px rgba(22,29,20,0.09)',
        }}>

          {/* ── STEP 1: Identity ── */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 6 }}>Step 1</p>
              <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: VR.display, color: VR.text, marginBottom: 6, letterSpacing: '0.02em' }}>Who are you?</h2>
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginBottom: 22, lineHeight: 1.55 }}>Your name and username are how your Council and others will know you.</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Full name</label>
                <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors({}) }} placeholder="Your full name" style={{ ...inputStyle, borderColor: errors.fullName ? VR.rejected : VR.border }} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = errors.fullName ? VR.rejected : VR.border }} />
                {errors.fullName && <p style={{ fontSize: 12, color: VR.rejected, marginTop: 5 }}>{errors.fullName}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: VR.accent, fontFamily: VR.display, fontSize: 14 }}>@</span>
                  <input type="text" value={username} onChange={e => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()); setErrors({}) }} maxLength={20} placeholder="yourname" style={{ ...inputStyle, paddingLeft: 32, borderColor: errors.username ? VR.rejected : VR.border, fontFamily: "'JetBrains Mono','Courier New',monospace" }} onFocus={e => { e.currentTarget.style.borderColor = errors.username ? VR.rejected : VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = errors.username ? VR.rejected : VR.border }} />
                </div>
                {errors.username && <p style={{ fontSize: 12, color: VR.rejected, marginTop: 5 }}>{errors.username}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2: Becoming ── */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 6 }}>Step 2</p>
              <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: VR.display, color: VR.text, marginBottom: 6, letterSpacing: '0.02em' }}>What are you becoming?</h2>
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginBottom: 22, lineHeight: 1.55 }}>
                This becomes the headline of your build. Write it as if it's already true.
              </p>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>I am becoming...</label>
              <textarea
                value={becoming}
                onChange={e => { setBecoming(e.target.value); setErrors({}) }}
                placeholder="e.g. a person who shows up every day, no matter what"
                rows={4}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6, borderColor: errors.becoming ? VR.rejected : VR.border }}
                onFocus={e => { e.currentTarget.style.borderColor = VR.accent }}
                onBlur={e => { e.currentTarget.style.borderColor = errors.becoming ? VR.rejected : VR.border }}
              />
              {errors.becoming && <p style={{ fontSize: 12, color: VR.rejected, marginTop: 5 }}>{errors.becoming}</p>}
            </div>
          )}

          {/* ── STEP 3: Stats ── */}
          {step === 3 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 6 }}>Step 3</p>
              <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: VR.display, color: VR.text, marginBottom: 6, letterSpacing: '0.02em' }}>Choose your stats.</h2>
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginBottom: 4, lineHeight: 1.55 }}>
                Pick up to 5 areas you want your Council to hold you accountable in.
              </p>
              <p style={{ fontSize: 11, color: VR.accent, fontFamily: VR.display, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 18 }}>
                {selectedStats.length} / 5 selected
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {categories.map(cat => {
                  const sel = selectedStats.includes(cat.id)
                  const maxed = selectedStats.length >= 5 && !sel
                  return (
                    <button
                      key={cat.id}
                      onClick={() => !maxed && toggleStat(cat.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                        border: `1.5px solid ${sel ? VR.accent : VR.border}`,
                        background: sel ? VR.accentMuted : VR.surface,
                        cursor: maxed ? 'not-allowed' : 'pointer',
                        opacity: maxed ? 0.4 : 1,
                        transition: 'all 0.15s', fontFamily: VR.body,
                      }}>
                      <p style={{ fontSize: 18, marginBottom: 5 }}>{cat.icon}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.04em', color: sel ? VR.accent : VR.text, marginBottom: cat.description ? 3 : 0 }}>{cat.name}</p>
                      {cat.description && <p style={{ fontSize: 10, color: VR.muted, lineHeight: 1.4 }}>{cat.description}</p>}
                    </button>
                  )
                })}
              </div>

              {errors.stats && <p style={{ fontSize: 12, color: VR.rejected, marginTop: 12 }}>{errors.stats}</p>}
            </div>
          )}

          {/* ── STEP 4: Privacy ── */}
          {step === 4 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.accent, marginBottom: 6 }}>Step 4</p>
              <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: VR.display, color: VR.text, marginBottom: 6, letterSpacing: '0.02em' }}>Last things.</h2>
              <p style={{ fontSize: 13, color: VR.muted, fontStyle: 'italic', marginBottom: 22, lineHeight: 1.55 }}>
                You can change these any time in Settings.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Public profile', desc: 'Others can find and view your build page', value: profilePublic, set: setProfilePublic },
                  { label: 'Open council requests', desc: 'People can request a seat on your council', value: councilOpen, set: setCouncilOpen },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    padding: '14px 16px', background: VR.surface, border: `1px solid ${VR.border}`, borderRadius: 12,
                  }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: VR.text, marginBottom: 2, fontFamily: VR.display, letterSpacing: '0.02em' }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.set(!item.value)}
                      style={{
                        flexShrink: 0, width: 44, height: 24, borderRadius: 12,
                        background: item.value ? VR.accent : VR.card,
                        border: `1px solid ${item.value ? VR.accent : VR.border}`,
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <div style={{
                        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                        background: '#FFFFFF', left: item.value ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1, padding: '13px', background: VR.surface, color: VR.muted,
                  border: `1px solid ${VR.border}`, borderRadius: 10,
                  fontSize: 12, fontWeight: 700, fontFamily: VR.display,
                  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}>
                ← Back
              </button>
            )}
            <button
              onClick={next}
              disabled={loading}
              style={{
                flex: 2, padding: '13px',
                background: VR.accent, color: '#FFFFFF',
                border: 'none', borderRadius: 10,
                fontSize: 12, fontWeight: 700, fontFamily: VR.display,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: `0 2px 12px ${VR.accent}25`,
              }}>
              {loading ? 'Setting up...' : step === TOTAL_STEPS ? 'Begin your build →' : 'Continue →'}
            </button>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )
}
