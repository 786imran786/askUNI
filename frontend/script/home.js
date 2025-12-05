// Hide page immediately (prevents flicker)
document.addEventListener("DOMContentLoaded", () => {
    document.body.style.display = "none";
    initHomePageAuth();
});

async function initHomePageAuth() {
    try {
        // Call backend to check if user is logged in (Cookie-based)
        const res = await fetch("http://127.0.0.1:5000/api/verify-token", {
            method: "POST",
            credentials: "include"
        });

        const data = await res.json();

        if (!data.success) {
            // User NOT logged in → redirect instantly
            window.location.href = "login_signup.html";
            return;
        }

        // User logged in → show page
        document.body.style.display = "block";

        console.log("User is logged in:", data.email);

    } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "login_signup.html";
    }
}
