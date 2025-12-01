// ============================================
// THEME TOGGLE FUNCTIONALITY
// ============================================

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const metaTheme = document.getElementById('meta-theme-color');
const THEME_KEY = 'college_portal_theme_v3';

// Apply theme: 'dark' or 'light'
function applyTheme(mode) {
    // Remove both classes first
    document.body.classList.remove('dark', 'light');
    
    // Add the selected class to body (not html)
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
(function initTheme() {
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
})();

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

// Only initialize sidebar functionality on mobile/tablet
function initSidebar() {
    // Check if we're on mobile/tablet
    if (window.innerWidth <= 1024) {
        // Show menu toggle button
        if (menuToggle) menuToggle.style.display = 'block';
        
        // Remove active classes to ensure clean state
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (menuIcon) menuIcon.className = 'fas fa-bars';
        document.body.style.overflow = '';
    } else {
        // On desktop, hide menu toggle and ensure sidebar is visible
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
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                profilePicture.innerHTML = '';
                const img = document.createElement('img');
                img.src = event.target.result;
                img.alt = 'Profile picture';
                profilePicture.appendChild(img);
                
                // Store in localStorage for demo purposes
                localStorage.setItem('profile_image', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
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

// Avatar options
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
    // Remove selected class from all options
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
    });
    // Add selected class to clicked option
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
    // Reset selections
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
            // Set selected avatar icon
            profilePicture.innerHTML = `<i class="${selectedAvatar.dataset.avatar}"></i>`;
            
            // Clear uploaded image if any
            localStorage.removeItem('profile_image');
            profilePictureUpload.value = '';
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
        // Remove active class from all options
        profileOptions.forEach(opt => opt.classList.remove('active'));
        // Add active class to clicked option
        this.classList.add('active');
        
        // Hide all form sections
        formSections.forEach(section => section.classList.add('hidden'));
        
        // Show the selected form section
        const targetId = this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            
            // Update progress bar
            updateProgressBar(targetId);
            
            // Focus on first input field for accessibility
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
            // Remove active class from all options
            designationOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update hidden input value
            const optionType = this.getAttribute('data-option');
            if (designationTypeInput) {
                designationTypeInput.value = optionType;
            }
            
            // Hide all designation forms
            designationForms.forEach(form => form.classList.add('hidden'));
            
            // Show the selected designation form
            const targetForm = document.getElementById(`${optionType}-form`);
            if (targetForm) {
                targetForm.classList.remove('hidden');
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
        ${text}
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

// Navigation functions
function navigateToSection(sectionId) {
    // Hide all form sections
    formSections.forEach(section => section.classList.add('hidden'));
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        
        // Update active profile option
        profileOptions.forEach(opt => opt.classList.remove('active'));
        const targetOption = document.querySelector(`.profile-option[data-target="${sectionId}"]`);
        if (targetOption) {
            targetOption.classList.add('active');
        }
        
        // Update progress bar
        updateProgressBar(sectionId);
        
        // Focus on first input for accessibility
        setTimeout(() => {
            const firstInput = targetSection.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

function showSuccessPage() {
    // Hide all form sections
    formSections.forEach(section => section.classList.add('hidden'));
    
    // Show success page
    const successPage = document.getElementById('success-page');
    if (successPage) {
        successPage.classList.remove('hidden');
    }
    
    // Update progress bar to 100%
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
        return 'Please fill in all required fields (Full Name, Username, Email, Age, and Gender)';
    }
    
    if (!fullName.value.trim() || !username.value.trim() || !email.value.trim() || !age.value || !gender.value) {
        return 'Please fill in all required fields (Full Name, Username, Email, Age, and Gender)';
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
        return 'Please enter a valid email address';
    }
    
    // Age validation
    if (parseInt(age.value) < 1 || parseInt(age.value) > 120) {
        return 'Please enter a valid age between 1 and 120';
    }
    
    return null;
}

// ============================================
// FORM SUBMISSIONS
// ============================================

const personalInfoForm = document.getElementById('personal-info');
if (personalInfoForm) {
    personalInfoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const validationError = validatePersonalInfoForm();
        if (validationError) {
            alert(validationError);
            return false;
        }
        
        // Here you would make an API call to save personal info
        console.log('Personal info would be saved via API');
        
        navigateToSection('designation');
    });
}

// ============================================
// SKIP BUTTON HANDLERS
// ============================================

const personalSkipBtn = document.getElementById('personal-skip');
if (personalSkipBtn) {
    personalSkipBtn.addEventListener('click', function() {
        navigateToSection('designation');
    });
}

const designationSkipBtn = document.getElementById('designation-skip');
if (designationSkipBtn) {
    designationSkipBtn.addEventListener('click', function() {
        navigateToSection('general-profile');
    });
}

const generalSkipBtn = document.getElementById('general-skip');
if (generalSkipBtn) {
    generalSkipBtn.addEventListener('click', function() {
        showSuccessPage();
    });
}

// ============================================
// SUCCESS PAGE BUTTONS
// ============================================

const viewProfileBtn = document.getElementById('view-profile');
if (viewProfileBtn) {
    viewProfileBtn.addEventListener('click', function() {
        alert('Profile view functionality would be implemented with backend integration.');
    });
}

const goHomeBtn = document.getElementById('go-home');
if (goHomeBtn) {
    goHomeBtn.addEventListener('click', function() {
        alert('Navigation to home page would be implemented with backend integration.');
    });
}

// ============================================
// OTP VERIFICATION FUNCTIONALITY
// ============================================

let otpTimer = null;
let otpTimeLeft = 120;
let generatedOTP = '';

// DOM elements for OTP
const collegeEmailInput = document.getElementById('college-email');
const sendOtpBtn = document.getElementById('send-otp-btn');
const otpVerificationSection = document.getElementById('otp-verification');
const otpCodeInput = document.getElementById('otp-code');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const resendOtpBtn = document.getElementById('resend-otp-btn');
const otpTimerElement = document.getElementById('timer');
const verificationStatus = document.getElementById('verification-status');

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate college email format
function isValidCollegeEmail(email) {
    const collegeEmailPatterns = [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/i,
        /^[a-zA-Z0-9._%+-]+@college\.[a-zA-Z]{2,}$/i,
        /^[a-zA-Z0-9._%+-]+@university\.[a-zA-Z]{2,}$/i,
        /^[a-zA-Z0-9._%+-]+@ac\.[a-zA-Z]{2,}$/i,
        /^[a-zA-Z0-9._%+-]+@ac\.in$/i
    ];
    
    return collegeEmailPatterns.some(pattern => pattern.test(email));
}

// Start OTP timer
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
        }
    }, 1000);
}

