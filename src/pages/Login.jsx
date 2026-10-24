import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ShoppingCart } from "lucide-react";
import Field, { PasswordField } from "../components/Field";
import Checkbox from "../components/Checkbox";
import Button from "../components/Button";
import Alert from "../components/Alert";
import SuperLogo from "../Assets/superMarket.jpg";
import { saveSession } from "../auth";

const LOCAL_API = "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [status, setStatus] = useState("pending");

  const inputsRef = useRef([]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      return setError("Enter your email or username and your password.");
    }
    setLoading(true);

    try {
      const res = await fetch(`${LOCAL_API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringfy({ identifier, password }),
      });

      const data = res.json();

      if (!res.ok) {
        setError(data.message || "Login Failed failed");
      }

      if (data.challenge) {
        setChallenge(data.challenge);
        setIdentifier("");
        setPassword("");
        setStatus("success");
      }
      saveSession(challenge, data.user, true);
    } catch (error) {
      console.error(error);
      setError("Network error while Login . Please try again.");
    }
  };

  const handleChange = (val, i) => {
    const newCode = [...code];
    newCode[i] = val;
    setCode(newCode);
    {
      /*auto-advance focus*/
    }
    if (val && i < inputsRef.current.length - 1) {
      inputsRef.current[i + 1].focus();
    }
    {
      /*auto-verify when all digits are filled. */
    }
    if (newCode.every((d) => d.length === 1)) {
      verifyLoginCode(newCode.join(""));
    }
  };

  const verifyLoginCode = async (code, remember) => {
    const res = await fetch(`${LOCAL_API}/auth/verify-login-mfa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge, token: code }),
    });
    const data = res.json();

    saveSession(data.accessToken, data.user, remember);

    if (data.refreshToken) {
      sessionStorage.setItem("refreshToken", data.refreshToken);
    }

    if (!res.ok)
      throw new Error(data.message || "Failed to submit token to Login");
    setStatus("pending");
    setCode(Array(6).fill(""));

    navigate("/dashboard");
  };

  useEffect(() => {
    if (status === "success") {
      const statusTimer = setTimeout(() => setStatus("pending"), 60000);
      return () => clearTimeout(statusTimer);
    }
  });

  return (
    <div
      className="min-h-screen grid place-items-center p-3 sm:p-8 bg-[#f1f5f3]
                    bg-[radial-gradient(circle_at_15%_10%,#dff1e8,transparent_45%),radial-gradient(circle_at_90%_95%,#e3ebf5,transparent_45%)]"
    >
      <div
        className="w-full max-w-[980px] grid md:grid-cols-[42%_1fr] md:min-h-[560px] bg-white rounded-2xl md:rounded-[20px] overflow-hidden
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
        <main className="flex items-center justify-center px-5 py-7 md:p-10">
          <section className="w-full max-w-[420px]">
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 text-[14.5px] mt-2 mb-6">
              Sign in to your FreshMart account
            </p>
            <Alert>{error}</Alert>
            <form onSubmit={handleLogin} className="grid gap-4" noValidate>
              <Field
                icon={User}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or Username"
                autoComplete="username"
                aria-label="Email or username"
                autoFocus
              />
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
              />
              <div className="flex items-center justify-between">
                <Checkbox checked={remember} onChange={setRemember}>
                  Remember me
                </Checkbox>
                <Link to="/forgot-password" className="lnk text-[13px]">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" loading={loading}>
                Sign In
              </Button>
            </form>

            {/* 6-digit input boxes */}
            {status === "success" && (
              <div className="flex gap-2 mt-4">
                {code.map((val, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleChange(e.target.value, i)}
                    ref={(el) => (inputsRef.current[i] = el)}
                    className="w-10 h-10 text-center border rounded focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                ))}
              </div>
            )}
            <p className="text-center text-[12.5px] text-slate-500 mt-6">
              Don’t have an account? Contact your administrator
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
