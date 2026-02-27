// ============================================
// Project Manager - Backend API Connection
// ============================================

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3000"
    : window.location.origin;

// ── Global state ──
let allProjects = [];    // stores all fetched projects
let activeFilter = null; // current active filter: null | "proposal" | "ongoing" | "completed"

// ── Logout ──
function logout() {
    sessionStorage.removeItem("spms_user");
    window.location.href = "login.html";
}

// ── Load logged-in user info into sidebar ──
function loadUserInfo() {
    try {
        const userData = sessionStorage.getItem("spms_user");
        if (!userData) return;
        const user = JSON.parse(userData);

        const avatarEl = document.getElementById("sidebar-avatar");
        const nameEl = document.getElementById("sidebar-username");

        if (avatarEl && user.full_name) {
            // Get initials (first letter of first & last name)
            const parts = user.full_name.trim().split(/\s+/);
            const initials = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0][0].toUpperCase();
            avatarEl.textContent = initials;
        }
        if (nameEl && user.full_name) {
            nameEl.textContent = user.full_name;
        }
    } catch (e) {
        console.error("Failed to load user info:", e);
    }
}

// ── Fetch all projects from backend ──
async function fetchProjects() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/projects`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const projects = await response.json();
        allProjects = projects; // store globally
        updateStats(projects);
        applyCurrentFilter();  // render with current filter
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        showToast("Failed to load projects. Make sure the server is running.", "error");
    } finally {
        showLoading(false);
    }
}

// ── Add a new project ──
async function addProject(studentName, projectTitle, status) {
    try {
        const response = await fetch(`${API_BASE}/add-project`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_name: studentName,
                project_title: projectTitle,
                status: status,
            }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        showToast("Project added successfully!", "success");
        fetchProjects(); // Refresh the list
        return data;
    } catch (error) {
        console.error("Failed to add project:", error);
        showToast("Failed to add project. Please try again.", "error");
    }
}

// ── Delete a project ──
async function deleteProject(id) {
    try {
        const response = await fetch(`${API_BASE}/delete-project/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        showToast("Project deleted successfully!", "success");
        fetchProjects(); // Refresh the list
        return data;
    } catch (error) {
        console.error("Failed to delete project:", error);
        showToast("Failed to delete project. Please try again.", "error");
    }
}

// ── Filter by status (clicking stat cards) ──
function filterByStatus(status) {
    if (activeFilter === status) {
        // Clicking the same card again clears the filter
        clearFilter();
        return;
    }
    activeFilter = status;
    applyCurrentFilter();
    updateActiveCard();
    updateTableTitle();
}

function clearFilter() {
    activeFilter = null;
    applyCurrentFilter();
    updateActiveCard();
    updateTableTitle();
}

function applyCurrentFilter() {
    if (!activeFilter) {
        renderProjects(allProjects);
    } else {
        const filtered = allProjects.filter(
            (p) => p.status.toLowerCase() === activeFilter
        );
        renderProjects(filtered);
    }
}

function updateActiveCard() {
    // Remove active class from all stat cards
    document.querySelectorAll(".stat-card").forEach((card) => {
        card.classList.remove("stat-active");
    });
    // Add active class to the matching card
    if (activeFilter) {
        const cardMap = {
            proposal: ".stat-proposal",
            ongoing: ".stat-ongoing",
            completed: ".stat-completed",
        };
        const card = document.querySelector(cardMap[activeFilter]);
        if (card) card.classList.add("stat-active");
    } else {
        // "All" is selected — highlight total card
        const totalCard = document.querySelector(".stat-total");
        if (totalCard) totalCard.classList.add("stat-active");
    }
}

function updateTableTitle() {
    const titleEl = document.querySelector(".table-header h3");
    if (!titleEl) return;
    if (activeFilter) {
        const label = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
        titleEl.textContent = `${label} Projects`;
    } else {
        titleEl.textContent = "All Projects";
    }
}

