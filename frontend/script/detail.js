// ============================================
// BACKEND API INTEGRATION
// ============================================

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'http://127.0.0.1:5000'; // Update with your Render/backend URL

// JWT Token Management
let authToken = null;
let currentUserId = null;

// Token management functions
function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

function saveToken(token) {
    authToken = token;
    localStorage.setItem('token', token);
}

function clearToken() {
    authToken = null;
    localStorage.removeItem('token');
}

function parseToken() {
    if (!authToken) return null;
    
    try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        currentUserId = payload.user_id;
        return payload;
    } catch (e) {
        console.error('Error parsing token:', e);
        return null;
    }
}

// API Headers
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

// Check if user is logged in
function checkAuth() {
    if (!authToken) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ============================================
// INITIAL AUTHENTICATION
// ============================================

async function initAuth() {
    // Check for token in URL (from Google auth)
    const urlToken = getTokenFromURL();
    if (urlToken) {
        saveToken(urlToken);
        
        // Clean URL
        const url = new URL(window.location);
        url.searchParams.delete('token');
        if (url.searchParams.get('new_user') === 'true') {
            url.searchParams.delete('new_user');
            showNotification('Welcome! Please complete your profile setup.', 'info');
        }
        window.history.replaceState({}, document.title, url.toString());
    } else {
        // Fall back to localStorage
        authToken = localStorage.getItem('token');
    }
    
    // Verify token
    if (authToken) {
        const payload = parseToken();
        if (payload) {
            await verifyTokenWithBackend();
        } else {
            clearToken();
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
}

async function verifyTokenWithBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-token`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ token: authToken })
        });
        const result = await response.json();
        if (result.success) {
            console.log('User authenticated:', currentUserId);
            await loadSavedData();
        } else {
            clearToken();
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        // Continue with local token if backend unreachable
        showNotification('Connected in offline mode. Changes will sync when connection is restored.', 'info');
    }
}

// ============================================
// SAVE DATA TO BACKEND
// ============================================

async function savePersonalInfo(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/save-personal-info`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                user_id: currentUserId,
                ...data
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Personal info saved:', result);
            return true;
        } else {
            throw new Error(result.message || 'Failed to save personal info');
        }
    } catch (error) {
        console.error('Error saving personal info:', error);
        throw error;
    }
}

