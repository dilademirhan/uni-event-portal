const API_BASE_URL = "http://127.0.0.1:8000";

const api = {
    async register(fullName, email, password) {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password
            })
        });
        return { ok: response.ok, data: await response.json() };
    },

    async login(email, password) {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${API_BASE_URL}/login`, { 
            method: "POST",
            body: formData
        });
        return { ok: response.ok, data: await response.json() };
    },

    async getMe() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async getClubs() {
        const response = await fetch(`${API_BASE_URL}/clubs/`);
        return await response.json();
    },

    async applyForManager(clubId) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/applications/apply-club-manager?club_id=${clubId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async createEvent(title, description, location) {
        const token = localStorage.getItem("access_token");
        const url = `${API_BASE_URL}/events/create?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async getMyEvents() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/my-events`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async getPendingApplications() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/applications/pending`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async approveManager(managerId, approve) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/applications/approve/${managerId}?approve=${approve}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async getPendingEvents() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/pending`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async approveEvent(eventId, approve) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/approve/${eventId}?approve=${approve}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    }
};