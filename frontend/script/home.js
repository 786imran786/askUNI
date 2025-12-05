// Hide page immediately (prevents flicker)
document.addEventListener("DOMContentLoaded", () => {
    document.body.style.display = "none";
    initHomePageAuth();
});
window.addEventListener("DOMContentLoaded", () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (token) {
        // Save token to localStorage
        localStorage.setItem("token", token);

        // OPTIONAL: clean URL
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
    }

    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
        window.location.href = "login_signup.html";
    }
});

async function initHomePageAuth() {
    try {
        // Call backend to check if user is logged in (Cookie-based)
        const res = await fetch("https://askunibackend.onrender.com/api/verify-token", {
            method: "POST",
                headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    },
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
