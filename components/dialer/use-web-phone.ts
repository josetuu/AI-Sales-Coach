'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type WebPhone from 'ringcentral-web-phone'
import type { SipInfo } from 'ringcentral-web-phone/types'
import { apiSend } from '@/lib/api-client'

type OutboundSession = Awaited<ReturnType<WebPhone['call']>>

export type BrowserCallHandlers = {
  onRinging: () => void
  onAnswered: () => void
  onEnded: (status: string) => void
}

function statusFromFailure(reason: string | null) {
  if (!reason) return 'NoAnsweredCall'
  if (/\b(486|600|603)\b/.test(reason)) return 'Busy'
  if (/\b(404|484|604)\b/.test(reason)) return 'CannotReach'
  if (/\b(408|480|487)\b/.test(reason)) return 'NoAnsweredCall'
  return 'Error'
}

export function useWebPhone() {
  const phoneRef = useRef<WebPhone | null>(null)
  const startingRef = useRef<Promise<WebPhone> | null>(null)
  const sessionRef = useRef<OutboundSession | null>(null)
  const userEndedRef = useRef(false)
  const [muted, setMuted] = useState(false)

  const ensurePhone = useCallback(() => {
    if (phoneRef.current) return Promise.resolve(phoneRef.current)
    startingRef.current ??= (async () => {
      const { sipInfo } = await apiSend<{ sipInfo: SipInfo }>('/api/ringcentral/sip-provision', 'POST')
      const { default: WebPhoneSDK } = await import('ringcentral-web-phone')
      const phone = new WebPhoneSDK({ sipInfo })
      await phone.start()
      phoneRef.current = phone
      return phone
    })().catch((error) => {
      startingRef.current = null
      throw error
    })
    return startingRef.current
  }, [])

  const call = useCallback(
    async (to: string, handlers: BrowserCallHandlers) => {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
        mic.getTracks().forEach((t) => t.stop())
      } catch {
        throw new Error('Permite el acceso al micrófono para llamar desde el navegador')
      }

      const phone = await ensurePhone()
      const session = await phone.call(to)
      sessionRef.current = session
      userEndedRef.current = false
      setMuted(false)

      let answered = false
      let failure: string | null = null
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        if (sessionRef.current === session) sessionRef.current = null
        const status = answered ? 'Success' : userEndedRef.current ? 'Cancelled' : statusFromFailure(failure)
        handlers.onEnded(status)
      }

      session.once('ringing', handlers.onRinging)
      session.once('answered', () => {
        answered = true
        handlers.onAnswered()
      })
      session.once('failed', (reason: unknown) => {
        failure = typeof reason === 'string' ? reason : String(reason ?? '')
        finish()
      })
      session.once('disposed', finish)

      if (session.state === 'ringing') handlers.onRinging()
      if (session.state === 'answered') {
        answered = true
        handlers.onAnswered()
      }
    },
    [ensurePhone],
  )

  const hangup = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    userEndedRef.current = true
    if (session.state === 'answered') await session.hangup()
    else await session.cancel()
  }, [])

  const toggleMute = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    setMuted((m) => {
      if (m) session.unmute()
      else session.mute()
      return !m
    })
  }, [])

  useEffect(() => {
    return () => {
      phoneRef.current?.dispose()
      phoneRef.current = null
      startingRef.current = null
    }
  }, [])

  return { call, hangup, toggleMute, muted, warmUp: ensurePhone }
}
