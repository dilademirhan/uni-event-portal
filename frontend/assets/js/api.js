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

    async getMyMemberships() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/clubs/memberships/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async joinClub(clubId) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/join`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return { ok: response.ok, data: await response.json() };
    },

    async applyForManager(clubId, message) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/applications/apply-club-manager`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                club_id: parseInt(clubId),
                application_message: message
            })
        });
        return await response.json();
    },

    async createEvent(title, description, location, eventDate, eventEndDate, category, maxAttendees, isMembersOnly) {
        const token = localStorage.getItem("access_token");
        const url = `${API_BASE_URL}/events/create?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}&event_date=${encodeURIComponent(eventDate)}&event_end_date=${encodeURIComponent(eventEndDate)}&category=${encodeURIComponent(category)}&max_attendees=${encodeURIComponent(maxAttendees)}&is_members_only=${encodeURIComponent(isMembersOnly)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to create event");
        }
        return await response.json();
    },

    async getMyEvents() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/my-events`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async getMyApplications() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/applications/me`, {
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
    },

    async getUpcomingEvents() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/upcoming`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    },

    async registerForEvent(eventId) {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to register for the event");
        }
        return await response.json();
    },

    async getMyRegistrations() {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/events/registrations/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        return await response.json();
    }
};