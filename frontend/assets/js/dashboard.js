let currentManagerClubId = null;
let applyingClubId = null;
let currentUser = null;
let myAppsGlobal = [];
let clubsGlobal = [];
let myMembershipsGlobal = [];

async function init() {
    const user = await api.getMe();
    if (!user.user_id) return window.location.href = "index.html";
    currentUser = user;

    document.getElementById('display-name').innerText = user.full_name;
    
    if (user.role_id === 1 || user.role_id === 2) {
        document.getElementById('sidebar-nav').classList.remove('hidden');
    }
    
    if (user.role_id === 1) {
        document.getElementById('display-role').innerText = "Student";
        document.getElementById('student-view').classList.remove('hidden');
        loadClubs();
    } else if (user.role_id === 2) {
        document.getElementById('display-role').innerText = "Club Manager";
        document.getElementById('tab-manager-view').classList.remove('hidden');
        document.getElementById('tab-manager-view').className = "w-full text-left px-4 py-3 rounded-lg bg-indigo-800 text-white font-bold transition flex items-center";
        document.getElementById('tab-student-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
        document.getElementById('manager-view').classList.remove('hidden');
        currentManagerClubId = user.managed_club_id;
        loadMyEvents();
        loadClubs(); 
    } else if (user.role_id === 3) {
        document.getElementById('display-role').innerText = "Admin";
        document.getElementById('admin-view').classList.remove('hidden');
        loadPendingApps();   
        loadPendingEvents(); 
    }
}

async function loadClubs() {
    const clubs = await api.getClubs();
    clubsGlobal = clubs;
    myAppsGlobal = await api.getMyApplications();
    const myMemberships = await api.getMyMemberships();
    myMembershipsGlobal = myMemberships;
    renderMyMemberships();
    
    const myApps = myAppsGlobal;
    const grid = document.getElementById('club-grid');
    
    grid.innerHTML = clubs.map(c => {
        let buttonHTML = '';
        let joinHTML = '';
        
        if (currentUser.role_id === 2) {
            const approvedApp = myApps.find(a => a.request_status === 1);
            if (approvedApp && approvedApp.club_id === c.club_id) {
                buttonHTML = `<button disabled class="w-full py-2 bg-emerald-50 text-emerald-700 font-bold rounded-lg cursor-not-allowed mt-2">✅ You are Manager</button>`;
            } else {
                buttonHTML = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed mt-2">Already Managing a Club</button>`;
            }
        } else {
            const existingApp = myApps.find(a => a.club_id === c.club_id);
            if (existingApp) {
                buttonHTML = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed mt-2">Application Submitted</button>`;
            } else if (c.manager_count >= c.max_managers) {
                buttonHTML = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed mt-2">Manager Quota Full</button>`;
            } else {
                buttonHTML = `<button onclick="openApplyModal('${c.club_id}')" class="w-full py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition mt-2">Apply to Become a Club Manager</button>`;
            }
            
            const isMember = myMemberships.find(m => m.club_id === c.club_id);
            if (isMember) {
                joinHTML = `<button disabled class="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg cursor-not-allowed border border-indigo-100">✅ Joined</button>`;
            } else if (c.member_count >= c.max_quota) {
                joinHTML = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed">Member Quota Full</button>`;
            } else {
                joinHTML = `<button onclick="openJoinModal('${c.club_id}')" class="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm">Join Club</button>`;
            }
        }

        return `
        <div class="bg-white p-6 rounded-xl border shadow-sm transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-start gap-2">
                    <button onclick="openJoinModal('${c.club_id}')" class="text-indigo-400 hover:text-indigo-700 transition mt-0.5" title="View Details">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                    <h3 class="font-bold text-lg leading-tight">${c.club_name}</h3>
                </div>
                <div class="flex flex-col gap-1 text-right shrink-0 ml-2">
                    <span class="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">Managers: ${c.manager_count}/${c.max_managers}</span>
                    <span class="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">Members: ${c.member_count}/${c.max_quota}</span>
                </div>
            </div>
            
            <div class="mt-auto space-y-2">
                ${joinHTML}
                ${buttonHTML}
            </div>
        </div>
        `;
    }).join('');
    
    loadMyApplicationsTable();
}

function switchTab(tabId) {
    document.getElementById('student-view').classList.add('hidden');
    if(document.getElementById('manager-view')) document.getElementById('manager-view').classList.add('hidden');
    if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('my-apps-view').classList.add('hidden');
    document.getElementById('my-memberships-view').classList.add('hidden');
    
    document.getElementById('tab-student-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    document.getElementById('tab-my-apps-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    document.getElementById('tab-my-memberships-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    
    if (currentUser && currentUser.role_id === 2 && document.getElementById('tab-manager-view')) {
        document.getElementById('tab-manager-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    }

    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(`tab-${tabId}`).className = "w-full text-left px-4 py-3 rounded-lg bg-indigo-800 text-white font-bold transition flex items-center";
}

function loadMyApplicationsTable() {
    const list = document.getElementById('my-apps-table-body');
    if (!myAppsGlobal || myAppsGlobal.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">You have no applications.</td></tr>';
        return;
    }

    list.innerHTML = myAppsGlobal.map(a => {
        let statusBadge = '';
        if (a.request_status === 0) {
            statusBadge = '<span class="text-yellow-600 bg-yellow-50 font-bold text-xs px-3 py-1.5 rounded-lg">⏳ Pending</span>';
        } else if (a.request_status === 1) {
            statusBadge = '<span class="text-emerald-600 bg-emerald-50 font-bold text-xs px-3 py-1.5 rounded-lg">✅ Approved</span>';
        } else {
            statusBadge = '<span class="text-red-600 bg-red-50 font-bold text-xs px-3 py-1.5 rounded-lg">❌ Rejected</span>';
        }

        const dateStr = new Date(a.request_date).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        return `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4 font-bold text-indigo-900">${a.club_name}</td>
                <td class="p-4 text-sm text-gray-600">${dateStr}</td>
                <td class="p-4">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function openApplyModal(clubId) {
    const hasPending = myAppsGlobal.some(a => a.request_status === 0);
    if (hasPending) {
        document.getElementById('error-modal').classList.remove('hidden');
        return;
    }
    applyingClubId = clubId;
    document.getElementById('apply-modal').classList.remove('hidden');
    document.getElementById('app-message').value = '';
}

function closeApplyModal() {
    applyingClubId = null;
    document.getElementById('apply-modal').classList.add('hidden');
}

function openJoinModal(clubId) {
    const club = clubsGlobal.find(c => c.club_id == clubId);
    if (!club) return;
    
    document.getElementById('join-modal-logo').innerText = club.club_name.charAt(0).toUpperCase();
    document.getElementById('join-modal-name').innerText = club.club_name;
    document.getElementById('join-modal-category').innerText = club.category || "General";
    document.getElementById('join-modal-desc').innerText = club.description || "No description provided.";
    
    const managersContainer = document.getElementById('join-modal-managers');
    if (club.managers_info && club.managers_info.length > 0) {
        managersContainer.innerHTML = club.managers_info.map(m => `
            <div class="flex flex-col border-b pb-3 border-gray-100">
                <span class="text-xs font-bold text-indigo-600 uppercase">Manager</span>
                <span class="font-bold text-gray-900 mt-1">${m.name}</span>
            </div>
            <div class="flex flex-col border-b pb-3 border-gray-100">
                <span class="text-xs font-bold text-indigo-600 uppercase">Manager Email</span>
                <span class="text-sm text-indigo-700 mt-1 font-bold">${m.email}</span>
            </div>
        `).join('');
    } else {
        managersContainer.innerHTML = `
            <div class="flex flex-col border-b pb-3 border-gray-100">
                <span class="text-xs font-bold text-indigo-600 uppercase">Manager</span>
                <span class="font-medium text-gray-400 mt-1 italic">No manager assigned yet</span>
            </div>
        `;
    }
    
    const isMember = myMembershipsGlobal.find(m => m.club_id === club.club_id);
    const confirmBtn = document.getElementById('join-modal-confirm-btn');
    
    if (isMember) {
        confirmBtn.disabled = true;
        confirmBtn.innerText = "✅ Joined";
        confirmBtn.className = "flex-1 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-100 cursor-not-allowed";
        confirmBtn.onclick = null;
    } else if (club.member_count >= club.max_quota) {
        confirmBtn.disabled = true;
        confirmBtn.innerText = "Quota Full";
        confirmBtn.className = "flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl cursor-not-allowed";
        confirmBtn.onclick = null;
    } else {
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Confirm & Join";
        confirmBtn.className = "flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg";
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerText = "Joining...";
            await handleJoinClub(clubId);
            closeJoinModal();
        };
    }
    
    document.getElementById('join-modal').classList.remove('hidden');
}

function closeJoinModal() {
    document.getElementById('join-modal').classList.add('hidden');
}

async function handleJoinClub(clubId) {
    try {
        const res = await api.joinClub(clubId);
        if (res.ok) {
            loadClubs();
        } else {
            alert(res.data.detail || "Failed to join club.");
        }
    } catch (e) {
        alert("An error occurred");
    }
}

function renderMyMemberships() {
    const grid = document.getElementById('my-memberships-grid');
    const myClubs = clubsGlobal.filter(c => myMembershipsGlobal.some(m => m.club_id === c.club_id));
    
    if (myClubs.length === 0) {
        grid.innerHTML = `<p class="col-span-3 text-gray-500 italic">You haven't joined any clubs yet.</p>`;
        return;
    }
    
    grid.innerHTML = myClubs.map(c => `
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col">
            <h3 class="font-bold text-lg text-indigo-900 mb-2">${c.club_name}</h3>
            <span class="text-xs font-bold text-indigo-600 uppercase mb-4">${c.category || 'General'}</span>
            <div class="mt-auto">
                <span class="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm border border-emerald-200">
                    ✅ Active Member
                </span>
            </div>
        </div>
    `).join('');
}

function closeErrorModal() {
    document.getElementById('error-modal').classList.add('hidden');
}

async function submitApplication() {
    const message = document.getElementById('app-message').value.trim();
    if (!message) {
        alert("Please explain why you want to become a manager.");
        return;
    }
    await api.applyForManager(applyingClubId, message);
    closeApplyModal();
    loadClubs();
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
    const list = document.getElementById('pending-apps-list');
    
    if (apps.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">No pending applications.</td></tr>';
        return;
    }

    list.innerHTML = apps.map(a => `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4">
                <span class="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-bold">Applicant #${a.user_id}</span>
            </td>
            <td class="p-4">
                <p class="font-bold text-indigo-900">${a.club_name}</p>
                <p class="text-black font-medium mt-1 italic">"${a.application_message}"</p>
            </td>
            <td class="p-4 text-right">
                <button onclick="handleApprove('${a.manager_id}', true)" class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition">Approve</button>
                <button onclick="handleApprove('${a.manager_id}', false)" class="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold ml-2 hover:bg-red-700 transition">Reject</button>
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