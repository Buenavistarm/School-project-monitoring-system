import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";

const Login = ({ setAuth }) => {
  const [inputs, setInputs] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  const onSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post("http://localhost:5000/auth/login", inputs);
      localStorage.setItem("token", response.data.token);
      setAuth(true);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data || "Invalid email or password!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">

        {/* DESIGNED ERROR NOTIFICATION */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={18} />
            <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-200 mb-4 transform -rotate-6">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Sign in to your account</p>
        </div>

        <form onSubmit={onSubmitForm} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={inputs.email}
              onChange={onChange}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all duration-300 font-medium"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={inputs.password}
              onChange={onChange}
              className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all duration-300 font-medium"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transform hover:-translate-y-0.5 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Authenticating...
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline underline-offset-4">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;