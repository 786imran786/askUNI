const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
window.API_BASE_URL = isLocalEnv ? "http://" + window.location.hostname + ":5000" : "https://askunibackend.onrender.com";

// Initialize page
async function initializePage() {
    const savedTheme = localStorage.getItem('college_portal_theme_v3');
    const desktopThemeToggle = document.getElementById('themeToggleHeader');
    const mobileThemeToggle = document.getElementById('themeToggleHeaderMobile');

    if (savedTheme === 'light') {
        document.body.classList.add('light');
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.remove('light');
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    adjustViewport();
    detectTouchDevice();
    adjustForScreenHeight();

    // 🔒 Auth Guard
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) return;

    await showWelcomeMessage();

    // Load user profile
    await loadUserProfile();

    // Load questions based on hash
    const hash = window.location.hash;
    if (hash === '#my-questions') {
        await loadQuestions('/api/my-questions', 'My Questions');
    } else if (hash === '#my-answers') {
        await loadQuestions('/api/my-answers', 'My Answers');
    } else {
        await loadQuestions();
    }

    // Load popular tags from backend
    await loadPopularTags();

    // Setup navigation listeners
    setupNavigationListeners();

    // Connect to real-time SSE feed
    connectSSE();
}

function setupNavigationListeners() {
    const filters = [
        { ids: ['nav-home', 'nav-home-mobile'], endpoint: '/api/questions', title: 'Recent Questions', hash: '' },
        { ids: ['nav-my-questions', 'nav-my-questions-mobile'], endpoint: '/api/my-questions', title: 'My Questions', hash: '#my-questions' },
        { ids: ['nav-my-answers', 'nav-my-answers-mobile'], endpoint: '/api/my-answers', title: 'My Answers', hash: '#my-answers' }
    ];

    filters.forEach(filter => {
        filter.ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    if(filter.hash) {
                        window.history.pushState(null, null, filter.hash);
                    } else {
                        window.history.pushState(null, null, window.location.pathname);
                    }
                    loadQuestions(filter.endpoint, filter.title);
                });
            }
        });
    });
}

// ============================================================
// 🔴 SSE – Real-time feed updates
// ============================================================
let _sseSource = null;
let _sseReconnectDelay = 3000;

function connectSSE() {
    if (_sseSource) _sseSource.close();

    _sseSource = new EventSource(`${window.API_BASE_URL}/api/stream`, { withCredentials: true });

    _sseSource.addEventListener('connected', () => {
        console.log('✅ SSE connected – real-time feed active');
        _sseReconnectDelay = 3000; // reset backoff on success
    });

    _sseSource.addEventListener('new_question', (e) => {
        const currentHash = window.location.hash;
        // Only auto-refresh the main feed, not personal filtered views
        if (!currentHash || currentHash === '#home') {
            loadQuestions('/api/questions', 'Recent Questions');
        }
    });

    _sseSource.onerror = () => {
        console.warn('⚠️ SSE disconnected – reconnecting in', _sseReconnectDelay / 1000, 's');
        _sseSource.close();
        setTimeout(connectSSE, _sseReconnectDelay);
        _sseReconnectDelay = Math.min(_sseReconnectDelay * 2, 60000); // exponential backoff, max 60s
    };
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
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

async function loadQuestions(endpoint = '/api/questions', feedTitle = 'Recent Questions') {
    try {
        // Show feed title header if it's a specific feed
        const feedHeaderContainer = document.getElementById('feed-header-container');
        const feedTitleEl = document.getElementById('feed-title');
        
        if (feedHeaderContainer && feedTitleEl) {
            if (endpoint !== '/api/questions') {
                feedTitleEl.textContent = feedTitle;
                feedHeaderContainer.style.display = 'block';
            } else {
                feedHeaderContainer.style.display = 'none';
            }
        }

        // Show loading spinner
        const questionsContainer = document.querySelector('.div4');
        if (questionsContainer) {
            questionsContainer.innerHTML = `
                <video id="loadingLight" autoplay muted loop playsinline>
                    <source src="media/video_loading.mp4" type="video/mp4">
                </video>
            `;
        }

        console.log("Fetching questions from backend: " + endpoint);
        const response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
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
async function loadUserProfile() {
    try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL}/api/get-profile-data`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            // Get Name
            const name = data.personal_info?.full_name || data.user_info?.full_name || 'Student User';
            
            // Format designation
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

            // Update DOM
            document.querySelectorAll('.profile-name').forEach(el => el.textContent = name);
            document.querySelectorAll('.profile-status').forEach(el => el.textContent = status);
            
            // Profile photo
            if (data.personal_info?.profile_photo) {
                let photoHtml = '';
                if (data.personal_info.profile_photo.startsWith('data:image') || data.personal_info.profile_photo.startsWith('http')) {
                    photoHtml = `<img src="${data.personal_info.profile_photo}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    photoHtml = `<i class="${data.personal_info.profile_photo}"></i>`;
                }
                
                document.querySelectorAll('.profile-avatar').forEach(el => {
                    el.innerHTML = photoHtml;
                });
            }
        }
    } catch (error) {
        console.error("Error loading user profile:", error);
    }
}

