import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { PasswordField } from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";
import SuperLogo from "../Assets/superMarket.jpg";

const LOCAL_API = "http://localhost:5000";

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState({ type: "error", text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      const timer = setTimeout(() => {
        setMsg({
          type: "error",
          text: "This reset link is missing its token. Request a new one.",
        });
      }, 0); // defer to next tick
      return () => clearTimeout(timer);
    }
  }, [token]);

  const s = strength(password);
  const barColor =
    s <= 2 ? "bg-red-600" : s <= 3 ? "bg-yellow-500" : "bg-green-500";

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!token)
      return setMsg({
        type: "error",
        text: "This reset link is invalid. Request a new one.",
      });

    if (
      password.length < 8 ||
      !/\d/.test(password) ||
      !/[A-Za-z]/.test(password)
    )
      return setMsg({
        type: "error",
        text: "Use at least 8 characters with a letter and a number.",
      });

    if (password !== confirmPassword)
      return setMsg({ type: "error", text: "The passwords don’t match." });
    setLoading(true);
    try {
      const res = await fetch(
        `${LOCAL_API}/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmPassword }),
        },
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMsg({
          type: "error",
          text: data.message || "unable to reset your password.",
        });
        return;
      }

      setMsg({
        type: "success",
        text: "Password updated. Taking you to sign in…",
      });
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      setMsg({
        type: "error",
        text: error || "Unable to contact the server. Please try again",
      });
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
          <section className="w-full max-w-[420px]">
            <h1 className="text-2xl font-bold tracking-tight">
              Set a new password
            </h1>
            <p className="text-slate-500 text-[14.5px] mt-2 mb-6">
              Choose a strong password for your FreshMart account.
            </p>
            <Alert type={msg.type}>{msg.text}</Alert>
            <form
              onSubmit={handlePasswordChange}
              className="grid gap-4"
              noValidate
            >
              <div>
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  aria-label="New password"
                  autoFocus
                />
                <div
                  className="h-1 rounded bg-line mt-2 overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-all ${barColor}`}
                    style={{ width: `${(s / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  At least 8 characters with a letter and a number.
                </p>
              </div>
              <PasswordField
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                aria-label="Confirm new password"
              />
              <Button type="submit" loading={loading}>
                Update password
              </Button>
            </form>
            <Link
              to="/login"
              className="lnk inline-flex items-center gap-1.5 mt-5 text-[13.5px]"
            >
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}
