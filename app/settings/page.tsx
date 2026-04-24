'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'

const VR = {
  bg: '#EBF0E5', surface: '#DDE5D5', card: '#FFFFFF',
  border: '#C4D0B8', text: '#161D14', muted: '#627056',
  accent: '#2D6A3F', accentMuted: '#D0E8D8', rejected: '#A0302A',
  display: "'Cinzel','Times New Roman',serif",
  body: "'Spectral','Georgia',serif",
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%',
  padding: '13px 16px',
  border: `1.5px solid ${VR.border}`,
  borderRadius: 10, fontSize: 14,
  color: VR.text, background: VR.card,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: VR.body, transition: 'border-color 0.15s',
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 16px' }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: VR.display, color: VR.muted, whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: VR.border }} />
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [userId, setUserId]     = useState('')

  const [fullName, setFullName]             = useState('')
  const [username, setUsername]             = useState('')
  const [bio, setBio]                       = useState('')
  const [location, setLocation]             = useState('')
  const [becoming, setBecoming]             = useState('')
  const [profilePublic, setProfilePublic]   = useState(true)
  const [councilOpen, setCouncilOpen]       = useState(true)
  const [emailNotifs, setEmailNotifs]       = useState(true)
  const [usernameError, setUsernameError]   = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name || '')
        setUsername(data.username || '')
        setBio(data.bio || '')
        setLocation(data.location || '')
        setBecoming(data.becoming_statement || '')
        setProfilePublic(data.profile_public ?? true)
        setCouncilOpen(data.council_requests_open ?? true)
        setEmailNotifs(data.email_notifications ?? true)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true); setUsernameError('')

    if (username.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setSaving(false); return
    }

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).neq('id', userId).single()
    if (existing) { setUsernameError('That username is already taken'); setSaving(false); return }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      username: username.toLowerCase().trim(),
      bio: bio.trim() || null,
      location: location.trim() || null,
      becoming_statement: becoming.trim(),
      profile_public: profilePublic,
      council_requests_open: councilOpen,
      email_notifications: emailNotifs,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100svh', background: VR.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${VR.border}`, borderTopColor: VR.accent, animation: 'spin .85s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  const toggles = [
    { label: 'Public profile', desc: 'Anyone can view your build at /u/username', value: profilePublic, onChange: setProfilePublic },
    { label: 'Open Council requests', desc: 'Allow people to request a seat on your Council', value: councilOpen, onChange: setCouncilOpen },
    { label: 'Email notifications', desc: 'Get notified when your Council reviews submissions', value: emailNotifs, onChange: setEmailNotifs },
  ]

  return (
    <main style={{ minHeight: '100svh', background: VR.bg, padding: '0 20px 80px', fontFamily: VR.body }}>
      <div style={{ maxWidth: 440, margin: '0 auto', paddingTop: 'calc(env(safe-area-inset-top,0px) + 20px)' }}>

        <PageHeader title="Settings" backHref="/dashboard" />

        {/* Profile */}
        <SectionLabel>Profile</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = VR.border }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: VR.accent, fontFamily: VR.display, fontSize: 14 }}>@</span>
              <input
                type="text"
                value={username}
                onChange={e => { setUsernameError(''); setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()) }}
                maxLength={20}
                placeholder="yourname"
                style={{ ...inputStyle, paddingLeft: 32, borderColor: usernameError ? VR.rejected : VR.border, fontFamily: "'JetBrains Mono','Courier New',monospace" }}
                onFocus={e => { e.currentTarget.style.borderColor = usernameError ? VR.rejected : VR.accent }}
                onBlur={e => { e.currentTarget.style.borderColor = usernameError ? VR.rejected : VR.border }}
              />
            </div>
            {usernameError && <p style={{ fontSize: 12, color: VR.rejected, marginTop: 6 }}>{usernameError}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Becoming statement</label>
            <textarea value={becoming} onChange={e => setBecoming(e.target.value)} placeholder="I am becoming someone who..." rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = VR.border }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontSize: 11 }}>(optional)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A little about you..." rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = VR.border }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, fontFamily: VR.display, letterSpacing: '0.1em', textTransform: 'uppercase', color: VR.muted, marginBottom: 7 }}>Location <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', fontSize: 11 }}>(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = VR.accent }} onBlur={e => { e.currentTarget.style.borderColor = VR.border }} />
          </div>
        </div>

        {/* Privacy */}
        <SectionLabel>Privacy</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {toggles.map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              padding: '14px 16px', background: VR.card, border: `1px solid ${VR.border}`, borderRadius: 12,
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: VR.text, marginBottom: 2 }}>{item.label}</p>
                <p style={{ fontSize: 11, color: VR.muted, fontStyle: 'italic' }}>{item.desc}</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => item.onChange(!item.value)}
                style={{
                  flexShrink: 0, width: 44, height: 24, borderRadius: 12,
                  background: item.value ? VR.accent : VR.surface,
                  border: `1px solid ${item.value ? VR.accent : VR.border}`,
                  position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                  background: '#FFFFFF',
                  left: item.value ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 20px',
            background: saved ? VR.accent : VR.accent,
            color: '#FFFFFF', border: 'none', borderRadius: 12,
            fontSize: 12, fontWeight: 700, fontFamily: VR.display,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            marginBottom: 24,
            boxShadow: `0 2px 12px ${VR.accent}30`,
          }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
          style={{
            width: '100%', padding: '13px 20px',
            background: 'transparent', color: VR.rejected,
            border: `1px solid #E0B0B0`,
            borderRadius: 12, fontSize: 12, fontWeight: 700,
            fontFamily: VR.display, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
          Sign Out
        </button>

      </div>
    </main>
  )
}
