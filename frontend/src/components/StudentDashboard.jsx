import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    LogOut,
    BookOpen,
    Clock,
    CheckCircle,
    ChevronLeft,
    Eye,
    FileText,
    Plus,
    Upload,
    Send,
    X,
    Calendar,
    Award,
    AlertCircle,
    CheckCircle2,
    RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";

const StudentDashboard = ({ setAuth }) => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [user, setUser] = useState({ name: "", email: "", class_section: "10-A" });
    const [activeTab, setActiveTab] = useState("My Projects");

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newProject, setNewProject] = useState({ title: "", subject: "", start_date: "", deadline: "", assigned_members: "" });
    const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [uploading, setUploading] = useState({});

    const [showProfileUpdate, setShowProfileUpdate] = useState(false);
    const [profileInput, setProfileInput] = useState("");

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
    };

    useEffect(() => {
        fetchUser();
        fetchProjects();
    }, []);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/auth/me`, { headers: { token } });
            setUser({ ...res.data, class_section: res.data.class_section || "Set your section" });
        } catch (err) { console.error("Error fetching user", err); }
    };

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_BASE_URL}/my-projects`, { headers: { token } });
            setProjects(res.data);
        } catch (err) { console.error("Error fetching projects", err); }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const projectData = {
                ...newProject,
                description: "",
                objectives: "",
                budget: ""
            };
            await axios.post(`${API_BASE_URL}/projects`, projectData, { headers: { token } });
            setNewProject({ title: "", subject: "", start_date: "", deadline: "", assigned_members: "" });
            setShowCreateForm(false);
            fetchProjects();
            showToast("Project created successfully!", "success");
        } catch (err) { showToast("Failed to create project", "error"); }
    };

    const updateProjectProgress = async (projectId, updates) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/projects/${projectId}`, updates, { headers: { token } });
            fetchProjects();
            if (updates.progress) showToast(`Status updated to: ${updates.progress}`, "success");
            if (selectedProjectDetails && selectedProjectDetails.id === projectId) {
                setSelectedProjectDetails(prev => ({ ...prev, ...updates }));
            }
        } catch (err) { showToast("Failed to update project progress.", "error"); }
    };

    const handleFileUpload = async (projectId, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploading({ ...uploading, [projectId]: true });
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_BASE_URL}/projects/${projectId}/upload`, formData, {
                headers: { token, 'Content-Type': 'multipart/form-data' }
            });
            fetchProjects();
            showToast("File uploaded successfully!", "success");
        } catch (err) {
            showToast("Upload failed. Please ensure file is under 20MB.", "error");
        } finally {
            setUploading({ ...uploading, [projectId]: false });
        }
    };

    const submitProject = async (projectId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_BASE_URL}/projects/${projectId}/submit`, {}, { headers: { token } });
            fetchProjects();
            showToast("Project submitted successfully!", "success");
        } catch (err) { showToast("Submission failed.", "error"); }
    };

    const resubmitProject = async (projectId) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${API_BASE_URL}/projects/${projectId}/resubmit`, {}, { headers: { token } });
            fetchProjects();
            showToast("Project resubmitted for review!", "success");
        } catch (err) { showToast("Resubmission failed.", "error"); }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setAuth(false);
        navigate("/login");
    };

    // FIXED: handleProfileUpdate matching server.js variable names
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            // Ipinapasa ang class_section para mag-match sa backend
            await axios.put(`${API_BASE_URL}/auth/me`, { class_section: profileInput }, { headers: { token } });
            await fetchUser();
            setShowProfileUpdate(false);
            showToast("Profile updated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to update profile", "error");
        }
    };

    const upcomingProjects = projects
        .filter(p => p.status !== 'graded' && p.status !== 'submitted' && p.status !== 'needs revision')
        .sort((a, b) => new Date(a.deadline || Date.now()) - new Date(b.deadline || Date.now()));

    const gradedProjectsList = projects.filter(p => p.status === 'graded');
    const needsRevisionProjects = projects.filter(p => p.status === 'needs revision');

    const totalProjects = projects.length;
    const inProgressCount = projects.filter(p => p.status === 'in progress' || p.status === 'pending').length;
    const submittedCount = projects.filter(p => p.status === 'submitted').length;
    const revisionCount = needsRevisionProjects.length;
    const gradedCount = gradedProjectsList.length;
    const avgGrade = gradedCount > 0
        ? Math.round(gradedProjectsList.reduce((acc, curr) => acc + parseInt(curr.grade || 0), 0) / gradedCount)
        : 0;

    const renderStatusBadge = (status) => {
        const styles = {
            'in progress': 'bg-blue-100 text-blue-600',
            'submitted': 'bg-yellow-100 text-yellow-600',
            'graded': 'bg-green-100 text-green-600',
            'pending': 'bg-blue-100 text-blue-600',
            'needs revision': 'bg-red-100 text-red-600'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${styles[status] || styles['pending']}`}>
                {status === 'needs revision' ? 'Needs Revision' : status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-12 relative overflow-x-hidden">
            {/* Custom Designed Toast Notification */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl transition-all duration-500 animate-in slide-in-from-right-10 border ${toast.type === "success" ? "bg-white border-green-100 text-green-600" : "bg-white border-red-100 text-red-600"}`}>
                    {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <p className="text-sm font-bold text-gray-800">{toast.message}</p>
                    <button onClick={() => setToast({ ...toast, show: false })} className="text-gray-400 hover:text-gray-600 ml-2">
                        <X size={16} />
                    </button>
                </div>
            )}

            <header className="bg-white p-4 flex justify-between items-center px-8 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Student Dashboard</h1>
                        <p className="text-sm text-gray-500">Welcome, {user.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span
                        onClick={() => { setProfileInput(user.class_section); setShowProfileUpdate(true); }}
                        className="bg-[#E7F7EF] text-[#2D8A56] px-3 py-1 rounded-md text-xs font-bold cursor-pointer hover:bg-green-100 transition-colors border border-green-200"
                        title="Click to edit section"
                    >
                        Student • {user.class_section}
                    </span>
                    <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto mt-8 px-6">
                {/* Profile Section */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[#00C853] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('') : "U"}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                            <p className="text-gray-500">{user.email}</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="mt-2 flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                            >
                                <Plus size={18} /> Create New Project
                            </button>
                        </div>
                    </div>
                    <div className="text-right mt-6 md:mt-0">
                        <p className="text-gray-400 text-sm font-medium">Average Grade</p>
                        <h3 className="text-5xl font-bold text-[#00C853]">{avgGrade}%</h3>
                        <p className="text-gray-500 text-sm mt-1">{gradedCount} projects completed</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: "Total Projects", value: totalProjects, color: "text-gray-800" },
                        { label: "In Progress", value: inProgressCount, color: "text-blue-600" },
                        { label: "Submitted", value: submittedCount, color: "text-orange-500" },
                        { label: "Needs Revision", value: revisionCount, color: "text-red-500" },
                        { label: "Graded", value: gradedCount, color: "text-green-500" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-gray-500 text-xs font-bold uppercase mb-2">{stat.label}</p>
                            <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 mb-6 bg-gray-200/50 p-1 rounded-xl w-fit">
                    {["My Projects", "Upcoming Deadlines", "Needs Revision", "Graded Projects"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* --- TAB CONTENT AREA --- */}
                <div className="space-y-4">
                    {activeTab === "My Projects" && projects.map(proj => (
                        <div key={proj.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-gray-800">{proj.title}</h3>
                                        {renderStatusBadge(proj.status)}
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{proj.description}</p>
                                    <div className="flex flex-wrap items-center gap-4">
                                        {proj.status !== 'submitted' && proj.status !== 'graded' && proj.status !== 'needs revision' && (
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-dashed border-gray-300 transition-all">
                                                <Upload size={14} />
                                                {uploading[proj.id] ? "Uploading..." : "Attach File"}
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(proj.id, e.target.files[0])} />
                                            </label>
                                        )}
                                        {proj.file_url && (
                                            <a href={`${API_BASE_URL}${proj.file_url}`} target="_blank" rel="noreferrer" className="text-blue-500 text-xs font-bold underline flex items-center gap-1">
                                                <FileText size={14} /> View File
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4 text-right">
                                    {proj.status === 'needs revision' && (
                                        <button onClick={() => resubmitProject(proj.id)} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-700">
                                            <RefreshCw size={14} /> Resubmit
                                        </button>
                                    )}
                                    {proj.status !== 'submitted' && proj.status !== 'graded' && proj.status !== 'needs revision' && (
                                        <button onClick={() => submitProject(proj.id)} className="bg-black text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800">
                                            <Send size={14} /> Submit
                                        </button>
                                    )}
                                    <button onClick={() => { setSelectedProjectDetails(proj); setShowDetails(true); }} className="text-gray-500 text-xs font-bold py-2 px-6 border border-gray-200 rounded-xl hover:bg-gray-50">
                                        Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Tab 2: Upcoming Deadlines */}
                    {activeTab === "Upcoming Deadlines" && (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar size={18} /> Priority Deadlines</h3>
                            </div>
                            {upcomingProjects.length > 0 ? upcomingProjects.map(proj => (
                                <div key={proj.id} className="p-6 border-b border-gray-50 flex justify-between items-center last:border-0 hover:bg-gray-50/50 transition-all">
                                    <div>
                                        <p className="font-bold text-gray-800">{proj.title}</p>
                                        <p className="text-xs text-gray-400">{proj.subject || 'General'}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-700">{proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'No Date Set'}</p>
                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tight">Status: {proj.status}</span>
                                        </div>
                                        <button onClick={() => { setSelectedProjectDetails(proj); setShowDetails(true); }} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                            <Eye size={16} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-gray-400 italic">No upcoming deadlines at the moment.</div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Needs Revision */}
                    {activeTab === "Needs Revision" && (
                        <div className="space-y-4">
                            {needsRevisionProjects.length > 0 ? needsRevisionProjects.map(proj => (
                                <div key={proj.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle size={18} className="text-red-600" />
                                                <h3 className="text-lg font-bold text-gray-800">{proj.title}</h3>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-4">{proj.subject}</p>
                                            <div className="bg-red-50/50 p-4 rounded-xl max-w-xl">
                                                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Revision Required</p>
                                                <p className="text-sm text-gray-600 italic">"{proj.revision_feedback || 'Please check the comments from your teacher.'}"</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col gap-2">
                                            <button onClick={() => resubmitProject(proj.id)} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-700">
                                                <RefreshCw size={14} /> Resubmit
                                            </button>
                                            <button onClick={() => { setSelectedProjectDetails(proj); setShowDetails(true); }} className="mt-2 text-xs font-bold text-gray-500 hover:text-black transition-all underline">
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="bg-white p-20 rounded-2xl border border-gray-100 text-center text-gray-400 font-bold italic">
                                    No projects require revision.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Graded */}
                    {activeTab === "Graded Projects" && (
                        <div className="space-y-4">
                            {gradedProjectsList.length > 0 ? gradedProjectsList.map(proj => (
                                <div key={proj.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Award size={18} className="text-green-600" />
                                                <h3 className="text-lg font-bold text-gray-800">{proj.title}</h3>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-4">{proj.subject}</p>
                                            <div className="bg-blue-50/50 p-4 rounded-xl max-w-xl">
                                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Teacher Feedback</p>
                                                <p className="text-sm text-gray-600 italic">"{proj.feedback || 'No written feedback provided.'}"</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Final Grade</p>
                                            <p className="text-4xl font-black text-green-500">{proj.grade}%</p>
                                            <button
                                                onClick={() => { setSelectedProjectDetails(proj); setShowDetails(true); }}
                                                className="mt-4 text-xs font-bold text-gray-500 hover:text-black transition-all underline"
                                            >
                                                View Full Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="bg-white p-20 rounded-2xl border border-gray-100 text-center text-gray-400 italic font-bold">
                                    You don't have any graded projects yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Profile Update Modal */}
            {showProfileUpdate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 font-black">Update Profile</h2>
                            <button onClick={() => setShowProfileUpdate(false)} className="text-gray-400 hover:text-black transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Class Section</label>
                                <input type="text" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={profileInput} onChange={(e) => setProfileInput(e.target.value)} placeholder="e.g. 10-A, 4th Year-IT" />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 font-black">New Project</h2>
                            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-black transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 font-black">Title *</label>
                                <input type="text" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} placeholder="Project Title" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 font-black">Subject *</label>
                                <input type="text" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={newProject.subject} onChange={(e) => setNewProject({ ...newProject, subject: e.target.value })} placeholder="e.g. Science, IT-101" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 font-black">Start Date *</label>
                                    <input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={newProject.start_date} onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 font-black">Deadline Date *</label>
                                    <input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={newProject.deadline} onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 font-black">Assigned Members</label>
                                <input type="text" placeholder="Group names (comma separated)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" value={newProject.assigned_members} onChange={(e) => setNewProject({ ...newProject, assigned_members: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95 mt-2">Create Project</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && selectedProjectDetails && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 font-black">{selectedProjectDetails.title}</h2>
                                <div className="mt-2">{renderStatusBadge(selectedProjectDetails.status)}</div>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-black transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 font-black">Description / Summary</p>
                                <p className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">{selectedProjectDetails.description || "No description provided."}</p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase font-black">Start</p>
                                        <p className="text-xs font-bold text-gray-800">{selectedProjectDetails.start_date ? new Date(selectedProjectDetails.start_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase font-black">Deadline</p>
                                        <p className="text-xs font-bold text-gray-800">{selectedProjectDetails.deadline ? new Date(selectedProjectDetails.deadline).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase font-black">Subject</p>
                                        <p className="text-xs font-bold text-gray-800">{selectedProjectDetails.subject || 'General'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase font-black">Progress</p>
                                        <p className="text-xs font-bold text-blue-600">{selectedProjectDetails.progress || 'Not Started'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100">
                                    <p className="text-[10px] font-bold text-green-600 uppercase font-black">Performance Grade</p>
                                    <p className="text-3xl font-black text-green-700">{selectedProjectDetails.grade ? `${selectedProjectDetails.grade}%` : "---"}</p>
                                </div>
                                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase font-black">Assigned Advisor</p>
                                    <p className="text-lg font-bold text-blue-700 truncate">{selectedProjectDetails.teacher_name || "Assigning..."}</p>
                                </div>
                            </div>

                            {selectedProjectDetails.feedback && (
                                <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-blue-500 shadow-sm">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 font-black">Advisor's Remarks</p>
                                    <p className="text-sm text-gray-600 italic font-medium">"{selectedProjectDetails.feedback}"</p>
                                </div>
                            )}

                            {selectedProjectDetails.file_url && (
                                <div className="border-t pt-6">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 font-black">Submitted Proof / Document</p>
                                    <a href={`${API_BASE_URL}${selectedProjectDetails.file_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                                        <Eye size={16} /> Open External Document
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;