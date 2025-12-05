// script.js
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Frontend functionality only - Theme toggle, flip handling, slideshow

const container = document.getElementById('container');
const registerLinks = document.querySelectorAll('.register-link');
const loginLinks = document.querySelectorAll('.login-link');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const metaTheme = document.getElementById('meta-theme-color');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

const THEME_KEY = 'college_portal_theme_v3';
const modeImage = document.getElementById('modeImage'); // signup image
const mode2 = document.getElementById('modelogin');      // login image      // login image
// Debug logging
console.log('Script loaded');
console.log('Register links found:', registerLinks.length);
console.log('Login links found:', loginLinks.length);

// apply theme: 'dark' or 'light'
function applyTheme(mode){
  document.documentElement.classList.remove('dark','light');
  document.documentElement.classList.add(mode);

  const modeImage = document.getElementById('modeImage');
  const mode2 = document.getElementById('modelogin');
  const modelogo=document.getElementById('modelogo');

  if(mode === 'dark'){
    if(modeImage) modeImage.src = "media/signup.jpeg";
    if(mode2) mode2.src = "media/login3.jpeg";
    if(modelogo) modelogo.src ="media/logo.png";


    themeIcon.className = 'fas fa-sun';
    themeToggle.setAttribute('aria-pressed','true');
    if(metaTheme) metaTheme.setAttribute('content','#0A0F27');
    localStorage.setItem(THEME_KEY,'dark');

  } else {
    if(modeImage) modeImage.src = "media/signup_light.jpeg";
    if(mode2) mode2.src = "media/login_light.jpeg";
    if(modelogo) modelogo.src ="media/logo_light.png";


    themeIcon.className = 'fas fa-moon';
    themeToggle.setAttribute('aria-pressed','false');
    if(metaTheme) metaTheme.setAttribute('content','#1A237E');
    localStorage.setItem(THEME_KEY,'light');
  }
}

// init theme
(function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }
})();

// Theme toggle
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
});

// System theme detection
if(window.matchMedia){
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if(!localStorage.getItem(THEME_KEY)){
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// Flip handling
registerLinks.forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    console.log('Register link clicked');
    container.classList.add('active');
    startSlideshow();
    document.body.style.overflow = 'hidden';
  });
});

loginLinks.forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    console.log('Login link clicked');
    container.classList.remove('active');
    stopSlideshow();
    document.body.style.overflow = '';
  });
});

// Touch swipe handling
let touchStartX = 0, touchEndX = 0;
const card = document.querySelector('.card');

if(card){
  card.addEventListener('touchstart', e => { 
    touchStartX = e.changedTouches[0].screenX; 
  }, {passive:true});
  
  card.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if(Math.abs(diff) > 60){
      if(diff < 0){ 
        container.classList.add('active'); 
        startSlideshow();
        document.body.style.overflow = 'hidden';
      } else { 
        container.classList.remove('active'); 
        stopSlideshow();
        document.body.style.overflow = '';
      }
    }
  }, {passive:true});
}

// Slideshow functionality
let slideIndex = 0;
let slideshowInterval = null;
const slides = document.querySelectorAll('.slide');

function showSlide(index){
  if(!slides || slides.length === 0) return;
  
  slideIndex = index;
  if(slideIndex >= slides.length) slideIndex = 0;
  if(slideIndex < 0) slideIndex = slides.length - 1;
  
  slides.forEach(slide => slide.classList.remove('active'));
  slides[slideIndex].classList.add('active');
}

function nextSlide(){ 
  showSlide(slideIndex + 1); 
}

function startSlideshow(){ 
  stopSlideshow();
  if(slides.length > 1) {
    slideshowInterval = setInterval(nextSlide, 4000);
  }
}

function stopSlideshow(){ 
  if(slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
  }
}

// Client-side form validation (basic)
if(signupForm){
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullname = document.getElementById("signup-fullname").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    const payload = {
        fullname,
        email,
        password
    };

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    try {
        // Set loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';

const res = await fetch("http://127.0.0.1:5000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
});

        const data = await res.json();
        if (data.success) {
            showToast("OTP sent to your email!", "success");

            // Redirect user to OTP page
            localStorage.setItem("pending_email", email);
            
            setTimeout(() => {
                 window.location.href = "otp.html";
            }, 1000); // Small delay to let user see the success message
           
        } else {
            showToast(data.message, "error");
            // Reset button state on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    } catch (err) {
        alert("Server error");
        console.log(err);
        // Reset button state on error
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
});
}

// Handle page resize
window.addEventListener('resize', () => {
  if(container.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

// Initialize slideshow if on signup page
document.addEventListener('DOMContentLoaded', function() {
  if(container.classList.contains('active')) {
    startSlideshow();
  }
});

// Initialize
stopSlideshow();
console.log('College Portal initialized successfully');
// ============================
// OTP VERIFICATION
// ============================
async function verifyOTP() {
    const email = localStorage.getItem("pending_email");
    const otp = document.getElementById("otp-input").value;

    const payload = { email, otp };

const res = await fetch("http://127.0.0.1:5000/api/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
});


    const data = await res.json();

    if(data.success){
        showToast("OTP verified!", "success");


        // remove temp storage
        localStorage.removeItem("pending_email");

        // redirect to details
        window.location.href = "detail.html";
    } else {
        showToast(data.message, "error");

    }
}
// ============================
// LOGIN API CALL
// ============================
// REMEMBER ME FUNCTIONALITY
const rememberCheck = document.getElementById("remember");
const loginUsername = document.getElementById("login-username");

// Load saved username on page load
window.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem("remember_username");
    if (savedUser) {
        loginUsername.value = savedUser;
        rememberCheck.checked = true;
    }
});

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    // Remember me save / remove
    if (rememberCheck.checked) {
        localStorage.setItem("remember_username", username);
    } else {
        localStorage.removeItem("remember_username");
    }

    const payload = { username, password };

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    try {
        // Set loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging you in...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';

  const res = await fetch("http://127.0.0.1:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
});


        const data = await res.json();

        if(data.success){
            showToast("Login successful!", "success");
        
            setTimeout(() => window.location.href = "home.html", 600);
        } else {
            showToast(data.message, "error");
            // Reset button state on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    } catch (err) {
        console.error(err);
        showToast("An error occurred. Please try again.", "error");
        // Reset button state on error
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
});

// ============================
// GOOGLE LOGIN
// ============================
const googleBtn1 = document.getElementById("googleLogin");
const googleBtn2 = document.getElementById("googleSignup");

if(googleBtn1){
    googleBtn1.addEventListener("click", () => {
        window.location.href = "http://127.0.0.1:5000/auth/google";
    });
}

if(googleBtn2){
    googleBtn2.addEventListener("click", () => {
        window.location.href = "http://127.0.0.1:5000/auth/google";
    });
}
document.getElementById("googleLogin").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "http://127.0.0.1:5000/auth/google";
});

document.getElementById("googleSignup").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "http://127.0.0.1:5000/auth/google";
});


