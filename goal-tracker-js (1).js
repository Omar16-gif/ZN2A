// Global variables
let mediaRecorder;
let recordedChunks = [];
let currentUser = null;
let users = [];

// Initialize LocalForage for persistent storage
localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'GoalTrackerApp'
});

// User Registration
async function registerUser() {
    const usernameInput = document.getElementById('username');
    const username = usernameInput.value.trim();

    if (!username) {
        alert('Please enter a username');
        return;
    }

    // Check if user already exists
    if (users.includes(username)) {
        alert('Username already exists');
        return;
    }

    users.push(username);
    await localforage.setItem('users', users);
    renderUserList();
    
    usernameInput.value = '';
    selectUser(username);
}

// Render User List
async function renderUserList() {
    const userListContainer = document.getElementById('user-list');
    userListContainer.innerHTML = '';

    users = await localforage.getItem('users') || [];
    users.forEach(user => {
        const userBadge = document.createElement('span');
        userBadge.textContent = user;
        userBadge.className = 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm cursor-pointer';
        userBadge.onclick = () => selectUser(user);
        userListContainer.appendChild(userBadge);
    });
}

// Select User
function selectUser(user) {
    currentUser = user;
    document.getElementById('goal-video-section').classList.remove('hidden');
    document.getElementById('todo-section').classList.remove('hidden');
    loadUserGoals(user);
}

// Video Recording
function startRecording() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            const preview = document.getElementById('preview');
            preview.srcObject = stream;
            preview.play();

            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.start();
        })
        .catch(error => {
            console.error('Error accessing media devices:', error);
            alert('Unable to access camera/microphone');
        });
}

function stopRecording() {
    mediaRecorder.stop();
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const preview = document.getElementById('preview');
        preview.srcObject = null;
        preview.src = URL.createObjectURL(blob);
    };
}

// Upload Video and Goal
async function uploadVideo() {
    if (!currentUser) {
        alert('Please select or register a user first');
        return;
    }

    const preview = document.getElementById('preview');
    const todoInput = document.getElementById('todo-input');
    const todoTimeInput = document.getElementById('todo-time');

    if (!preview.src || !todoInput.value) {
        alert('Please record a video and enter a goal');
        return;
    }

    const goal = {
        user: currentUser,
        videoSrc: preview.src,
        goalText: todoInput.value,
        goalTime: todoTimeInput.value,
        timestamp: new Date().toISOString()
    };

    // Store goal
    let userGoals = await localforage.getItem(`goals_${currentUser}`) || [];
    userGoals.push(goal);
    await localforage.setItem(`goals_${currentUser}`, userGoals);

    // Clear inputs and update display
    preview.src = '';
    todoInput.value = '';
    todoTimeInput.value = '';
    renderGoals();
}

// Render Goals
async function renderGoals() {
    const goalsDisplay = document.getElementById('goals-display');
    goalsDisplay.innerHTML = '';

    for (let user of users) {
        const userGoals = await localforage.getItem(`goals_${user}`) || [];
        userGoals.forEach(goal => {
            const goalCard = document.createElement('div');
            goalCard.className = 'goal-card bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition';
            goalCard.innerHTML = `
                <h3 class="font-bold text-lg mb-2">${user}'s Goal</h3>
                <p class="text-gray-600 mb-2">${goal.goalText}</p>
                <p class="text-sm text-gray-500">Time: ${goal.goalTime}</p>
                <video src="${goal.videoSrc}" controls class="mt-2 w-full rounded-md"></video>
            `;
            goalsDisplay.appendChild(goalCard);
        });
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    renderUserList();
    renderGoals();
});

// Periodic goal refresh
setInterval(renderGoals, 60000);
