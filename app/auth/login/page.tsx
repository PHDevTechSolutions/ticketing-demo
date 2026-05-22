import { LoginForm } from "@/components/auth-forms/login-form"

export default function LoginPage() {
  return (
    <div className="bg-[#000000] flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