// ── Render projects into the table ──
function renderProjects(projects) {
    const tbody = document.getElementById("projects-tbody");
    if (!tbody) return;

    const emptyMsg = activeFilter
        ? `No ${activeFilter} projects found`
        : "No projects found";
    const emptyHint = activeFilter
        ? `Click another status card or "Total Projects" to see all`
        : 'Click "Add New Project" to get started';

    if (projects.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="empty-icon">📂</div>
          <p>${emptyMsg}</p>
          <span>${emptyHint}</span>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = projects
        .map(
            (project, index) => `
    <tr class="fade-in" style="animation-delay: ${index * 0.05}s">
      <td class="id-cell">${project.id}</td>
      <td>
        <div class="student-info">
          <div class="avatar">${project.student_name.charAt(0).toUpperCase()}</div>
          <span>${escapeHTML(project.student_name)}</span>
        </div>
      </td>
      <td class="project-title-cell">${escapeHTML(project.project_title)}</td>
      <td>
        <span class="status-badge status-${slugify(project.status)}">
          ${escapeHTML(project.status)}
        </span>
      </td>
      <td>
        <button class="btn-delete" onclick="confirmDelete(${project.id}, '${escapeHTML(project.project_title)}')" title="Delete project">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    </tr>
  `
        )
        .join("");
}

// ── Update dashboard stats ──
function updateStats(projects) {
    const totalEl = document.getElementById("stat-total");
    const proposalEl = document.getElementById("stat-proposal");
    const ongoingEl = document.getElementById("stat-ongoing");
    const completedEl = document.getElementById("stat-completed");

    if (totalEl) totalEl.textContent = projects.length;
    if (proposalEl)
        proposalEl.textContent = projects.filter(
            (p) => p.status.toLowerCase() === "proposal"
        ).length;
    if (ongoingEl)
        ongoingEl.textContent = projects.filter(
            (p) => p.status.toLowerCase() === "ongoing"
        ).length;
    if (completedEl)
        completedEl.textContent = projects.filter(
            (p) => p.status.toLowerCase() === "completed"
        ).length;
}

// ── Modal controls ──
function openModal() {
    const modal = document.getElementById("add-modal");
    if (modal) {
        modal.classList.add("active");
        document.getElementById("input-student-name")?.focus();
    }
}

function closeModal() {
    const modal = document.getElementById("add-modal");
    if (modal) {
        modal.classList.remove("active");
        document.getElementById("add-project-form")?.reset();
    }
}

// ── Form submit handler ──
function handleFormSubmit(e) {
    e.preventDefault();
    const studentName = document.getElementById("input-student-name")?.value.trim();
    const projectTitle = document.getElementById("input-project-title")?.value.trim();
    const status = document.getElementById("input-status")?.value;

    if (!studentName || !projectTitle || !status) {
        showToast("Please fill in all fields.", "error");
        return;
    }

    addProject(studentName, projectTitle, status);
    closeModal();
}

// ── Delete confirmation ──
function confirmDelete(id, title) {
    const modal = document.getElementById("confirm-modal");
    const msg = document.getElementById("confirm-message");
    if (modal && msg) {
        msg.textContent = `Are you sure you want to delete "${title}"?`;
        modal.classList.add("active");
        // Store the id to use when confirmed
        modal.dataset.deleteId = id;
    }
}

function executeDelete() {
    const modal = document.getElementById("confirm-modal");
    if (modal && modal.dataset.deleteId) {
        deleteProject(modal.dataset.deleteId);
        modal.classList.remove("active");
        delete modal.dataset.deleteId;
    }
}

function cancelDelete() {
    const modal = document.getElementById("confirm-modal");
    if (modal) {
        modal.classList.remove("active");
        delete modal.dataset.deleteId;
    }
}

// ── Toast notification ──
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon =
        type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ── Loading state ──
function showLoading(isLoading) {
    const loader = document.getElementById("table-loader");
    if (loader) {
        loader.style.display = isLoading ? "flex" : "none";
    }
}

// ── Search / Filter ──
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#projects-tbody tr");
    rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
    });
}

// ── Utility helpers ──
function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Initialize on DOM load ──
document.addEventListener("DOMContentLoaded", () => {
    // Load logged-in user info
    loadUserInfo();

    // Fetch projects on load
    fetchProjects();

    // Form submit
    const form = document.getElementById("add-project-form");
    if (form) form.addEventListener("submit", handleFormSubmit);

    // Search
    const search = document.getElementById("search-input");
    if (search) search.addEventListener("input", handleSearch);

    // ── Stat card click handlers ──
    const totalCard = document.querySelector(".stat-total");
    const proposalCard = document.querySelector(".stat-proposal");
    const ongoingCard = document.querySelector(".stat-ongoing");
    const completedCard = document.querySelector(".stat-completed");

    if (totalCard) totalCard.addEventListener("click", () => clearFilter());
    if (proposalCard) proposalCard.addEventListener("click", () => filterByStatus("proposal"));
    if (ongoingCard) ongoingCard.addEventListener("click", () => filterByStatus("ongoing"));
    if (completedCard) completedCard.addEventListener("click", () => filterByStatus("completed"));

    // Close modal on backdrop click
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                backdrop.classList.remove("active");
            }
        });
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
            cancelDelete();
        }
    });
});