async function saveDesignation(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/save-designation`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                user_id: currentUserId,
                ...data
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Designation saved:', result);
            return true;
        } else {
            throw new Error(result.message || 'Failed to save designation');
        }
    } catch (error) {
        console.error('Error saving designation:', error);
        throw error;
    }
}

async function saveGeneralProfile(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/save-general-profile`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                user_id: currentUserId,
                ...data
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('General profile saved:', result);
            return true;
        } else {
            throw new Error(result.message || 'Failed to save general profile');
        }
    } catch (error) {
        console.error('Error saving general profile:', error);
        throw error;
    }
}
async function loadSavedData() {
    if (!currentUserId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/get-profile-data`, {
            method: 'GET',
            headers: getHeaders()
        });

        const result = await response.json();

        if (result.success) {
            // 🔥 Save profile data globally so we can use it elsewhere
            window.loadedProfileData = result;

            populateForms(result);
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}


function populateForms(data) {
    // Populate personal info
    if (data.personal_info) {
        const personal = data.personal_info;
        const fullName = document.getElementById('full-name');
        const username = document.getElementById('username');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const age = document.getElementById('age');
        const gender = document.getElementById('gender');
        
        if (fullName && personal.full_name) fullName.value = personal.full_name;
        if (username && personal.username) username.value = personal.username;
        if (email && personal.email) email.value = personal.email;
        if (phone && personal.phone) phone.value = personal.phone;
        if (age && personal.age) age.value = personal.age;
        if (gender && personal.gender) gender.value = personal.gender;
    }
    
    // Populate designation
    if (data.designation) {
        const designation = data.designation;
        const designationType = document.getElementById('designation-type');
        
        if (designationType && designation.designation_type) {
            designationType.value = designation.designation_type;
            
            // Activate corresponding option
            const option = document.querySelector(`.designation-option[data-option="${designation.designation_type}"]`);
            if (option) {
                option.click();
            }
            
            // Populate form based on type
            if (designation.designation_type === 'student') {
                const registrationNo = document.getElementById('registration-no');
                const program = document.getElementById('program');
                const department = document.getElementById('department');
                const currentYear = document.getElementById('current-year');
                const graduationYear = document.getElementById('graduation-year');
                const collegeEmail = document.getElementById('college-email');
                
                if (registrationNo && designation.registration_no) registrationNo.value = designation.registration_no;
                if (program && designation.program) program.value = designation.program;
                if (department && designation.department) department.value = designation.department;
                if (currentYear && designation.current_year) currentYear.value = designation.current_year;
                if (graduationYear && designation.graduation_year) graduationYear.value = designation.graduation_year;
                if (collegeEmail && designation.college_email) {
                    collegeEmail.value = designation.college_email;
                    // If email is verified, set flag
                    if (designation.is_college_email_verified) {
                        isCollegeEmailVerified = true;
                        showVerificationStatus('College email already verified ✓', 'success');
                    }
                }
            }
        }
    }
    
    // Populate general profile
    if (data.general_profile) {
        const general = data.general_profile;
        const shortBio = document.getElementById('short-bio');
        const skills = document.getElementById('skills');
        const interests = document.getElementById('interests');
        const linkedin = document.getElementById('general-linkedin');
        const github = document.getElementById('github');
        const portfolio = document.getElementById('portfolio');
        
        if (shortBio && general.short_bio) shortBio.value = general.short_bio;
        if (skills && general.skills) {
            // Parse and create tags
            general.skills.split(',').forEach(skill => {
                const trimmed = skill.trim();
                if (trimmed) createTag(trimmed, skillsTagsContainer);
            });
        }
        if (interests && general.interests) {
            // Parse and create tags
            general.interests.split(',').forEach(interest => {
                const trimmed = interest.trim();
                if (trimmed) createTag(trimmed, interestsTagsContainer);
            });
        }
        if (linkedin && general.linkedin) linkedin.value = general.linkedin;
        if (github && general.github) github.value = general.github;
        if (portfolio && general.portfolio) portfolio.value = general.portfolio;
    }
}

// ============================================
// THEME TOGGLE FUNCTIONALITY
// ============================================

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const metaTheme = document.getElementById('meta-theme-color');
const THEME_KEY = 'college_portal_theme_v3';

// Apply theme: 'dark' or 'light'
function applyTheme(mode) {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(mode);

    if (mode === 'dark') {
        themeIcon.className = 'fas fa-sun'; 
        themeToggle.setAttribute('aria-pressed', 'true');
        if (metaTheme) metaTheme.setAttribute('content', '#0A0F27');
        localStorage.setItem(THEME_KEY, 'dark');
    } else {
        themeIcon.className = 'fas fa-moon';
        themeToggle.setAttribute('aria-pressed', 'false');
        if (metaTheme) metaTheme.setAttribute('content', '#1A237E');
        localStorage.setItem(THEME_KEY, 'light');
    }
}

// Initialize theme
function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }
}


// Theme toggle event listener
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
}

// System theme detection
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// ============================================
// SIDEBAR TOGGLE FUNCTIONALITY
// ============================================

const menuToggle = document.getElementById('menuToggle');
const menuIcon = document.getElementById('menuIcon');
const sidebar = document.querySelector('.div2');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function initSidebar() {
    if (window.innerWidth <= 1024) {
        if (menuToggle) menuToggle.style.display = 'block';
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (menuIcon) menuIcon.className = 'fas fa-bars';
        document.body.style.overflow = '';
    } else {
        if (menuToggle) menuToggle.style.display = 'none';
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function toggleSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    
    if (menuIcon) {
        if (sidebar.classList.contains('active')) {
            menuIcon.className = 'fas fa-times';
            menuToggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        } else {
            menuIcon.className = 'fas fa-bars';
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }
}

function closeSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    if (menuIcon) {
        menuIcon.className = 'fas fa-bars';
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
}

// Event Listeners for sidebar
if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// Close sidebar when clicking on a profile option (on mobile)
document.querySelectorAll('.profile-option').forEach(option => {
    option.addEventListener('click', function() {
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    });
});

// Close sidebar on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
        closeSidebar();
    }
});

// Initialize sidebar on load and resize
window.addEventListener('load', initSidebar);
window.addEventListener('resize', initSidebar);

// ============================================
// PROFILE PICTURE UPLOAD FUNCTIONALITY
// ============================================

const profilePictureUploadBtn = document.getElementById('profile-picture-upload-btn');
const profilePictureUpload = document.getElementById('profile-picture-upload');
const profilePicture = document.getElementById('profile-picture');

if (profilePictureUploadBtn && profilePictureUpload) {
    profilePictureUploadBtn.addEventListener('click', function() {
        profilePictureUpload.click();
    });

    profilePictureUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('File size should be less than 5MB', 'error');
                return;
            }

            if (!file.type.startsWith('image/')) {
                showNotification('Please select an image file', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                profilePicture.innerHTML = '';
                const img = document.createElement('img');
                img.src = event.target.result;
                img.alt = 'Profile picture';
                profilePicture.appendChild(img);
                
                // Save to localStorage for demo
               saveProfilePhotoToBackend(event.target.result);

            };
            reader.readAsDataURL(file);
        }
    });
}
async function saveProfilePhotoToBackend(base64Image) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/save-profile-photo`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                photo: base64Image
            })
        });

        const result = await response.json();

        if (!result.success) {
            showNotification(result.message || "Failed to save photo", "error");
        } else {
            showNotification("Profile photo updated!", "success");
        }

    } catch (err) {
        console.error("Photo upload error:", err);
        showNotification("Failed to upload photo!", "error");
    }
}