// Update timer display
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

// Show verification status message
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

// Initialize OTP functionality if elements exist
if (sendOtpBtn && collegeEmailInput) {
    // Send OTP button click handler
    sendOtpBtn.addEventListener('click', function() {
        const email = collegeEmailInput.value.trim();
        
        if (!email) {
            showVerificationStatus('Please enter your college email address', 'error');
            return;
        }
        
        if (!isValidCollegeEmail(email)) {
            showVerificationStatus('Please enter a valid college email address', 'error');
            return;
        }
        
        // Generate OTP
        generatedOTP = generateOTP();
        
        // For demo purposes - show OTP in alert
        alert(`OTP sent to ${email}\nDemo OTP: ${generatedOTP}\n\nNote: In production, this OTP would be sent to your email.`);
        
        // Show OTP verification section
        if (otpVerificationSection) {
            otpVerificationSection.classList.remove('hidden');
        }
        
        // Reset OTP input
        if (otpCodeInput) {
            otpCodeInput.value = '';
            otpCodeInput.disabled = false;
        }
        
        // Start timer
        startOTPTimer();
        
        // Show success message
        showVerificationStatus('OTP has been sent to your college email. Please check your inbox.', 'success');
        
        // Enable verify button
        if (verifyOtpBtn) verifyOtpBtn.disabled = false;
        if (resendOtpBtn) resendOtpBtn.disabled = true;
        
        // Disable send OTP button temporarily
        sendOtpBtn.disabled = true;
        setTimeout(() => {
            sendOtpBtn.disabled = false;
        }, 30000);
    });

    // Verify OTP button click handler
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', function() {
            const enteredOTP = otpCodeInput.value.trim();
            
            if (!enteredOTP) {
                showVerificationStatus('Please enter the OTP', 'error');
                return;
            }
            
            if (enteredOTP.length !== 6) {
                showVerificationStatus('OTP must be 6 digits', 'error');
                return;
            }
            
            if (enteredOTP === generatedOTP) {
                // Stop timer
                clearInterval(otpTimer);
                
                // Show success
                showVerificationStatus('Email verified successfully! ✓', 'success');
                
                // Disable OTP input
                if (otpCodeInput) otpCodeInput.disabled = true;
                verifyOtpBtn.disabled = true;
                
                // Enable resend button
                if (resendOtpBtn) resendOtpBtn.disabled = false;
            } else {
                showVerificationStatus('Invalid OTP. Please try again.', 'error');
            }
        });
    }

    // Resend OTP button click handler
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', function() {
            const email = collegeEmailInput.value.trim();
            
            if (!email) {
                showVerificationStatus('Please enter your college email address', 'error');
                return;
            }
            
            // Generate new OTP
            generatedOTP = generateOTP();
            
            // For demo purposes
            alert(`New OTP sent to ${email}\nDemo OTP: ${generatedOTP}`);
            
            // Reset OTP input
            if (otpCodeInput) {
                otpCodeInput.value = '';
                otpCodeInput.disabled = false;
            }
            
            // Restart timer
            startOTPTimer();
            
            // Show success message
            showVerificationStatus('New OTP has been sent to your college email.', 'success');
            
            // Enable verify button
            if (verifyOtpBtn) verifyOtpBtn.disabled = false;
            if (resendOtpBtn) resendOtpBtn.disabled = true;
        });
    }

    // College email input change handler
    collegeEmailInput.addEventListener('input', function() {
        // If email changes, reset verification
        if (otpVerificationSection) otpVerificationSection.classList.add('hidden');
        if (verificationStatus) verificationStatus.classList.add('hidden');
        clearInterval(otpTimer);
        if (otpCodeInput) otpCodeInput.value = '';
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize progress bar
updateProgressBar('personal-info');

// Load saved profile image if exists
window.addEventListener('load', function() {
    const savedImage = localStorage.getItem('profile_image');
    if (savedImage && profilePicture) {
        profilePicture.innerHTML = '';
        const img = document.createElement('img');
        img.src = savedImage;
        img.alt = 'Profile picture';
        profilePicture.appendChild(img);
    }
    
    // Set initial focus for accessibility
    const firstInput = document.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
    
    // Initialize sidebar
    initSidebar();
});