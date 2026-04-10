import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LogOut,
  ChevronLeft,
  BookOpen,
  Users,
  UserSquare2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Mail,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  X
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import API_BASE_URL from "../config";

const AdminDashboard = ({ setAuth }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedProjectForReassign, setSelectedProjectForReassign] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 4000);
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchTeachers();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/admin/projects`, { headers: { token } });
      setProjects(response.data);
    } catch (err) { console.error("Failed to fetch projects", err); }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/admin/users`, { headers: { token } });
      setUsers(response.data);
    } catch (err) { console.error("Failed to fetch users", err); }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/admin/teachers`, { headers: { token } });
      setTeachers(res.data);
    } catch (err) { console.error(err); }
  };

  const handleReassignTeacher = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/admin/projects/${selectedProjectForReassign.id}/assign-teacher`,
        { teacher_id: selectedTeacherId },
        { headers: { token } }
      );
      showToast("Teacher reassigned successfully", "success");
      setShowReassignModal(false);
      fetchProjects();
    } catch (err) {
      showToast("Failed to reassign", "error");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setAuth(false);
    navigate("/login");
  };

  const students = users.filter(u => u.role === 'student');
  const teachersList = users.filter(u => u.role === 'teacher');
  const inProgress = projects.filter(p => ['in progress', 'pending'].includes(p.status)).length;
  const delayed = projects.filter(p => (p.deadline && new Date(p.deadline) < new Date() && !['graded', 'submitted'].includes(p.status))).length;
  const completedCount = projects.filter(p => p.status === 'graded').length;

  const statusData = [
    { name: 'In Progress', value: inProgress },
    { name: 'Submitted', value: projects.filter(p => p.status === 'submitted').length },
    { name: 'Graded', value: completedCount }
  ].filter(d => d.value > 0);

  const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'];

  const subjectMap = new Map();
  projects.forEach(p => {
    let rawSub = p.teacher_subject || p.subject || 'General';
    rawSub = rawSub.trim();
    if (rawSub === "") rawSub = "General";
    const normalizedKey = rawSub.toLowerCase();
    if (subjectMap.has(normalizedKey)) {
      const entry = subjectMap.get(normalizedKey);
      entry.count += 1;
    } else {
      subjectMap.set(normalizedKey, { displayName: rawSub, count: 1 });
    }
  });
  const subjectData = Array.from(subjectMap.values()).map(item => ({
    name: item.displayName.length > 12 ? item.displayName.substring(0, 10) + '..' : item.displayName,
    Projects: item.count
  }));

  const sectionMap = {};
  students.forEach(s => {
    const sec = s.class_section || s.class || 'N/A';
    if (sec === 'N/A') return;
    const sProj = projects.filter(p => p.student_id === s.id && p.grade);
    if (sProj.length > 0) {
      const sAvg = sProj.reduce((acc, curr) => acc + parseInt(curr.grade || 0), 0) / sProj.length;
      if (!sectionMap[sec]) sectionMap[sec] = { total: 0, count: 0 };
      sectionMap[sec].total += sAvg;
      sectionMap[sec].count += 1;
    }
  });
  const sectionData = Object.keys(sectionMap).map(key => ({
    name: key,
    Average: Math.round(sectionMap[key].total / sectionMap[key].count)
  }));

  const renderStatusBadge = (status) => {
    const styles = {
      'in progress': 'bg-blue-100 text-blue-600',
      'submitted': 'bg-orange-100 text-orange-600',
      'graded': 'bg-green-100 text-green-600',
      'pending': 'bg-purple-100 text-purple-600'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status.toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12 font-sans">
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
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-gray-400 font-medium">Analytics & School Overview</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-[#EBF2FF] text-[#3B82F6] px-4 py-1.5 rounded-xl text-xs font-black uppercase border border-blue-50">Administrator</span>
          <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-50 rounded-full">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-8 px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total Projects", val: projects.length, icon: <BookOpen size={16} />, color: "text-gray-800" },
            { label: "Students", val: students.length, icon: <Users size={16} />, color: "text-gray-800" },
            { label: "Teachers", val: teachersList.length, icon: <UserSquare2 size={16} />, color: "text-gray-800" },
            { label: "In Progress", val: inProgress, icon: <Clock size={16} />, color: "text-blue-500" },
            { label: "Delayed", val: delayed, icon: <AlertCircle size={16} />, color: "text-red-500" },
            { label: "Graded", val: completedCount, icon: <CheckCircle2 size={16} />, color: "text-green-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between min-h-[130px]">
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <span className="text-gray-200">{stat.icon}</span>
              </div>
              <p className={`text-4xl font-black ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-8 bg-gray-200/40 p-1.5 rounded-2xl w-fit">
          {["Overview", "All Projects", "Students", "Teachers"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-white text-gray-800 shadow-md scale-105" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-purple-50 rounded-2xl text-purple-500"><PieIcon size={20} /></div>
                  <h3 className="text-lg font-black text-gray-800">Project Status</h3>
                </div>
                <div className="flex-1">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-300 font-bold italic">No project data found</div>}
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><BarChart2 size={20} /></div>
                  <h3 className="text-lg font-black text-gray-800">Projects by Discipline</h3>
                </div>
                <div className="flex-1">
                  {subjectData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="Projects" fill="#3B82F6" radius={[10, 10, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-300 font-bold italic">Waiting for submissions...</div>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col h-[350px]">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-green-50 rounded-2xl text-green-500"><TrendingUp size={20} /></div>
                <h3 className="text-lg font-black text-gray-800">Section Performance</h3>
              </div>
              <div className="flex-1">
                {sectionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sectionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="Average" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981' }} activeDot={{ r: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-gray-300 font-bold italic">No grades published yet</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab !== "Overview" && (
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-[#FDFDFF]">
              <div>
                <h3 className="text-xl font-black text-gray-800">{activeTab}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">School Records Database</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">
                  <tr>
                    {activeTab === "All Projects" && (
                      <>
                        <th className="px-8 py-5">Project ID</th>
                        <th className="px-8 py-5">Title</th>
                        <th className="px-8 py-5">Subject</th>
                        <th className="px-8 py-5">Teacher</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-center">Grade</th>
                        <th className="px-8 py-5 text-center">Actions</th>
                      </>
                    )}
                    {activeTab === "Students" && (
                      <>
                        <th className="px-8 py-5">Student ID</th>
                        <th className="px-8 py-5">Name</th>
                        <th className="px-8 py-5">Email</th>
                        <th className="px-8 py-5">Class</th>
                        <th className="px-8 py-5 text-center">Avg Grade</th>
                      </>
                    )}
                    {activeTab === "Teachers" && (
                      <>
                        <th className="px-8 py-5">Teacher ID</th>
                        <th className="px-8 py-5">Name</th>
                        <th className="px-8 py-5">Email</th>
                        <th className="px-8 py-5">Subject</th>
                        <th className="px-8 py-5 text-center">Active Projects</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeTab === "All Projects" && projects.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6 text-sm font-bold text-gray-400">P00{i + 1}</td>
                      <td className="px-8 py-6 text-sm font-black text-gray-800">{p.title}</td>
                      <td className="px-8 py-6">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-blue-100">
                          {p.teacher_subject || p.subject || 'General'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-gray-500">{p.teacher_name || 'Unassigned'}</td>
                      <td className="px-8 py-6">{renderStatusBadge(p.status)}</td>
                      <td className="px-8 py-6 text-center font-black text-gray-800">{p.grade ? `${p.grade}%` : '-'}</td>
                      <td className="px-8 py-6 text-center">
                        <button
                          onClick={() => { setSelectedProjectForReassign(p); setSelectedTeacherId(p.teacher_id || ""); setShowReassignModal(true); }}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold transition"
                        >
                          Reassign Teacher
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === "Students" && students.map((s, i) => {
                    const sProjects = projects.filter(p => p.student_id === s.id && p.grade);
                    const sAvg = sProjects.length > 0 ? Math.round(sProjects.reduce((acc, curr) => acc + parseInt(curr.grade || 0), 0) / sProjects.length) : 0;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6 text-sm font-bold text-gray-400">S00{i + 1}</td>
                        <td className="px-8 py-6 text-sm font-black text-gray-800">{s.name}</td>
                        <td className="px-8 py-6 text-sm text-blue-500 font-medium italic underline underline-offset-4 decoration-blue-200">{s.email}</td>
                        <td className="px-8 py-6 text-sm text-gray-600 font-black">{s.class_section || s.class || 'N/A'}</td>
                        <td className="px-8 py-6 text-center">
                          <span className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-xs font-black border border-green-100">{sAvg}%</span>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "Teachers" && teachersList.map((t, i) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6 text-sm font-bold text-gray-400">T00{i + 1}</td>
                      <td className="px-8 py-6 text-sm font-black text-gray-800">{t.name}</td>
                      <td className="px-8 py-6 text-sm text-gray-500 font-medium">{t.email}</td>
                      <td className="px-8 py-6">
                        <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-purple-100">
                          {t.subject || 'Not Set'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center text-sm font-black text-gray-800">
                        {projects.filter(p => p.teacher_id === t.id).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Reassign Teacher Modal */}
      {showReassignModal && selectedProjectForReassign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Reassign Teacher</h2>
              <button onClick={() => setShowReassignModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-black transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Project: <span className="font-bold text-gray-800">{selectedProjectForReassign.title}</span></p>
            </div>
            <div className="mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Select Teacher</label>
              <select
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <option value="">-- Unassign --</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.subject || 'No subject'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReassignModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button onClick={handleReassignTeacher} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;