// ============================================
// AVATAR SELECTION MODAL
// ============================================

const avatarModal = document.getElementById('avatar-modal');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const closeModalBtn = document.getElementById('close-modal');
const cancelAvatarBtn = document.getElementById('cancel-avatar');
const saveAvatarBtn = document.getElementById('save-avatar');
const avatarGrid = document.getElementById('avatar-grid');

const avatarOptions = [
    'fas fa-user',
    'fas fa-user-tie',
    'fas fa-user-graduate',
    'fas fa-user-ninja',
    'fas fa-user-astronaut',
    'fas fa-user-md',
    'fas fa-user-secret',
    'fas fa-user-injured',
    'fas fa-robot',
    'fas fa-cat',
    'fas fa-dog',
    'fas fa-dragon'
];

// Populate avatar grid
if (avatarGrid) {
    avatarOptions.forEach((avatar, index) => {
        const avatarOption = document.createElement('div');
        avatarOption.className = 'avatar-option';
        avatarOption.innerHTML = `<i class="${avatar}"></i>`;
        avatarOption.dataset.avatar = avatar;
        avatarOption.setAttribute('tabindex', '0');
        avatarOption.setAttribute('role', 'button');
        avatarOption.setAttribute('aria-label', `Avatar option ${index + 1}`);
        
        avatarOption.addEventListener('click', function() {
            selectAvatarOption(this);
        });
        
        avatarOption.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectAvatarOption(this);
            }
        });
        
        avatarGrid.appendChild(avatarOption);
    });
}

function selectAvatarOption(option) {
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
    });
    option.classList.add('selected');
    option.setAttribute('aria-selected', 'true');
}

// Open modal
if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', function() {
        avatarModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

// Close modal
function closeAvatarModal() {
    avatarModal.classList.remove('active');
    document.body.style.overflow = '';
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeAvatarModal);
}

if (cancelAvatarBtn) {
    cancelAvatarBtn.addEventListener('click', closeAvatarModal);
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && avatarModal.classList.contains('active')) {
        closeAvatarModal();
    }
});

// Close modal on outside click
if (avatarModal) {
    avatarModal.addEventListener('click', function(e) {
        if (e.target === avatarModal) {
            closeAvatarModal();
        }
    });
}

// Save avatar selection
if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener('click', function() {
        const selectedAvatar = document.querySelector('.avatar-option.selected');
        
        if (selectedAvatar) {
            profilePicture.innerHTML = `<i class="${selectedAvatar.dataset.avatar}"></i>`;
            localStorage.removeItem('profile_image');
            profilePictureUpload.value = '';
            
            // In a real app, save to backend here
            // await saveAvatarToBackend(selectedAvatar.dataset.avatar);
        }
        
        closeAvatarModal();
    });
}

// ============================================
// PROFILE OPTIONS NAVIGATION
// ============================================

const profileOptions = document.querySelectorAll('.profile-option');
const formSections = document.querySelectorAll('.div3 > .form-container, .div3 > #success-page');

