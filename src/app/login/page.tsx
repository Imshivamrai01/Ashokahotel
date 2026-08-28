"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput } from "@/lib/validations";
import { ROLE_REDIRECTS } from "@/lib/auth-constants";
import type { UserRole } from "@/types";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminFormField } from "@/components/admin/AdminFormField";

function errorMessage(raw: string): string {
  if (raw.includes("account_inactive"))
    return "Your account has been deactivated. Please contact your manager.";
  if (raw.includes("invalid_credentials"))
    return "Incorrect email or password. Please try again.";
  return "Sign-in failed. Please try again.";
}


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const loginWith = async (email: string, password: string) => {
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      role: "",
      redirect: false,
    });

    if (result?.error) {
      setError(errorMessage(result.error));
      setShakeKey((k) => k + 1);
      return false;
    }

    // Fetch session to get role for redirect
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role as UserRole | undefined;

    if (callbackUrl) {
      router.push(callbackUrl);
    } else if (role && ROLE_REDIRECTS[role]) {
      router.push(ROLE_REDIRECTS[role]);
    } else {
      router.push("/admin/dashboard");
    }
    return true;
  };

  const onSubmit = async (data: LoginInput) => {
    await loginWith(data.email, data.password);
  };


  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4 overflow-hidden text-amber-500">
            <span className="font-playfair font-black text-2xl">AH</span>
          </div>
          <h1 className="font-playfair text-2xl font-bold text-base-content">
            Ashoka Hotel
          </h1>
          <p className="text-base-content/50 text-sm mt-1">Management & Operations Portal</p>
        </div>

        {/* Card */}
        <div className="card bg-base-200 shadow-xl border border-base-300">
          <div className="card-body gap-5">
            <h2 className="card-title text-lg">Sign In</h2>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              key={shakeKey}
              onSubmit={handleSubmit(onSubmit)}
              className={`flex flex-col gap-4 ${error ? "animate-shake" : ""}`}
            >
              <AdminFormField label="Email" error={errors.email?.message}>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="admin@ashoka.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className={
                    error
                      ? "border-destructive/60 focus-visible:ring-destructive/30"
                      : ""
                  }
                />
              </AdminFormField>

              <AdminFormField label="Password" error={errors.password?.message}>
                <div className="relative">
                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className={`pr-10 ${error ? "border-destructive/60 focus-visible:ring-destructive/30" : ""}`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </AdminFormField>

              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-base-content/60 hover:text-base-content transition-colors">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={false}
                  />
                  <div className="w-5 h-5 rounded-full border-2 border-base-content/30 peer-checked:bg-[#f97316] peer-checked:border-[#f97316] transition-colors"></div>
                  <svg 
                    className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Remember me on this device
              </label>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

          </div>
        </div>

        <p className="text-center text-xs text-base-content/30 mt-6">
          Ashoka Hotel © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
