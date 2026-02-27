// ============================================
// Auth — Login & Register Logic
// ============================================

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3000"
    : window.location.origin;

// ── If already logged in, go to dashboard ──
(function checkAuth() {
    const user = sessionStorage.getItem("spms_user");
    if (user) {
        window.location.href = "index.html";
    }
})();

// ── Show login or register card ──
function showCard(cardId) {
    document.getElementById("login-card").style.display = "none";
    document.getElementById("register-card").style.display = "none";

    const card = document.getElementById(cardId);
    if (card) {
        card.style.display = "block";
        card.style.animation = "none";
        // Trigger reflow for re-animation
        void card.offsetWidth;
        card.style.animation = "fadeUp 0.4s ease";
    }

    // Clear errors
    hideMessage("login-error");
    hideMessage("register-error");
    hideMessage("register-success");
}

// ── Toggle password visibility ──
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const eyeOpen = btn.querySelector(".eye-open");
    const eyeClosed = btn.querySelector(".eye-closed");

    if (input.type === "password") {
        input.type = "text";
        eyeOpen.style.display = "none";
        eyeClosed.style.display = "block";
    } else {
        input.type = "password";
        eyeOpen.style.display = "block";
        eyeClosed.style.display = "none";
    }
}

// ── Show / Hide messages ──
function showMessage(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
        el.style.display = "block";
    }
}

function hideMessage(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}

// ── Set button loading state ──
function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector(".btn-text");
    const loader = btn.querySelector(".btn-loader");

    btn.disabled = isLoading;
    if (text) text.style.display = isLoading ? "none" : "inline";
    if (loader) loader.style.display = isLoading ? "inline-block" : "none";
}

// ── LOGIN ──
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage("login-error");

            const username = document.getElementById("login-username").value.trim();
            const password = document.getElementById("login-password").value;

            if (!username || !password) {
                showMessage("login-error", "Please fill in all fields.");
                return;
            }

            setLoading("login-btn", true);

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    showMessage("login-error", data.error || "Login failed.");
                    return;
                }

                // Store user in session
                sessionStorage.setItem("spms_user", JSON.stringify(data.user));

                // Redirect to dashboard
                window.location.href = "index.html";
            } catch (err) {
                console.error("Login error:", err);
                showMessage("login-error", "Cannot connect to server. Make sure it's running.");
            } finally {
                setLoading("login-btn", false);
            }
        });
    }

    // ── REGISTER ──
    const regForm = document.getElementById("register-form");
    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideMessage("register-error");
            hideMessage("register-success");

            const full_name = document.getElementById("reg-fullname").value.trim();
            const username = document.getElementById("reg-username").value.trim();
            const password = document.getElementById("reg-password").value;

            if (!full_name || !username || !password) {
                showMessage("register-error", "Please fill in all fields.");
                return;
            }

            if (password.length < 4) {
                showMessage("register-error", "Password must be at least 4 characters.");
                return;
            }

            setLoading("register-btn", true);

            try {
                const res = await fetch(`${API_BASE}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name, username, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    showMessage("register-error", data.error || "Registration failed.");
                    return;
                }

                // Show success & switch to login after 1.5s
                showMessage("register-success", "Account created! Redirecting to login...");
                regForm.reset();

                setTimeout(() => {
                    showCard("login-card");
                }, 1500);
            } catch (err) {
                console.error("Register error:", err);
                showMessage("register-error", "Cannot connect to server. Make sure it's running.");
            } finally {
                setLoading("register-btn", false);
            }
        });
    }
});
