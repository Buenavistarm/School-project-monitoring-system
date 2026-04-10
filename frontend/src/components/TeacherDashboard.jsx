import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    LogOut,
    ChevronLeft,
    BookOpen,
    Clock,
    Users,
    CheckCircle,
    FileText,
    Eye,
    X,
    AlertCircle,
    CheckCircle2,
    MessageSquare,
    Edit3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

const TeacherDashboard = ({ setAuth }) => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [teacher, setTeacher] = useState({ name: "", email: "", subject: "Science" });
    const [activeTab, setActiveTab] = useState("Assigned Projects");
    const [students, setStudents] = useState([]);

    const [selectedProject, setSelectedProject] = useState(null);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [grade, setGrade] = useState("");
    const [feedback, setFeedback] = useState("");
    const [revisionFeedback, setRevisionFeedback] = useState("");

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [showProfileUpdate, setShowProfileUpdate] = useState(false);
    const [profileInput, setProfileInput] = useState("");

    useEffect(() => {
        fetchUser();
        fetchProjects();
        fetchStudents();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 4000);
    };

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/auth/me`, { headers: { token } });
            setTeacher({
                name: res.data.name,
                email: res.data.email || `${res.data.name.toLowerCase().replace(' ', '.')}@school.edu`,
                subject: res.data.subject || "Science"
            });
        } catch (err) { console.error("Error fetching user", err); }
    };

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/teacher/my-projects`, { headers: { token } });
            setProjects(res.data);
        } catch (err) { console.error("Error fetching projects", err); }
    };

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/teacher/students`, { headers: { token } });
            setStudents(res.data);
        } catch (err) { console.error("Error fetching students", err); }
    };

    const handleGradeSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_BASE_URL}/teacher/grade/${selectedProject.id}`,
                { grade, feedback },
                { headers: { token } }
            );
            setShowGradeModal(false);
            fetchProjects();
            showToast("Grade published successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to submit grade. Please try again.", "error");
        }
    };

    const handleApproval = async (projectId, newStatus) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/projects/${projectId}`, { status: newStatus }, { headers: { token } });
            fetchProjects();
            setShowReviewModal(false);
            showToast(`Project marked as ${newStatus}`, "success");
        } catch (err) {
            showToast("Failed to update status", "error");
        }
    };

    const handleRequestRevision = async () => {
        if (!revisionFeedback.trim()) {
            showToast("Please provide revision feedback", "error");
            return;
        }
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_BASE_URL}/projects/${selectedProject.id}/request-revision`,
                { revision_feedback: revisionFeedback },
                { headers: { token } }
            );
            fetchProjects();
            setShowRevisionModal(false);
            setRevisionFeedback("");
            showToast("Revision requested with feedback", "success");
        } catch (err) {
            showToast("Failed to request revision", "error");
        }
    };

    const updateProjectProgress = async (projectId, updates) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/projects/${projectId}`, updates, { headers: { token } });
            fetchProjects();
            if (updates.progress) showToast(`Progress updated to: ${updates.progress}`, "success");
            if (selectedProject && selectedProject.id === projectId) {
                setSelectedProject(prev => ({ ...prev, ...updates }));
            }
        } catch (err) { showToast("Failed to update project progress.", "error"); }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setAuth(false);
        navigate("/login");
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/auth/me`, { subject: profileInput }, { headers: { token } });
            fetchUser();
            setShowProfileUpdate(false);
            showToast("Subject profile updated", "success");
        } catch (err) { showToast("Failed to update profile", "error"); }
    };

    const totalProjects = projects.length;
    const pendingReview = projects.filter(p => p.status === 'submitted').length;
    const needsRevision = projects.filter(p => p.status === 'needs revision').length;
    const inProgressCount = projects.filter(p => p.status === 'in progress' || p.status === 'pending').length;
    const gradedCount = projects.filter(p => p.status === 'graded').length;

    const renderStatusBadge = (status) => {
        const styles = {
            'in progress': 'bg-blue-100 text-blue-600',
            'submitted': 'bg-yellow-100 text-yellow-600',
            'graded': 'bg-green-100 text-green-600',
            'pending': 'bg-purple-100 text-purple-600',
            'needs revision': 'bg-red-100 text-red-600'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
                {status === 'needs revision' ? 'Needs Revision' : status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-12 relative overflow-x-hidden">
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl transition-all duration-500 animate-in slide-in-from-right-10 border ${toast.type === "success" ? "bg-white border-green-100 text-green-600" : "bg-white border-red-100 text-red-600"}`}>
                    {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-bold text-gray-800">{toast.message}</p>
                    <button onClick={() => setToast({ ...toast, show: false })} className="text-gray-400 hover:text-gray-600 ml-2">
                        <X size={16} />
                    </button>
                </div>
            )}

            <header className="bg-white p-4 flex justify-between items-center px-8 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-tight">Teacher Dashboard</h1>
                        <p
                            onClick={() => { setProfileInput(teacher.subject); setShowProfileUpdate(true); }}
                            className="text-sm text-gray-500 cursor-pointer hover:text-purple-600 hover:underline transition-all"
                            title="Click to edit subject"
                        >
                            Subject: {teacher.subject}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="bg-[#F3E8FF] text-[#7E22CE] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                        Teacher Mode
                    </span>
                    <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto mt-8 px-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[#9333EA] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-100">
                            {teacher.name ? teacher.name.split(' ').map(n => n[0]).join('') : "T"}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{teacher.name}</h2>
                            <p className="text-gray-500">{teacher.email}</p>
                            <p className="text-xs font-bold text-purple-600 mt-1 uppercase tracking-tighter">Academic Head</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-gray-50 rounded-2xl min-w-[100px]">
                            <p className="text-2xl font-black text-gray-800">{pendingReview}</p>
                            <p className="text-[10px] font-bold text-orange-500 uppercase">Pending</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-gray-50 rounded-2xl min-w-[100px]">
                            <p className="text-2xl font-black text-gray-800">{needsRevision}</p>
                            <p className="text-[10px] font-bold text-red-500 uppercase">Revision</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-gray-50 rounded-2xl min-w-[100px]">
                            <p className="text-2xl font-black text-gray-800">{gradedCount}</p>
                            <p className="text-[10px] font-bold text-green-500 uppercase">Graded</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Projects", value: totalProjects, icon: <BookOpen size={18} className="text-gray-400" />, color: "text-gray-800" },
                        { label: "Pending Review", value: pendingReview, icon: <FileText size={18} className="text-orange-400" />, color: "text-orange-500" },
                        { label: "Needs Revision", value: needsRevision, icon: <MessageSquare size={18} className="text-red-400" />, color: "text-red-500" },
                        { label: "Graded", value: gradedCount, icon: <CheckCircle size={18} className="text-green-400" />, color: "text-green-500" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[140px]">
                            <div className="flex justify-between items-center">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                {stat.icon}
                            </div>
                            <span className={`text-4xl font-black ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 mb-6 bg-gray-200/50 p-1 rounded-xl w-fit">
                    {["Assigned Projects", "Pending Review", "Needs Revision", "Graded", "My Students"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-[#FDFDFF]">
                        <h3 className="font-bold text-gray-800 tracking-tight">{activeTab}</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">School Management System</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Title</th>
                                    <th className="px-8 py-4">Student</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4">Submission</th>
                                    <th className="px-8 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projects
                                    .filter(p => {
                                        if (activeTab === "Assigned Projects") return true;
                                        if (activeTab === "Pending Review") return p.status === 'submitted';
                                        if (activeTab === "Needs Revision") return p.status === 'needs revision';
                                        if (activeTab === "Graded") return p.status === 'graded';
                                        return true;
                                    })
                                    .map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-8 py-5 text-sm font-bold text-gray-800">{p.title}</td>
                                            <td className="px-8 py-5 text-sm text-gray-600 font-medium">{p.student_name || "N/A"}</td>
                                            <td className="px-8 py-5">{renderStatusBadge(p.status)}</td>
                                            <td className="px-8 py-5">
                                                {p.file_url ? (
                                                    <a href={`${API_BASE_URL}${p.file_url}`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold flex items-center gap-1.5 hover:underline">
                                                        <FileText size={14} /> Open File
                                                    </a>
                                                ) : <span className="text-gray-400 text-xs italic opacity-60">No file</span>}
                                            </td>
                                            <td className="px-8 py-5 text-right flex gap-2 justify-end">
                                                {p.status === 'pending' && (
                                                    <button
                                                        onClick={() => { setSelectedProject(p); setRevisionFeedback(""); setShowReviewModal(true); }}
                                                        className="bg-blue-50 text-blue-600 text-[11px] font-bold px-5 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                                {p.status === 'submitted' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setSelectedProject(p); setGrade(p.grade || ""); setFeedback(p.feedback || ""); setShowGradeModal(true); }}
                                                            className="bg-black text-white text-[11px] font-bold px-5 py-2 rounded-xl hover:bg-gray-800 shadow-sm transition-all"
                                                        >
                                                            Grade
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedProject(p); setRevisionFeedback(""); setShowRevisionModal(true); }}
                                                            className="bg-red-50 text-red-600 text-[11px] font-bold px-5 py-2 rounded-xl hover:bg-red-100 transition-all border border-red-100 flex items-center gap-1"
                                                        >
                                                            <Edit3 size={12} /> Revision
                                                        </button>
                                                    </div>
                                                )}
                                                {(p.status === 'in progress' || p.status === 'graded' || p.status === 'needs revision') && (
                                                    <button
                                                        onClick={() => { setSelectedProject(p); setShowReviewModal(true); }}
                                                        className="bg-gray-50 text-gray-600 text-[11px] font-bold px-5 py-2 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                                                    >
                                                        Details
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {projects.length === 0 && (
                            <div className="p-20 text-center text-gray-400 text-sm italic font-medium">
                                No records found for this section.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Profile Update Modal */}
            {showProfileUpdate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Update Subject</h2>
                            <button onClick={() => setShowProfileUpdate(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assigned Subject(s)</label>
                                <input type="text" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500" value={profileInput} onChange={(e) => setProfileInput(e.target.value)} placeholder="e.g. Science, 1T-307" />
                                <span className="text-xs text-gray-500 block mt-2 font-medium">*If you teach multiple subjects, just separate them with a comma (e.g. "1T-307, Math"). The system tracks all listed subjects.</span>
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {showGradeModal && selectedProject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[32px] p-10 max-w-2xl w-full shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Grade Submission</h2>
                                <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-tight">Project: {selectedProject.title}</p>
                            </div>
                            <button onClick={() => setShowGradeModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleGradeSubmit} className="space-y-6">
                            <div className="bg-[#F8F9FF] p-6 rounded-2xl border border-blue-50">
                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-3">Numerical Grade (0-100%)</label>
                                <input
                                    type="number"
                                    required
                                    max="100"
                                    className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-purple-100 font-black text-2xl text-gray-800"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    placeholder="95"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Constructive Feedback</label>
                                <textarea
                                    rows="4"
                                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-purple-500/5 text-sm font-medium text-gray-700"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="What did the student do well? What can be improved?"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowGradeModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-[2] bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95">
                                    Publish Grade
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revision Request Modal */}
            {showRevisionModal && selectedProject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[32px] p-10 max-w-2xl w-full shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Request Revision</h2>
                                <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-tight">Project: {selectedProject.title}</p>
                            </div>
                            <button onClick={() => setShowRevisionModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">Revision Feedback *</label>
                                <textarea
                                    rows="5"
                                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-red-100 text-sm font-medium text-gray-700"
                                    value={revisionFeedback}
                                    onChange={(e) => setRevisionFeedback(e.target.value)}
                                    placeholder="Explain clearly what needs to be changed or improved..."
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-2">The student will see this message and must resubmit the project.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowRevisionModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleRequestRevision} className="flex-[2] bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95">
                                    Send Revision Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {showReviewModal && selectedProject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[32px] p-10 max-w-2xl w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Project Details</h2>
                                <p className="text-sm text-gray-400 mt-1 uppercase font-bold tracking-tight">Project: {selectedProject.title}</p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-[#F8F9FF] p-6 rounded-2xl border border-blue-50 mb-6 space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
                                <p className="text-sm text-gray-800">{selectedProject.description}</p>
                            </div>
                            {selectedProject.objectives && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Objectives</p>
                                    <p className="text-sm text-gray-800">{selectedProject.objectives}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Budget</p>
                                    <p className="text-sm font-bold text-gray-800">{selectedProject.budget || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned Members</p>
                                    <p className="text-sm font-bold text-gray-800">{selectedProject.assigned_members || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Start Date</p>
                                    <p className="text-sm font-bold text-gray-800">{selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Deadline</p>
                                    <p className="text-sm font-bold text-gray-800">{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Current Status</p>
                                    <p className="text-sm font-bold text-gray-800 uppercase text-[#7E22CE]">{selectedProject.status}</p>
                                </div>
                                {selectedProject.revision_feedback && (
                                    <div className="col-span-full">
                                        <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Revision Request</p>
                                        <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                            <p className="text-sm text-gray-700">{selectedProject.revision_feedback}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="col-span-full mt-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Progress Monitoring</p>
                                    <div className="flex gap-2 items-center">
                                        <select
                                            className="p-3 text-sm bg-white border border-purple-100 shadow-sm rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-50"
                                            value={selectedProject.progress || "Not Started"}
                                            onChange={(e) => updateProjectProgress(selectedProject.id, { progress: e.target.value })}
                                        >
                                            <option value="Not Started">Not Started</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Delayed">Delayed</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                        <span className="text-xs text-gray-500 italic block">Teacher assigns formal progress</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedProject.status === 'pending' && (
                            <div className="flex gap-3 pt-2 border-t border-gray-100">
                                <button onClick={() => handleApproval(selectedProject.id, 'rejected')} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100">
                                    Reject
                                </button>
                                <button onClick={() => handleApproval(selectedProject.id, 'needs revision')} className="flex-1 bg-yellow-50 text-yellow-600 py-4 rounded-2xl font-bold hover:bg-yellow-100 transition-all border border-yellow-100">
                                    Request Revision
                                </button>
                                <button onClick={() => handleApproval(selectedProject.id, 'in progress')} className="flex-[2] bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95">
                                    Approve Project
                                </button>
                            </div>
                        )}
                        {(selectedProject.status === 'in progress' || selectedProject.status === 'graded') && (
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => handleApproval(selectedProject.id, 'completed')} className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-bold hover:bg-green-100 transition-all border border-green-100">
                                    Mark as Completed / Archive
                                </button>
                            </div>
                        )}
                        {selectedProject.status === 'needs revision' && (
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowReviewModal(false)} className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;