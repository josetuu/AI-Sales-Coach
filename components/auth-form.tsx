'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/brand-mark'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name: String(form.get('name')) })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError(isSignUp ? 'No se pudo crear la cuenta. Revisa los datos.' : 'Correo o contraseña incorrectos.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col gap-6">
        <BrandMark />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {isSignUp ? 'Crea tu cuenta de agente' : 'Bienvenido de vuelta'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? 'Conecta tu hoja de leads y empieza a marcar en minutos.'
              : 'Entra para continuar con tu cola de llamadas.'}
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required autoComplete="name" placeholder="Ana García" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="ana@empresa.com" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="mt-2 h-10">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {isSignUp ? 'Crear cuenta' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? '¿Ya tienes cuenta? ' : '¿Nuevo en Pulse? '}
        <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="font-medium text-foreground underline-offset-4 hover:underline">
          {isSignUp ? 'Inicia sesión' : 'Crea una cuenta'}
        </Link>
      </p>
    </div>
  )
}