profileOptions.forEach(option => {
    option.addEventListener('click', function() {
        if (!checkAuth()) return;
        
        profileOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        formSections.forEach(section => section.classList.add('hidden'));
        
        const targetId = this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            updateProgressBar(targetId);
            setTimeout(() => {
                const firstInput = targetSection.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    });
});

// ============================================
// DESIGNATION OPTIONS NAVIGATION
// ============================================

const designationOptions = document.querySelectorAll('.designation-option');
const designationTypeInput = document.getElementById('designation-type');
const designationForms = document.querySelectorAll('.designation-form');

if (designationOptions.length > 0) {
  designationOptions.forEach(option => {
    option.addEventListener('click', function() {
        
        // Remove active from all
        designationOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');

        const optionType = this.getAttribute('data-option');

        // Update hidden input
        designationTypeInput.value = optionType;

        // Hide all forms + remove required fields
        designationForms.forEach(form => {
            form.classList.add('hidden');
            form.querySelectorAll('[required]').forEach(input => {
                input.dataset.wasRequired = "true";
                input.removeAttribute('required');
            });
        });

        // Show selected form + restore required fields
        const targetForm = document.getElementById(`${optionType}-form`);
        if (targetForm) {
            targetForm.classList.remove('hidden');
            targetForm.querySelectorAll('[data-was-required="true"]').forEach(input => {
                input.setAttribute('required', 'required');
            });
        }
    });
});

}

// ============================================
// DEPARTMENT OPTIONS BASED ON PROGRAM SELECTION
// ============================================

const programSelect = document.getElementById('program');
const departmentSelect = document.getElementById('department');
const alumniProgramSelect = document.getElementById('alumni-program');
const alumniDepartmentSelect = document.getElementById('alumni-department');

const departmentOptions = {
    btech: ['Computer Science', 'Mechanical', 'Electrical', 'Civil', 'Electronics'],
    bba: ['Marketing', 'Finance', 'Human Resources', 'Operations'],
    bca: ['Software Development', 'Networking', 'Database Management'],
    mba: ['Marketing', 'Finance', 'Human Resources', 'Operations', 'International Business']
};

function updateDepartmentOptions(programSelect, departmentSelect) {
    if (!programSelect || !departmentSelect) return;
    
    const selectedProgram = programSelect.value;
    departmentSelect.innerHTML = '<option value="">Select Department</option>';
    
    if (selectedProgram && departmentOptions[selectedProgram]) {
        departmentOptions[selectedProgram].forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.toLowerCase().replace(/\s+/g, '_');
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });
    }
}

if (programSelect && departmentSelect) {
    programSelect.addEventListener('change', function() {
        updateDepartmentOptions(programSelect, departmentSelect);
    });
}

if (alumniProgramSelect && alumniDepartmentSelect) {
    alumniProgramSelect.addEventListener('change', function() {
        updateDepartmentOptions(alumniProgramSelect, alumniDepartmentSelect);
    });
}

// ============================================
// TAGS FUNCTIONALITY FOR SKILLS AND INTERESTS
// ============================================

const skillsInput = document.getElementById('skills');
const interestsInput = document.getElementById('interests');
const skillsTagsContainer = document.getElementById('skills-tags');
const interestsTagsContainer = document.getElementById('interests-tags');

