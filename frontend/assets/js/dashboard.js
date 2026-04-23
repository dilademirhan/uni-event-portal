let currentManagerClubId = null;async function init() {
    const user = await api.getMe();
    if (!user.user_id) return window.location.href = "index.html";

    document.getElementById('display-name').innerText = user.full_name;
    
    if (user.role_id === 1) {
        document.getElementById('display-role').innerText = "Student";
        document.getElementById('student-view').classList.remove('hidden');
        loadClubs();
    } else if (user.role_id === 2) {
        document.getElementById('display-role').innerText = "Club Manager";
        document.getElementById('manager-view').classList.remove('hidden');
        currentManagerClubId = user.managed_club_id;
        loadMyEvents();
    } else if (user.role_id === 3) {
        document.getElementById('display-role').innerText = "Admin";
        document.getElementById('admin-view').classList.remove('hidden');
        loadPendingApps();   
        loadPendingEvents(); 
    }
}

async function loadClubs() {
    const clubs = await api.getClubs();
    const grid = document.getElementById('club-grid');
    grid.innerHTML = clubs.map(c => `
        <div class="bg-white p-6 rounded-xl border shadow-sm">
            <h3 class="font-bold text-lg">${c.club_name}</h3>
            <p class="text-gray-500 text-sm mb-4">${c.description || ''}</p>
            <button onclick="apply('${c.club_id}')" class="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition">Apply to Become a Club Manager</button>
        </div>
    `).join('');
}

async function apply(clubId) {
    const res = await api.applyForManager(clubId);
    alert(res.message || res.detail);
}

async function submitEvent() {
    const title = document.getElementById('ev-title').value;
    const desc = document.getElementById('ev-desc').value;
    const loc = document.getElementById('ev-loc').value;
    const res = await api.createEvent(title, desc, loc, currentManagerClubId);
    alert(res.message);
    loadMyEvents();
}

async function loadMyEvents() {
    const events = await api.getMyEvents();
    document.getElementById('my-events-list').innerHTML = events.map(e => `
        <div class="p-4 bg-white border rounded-xl flex justify-between items-start">
            <div class="flex-1 pr-4">
                <p class="font-bold text-indigo-900">${e.title}</p>
                <p class="text-sm text-gray-600 mt-1 italic leading-relaxed">${e.description || 'No description available.'}</p>
                <div class="flex items-center mt-2 text-xs text-gray-400">
                    <span class="mr-2">📍 ${e.location}</span>
                </div>
            </div>
            <span class="${
    e.approval_status === 1 ? 'text-green-600 bg-green-50' : 
    e.approval_status === 2 ? 'text-red-600 bg-red-50' : 
    'text-orange-600 bg-orange-50'
} font-bold text-xs px-2 py-1 rounded-lg">
    ${
        e.approval_status === 1 ? 'Approved' : 
        e.approval_status === 2 ? 'Rejected' : 
        'Pending'
    }
</span>
        </div>
    `).join('');
}

async function loadPendingApps() {
    const apps = await api.getPendingApplications();
    document.getElementById('pending-apps-list').innerHTML = apps.map(a => `
        <tr class="border-b">
            <td class="p-4">${a.user_id}</td>
            <td class="p-4">${a.club_id}</td>
            <td class="p-4 text-right">
                <button onclick="handleApprove('${a.manager_id}', true)" class="bg-green-500 text-white px-3 py-1 rounded mr-2">Approve</button>
                <button onclick="handleApprove('${a.manager_id}', false)" class="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
            </td>
        </tr>
    `).join('');
}

async function handleApprove(id, status) {
    await api.approveManager(id, status);
    loadPendingApps();
}

async function loadPendingEvents() {
    const events = await api.getPendingEvents();
    const list = document.getElementById('pending-events-list');
    
    if (events.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">No pending events.</td></tr>';
        return;
    }

    list.innerHTML = events.map(e => `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4">
                <p class="font-bold text-indigo-900">${e.title}</p>
                <p class="text-xs text-gray-500 mt-1 max-w-xs truncate">${e.description}</p>
            </td>
            <td class="p-4 text-sm text-gray-600">${e.location}</td>
            <td class="p-4 text-right">
                <button onclick="handleEventApprove(${e.event_id}, true)" class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700">Approve</button>
                <button onclick="handleEventApprove(${e.event_id}, false)" class="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold ml-2 hover:bg-red-700 transition">Reject</button>
            </td>
        </tr>
    `).join('');
}

async function handleEventApprove(id, status) {
    const res = await api.approveEvent(id, status);
    alert(res.message);
    loadPendingEvents(); 
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

init();