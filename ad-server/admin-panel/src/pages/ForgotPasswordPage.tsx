import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError("");
      await api.post("/auth/forgot-password", { email: data.email });
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <main
        role="main"
        className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md"
        aria-labelledby="forgot-heading"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 id="forgot-heading" className="text-2xl md:text-3xl font-bold text-gray-900">
            Forgot password?
          </h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base leading-relaxed">
            {submitted
              ? "Follow the link we sent you to choose a new password."
              : "Enter your account email and we’ll send you a secure link to reset your password."}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                If an account exists for that address, we sent password reset instructions. The link expires in{" "}
                <strong>1 hour</strong>.
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Didn’t get it? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder, or try again with
                a different email.
              </p>
            </div>

            <details className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-950">
              <summary className="cursor-pointer font-semibold text-amber-900">
                Not receiving the email? (common causes)
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-amber-900/90">
                <li>
                  <strong>Wrong email:</strong> Use the <em>exact</em> address of your Ad Manager account (the one you
                  sign in with). If that address isn’t in our database, we don’t send mail — but we still show this
                  screen for security.
                </li>
                <li>
                  <strong>Server email not set up:</strong> The hosting backend must have{" "}
                  <strong>Resend</strong> or <strong>SMTP</strong> configured (e.g. in Railway variables). Until then,
                  nothing is delivered to Gmail — the reset link may only appear in server logs.
                </li>
                <li>
                  <strong>Gmail:</strong> Use an <strong>App Password</strong> if you choose SMTP with Google — not your
                  normal login password.
                </li>
              </ul>
              <p className="mt-3 text-xs text-amber-800/90">
                Operators: see <code className="rounded bg-amber-100 px-1">ad-server/docs/PASSWORD_RESET_EMAIL.md</code>{" "}
                in the repo for Resend, Gmail SMTP, and Railway steps.
              </p>
            </details>

            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-lg bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  id="email"
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
