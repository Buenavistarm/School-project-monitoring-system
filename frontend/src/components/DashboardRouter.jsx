import React, { useState, useEffect } from "react";
import axios from "axios";
import StudentDashboard from "./StudentDashboard";
import TeacherDashboard from "./TeacherDashboard";
import AdminDashboard from "./AdminDashboard";

const DashboardRouter = ({ setAuth }) => {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await axios.get("http://localhost:5000/auth/me", {
                    headers: { token }
                });
                setRole(response.data.role);
            } catch (err) {
                console.error(err);
                localStorage.removeItem("token");
                setAuth(false);
            } finally {
                setLoading(false);
            }
        };
        fetchUserRole();
    }, [setAuth]);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    if (role === "teacher") return <TeacherDashboard setAuth={setAuth} />;
    if (role === "admin") return <AdminDashboard setAuth={setAuth} />;
    return <StudentDashboard setAuth={setAuth} />;
};

export default DashboardRouter;