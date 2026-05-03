const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
window.API_BASE_URL = isLocalEnv ? "http://" + window.location.hostname + ":5000" : "https://askunibackend.onrender.com";

function getToken() {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
    if (authCookie) return authCookie.split('=')[1];
    
    const localToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (localToken) return localToken;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

// Custom Alert Function
function showCustomAlert(message) {
    const alertOverlay = document.getElementById('customAlert');
    const alertMessage = document.getElementById('customAlertMessage');
    const alertBtn = document.getElementById('customAlertBtn');

    if (alertOverlay && alertMessage) {
        alertMessage.textContent = message;
        alertOverlay.classList.add('active');
        alertBtn.onclick = function () { alertOverlay.classList.remove('active'); };
        alertOverlay.onclick = function (e) {
            if (e.target === alertOverlay) alertOverlay.classList.remove('active');
        };
    } else {
        alert(message);
    }
}

async function checkAuthStatus() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login_signup.html';
        return false;
    }
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/verify-token`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) {
            localStorage.removeItem('token');
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = 'login_signup.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error("Auth check failed:", error);
        return false;
    }
}

async function handleLogout(e) {
    e.preventDefault();
    try {
        const token = getToken();
        if(token) {
            await fetch(`${window.API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (err) {
        console.error("Logout request failed", err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = 'login_signup.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Guard
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) return;

    // Theme logic
    const savedTheme = localStorage.getItem('college_portal_theme_v3');
    const desktopThemeToggle = document.getElementById('themeToggleHeader');
    const mobileThemeToggle = document.getElementById('themeToggleHeaderMobile');

    if (savedTheme === 'light') {
        document.body.classList.add('light');
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }

    function toggleTheme() {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        localStorage.setItem('college_portal_theme_v3', isLight ? 'light' : 'dark');
        
        const iconHtml = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = iconHtml;
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = iconHtml;
    }

    if (desktopThemeToggle) desktopThemeToggle.addEventListener('click', toggleTheme);
    if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);

    // Mobile menu logic
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function toggleMobileSidebar() {
        mobileSidebar.classList.toggle('active');
        mobileSidebarOverlay.classList.toggle('active');
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleMobileSidebar);
    if (mobileSidebarOverlay) mobileSidebarOverlay.addEventListener('click', toggleMobileSidebar);

    // Logout
    const loginLink = document.getElementById('loginLink');
    const loginLinkMobile = document.getElementById('loginLinkMobile');
    if (loginLink) loginLink.addEventListener('click', handleLogout);
    if (loginLinkMobile) loginLinkMobile.addEventListener('click', handleLogout);

    // Load Profile
    await loadProfile();
});