function createTag(text, container) {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
        <span class="tag-text">${text}</span>
        <span class="tag-remove" role="button" tabindex="0" aria-label="Remove tag">×</span>
    `;
    
    const removeBtn = tag.querySelector('.tag-remove');
    removeBtn.addEventListener('click', function() {
        container.removeChild(tag);
    });
    
    removeBtn.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            container.removeChild(tag);
        }
    });
    
    container.appendChild(tag);
}

function handleTagInput(input, container) {
    if (!input || !container) return;
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const text = this.value.trim();
            if (text) {
                createTag(text, container);
                this.value = '';
            }
        }
    });
}

handleTagInput(skillsInput, skillsTagsContainer);
handleTagInput(interestsInput, interestsTagsContainer);

// ============================================
// FORM NAVIGATION AND PROGRESS TRACKING
// ============================================

function updateProgressBar(currentSection) {
    let progress = 0;
    
    switch(currentSection) {
        case 'personal-info':
            progress = 33;
            break;
        case 'designation':
            progress = 66;
            break;
        case 'general-profile':
            progress = 100;
            break;
    }
    
    const progressBar = document.getElementById('form-progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function navigateToSection(sectionId) {
    if (!checkAuth()) return;
    
    formSections.forEach(section => section.classList.add('hidden'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        profileOptions.forEach(opt => opt.classList.remove('active'));
        const targetOption = document.querySelector(`.profile-option[data-target="${sectionId}"]`);
        if (targetOption) {
            targetOption.classList.add('active');
        }
        
        updateProgressBar(sectionId);
        
        setTimeout(() => {
            const firstInput = targetSection.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function showSuccessPage() {
    formSections.forEach(section => section.classList.add('hidden'));
    
    const successPage = document.getElementById('success-page');
    if (successPage) {
        successPage.classList.remove('hidden');
    }
    
    updateProgressBar('general-profile');
}

// ============================================
// FORM VALIDATION HELPERS
// ============================================

function validatePersonalInfoForm() {
    const fullName = document.getElementById('full-name');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const age = document.getElementById('age');
    const gender = document.getElementById('gender');
    
    if (!fullName || !username || !email || !age || !gender) {
        return 'Please fill in all required fields';
    }
    
    if (!fullName.value.trim() || !username.value.trim() || !email.value.trim() || !age.value || !gender.value) {
        return 'Please fill in all required fields';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
        return 'Please enter a valid email address';
    }
    
    if (parseInt(age.value) < 1 || parseInt(age.value) > 120) {
        return 'Please enter a valid age between 1 and 120';
    }
    
    return null;
}

function validateDesignationForm() {
    const designationType = document.getElementById('designation-type').value;
    
    if (!designationType) {
        return 'Please select a designation type';
    }
    
    // Validate based on designation type
    if (designationType === 'student') {
        const regNo = document.getElementById('registration-no');
        const program = document.getElementById('program');
        const department = document.getElementById('department');
        const currentYear = document.getElementById('current-year');
        const graduationYear = document.getElementById('graduation-year');
        const collegeEmail = document.getElementById('college-email');
        
        if (!regNo.value.trim() || !program.value || !department.value || !currentYear.value || !graduationYear.value || !collegeEmail.value.trim()) {
            return 'Please fill in all required student fields';
        }
        
        // College email validation
        const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@(students\.)?(lpu\.in|lpu\.co\.in)$/i;
        if (!collegeEmailRegex.test(collegeEmail.value.trim())) {
            return 'Please enter a valid LPU college email';
        }
        
    } else if (designationType === 'faculty') {
        const facultyId = document.getElementById('faculty-id');
        const facultyDept = document.getElementById('faculty-department');
        const post = document.getElementById('post');
        const courses = document.getElementById('courses-taught');
        const office = document.getElementById('office-location');
        const experience = document.getElementById('experience');
        
        if (!facultyId.value.trim() || !facultyDept.value.trim() || !post.value.trim() || 
            !courses.value.trim() || !office.value.trim() || !experience.value) {
            return 'Please fill in all required faculty fields';
        }
        
    } else if (designationType === 'alumni') {
        const gradYear = document.getElementById('alumni-graduation-year');
        const alumniProgram = document.getElementById('alumni-program');
        const alumniDept = document.getElementById('alumni-department');
        const jobTitle = document.getElementById('job-title');
        const companyName = document.getElementById('company-name');
        
        if (!gradYear.value || !alumniProgram.value || !alumniDept.value || 
            !jobTitle.value.trim() || !companyName.value.trim()) {
            return 'Please fill in all required alumni fields';
        }
    }
    
    return null;
}

function validateGeneralProfileForm() {
    const shortBio = document.getElementById('short-bio');
    const skills = document.getElementById('skills');
    const interests = document.getElementById('interests');
    
    // Check if we have tags or input value
    const skillsTags = Array.from(skillsTagsContainer.querySelectorAll('.tag-text')).map(tag => tag.textContent);
    const interestsTags = Array.from(interestsTagsContainer.querySelectorAll('.tag-text')).map(tag => tag.textContent);
    
    const hasSkills = skillsTags.length > 0 || skills.value.trim().length > 0;
    const hasInterests = interestsTags.length > 0 || interests.value.trim().length > 0;
    
    if (!shortBio.value.trim() || !hasSkills || !hasInterests) {
        return 'Please fill in all required fields (Bio, Skills, Interests)';
    }
    
    if (shortBio.value.trim().length < 10) {
        return 'Please write a more detailed bio (at least 10 characters)';
    }
    
    return null;
}

// ============================================
// NOTIFICATION HELPER
// ============================================

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// ============================================
// FORM SUBMISSIONS WITH BACKEND INTEGRATION
// ============================================

const personalInfoForm = document.getElementById('personal-info');
if (personalInfoForm) {
    personalInfoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!checkAuth()) return;
        
        const validationError = validatePersonalInfoForm();
        if (validationError) {
            showNotification(validationError, 'error');
            return false;
        }
        
        const formData = {
            full_name: document.getElementById('full-name').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim() || null,
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value
        };
        
        try {
            const submitBtn = document.getElementById('personal-continue');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>';
            submitBtn.disabled = true;
            
            await savePersonalInfo(formData);
            showNotification('Personal information saved successfully!', 'success');
            navigateToSection('designation');
            
        } catch (error) {
            showNotification(error.message || 'Failed to save personal information', 'error');
        } finally {
            const submitBtn = document.getElementById('personal-continue');
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> <span>Continue</span>';
            submitBtn.disabled = false;
        }
    });
}

const designationForm = document.getElementById('designation');
if (designationForm) {
    designationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!checkAuth()) return;
        
        const validationError = validateDesignationForm();
        if (validationError) {
            showNotification(validationError, 'error');
            return false;
        }
        
        const designationType = document.getElementById('designation-type').value;
        let formData = {
            designation_type: designationType
        };
        
        // Collect data based on designation type
        if (designationType === 'student') {
            formData = {
                ...formData,
                registration_no: document.getElementById('registration-no').value.trim(),
                program: document.getElementById('program').value,
                department: document.getElementById('department').value,
                current_year: parseInt(document.getElementById('current-year').value),
                graduation_year: parseInt(document.getElementById('graduation-year').value),
                college_email: document.getElementById('college-email').value.trim(),
                is_college_email_verified: isCollegeEmailVerified || false
            };
        } else if (designationType === 'faculty') {
            formData = {
                ...formData,
                faculty_id: document.getElementById('faculty-id').value.trim(),
                faculty_department: document.getElementById('faculty-department').value.trim(),
                post: document.getElementById('post').value.trim(),
                courses_taught: document.getElementById('courses-taught').value.trim(),
                office_location: document.getElementById('office-location').value.trim(),
                experience: parseInt(document.getElementById('experience').value),
                research: document.getElementById('research').value.trim() || null
            };
        } else if (designationType === 'alumni') {
            formData = {
                ...formData,
                graduation_year: parseInt(document.getElementById('alumni-graduation-year').value),
                program: document.getElementById('alumni-program').value,
                department: document.getElementById('alumni-department').value,
                job_title: document.getElementById('job-title').value.trim(),
                company_name: document.getElementById('company-name').value.trim(),
                linkedin: document.getElementById('linkedin').value.trim() || null
            };
        }
        
        try {
            const submitBtn = document.getElementById('designation-continue');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>';
            submitBtn.disabled = true;
            
            await saveDesignation(formData);
            showNotification('Designation information saved successfully!', 'success');
            navigateToSection('general-profile');
            
        } catch (error) {
            showNotification(error.message || 'Failed to save designation information', 'error');
        } finally {
            const submitBtn = document.getElementById('designation-continue');
            submitBtn.innerHTML = '<i class="fas fa-arrow-right"></i> <span>Continue</span>';
            submitBtn.disabled = false;
        }
    });
}

const generalProfileForm = document.getElementById('general-profile');
if (generalProfileForm) {
    generalProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!checkAuth()) return;
        
        const validationError = validateGeneralProfileForm();
        if (validationError) {
            showNotification(validationError, 'error');
            return false;
        }
        
        // Collect skills tags
        const skillsTags = Array.from(skillsTagsContainer.querySelectorAll('.tag-text')).map(tag => tag.textContent);
        const skillsValue = skillsTags.length > 0 ? skillsTags.join(', ') : document.getElementById('skills').value.trim();
        
        // Collect interests tags
        const interestsTags = Array.from(interestsTagsContainer.querySelectorAll('.tag-text')).map(tag => tag.textContent);
        const interestsValue = interestsTags.length > 0 ? interestsTags.join(', ') : document.getElementById('interests').value.trim();
        
        const formData = {
            short_bio: document.getElementById('short-bio').value.trim(),
            skills: skillsValue,
            interests: interestsValue,
            linkedin: document.getElementById('general-linkedin').value.trim() || null,
            github: document.getElementById('github').value.trim() || null,
            portfolio: document.getElementById('portfolio').value.trim() || null
        };
        
        try {
            const submitBtn = document.getElementById('general-submit');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>';
            submitBtn.disabled = true;
            
            await saveGeneralProfile(formData);
            showNotification('Profile setup complete!', 'success');
            showSuccessPage();
            
        } catch (error) {
            showNotification(error.message || 'Failed to save profile information', 'error');
        } finally {
            const submitBtn = document.getElementById('general-submit');
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Submit Profile</span>';
            submitBtn.disabled = false;
        }
    });
}

// ============================================
// SKIP BUTTON HANDLERS
// ============================================

const personalSkipBtn = document.getElementById('personal-skip');
if (personalSkipBtn) {
    personalSkipBtn.addEventListener('click', function() {
        if (!checkAuth()) return;
        navigateToSection('designation');
    });
}

const designationSkipBtn = document.getElementById('designation-skip');
if (designationSkipBtn) {
    designationSkipBtn.addEventListener('click', function() {
        if (!checkAuth()) return;
        navigateToSection('general-profile');
    });
}

const generalSkipBtn = document.getElementById('general-skip');
if (generalSkipBtn) {
    generalSkipBtn.addEventListener('click', function() {
        if (!checkAuth()) return;
        showSuccessPage();
    });
}

// ============================================
// SUCCESS PAGE BUTTONS
// ============================================

const viewProfileBtn = document.getElementById('view-profile');
if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function() {
        window.location.href = 'profile.html';
    });
}

const goHomeBtn = document.getElementById('go-home');
if (goHomeBtn) {
    goHomeBtn.addEventListener('click', function() {
        window.location.href = 'home.html';
    });
}

// ============================================
// OTP VERIFICATION FUNCTIONALITY
// ============================================

let otpTimer = null;
let otpTimeLeft = 120;
let generatedOTP = '';
let isCollegeEmailVerified = false;

const collegeEmailInput = document.getElementById('college-email');
const sendOtpBtn = document.getElementById('send-otp-btn');
const otpVerificationSection = document.getElementById('otp-verification');
const otpCodeInput = document.getElementById('otp-code');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const resendOtpBtn = document.getElementById('resend-otp-btn');
const otpTimerElement = document.getElementById('timer');
const verificationStatus = document.getElementById('verification-status');

function isValidCollegeEmail(email) {
    const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@(students\.)?(lpu\.in|lpu\.co\.in)$/i;
    return collegeEmailRegex.test(email);
}

function startOTPTimer() {
    clearInterval(otpTimer);
    otpTimeLeft = 120;
    updateTimerDisplay();
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        updateTimerDisplay();
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            if (otpTimerElement) otpTimerElement.style.color = '#e74c3c';
            if (otpCodeInput) otpCodeInput.disabled = true;
            showVerificationStatus('OTP has expired. Please request a new one.', 'error');
            if (verifyOtpBtn) verifyOtpBtn.disabled = true;
            if (resendOtpBtn) resendOtpBtn.disabled = false;
            isCollegeEmailVerified = false;
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (otpTimerElement) {
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        otpTimerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (otpTimeLeft < 30) {
            otpTimerElement.style.color = '#e74c3c';
        } else {
            otpTimerElement.style.color = '';
        }
    }
}

function showVerificationStatus(message, type = 'info') {
    if (verificationStatus) {
        verificationStatus.textContent = message;
        verificationStatus.className = 'verification-status ' + type;
        verificationStatus.classList.remove('hidden');
        
        if (type === 'info') {
            setTimeout(() => {
                verificationStatus.classList.add('hidden');
            }, 3000);
        }
    }
}

// College Email OTP Backend Functions
async function sendCollegeOTP(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-college-otp`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                email: email,
                user_id: currentUserId
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error sending college OTP:', error);
        return { success: false, message: 'Failed to send OTP' };
    }
}

