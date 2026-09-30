import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { AuthShell } from '@/components/auth-shell'
import { getSessionUser } from '@/lib/session'

export default async function SignUpPage() {
  if (await getSessionUser()) redirect('/dashboard')
  return (
    <AuthShell>
      <AuthForm mode="sign-up" />
    </AuthShell>
  )
}
