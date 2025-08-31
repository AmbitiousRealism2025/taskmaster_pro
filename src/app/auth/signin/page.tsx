import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In - TaskMaster Pro',
  description: 'Sign in to your TaskMaster Pro account'
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            TaskMaster Pro
          </h1>
          <p className="text-muted-foreground mt-2">
            Your productivity companion
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}