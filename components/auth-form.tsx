"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Phone } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

const inputCls =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get("email"))
    const password = String(f.get("password"))
    setError(null)
    setLoading(true)
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name: String(f.get("name")) })
      : await authClient.signIn.email({ email, password })
    setLoading(false)
    if (error) {
      setError(isSignUp ? "No se pudo crear la cuenta. Revisa los datos." : "Email o contraseña incorrectos.")
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="mb-6 flex flex-col gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Phone className="size-5" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{isSignUp ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Empieza a analizar tus llamadas de RingCentral." : "Inicia sesión en AI Sales Coach."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <label className="flex flex-col gap-2 text-sm">
              Nombre
              <input name="name" required autoComplete="name" className={inputCls} />
            </label>
          )}
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className={inputCls} />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className={inputCls}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Un momento…" : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-medium text-foreground hover:underline">
            {isSignUp ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
      </div>
    </main>
  )
}