async function loadPopularTags() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/tags`);
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

    let imagesHtml = '';
    if (question.images) {
        let imagesArray = [];
        if (Array.isArray(question.images)) {
            imagesArray = question.images;
        } else if (typeof question.images === 'string') {
            try {
                let str = question.images.trim();
                if (str.startsWith('{') && str.endsWith('}')) {
                    str = '[' + str.slice(1, -1) + ']';
                }
                imagesArray = JSON.parse(str.replace(/'/g, '"'));
            } catch (e) {
                imagesArray = [question.images];
            }
        }
        if (imagesArray.length > 0) {
            imagesHtml = `
                    <div class="question-images" style="margin-top: 10px;">
                        ${imagesArray.map(url => `<img src="${url}" alt="Attachment" style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-bottom: 5px; cursor: pointer;" onclick="window.open(this.src, '_blank')">`).join('')}
                    </div>
                `;
        }
    }

    let avatarHtml = '<i class="fas fa-user-circle" style="font-size: 24px; color: var(--text-muted);"></i>';
    if (question.author?.profile_photo) {
        if (question.author.profile_photo.startsWith('data:image') || question.author.profile_photo.startsWith('http')) {
            avatarHtml = `<img src="${question.author.profile_photo}" alt="Author" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarHtml = `<i class="${question.author.profile_photo}" style="font-size: 24px; color: var(--primary-color);"></i>`;
        }
    }

    let verifiedHtml = '';
    if (question.author?.is_verified) {
        verifiedHtml = `<i class="fas fa-check-circle" title="This user is college verified" style="color: #4CAF50; margin-left: 5px; font-size: 0.9em; cursor: help;"></i>`;
    }

    questionDiv.innerHTML = `
        <div class="question-header">
            <div class="question-author" style="display: flex; align-items: center; gap: 8px;">
                ${avatarHtml}
                <span style="font-weight: 500;">${question.author?.full_name || 'Anonymous'}${verifiedHtml}</span>
            </div>
            <div class="question-date">${timeAgo}</div>
        </div>
        <h3 class="question-title">${escapeHtml(question.title)}</h3>
        <div class="question-content">${escapeHtml(question.content)}</div>
        ${imagesHtml}
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
        // Load answers if not already loaded (check for empty or just the comment)
        if (answersList.innerHTML.trim() === '' || answersList.innerHTML.trim() === '<!-- Answers will be loaded here -->') {
            await loadAnswers(questionId);
        }
        answersSection.style.display = 'block';
    } else {
        answersSection.style.display = 'none';
    }
}

async function loadAnswers(questionId) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load answers');

        const data = await response.json();
        const answersList = document.getElementById(`answers-list-${questionId}`);

        if (data.success && data.answers && data.answers.length > 0) {
            answersList.innerHTML = data.answers.map(answer => {
                let imagesHtml = '';
                if (answer.images) {
                    let imagesArray = [];
                    if (Array.isArray(answer.images)) {
                        imagesArray = answer.images;
                    } else if (typeof answer.images === 'string') {
                        try {
                            let str = answer.images.trim();
                            if (str.startsWith('{') && str.endsWith('}')) {
                                str = '[' + str.slice(1, -1) + ']';
                            }
                            imagesArray = JSON.parse(str.replace(/'/g, '"'));
                        } catch (e) {
                            imagesArray = [answer.images];
                        }
                    }
                    if (imagesArray.length > 0) {
                        imagesHtml = `
                            <div class="answer-images" style="margin-top: 10px;">
                                ${imagesArray.map(url => `<img src="${url}" alt="Attachment" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 5px; cursor: pointer;" onclick="window.open(this.src, '_blank')">`).join('')}
                            </div>
                        `;
                    }
                }
                let avatarHtml = '<i class="fas fa-user-circle" style="font-size: 20px; color: var(--text-muted);"></i>';
                if (answer.author?.profile_photo) {
                    if (answer.author.profile_photo.startsWith('data:image') || answer.author.profile_photo.startsWith('http')) {
                        avatarHtml = `<img src="${answer.author.profile_photo}" alt="Author" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">`;
                    } else {
                        avatarHtml = `<i class="${answer.author.profile_photo}" style="font-size: 20px; color: var(--primary-color);"></i>`;
                    }
                }

                let verifiedHtml = '';
                if (answer.author?.is_verified) {
                    verifiedHtml = `<i class="fas fa-check-circle" title="This user is college verified" style="color: #4CAF50; margin-left: 5px; font-size: 0.9em; cursor: help;"></i>`;
                }

                return `
                <div class="answer" id="answer-${answer.id}">
                    <div class="question-header">
                        <div class="question-author" style="display: flex; align-items: center; gap: 8px;">
                            ${avatarHtml}
                            <span style="font-weight: 500;">${answer.author?.full_name || 'Anonymous'}${verifiedHtml}</span>
                        </div>
                        <div class="question-date">${formatTimeAgo(answer.created_at)}</div>
                    </div>
                    <div class="question-content">${escapeHtml(answer.content)}</div>
                    ${imagesHtml}
                    <div class="vote-container">
                        <button class="vote-btn upvote-btn" onclick="handleVote('answer', '${answer.id}', 'upvote')">
                            <i class="fas fa-arrow-up"></i> Upvote
                            <span class="vote-count">${answer.upvotes || 0}</span>
                        </button>
                        <button class="vote-btn downvote-btn" onclick="handleVote('answer', '${answer.id}', 'downvote')">
                            <i class="fas fa-arrow-down"></i> Downvote
                            <span class="vote-count">${answer.downvotes || 0}</span>
                        </button>
                        <button class="comment-btn" onclick="document.getElementById('answerForm-${questionId}').querySelector('textarea').focus()">
                            <i class="fas fa-comment"></i> Reply
                        </button>
                    </div>
                </div>
            `}).join('');
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

        const response = await fetch(`${window.API_BASE_URL}/api/vote`, {
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

            let response = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}/answers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.status === 415) {
                console.warn('Backend rejected FormData (415). Retrying with JSON...');
                // Retry with JSON
                response = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}/answers`, {
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
            var fetchResponse = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}/answers`, {
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
                `${window.API_BASE_URL}/api/questions`,
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
                    `${window.API_BASE_URL}/api/questions`,
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
                `${window.API_BASE_URL}/api/questions`,
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
    const isLightMode = body.classList.toggle('light');

    if (isLightMode) {
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('college_portal_theme_v3', 'light');
    } else {
        if (desktopThemeToggle) desktopThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('college_portal_theme_v3', 'dark');
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
    // Check URL parameters for authentication and new user redirection
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
        // Save token
        localStorage.setItem('token', urlToken);
        document.cookie = `auth_token=${urlToken}; path=/; max-age=604800`; // 7 days

        // Check if it's a new user from Google Login
        if (urlParams.get('new_user') === 'true') {
            window.location.href = `detail.html?token=${urlToken}&new_user=true`;
            return; // Stop initialization
        }

        // Clean up URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('token');
        newUrl.searchParams.delete('new_user');
        window.history.replaceState({}, '', newUrl);
    }

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

    // Logout Logic
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${window.API_BASE_URL}/api/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            // Clear cookies/localStorage
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
            window.location.href = "login_signup.html";
        }
    };

    const loginLinkDesktop = document.getElementById('loginLink');
    const loginLinkMobile = document.getElementById('loginLinkMobile');

    if (loginLinkDesktop) loginLinkDesktop.addEventListener('click', handleLogout);
    if (loginLinkMobile) loginLinkMobile.addEventListener('click', handleLogout);
});