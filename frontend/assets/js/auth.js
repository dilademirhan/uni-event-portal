function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const errorBox = document.getElementById('error-box');

    errorBox.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginBtn.className = "w-1/2 py-2.5 text-sm font-bold rounded-xl bg-white shadow-sm text-indigo-700 transition-all";
        registerBtn.className = "w-1/2 py-2.5 text-sm font-bold rounded-xl text-gray-500 hover:text-indigo-600 transition-all";
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registerBtn.className = "w-1/2 py-2.5 text-sm font-bold rounded-xl bg-white shadow-sm text-emerald-700 transition-all";
        loginBtn.className = "w-1/2 py-2.5 text-sm font-bold rounded-xl text-gray-500 hover:text-emerald-600 transition-all";
    }
}

function showError(message) {
    const errorBox = document.getElementById('error-box');
    const errorMessage = document.getElementById('error-message');
    
    if (Array.isArray(message)) {
        errorMessage.innerText = message[0].msg;
    } else {
        errorMessage.innerText = message;
    }
    errorBox.classList.remove('hidden');
}

// KAYIT İŞLEMİ
async function handleRegister(event) {
    event.preventDefault();
    const fullName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const result = await api.register(fullName, email, password);

    if (result.ok) {
        alert("Success! You can now login.");
        switchTab('login');
    } else {
        showError(result.data.detail);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const result = await api.login(email, password);

    if (result.ok) {
        localStorage.setItem("access_token", result.data.access_token);
        window.location.href = "dashboard.html";
    } else {
        showError("Invalid email or password.");
    }
}