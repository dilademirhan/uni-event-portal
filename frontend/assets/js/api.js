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
}
};