async function loadProfile() {
    try {
        const token = getToken();
        let res = await fetch(`${window.API_BASE_URL}/api/get-profile-data`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        let data = await res.json();

        if (!data.success) {
            showCustomAlert("Failed to load profile");
            return;
        }

        // Sidebar synchronization (similar to home.js)
        const name = data.personal_info?.full_name || data.user_info?.full_name || 'Student User';
        let status = 'Student';
        if (data.designation?.designation_type === 'student') {
            const program = data.designation.program || '';
            const currentYear = data.designation.current_year || '';
            status = program && currentYear ? `${program}, ${currentYear} Year` : 'Student';
        } else if (data.designation?.designation_type === 'faculty') {
            status = data.designation.post || 'Faculty';
        } else if (data.designation?.designation_type === 'alumni') {
            status = data.designation.job_title || 'Alumni';
        } else if (data.user_info?.email) {
            status = data.user_info.email;
        }

        document.querySelectorAll('.profile-name').forEach(el => el.textContent = name);
        document.querySelectorAll('.profile-status').forEach(el => el.textContent = status);

        if (data.personal_info?.profile_photo) {
            let photoHtml = '';
            if (data.personal_info.profile_photo.startsWith('data:image') || data.personal_info.profile_photo.startsWith('http')) {
                photoHtml = `<img src="${data.personal_info.profile_photo}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                photoHtml = `<i class="${data.personal_info.profile_photo}"></i>`;
            }
            document.querySelectorAll('.profile-avatar, .profile-photo-large').forEach(el => {
                el.innerHTML = photoHtml;
            });
        }

        // Main Profile Content Population
        document.getElementById("full-name").innerText = data.user_info.full_name || "No Name Provided";
        document.getElementById("email").innerText = data.user_info.email || "";
        document.getElementById("username").innerText = data.personal_info?.username || "-";
        document.getElementById("phone").innerText = data.personal_info?.phone || "-";
        document.getElementById("age").innerText = data.personal_info?.age || "-";
        document.getElementById("gender").innerText = data.personal_info?.gender || "-";

        if (data.designation?.is_college_email_verified) {
            document.getElementById("verified-status").innerHTML = `<div class="verified-badge-large"><i class="fas fa-check-circle"></i> Verified Student</div>`;
        } else {
            document.getElementById("verified-status").innerHTML = `<div class="unverified-badge-large"><i class="fas fa-times-circle"></i> Not Verified</div>`;
        }

        const des = data.designation || {};
        let html = "";
        if (des.designation_type === "student") {
            html = `
                <div class="info-box"><div class="info-box-label">Registration No</div><div class="info-box-value">${des.registration_no || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Program</div><div class="info-box-value">${des.program || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Department</div><div class="info-box-value">${des.department || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Current Year</div><div class="info-box-value">${des.current_year || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Graduation Year</div><div class="info-box-value">${des.graduation_year || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">College Email</div><div class="info-box-value">${des.college_email || '-'}</div></div>
            `;
        } else if (des.designation_type === "faculty") {
            html = `
                <div class="info-box"><div class="info-box-label">Faculty ID</div><div class="info-box-value">${des.faculty_id || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Department</div><div class="info-box-value">${des.faculty_department || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Post</div><div class="info-box-value">${des.post || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Courses</div><div class="info-box-value">${des.courses_taught || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Office</div><div class="info-box-value">${des.office_location || '-'}</div></div>
            `;
        } else if (des.designation_type === "alumni") {
            html = `
                <div class="info-box"><div class="info-box-label">Program</div><div class="info-box-value">${des.program || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Department</div><div class="info-box-value">${des.department || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Grad Year</div><div class="info-box-value">${des.graduation_year || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Job Title</div><div class="info-box-value">${des.job_title || '-'}</div></div>
                <div class="info-box"><div class="info-box-label">Company</div><div class="info-box-value">${des.company_name || '-'}</div></div>
            `;
        } else {
            html = `<div style="grid-column: 1 / -1; color: var(--text-2); font-style: italic;">No academic information provided. Update your profile settings to add this.</div>`;
        }
        document.getElementById("designation-section").innerHTML = html;

        document.getElementById("short-bio").innerText = data.general_profile?.short_bio || "No bio available.";

        let skillsHtml = "";
        let skills = (data.general_profile?.skills || "").split(",");
        skills.forEach(s => {
            if (s.trim()) skillsHtml += `<span class="tag-large">${s.trim()}</span>`;
        });
        document.getElementById("skills-tags").innerHTML = skillsHtml || '<span style="color:var(--text-3);font-size:13px;">None</span>';

        let interestsHtml = "";
        let interests = (data.general_profile?.interests || "").split(",");
        interests.forEach(i => {
            if (i.trim()) interestsHtml += `<span class="tag-large">${i.trim()}</span>`;
        });
        document.getElementById("interests-tags").innerHTML = interestsHtml || '<span style="color:var(--text-3);font-size:13px;">None</span>';

        const linkedinBtn = document.getElementById("linkedin");
        if (data.general_profile?.linkedin) {
            linkedinBtn.href = data.general_profile.linkedin;
            linkedinBtn.style.display = "inline-flex";
        }
        
        const githubBtn = document.getElementById("github");
        if (data.general_profile?.github) {
            githubBtn.href = data.general_profile.github;
            githubBtn.style.display = "inline-flex";
        }
        
        const portBtn = document.getElementById("portfolio");
        if (data.general_profile?.portfolio) {
            portBtn.href = data.general_profile.portfolio;
            portBtn.style.display = "inline-flex";
        }

    } catch (error) {
        console.error("Profile load error:", error);
        showCustomAlert("Error loading profile data");
    }
}
