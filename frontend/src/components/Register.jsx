import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, UserPlus, Eye, EyeOff, Briefcase, AlertCircle, BookOpen } from "lucide-react";

const Register = ({ setAuth }) => {
    const [inputs, setInputs] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "student",
        subject: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const onChange = (e) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const onSubmitForm = async (e) => {
        e.preventDefault();
        if (inputs.password !== inputs.confirmPassword) {
            setError("Passwords do not match!");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const { confirmPassword, ...userData } = inputs;
            const response = await axios.post("http://localhost:5000/auth/register", userData);
            localStorage.setItem("token", response.data.token);
            setAuth(true);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data || "Registration failed!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 p-4">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">

                {/* DESIGNED ERROR NOTIFICATION */}
                {error && (
                    <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle size={18} />
                        <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
                    </div>
                )}

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-xl shadow-emerald-200 mb-4 transform rotate-6">
                        <UserPlus className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">
                        Create Account
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Join our school monitoring system</p>
                </div>

                <form onSubmit={onSubmitForm} className="space-y-4">
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                        <input
                            type="text"
                            name="name"
                            placeholder="Full name"
                            value={inputs.name}
                            onChange={onChange}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all duration-300 font-medium"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email address"
                            value={inputs.email}
                            onChange={onChange}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all duration-300 font-medium"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Password"
                                value={inputs.password}
                                onChange={onChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all duration-300 font-medium text-sm"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Confirm"
                                value={inputs.confirmPassword}
                                onChange={onChange}
                                className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all duration-300 font-medium text-sm"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 w-5 h-5" />
                            <select
                                name="role"
                                value={inputs.role}
                                onChange={onChange}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all duration-300 font-bold text-xs appearance-none"
                                required
                            >
                                <option value="student">STUDENT</option>
                                <option value="teacher">TEACHER</option>
                                <option value="admin">ADMIN</option>
                            </select>
                        </div>

                        {/* TEXT INPUT FOR SUBJECT (ONLY FOR TEACHERS) */}
                        {inputs.role === "teacher" && (
                            <div className="relative group animate-in fade-in slide-in-from-left-2">
                                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                                <input
                                    type="text"
                                    name="subject"
                                    placeholder="Enter Subject (e.g. Science)"
                                    value={inputs.subject}
                                    onChange={onChange}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-200 rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-medium text-sm"
                                    required={inputs.role === "teacher"}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transform hover:-translate-y-0.5 active:scale-95 transition-all duration-300 disabled:opacity-70 mt-2"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Processing...
                            </div>
                        ) : (
                            "Sign Up"
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-gray-500 font-medium">
                        Already have an account?{" "}
                        <Link to="/login" className="text-emerald-600 font-bold hover:underline underline-offset-4">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;