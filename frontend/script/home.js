// ===============================
// 🔥 CONFIG
// ===============================
const API_BASE_URL = "http://127.0.0.1:5000";

window.addEventListener('load', async function () {
    await initAuth();
});

// ===============================
// 🔥 INIT AUTH
// ===============================
async function initAuth() {
    console.log("Auth Init...");

    // 1️⃣ Check for token in URL (from Google OAuth)
    const urlToken = getTokenFromURL();
    
    if (urlToken) {
        console.log("Token found in URL, saving to cookie...");

        // Save token to backend cookie
        await saveTokenToCookie(urlToken);

        // Cleanup URL
        const url = new URL(window.location);
        url.searchParams.delete('token');

        if (url.searchParams.get('new_user') === 'true') {
            url.searchParams.delete('new_user');
            showNotification('Welcome! Please complete your profile setup.', 'info');
        }

        window.history.replaceState({}, document.title, url.toString());
    }

    // 2️⃣ Verify cookie-based login (auto keeps user logged in)
    const isLoggedIn = await verifyTokenFromCookie();

    if (!isLoggedIn) {
        console.log("Not logged in — redirecting to login page.");
        window.location.href = 'login_signup.html';
        return;
    }

    console.log("User is logged in via cookie ✔");
}


// ===============================
// 🔥 SAVE TOKEN TO COOKIE (Backend)
// ===============================
async function saveTokenToCookie(token) {
    try {
        await fetch(`${API_BASE_URL}/api/save-token-cookie`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        console.log("Token saved in HttpOnly cookie.");
    } catch (err) {
        console.error("Error saving token cookie:", err);
    }
}


// ===============================
// 🔥 VERIFY TOKEN FROM COOKIE
// ===============================
async function verifyTokenFromCookie() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/verify-token`, {
            method: "POST",
            credentials: "include"
        });

        const data = await res.json();
        return data.success === true;
    } catch (err) {
        console.error("Verify token failed:", err);
        return false;
    }
}


// ===============================
// 🔥 Extract token from URL (?token=xxx)
// ===============================
function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}


// ===============================
// 🔥 Optional Notification
// ===============================
function showNotification(msg, type = 'info') {
    alert(msg); // Replace with your custom UI notification system
}
