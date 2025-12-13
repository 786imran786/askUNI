// Initialize page
async function initializePage() {
    const savedTheme = localStorage.getItem('collegeQATheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
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
        const response = await fetch('http://127.0.0.1:5000/api/questions', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load questions');
        }

        const data = await response.json();

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
        const response = await fetch('http://127.0.0.1:5000/api/tags');
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
        const response = await fetch(`http://127.0.0.1:5000/api/questions/${questionId}`, {
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

async function handleVote(targetType, targetId, voteType) {
    try {
        const token = getToken();
        if (!token) {
            alert('Please login to vote');
            return;
        }

        const response = await fetch('http://127.0.0.1:5000/api/vote', {
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
            alert(data.message || 'Failed to record vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        alert('Failed to record vote. Please try again.');
    }
}

async function submitAnswer(event, questionId) {
    event.preventDefault();

    const form = event.target;
    const content = form.answer_content.value;

    if (!content.trim()) {
        alert('Please enter your answer');
        return;
    }

    try {
        const token = getToken();
        if (!token) {
            alert('Please login to post an answer');
            return;
        }

        const response = await fetch(`http://127.0.0.1:5000/api/questions/${questionId}/answers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (data.success) {
            form.reset();
            alert('Answer posted successfully!');
            // Reload answers
            await loadAnswers(questionId);
        } else {
            alert(data.message || 'Failed to post answer');
        }
    } catch (error) {
        console.error('Error posting answer:', error);
        alert('Failed to post answer. Please try again.');
    }
}

// Ask Question form submission
document.getElementById('askQuestionForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const title = document.getElementById('questionTitle').value;
    const details = document.getElementById('questionDetails').value;
    const tags = document.getElementById('questionTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
        const token = getToken();
        if (!token) {
            alert('Please login to ask a question');
            return;
        }

        const response = await fetch('http://127.0.0.1:5000/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                content: details,
                tags
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Question posted successfully!');
            closeAskModal();
            // Reload questions
            await loadQuestions();
        } else {
            alert(data.message || 'Failed to post question');
        }
    } catch (error) {
        console.error('Error posting question:', error);
        alert('Failed to post question. Please try again.');
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