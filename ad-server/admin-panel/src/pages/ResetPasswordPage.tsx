import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../lib/api";

const resetSchema = z
  .object({
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don’t match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError("This link is missing the reset token. Open the link from your email.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await api.post("/auth/reset-password", {
        token,
        new_password: data.newPassword,
      });
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(
        typeof e.response?.data?.detail === "string"
          ? e.response.data.detail
          : "Could not reset password. Request a new link."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const missingToken = !token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create new password</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            Choose a strong password you haven’t used elsewhere.
          </p>
        </div>

        {missingToken ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
            <p className="font-medium">Invalid or incomplete link</p>
            <p className="mt-1 text-amber-800">
              Open the reset link from your email, or request a new one below.
            </p>
          </div>
        ) : null}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <div className="relative">
              <input
                {...register("newPassword")}
                type={showPw ? "text" : "password"}
                id="newPassword"
                autoComplete="new-password"
                disabled={isLoading || missingToken}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-50"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPw ? (
                  <span className="text-xs font-medium">Hide</span>
                ) : (
                  <span className="text-xs font-medium">Show</span>
                )}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm new password
            </label>
            <div className="relative">
              <input
                {...register("confirmPassword")}
                type={showPw2 ? "text" : "password"}
                id="confirmPassword"
                autoComplete="new-password"
                disabled={isLoading || missingToken}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-50"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowPw2(!showPw2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPw2 ? (
                  <span className="text-xs font-medium">Hide</span>
                ) : (
                  <span className="text-xs font-medium">Show</span>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || missingToken}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-3 text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
            Request a new reset link
          </Link>
          <Link to="/login" className="text-gray-600 hover:text-gray-900">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
