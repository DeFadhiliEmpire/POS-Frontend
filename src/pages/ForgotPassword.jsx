import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ShoppingCart } from "lucide-react";
import Field from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";
import SuperLogo from "../Assets/superMarket.jpg";

const LOCAL_API = "http://localhost:5000";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState({ type: "error", text: "" });
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setMsg({ type: "error", text: "Enter a valid email address." });
    setLoading(true);

    try {
      const res = await fetch(`${LOCAL_API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        return data.error;
      }

      setMsg({
        type: "success",
        text: "If the email belongs to an account, a reset link is on its way. Check your inbox.",
      });

      setEmail("");
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center p-3 sm:p-8 bg-[#f1f5f3]
                        bg-[radial-gradient(circle_at_15%_10%,#dff1e8,transparent_45%),radial-gradient(circle_at_90%_95%,#e3ebf5,transparent_45%)]"
    >
      <div
        className="w-full max-w-[850px] grid md:grid-cols-[42%_1fr] md:min-h-[560px] bg-white rounded-2xl md:rounded-[20px] overflow-hidden
                          shadow-[0_24px_60px_-20px_rgba(20,40,60,.35),0_2px_8px_rgba(20,40,60,.08)]"
      >
        {/* Brand panel */}
        <aside
          className="relative overflow-hidden text-white px-6 py-7 md:p-11 flex flex-col justify-center gap-3.5 md:gap-8"
          style={{
            background: `linear-gradient(rgba(10,18,28,0.7), rgba(10,18,28,0.8)), url(${SuperLogo})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.18),transparent_45%)]" />
          <div className="relative flex items-center gap-3 text-[24px] md:text-[32px] font-semibold tracking-tight">
            <ShoppingCart
              size={38}
              strokeWidth={1.5}
              className="text-[#2fd18f]"
            />
            FreshMart
          </div>
          <p className="relative text-[15px] opacity-90 -mt-2 md:-mt-5">
            Smart POS for a better tomorrow
          </p>
          <p className="relative hidden md:block text-[15px] leading-relaxed max-w-[240px] opacity-95">
            Manage your store, track sales, and serve your customers better.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-3 py-7 md:p-10">
          <section className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-slate-500 text-sm mt-2 mb-6">
              Enter the email linked to your account and we’ll send you a link
              to reset it.
            </p>

            <Alert type={msg.type}>{msg.text}</Alert>

            <form
              onSubmit={handlePasswordReset}
              className="grid gap-4"
              noValidate
            >
              <Field
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                aria-label="Email address"
                autoFocus
              />
              <Button type="submit" loading={loading}>
                Send reset link
              </Button>
            </form>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 mt-5 text-sm text-blue-700 text-semibold hover:underline"
            >
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}
