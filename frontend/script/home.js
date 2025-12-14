// Initialize page
async function initializePage() {
    const savedTheme = localStorage.getItem('college_portal_theme_v3');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        const desktopThemeToggle = document.getElementById('themeToggleHeader');
        const mobileThemeToggle = document.getElementById('themeToggleHeaderMobile');
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    adjustViewport();
    detectTouchDevice();
    adjustForScreenHeight();

    await showWelcomeMessage();

    // Load questions from backend
    await loadQuestions();

    // Load popular tags from backend
    await loadPopularTags();
}

async function loadQuestions() {
    try {
        console.log("Fetching questions from backend...");
        const response = await fetch('https://askunibackend.onrender.com/api/questions', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error(`Failed to load questions: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Questions data received:", data);

        if (data.success) {
            renderQuestions(data.questions);
        } else {
            console.error('Error loading questions:', data.message);
            // Show fallback questions if API fails
            showFallbackQuestions();
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        showFallbackQuestions();
    }
}

async function loadPopularTags() {
    try {
        const response = await fetch('https://askunibackend.onrender.com/api/tags');
        const data = await response.json();

        if (data.success && data.tags) {
            const tagsContainer = document.querySelector('.tags-container');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                data.tags.slice(0, 16).forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag.name;
                    tagElement.addEventListener('click', () => filterByTag(tag.name));
                    tagsContainer.appendChild(tagElement);
                });
            }
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function renderQuestions(questions) {
    const questionsContainer = document.querySelector('.div4');
    if (!questionsContainer) return;

    questionsContainer.innerHTML = '';

    if (questions.length === 0) {
        questionsContainer.innerHTML = `
            <div class="no-questions">
                <i class="fas fa-question-circle fa-3x"></i>
                <h3>No questions yet</h3>
                <p>Be the first to ask a question!</p>
                <button class="btn btn-primary" onclick="handleAskQuestion()">
                    <i class="fas fa-plus-circle"></i> Ask Your First Question
                </button>
            </div>
        `;
        return;
    }

    questions.forEach(question => {
        const questionElement = createQuestionElement(question);
        questionsContainer.appendChild(questionElement);
    });
}

function createQuestionElement(question) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.id = `question-${question.id}`;

    const timeAgo = formatTimeAgo(question.created_at);

    questionDiv.innerHTML = `
        <div class="question-header">
            <div class="question-author"><i class="fas fa-user"></i> ${question.author?.full_name || 'Anonymous'}</div>
            <div class="question-date">${timeAgo}</div>
        </div>
        <h3 class="question-title">${escapeHtml(question.title)}</h3>
        <div class="question-content">${escapeHtml(question.content)}</div>
        <div class="question-tags">
            ${question.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="vote-container">
            <button class="vote-btn upvote-btn" data-target="question-${question.id}" onclick="handleVote('question', '${question.id}', 'upvote')">
                <i class="fas fa-arrow-up"></i> Upvote
                <span class="vote-count" id="votes-up-question-${question.id}">${question.upvotes || 0}</span>
            </button>
            <button class="vote-btn downvote-btn" data-target="question-${question.id}" onclick="handleVote('question', '${question.id}', 'downvote')">
                <i class="fas fa-arrow-down"></i> Downvote
                <span class="vote-count" id="votes-down-question-${question.id}">${question.downvotes || 0}</span>
            </button>
            <button class="comment-btn" onclick="toggleAnswers('${question.id}')">
                <i class="fas fa-comment"></i> ${question.answer_count || 0} Answers
            </button>
        </div>
        <div class="answers-section" id="answers-${question.id}" style="display: none;">
            <div class="answers-list" id="answers-list-${question.id}">
                <!-- Answers will be loaded here -->
            </div>
            <form class="answer-form" id="answerForm-${question.id}" onsubmit="submitAnswer(event, '${question.id}')">
                <h4>Post Your Answer</h4>
                <textarea class="answer-textarea" name="answer_content" 
                    placeholder="Write your answer here... Be specific and provide details to help others understand." 
                    required></textarea>
                <div class="answer-attachments">
                    <label class="file-label">
                        <i class="fas fa-image"></i> Add Image
                        <input type="file" name="answer_images" class="answer-image-input" accept="image/*" multiple>
                    </label>
                    <span class="answer-file-info"></span>
                </div>
                <button type="submit" class="submit-answer-btn">Submit Answer</button>
            </form>
        </div>
    `;

    return questionDiv;
}

async function toggleAnswers(questionId) {
    const answersSection = document.getElementById(`answers-${questionId}`);
    const answersList = document.getElementById(`answers-list-${questionId}`);

    if (answersSection.style.display === 'none') {
        // Load answers if not already loaded
        if (answersList.innerHTML === '') {
            await loadAnswers(questionId);
        }
        answersSection.style.display = 'block';
    } else {
        answersSection.style.display = 'none';
    }
}

async function loadAnswers(questionId) {
    try {
        const response = await fetch(`https://askunibackend.onrender.com/api/questions/${questionId}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load answers');

        const data = await response.json();
        const answersList = document.getElementById(`answers-list-${questionId}`);

        if (data.success && data.answers && data.answers.length > 0) {
            answersList.innerHTML = data.answers.map(answer => `
                <div class="answer" id="answer-${answer.id}">
                    <div class="question-header">
                        <div class="question-author"><i class="fas fa-user"></i> ${answer.author?.full_name || 'Anonymous'}</div>
                        <div class="question-date">${formatTimeAgo(answer.created_at)}</div>
                    </div>
                    <div class="question-content">${escapeHtml(answer.content)}</div>
                    <div class="vote-container">
                        <button class="vote-btn upvote-btn" onclick="handleVote('answer', '${answer.id}', 'upvote')">
                            <i class="fas fa-arrow-up"></i> Upvote
                            <span class="vote-count">${answer.upvotes || 0}</span>
                        </button>
                        <button class="vote-btn downvote-btn" onclick="handleVote('answer', '${answer.id}', 'downvote')">
                            <i class="fas fa-arrow-down"></i> Downvote
                            <span class="vote-count">${answer.downvotes || 0}</span>
                        </button>
                        <button class="comment-btn">
                            <i class="fas fa-comment"></i> Reply
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            answersList.innerHTML = `
                <div style="text-align: center; padding: 15px; color: var(--text-muted); font-style: italic;">
                    No answers yet. Be the first to answer this question!
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading answers:', error);
        const answersList = document.getElementById(`answers-list-${questionId}`);
        answersList.innerHTML = `
            <div style="text-align: center; padding: 15px; color: var(--text-danger);">
                Failed to load answers. Please try again.
            </div>
        `;
    }
}

// Custom Alert Function
function showCustomAlert(message) {
    const alertOverlay = document.getElementById('customAlert');
    const alertMessage = document.getElementById('customAlertMessage');
    const alertBtn = document.getElementById('customAlertBtn');

    if (alertOverlay && alertMessage) {
        alertMessage.textContent = message;
        alertOverlay.classList.add('active');

        alertBtn.onclick = function () {
            alertOverlay.classList.remove('active');
        };

        // Close on overlay click
        alertOverlay.onclick = function (e) {
            if (e.target === alertOverlay) {
                alertOverlay.classList.remove('active');
            }
        };
    } else {
        // Fallback
        alert(message);
    }
}

async function handleVote(targetType, targetId, voteType) {
    try {
        const token = getToken();
        if (!token) {
            showCustomAlert('Please login to vote');
            return;
        }

        const response = await fetch('https://askunibackend.onrender.com/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                target_type: targetType,
                target_id: targetId,
                vote_type: voteType
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update vote counts in UI
            const upvoteCount = document.getElementById(`votes-up-${targetType}-${targetId}`);
            const downvoteCount = document.getElementById(`votes-down-${targetType}-${targetId}`);

            if (upvoteCount) upvoteCount.textContent = data.upvotes;
            if (downvoteCount) downvoteCount.textContent = data.downvotes;
        } else {
            showCustomAlert(data.message || 'Failed to record vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        showCustomAlert('Failed to record vote. Please try again.');
    }
}

async function submitAnswer(event, questionId) {
    event.preventDefault();

    const form = event.target;
    // Capture content and files
    const content = form.answer_content.value;
    const imageInput = form.querySelector('input[name="answer_images"]');
    // If you have a separate file input for generic files, capture it too:
    // const fileInput = form.querySelector('input[name="answer_files"]'); 

    if (!content.trim()) {
        showCustomAlert('Please enter your answer');
        return;
    }

    try {
        const token = getToken();
        if (!token) {
            showCustomAlert('Please login to post an answer');
            return;
        }

        const hasImages = imageInput && imageInput.files.length > 0;
        // const hasFiles = fileInput && fileInput.files.length > 0;
        const hasFiles = false; // Set to true if you enable fileInput

        if (hasImages || hasFiles) {
            // Send as FormData (Multipart)
            const formData = new FormData();
            formData.append('content', content);

            if (hasImages) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    formData.append('images', imageInput.files[i]);
                }
            }

            /*
            if (hasFiles) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
            }
            */

            let response = await fetch(`https://askunibackend.onrender.com/api/questions/${questionId}/answers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.status === 415) {
                console.warn('Backend rejected FormData (415). Retrying with JSON...');
                // Retry with JSON
                response = await fetch(`https://askunibackend.onrender.com/api/questions/${questionId}/answers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });

                if (response.ok) {
                    showCustomAlert('Answer posted (Image upload skipped - Backend needs update)');
                }
            }

            // Assign response for downstream processing
            // (We need to declare 'response' outside or handle it here. 
            // The original code assigned to 'let response'. 
            // Here we can just use a shared logic or return the response.)

            // To minimize code changes, I will structure this so 'response' is available below.
            var fetchResponse = response;
        } else {
            // No files - Send as JSON directly
            var fetchResponse = await fetch(`https://askunibackend.onrender.com/api/questions/${questionId}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
        }

        let response = fetchResponse;

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) throw new Error(`Server error (${response.status}): ${text.slice(0, 100)}`);
            data = { success: response.ok };
        }

        if (data.success) {
            form.reset();
            // Clear file info text if present
            const infoSpan = form.querySelector('.answer-file-info');
            if (infoSpan) infoSpan.textContent = '';

            // alert('Answer posted successfully!');
            await loadAnswers(questionId);
        } else {
            showCustomAlert(data.message || 'Failed to post answer');
        }
    } catch (error) {
        console.error('Error posting answer:', error);
        showCustomAlert('Failed to post answer. Please try again.');
    }
}

// ===============================
// ASK QUESTION
// ===============================
document.getElementById('askQuestionForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    const titleInput = document.getElementById('questionTitle');
    const detailsInput = document.getElementById('questionDetails');
    const tagsInput = document.getElementById('questionTags');
    const imageInput = document.getElementById('questionImages');
    const fileInput = document.getElementById('questionFiles');

    const title = titleInput?.value;
    const content = detailsInput?.value;
    const tags = tagsInput?.value;

    if (!title || !content) {
        showCustomAlert('Please fill in title and details');
        return;
    }

    try {
        const token = getToken();
        if (!token) {
            showCustomAlert('Please login to ask a question');
            return;
        }

        const hasImages = imageInput && imageInput.files.length > 0;
        const hasFiles = fileInput && fileInput.files.length > 0;
        let res;

        if (hasImages || hasFiles) {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            if (tags) {
                formData.append('tags', tags);
            }

            if (hasImages) {
                for (let i = 0; i < imageInput.files.length; i++) {
                    formData.append('images', imageInput.files[i]);
                }
            }

            if (hasFiles) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
            }

            res = await fetch(
                'https://askunibackend.onrender.com/api/questions',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                }
            );

            // Fallback for 415 (Unsupported Media Type)
            if (res.status === 415) {
                console.warn('Backend rejected FormData (415). Retrying with JSON...');
                res = await fetch(
                    'https://askunibackend.onrender.com/api/questions',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ title, content, tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [] })
                    }
                );

                if (res.ok) {
                    showCustomAlert('Question posted (Image upload skipped - Backend needs update)');
                }
            }
        } else {
            // Send as JSON directly
            res = await fetch(
                'https://askunibackend.onrender.com/api/questions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, content, tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [] })
                }
            );
        }

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const text = await res.text();
            if (!res.ok) throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
            data = { success: res.ok };
        }
        if (data.success) {
            // Close modal
            closeAskModal();
            e.target.reset(); // Reset form
            // Clear file info
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) fileInfo.textContent = '';

            loadQuestions();
            // alert('Question posted successfully!'); 
        } else {
            showCustomAlert(data.message || 'Error posting question');
        }
    } catch (err) {
        console.error(err);
        showCustomAlert('Failed to connect to server');
    }
});

// Helper functions
function getToken() {
    // Check cookies first
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
    if (authCookie) {
        return authCookie.split('=')[1];
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token') || localStorage.getItem('auth_token');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function filterByTag(tagName) {
    alert(`Filtering by tag: ${tagName}`);
    // You can implement tag filtering here
    console.log(`Filtering by tag: ${tagName}`);
}

// Keep all your existing functions (adjustViewport, detectTouchDevice, etc.)
// ... rest of your existing JavaScript code ...



async function showWelcomeMessage() {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log("College Q&A Forum loaded successfully!");
            resolve();
        }, 500);
    });
}

// Viewport meta tag adjustment for mobile
function adjustViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // For mobile devices, ensure proper scaling
        if (window.innerWidth <= 767) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
        } else {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
    }
}

// Touch device detection and enhancements
function detectTouchDevice() {
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        document.body.classList.add('touch-device');

        // Increase tap target sizes for mobile
        const smallElements = document.querySelectorAll('.tag, .vote-btn, .comment-btn, .profile-link');
        smallElements.forEach(el => {
            el.style.minHeight = '44px';
            el.style.minWidth = '44px';
            el.style.display = 'inline-flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        });
    } else {
        document.body.classList.add('no-touch-device');
    }
}

// Adjust layout based on available screen height
function adjustForScreenHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Adjust questions container height on mobile landscape
    if (window.innerWidth <= 767 && window.innerHeight < 500) {
        document.querySelector('.div4').style.maxHeight = 'calc(var(--vh, 1vh) * 60)';
        document.querySelector('.div4').style.overflowY = 'auto';
    } else {
        const div4 = document.querySelector('.div4');
        if (div4) {
            div4.style.maxHeight = 'none';
            div4.style.overflowY = 'visible';
        }
    }
}



// Theme toggle
function toggleTheme() {
    const body = document.body;
    const desktopThemeToggle = document.getElementById('themeToggleHeader');
    const mobileThemeToggle = document.getElementById('themeToggleHeaderMobile');
    const isDarkMode = body.classList.toggle('dark');

    if (isDarkMode) {
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('college_portal_theme_v3', 'dark');
    } else {
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('college_portal_theme_v3', 'light');
    }
}





// Update small text when images selected for answers
function handleAnswerImageChange(event) {
    const input = event.currentTarget;
    const files = input.files ? Array.from(input.files) : [];
    const answerAttachments = input.closest('.answer-attachments');
    if (!answerAttachments) return;

    const infoSpan = answerAttachments.querySelector('.answer-file-info');
    if (!infoSpan) return;

    if (files.length === 0) {
        infoSpan.textContent = '';
    } else if (files.length === 1) {
        infoSpan.textContent = files[0].name;
    } else {
        infoSpan.textContent = `${files.length} images selected`;
    }
}

// Ask Question modal helpers
function openAskModal() {
    document.getElementById('askQuestionModal').classList.remove('hidden');
}

function closeAskModal() {
    document.getElementById('askQuestionModal').classList.add('hidden');
}

function handleAskQuestion() {
    openAskModal();
}

function updateQuestionFileInfo() {
    const imgInput = document.getElementById('questionImages');
    const fileInput = document.getElementById('questionFiles');
    const infoSpan = document.getElementById('questionFileInfo');

    const imgs = imgInput.files ? Array.from(imgInput.files) : [];
    const files = fileInput.files ? Array.from(fileInput.files) : [];
    const total = imgs.length + files.length;

    if (total === 0) {
        infoSpan.textContent = '';
    } else {
        const parts = [];
        if (imgs.length) parts.push(`${imgs.length} image(s)`);
        if (files.length) parts.push(`${files.length} file(s)`);
        infoSpan.textContent = parts.join(', ') + " selected";
    }
}



// Login / other simple handlers




// Mobile sidebar functions
function openMobileSidebar() {
    document.getElementById('mobileSidebar').classList.add('active');
    document.getElementById('mobileSidebarOverlay').classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
}

function closeMobileSidebar() {
    document.getElementById('mobileSidebar').classList.remove('active');
    document.getElementById('mobileSidebarOverlay').classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

// Fallback when API fails
function showFallbackQuestions() {
    console.warn("Using fallback questions");
    const fallbackData = [
        {
            id: 'demo-1',
            title: 'Welcome to College Q&A',
            content: 'We are currently unable to reach the server. This is a demo question to show the layout. Please check your connection or try again later.',
            author: { full_name: 'System' },
            created_at: new Date().toISOString(),
            tags: ['System', 'Offline'],
            upvotes: 0,
            downvotes: 0,
            answer_count: 0
        }
    ];
    renderQuestions(fallbackData);
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializePage();

    // Theme toggle for both desktop and mobile
    document.getElementById('themeToggleHeader').addEventListener('click', toggleTheme);
    document.getElementById('themeToggleHeaderMobile').addEventListener('click', toggleTheme);

    // Voting


    // Answer submission


    // Image upload for answers
    document.querySelectorAll('.answer-image-input').forEach(input => {
        input.addEventListener('change', handleAnswerImageChange);
    });

    // Ask question buttons (desktop and mobile)
    document.getElementById('askQuestionBtn').addEventListener('click', handleAskQuestion);
    document.getElementById('askQuestionBtnMobile').addEventListener('click', handleAskQuestion);

    // Modal controls
    document.getElementById('closeAskModal').addEventListener('click', closeAskModal);
    document.getElementById('cancelAskBtn').addEventListener('click', closeAskModal);
    document.getElementById('askQuestionModal').addEventListener('click', (e) => {
        if (e.target.id === 'askQuestionModal') closeAskModal();
    });


    document.getElementById('questionImages').addEventListener('change', updateQuestionFileInfo);
    document.getElementById('questionFiles').addEventListener('change', updateQuestionFileInfo);



    // Notifications (desktop and mobile)
    document.getElementById('notificationBtn').addEventListener('click', function () {
        alert("Notifications panel would open here.");
    });

    document.getElementById('notificationBtnMobile').addEventListener('click', function () {
        alert("Notifications panel would open here.");
    });

    // Tags
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function () {
            const tagName = this.textContent;
            console.log(`Filtering by tag: ${tagName}`);
        });
    });

    // Mobile sidebar controls
    document.getElementById('mobileMenuBtn').addEventListener('click', openMobileSidebar);
    document.getElementById('closeSidebar').addEventListener('click', closeMobileSidebar);
    document.getElementById('mobileSidebarOverlay').addEventListener('click', closeMobileSidebar);

    // Add responsive event listeners
    window.addEventListener('resize', function () {
        adjustViewport();
        adjustForScreenHeight();
    });

    window.addEventListener('orientationchange', function () {
        setTimeout(function () {
            adjustViewport();
            adjustForScreenHeight();
        }, 100);
    });

    // Prevent zoom on double-tap for mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});