async function verifyCollegeOTP(email, otp) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-college-otp`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                email: email,
                otp: otp,
                user_id: currentUserId
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error verifying college OTP:', error);
        return { success: false, message: 'Failed to verify OTP' };
    }
}

// Initialize OTP functionality if elements exist
if (sendOtpBtn && collegeEmailInput) {
    // Send OTP button click handler
    sendOtpBtn.addEventListener('click', async function() {
        const email = collegeEmailInput.value.trim();
        
        if (!email) {
            showNotification('Please enter your college email address', 'error');
            return;
        }
        
        if (!isValidCollegeEmail(email)) {
            showNotification('Please enter a valid LPU college email', 'error');
            return;
        }
        
        try {
            sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
            sendOtpBtn.disabled = true;
            
            const result = await sendCollegeOTP(email);
            
if (result.success) {

    // 🔥 Already verified? No need to show OTP box
    if (result.already_verified) {
        showNotification("This email is already verified ✓", "success");
        isCollegeEmailVerified = true;

        // Disable input + buttons
        collegeEmailInput.disabled = true;
        sendOtpBtn.disabled = true;

        otpVerificationSection.classList.add("hidden");
        verificationStatus.textContent = "Already verified ✓";
        verificationStatus.className = "verification-status success";
        verificationStatus.classList.remove("hidden");
        return;
    }

    // ---- Normal OTP Flow ----
    alert(`OTP sent to ${email}\nDemo OTP: ${result.otp}`);

    generatedOTP = result.otp;

    otpVerificationSection.classList.remove('hidden');

    otpCodeInput.value = "";
    otpCodeInput.disabled = false;

    startOTPTimer();
    showNotification('OTP has been sent to your college email.', 'success');

    verifyOtpBtn.disabled = false;
    resendOtpBtn.disabled = true;
}
else {
    showNotification(result.message || 'Failed to send OTP', 'error');
}

            
        } catch (error) {
            showNotification('Failed to send OTP. Please try again.', 'error');
        } finally {
            sendOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Send OTP</span>';
            sendOtpBtn.disabled = false;
        }
    });

    // Verify OTP button click handler
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async function() {
            const enteredOTP = otpCodeInput.value.trim();
            
            if (!enteredOTP) {
                showNotification('Please enter the OTP', 'error');
                return;
            }
            
            if (enteredOTP.length !== 6) {
                showNotification('OTP must be 6 digits', 'error');
                return;
            }
            
            try {
                verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verifying...</span>';
                verifyOtpBtn.disabled = true;
                
                const result = await verifyCollegeOTP(collegeEmailInput.value.trim(), enteredOTP);
                
                if (result.success) {
                    clearInterval(otpTimer);
                    showNotification('College email verified successfully!', 'success');
                    
                    if (otpCodeInput) otpCodeInput.disabled = true;
                    verifyOtpBtn.disabled = true;
                    
                    if (resendOtpBtn) resendOtpBtn.disabled = false;
                    
                    isCollegeEmailVerified = true;
                    
                } else {
                    showNotification(result.message || 'Invalid OTP. Please try again.', 'error');
                }
                
            } catch (error) {
                showNotification('Failed to verify OTP. Please try again.', 'error');
            } finally {
                verifyOtpBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Verify OTP</span>';
                verifyOtpBtn.disabled = false;
            }
        });
    }

    // Resend OTP button click handler
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async function() {
            const email = collegeEmailInput.value.trim();
            
            if (!email) {
                showNotification('Please enter your college email address', 'error');
                return;
            }
            
            try {
                resendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Resending...</span>';
                resendOtpBtn.disabled = true;
                
                const result = await sendCollegeOTP(email);
                
                if (result.success) {
                    generatedOTP = result.otp || Math.floor(100000 + Math.random() * 900000).toString();
                    
                    alert(`New OTP sent to ${email}\nDemo OTP: ${generatedOTP}`);
                    
                    if (otpCodeInput) {
                        otpCodeInput.value = '';
                        otpCodeInput.disabled = false;
                    }
                    
                    startOTPTimer();
                    showNotification('New OTP has been sent to your college email.', 'success');
                    
                    if (verifyOtpBtn) verifyOtpBtn.disabled = false;
                    if (resendOtpBtn) resendOtpBtn.disabled = true;
                    
                } else {
                    showNotification(result.message || 'Failed to resend OTP', 'error');
                }
                
            } catch (error) {
                showNotification('Failed to resend OTP. Please try again.', 'error');
            } finally {
                resendOtpBtn.innerHTML = '<i class="fas fa-redo"></i> <span>Resend OTP</span>';
                resendOtpBtn.disabled = false;
            }
        });
    }

    // College email input change handler
    collegeEmailInput.addEventListener('input', function() {
        if (otpVerificationSection) otpVerificationSection.classList.add('hidden');
        if (verificationStatus) verificationStatus.classList.add('hidden');
        clearInterval(otpTimer);
        if (otpCodeInput) otpCodeInput.value = '';
        isCollegeEmailVerified = false;
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize progress bar
updateProgressBar('personal-info');

// Main initialization
window.addEventListener('load', async function() {
    try {
        await initAuth();
        
        // Load saved profile image if exists
if (profilePicture && window.loadedProfileData) {
    const photo = window.loadedProfileData.personal_info?.profile_photo;
    if (photo) {
        profilePicture.innerHTML = '';
        const img = document.createElement('img');
        img.src = photo;
        img.alt = 'Profile picture';
        profilePicture.appendChild(img);
    }
}

        initTheme();
        initSidebar();
        
        // Set initial focus for accessibility
        setTimeout(() => {
            const firstInput = document.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize application', 'error');
    }
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s, transform 0.3s;
        max-width: 350px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    
    .notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .notification.success {
        background: linear-gradient(135deg, #2ecc71, #27ae60);
        border-left: 4px solid #27ae60;
    }
    
    .notification.error {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        border-left: 4px solid #c0392b;
    }
    
    .notification.info {
        background: linear-gradient(135deg, #3498db, #2980b9);
        border-left: 4px solid #2980b9;
    }
    
    .notification i {
        font-size: 1.2em;
    }
`;

document.head.appendChild(style);