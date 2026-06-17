let currentManagerClubId = null;
let applyingClubId = null;
let currentUser = null;
let myAppsGlobal = [];
let clubsGlobal = [];
let myMembershipsGlobal = [];
let myRegistrationsGlobal = [];
let campusEventsGlobal = [];
let pendingEventsGlobal = [];
let adminHistoryEventsGlobal = [];
let currentCampusFilter = 'Default';

document.addEventListener('click', function(e) {
    if (!e.target.closest('[id^="membership-menu-"]') && !e.target.closest('[onclick^="toggleMembershipMenu"]')) {
        document.querySelectorAll('[id^="membership-menu-"]').forEach(m => m.classList.add('hidden'));
    }
});

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
        await loadClubs();
        await loadUpcomingEvents();
    } else if (user.role_id === 2) {
        document.getElementById('display-role').innerText = "Club Manager";
        document.getElementById('tab-manager-view').classList.remove('hidden');
        document.getElementById('manager-view').classList.add('hidden');
        currentManagerClubId = user.managed_club_id;
        loadMyEvents();
        await loadClubs(); 
        await loadUpcomingEvents();
    } else if (user.role_id === 3) {
        document.getElementById('display-role').innerText = "Admin";
        document.getElementById('admin-sidebar-nav').classList.remove('hidden');
        document.getElementById('admin-sidebar-nav').classList.add('flex');
        document.getElementById('admin-view').classList.remove('hidden');
        document.getElementById('upcoming-events-view').classList.add('hidden');
        loadPendingApps();   
        loadPendingEvents(); 
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && document.getElementById(tabParam)) {
        switchTab(tabParam);
    }


    if (document.getElementById('ev-date') && document.getElementById('ev-end-date')) {
        const nowLocal = new Date();
        const tzOffset = nowLocal.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(nowLocal - tzOffset)).toISOString().slice(0, 16);
        
        document.getElementById('ev-date').min = localISOTime;
        document.getElementById('ev-end-date').min = localISOTime;
        
        const evDate = document.getElementById('ev-date');
        const evEndDate = document.getElementById('ev-end-date');
        
        function validateCreateDates() {
            if (evDate.value && evEndDate.value) {
                if (evEndDate.value <= evDate.value) {
                    evEndDate.setCustomValidity('The end date must be after the start date.');
                } else {
                    evEndDate.setCustomValidity('');
                }
            }
        }
        
        evDate.addEventListener('change', (e) => {
            if (e.target.value) evEndDate.min = e.target.value;
            validateCreateDates();
        });
        evEndDate.addEventListener('change', validateCreateDates);
    }

    if (document.getElementById('edit-ev-date') && document.getElementById('edit-ev-end-date')) {
        const editEvDate = document.getElementById('edit-ev-date');
        const editEvEndDate = document.getElementById('edit-ev-end-date');
        
        function validateEditDates() {
            if (editEvDate.value && editEvEndDate.value) {
                if (editEvEndDate.value <= editEvDate.value) {
                    editEvEndDate.setCustomValidity('The end date must be after the start date.');
                } else {
                    editEvEndDate.setCustomValidity('');
                }
            }
        }
        
        editEvDate.addEventListener('change', (e) => {
            if (e.target.value) editEvEndDate.min = e.target.value;
            validateEditDates();
        });
        editEvEndDate.addEventListener('change', validateEditDates);
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
            if (currentManagerClubId === c.club_id) {
                buttonHTML = `<button disabled class="w-full py-2 bg-emerald-100 text-emerald-600 font-bold rounded-lg cursor-not-allowed mt-2 shadow-inner border border-emerald-200">You are Manager</button>`;
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
        }
            
        if (currentUser.role_id === 2 && currentManagerClubId === c.club_id) {
            joinHTML = '';
        } else {
            const isMember = myMemberships.find(m => m.club_id === c.club_id);
            if (isMember) {
                joinHTML = `<button disabled class="w-full py-2 bg-indigo-100 text-indigo-500 font-bold rounded-lg cursor-not-allowed shadow-inner border border-indigo-200">Joined</button>`;
            } else if (c.member_count >= c.max_quota) {
                joinHTML = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed">Member Quota Full</button>`;
            } else {
                joinHTML = `<button onclick="openJoinModal('${c.club_id}')" class="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm">Join Club</button>`;
            }
        }

        return `
        <div class="bg-white p-6 rounded-2xl border shadow-sm transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col relative">
            <button onclick="openJoinModal('${c.club_id}')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition hover:bg-indigo-600 hover:text-white shadow-sm" title="View Details">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <div class="flex justify-between items-start mb-4 pr-10">
                <h3 class="font-bold text-lg leading-tight">${c.club_name}</h3>
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
    document.getElementById('upcoming-events-view').classList.add('hidden');
    document.getElementById('my-registrations-view').classList.add('hidden');
    
    const tabs = ['tab-student-view', 'tab-my-apps-view', 'tab-my-memberships-view', 'tab-upcoming-events-view', 'tab-my-registrations-view'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        if (el) el.className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    });
    
    if (currentUser && currentUser.role_id === 2 && document.getElementById('tab-manager-view')) {
        document.getElementById('tab-manager-view').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    }

    document.getElementById(tabId).classList.remove('hidden');
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) {
        activeTab.className = "w-full text-left px-4 py-3 rounded-lg bg-indigo-800 text-white font-bold transition flex items-center";
    }
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
            statusBadge = '<span class="text-orange-700 bg-orange-100 font-bold text-sm px-3 py-1 rounded-lg shrink-0 border border-orange-200">Pending</span>';
        } else if (a.request_status === 1) {
            statusBadge = '<span class="text-emerald-700 bg-emerald-100 font-bold text-sm px-3 py-1 rounded-lg shrink-0 border border-emerald-200">Approved</span>';
        } else {
            statusBadge = '<span class="text-red-700 bg-red-100 font-bold text-sm px-3 py-1 rounded-lg shrink-0 border border-red-200">Rejected</span>';
        }

        const dateStr = new Date(a.request_date).toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
        });

        return `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4 font-bold text-indigo-900">${a.club_name}</td>
                <td class="p-4 text-sm text-gray-800 font-semibold">${dateStr}</td>
                <td class="p-4 text-center">${statusBadge}</td>
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
        confirmBtn.innerText = "Joined";
        confirmBtn.className = "flex-1 py-3 bg-indigo-100 text-indigo-500 font-bold rounded-xl cursor-not-allowed shadow-inner border border-indigo-200";
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
            await loadClubs();
            renderCampusEvents();
        } else {
            showCustomAlert("Failed to Join", res.data.detail || "Failed to join club.", false);
        }
    } catch (e) {
        showCustomAlert("Error", "An error occurred while joining the club.", false);
    }
}

function renderMyMemberships() {
    const grid = document.getElementById('my-memberships-grid');
    const myClubs = clubsGlobal.filter(c => myMembershipsGlobal.some(m => m.club_id === c.club_id));
    
    if (myClubs.length === 0) {
        grid.innerHTML = `<p class="col-span-3 text-gray-500 italic">You haven't joined any clubs yet.</p>`;
        return;
    }

    myClubs.sort((a, b) => {
        const aIsManager = currentUser.role_id === 2 && currentManagerClubId === a.club_id;
        const bIsManager = currentUser.role_id === 2 && currentManagerClubId === b.club_id;
        if (aIsManager && !bIsManager) return -1;
        if (!aIsManager && bIsManager) return 1;
        return 0; // Keep original order for others
    });
    
    grid.innerHTML = myClubs.map(c => {
        const isManager = currentUser.role_id === 2 && currentManagerClubId === c.club_id;
        return `
        <div class="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm transform hover:-translate-y-2 hover:shadow-xl transition duration-300 flex flex-col relative">
            <div class="absolute top-3 right-3 flex items-center gap-1">
                <button onclick="openJoinModal('${c.club_id}')" class="w-8 h-8 rounded-full hover:bg-indigo-100 flex items-center justify-center transition text-indigo-400 hover:text-indigo-600" title="View Details">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                ${!isManager ? `
                <div class="relative">
                    <button onclick="toggleMembershipMenu(${c.club_id})" class="w-8 h-8 rounded-full hover:bg-indigo-100 flex items-center justify-center transition text-gray-400 hover:text-indigo-600">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div id="membership-menu-${c.club_id}" class="hidden absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <button onclick="handleLeaveClub(${c.club_id}, '${c.club_name.replace(/'/g, "\\'")}')" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                            Leave the Club
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            <h3 class="font-bold text-lg text-indigo-900 mb-2 pr-16">${c.club_name}</h3>
            <span class="text-xs font-bold text-indigo-600 uppercase mb-4">${c.category || 'General'}</span>
            <div class="mt-auto">
                <span class="inline-block px-3 py-1 ${isManager ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'} font-bold rounded-lg text-sm border">
                    ${isManager ? '⭐ Club Manager' : 'Active Member'}
                </span>
            </div>
        </div>
    `}).join('');
}

function toggleMembershipMenu(clubId) {
    const allMenus = document.querySelectorAll('[id^="membership-menu-"]');
    allMenus.forEach(menu => {
        if (menu.id !== `membership-menu-${clubId}`) {
            menu.classList.add('hidden');
        }
    });
    const menu = document.getElementById(`membership-menu-${clubId}`);
    menu.classList.toggle('hidden');
}

async function handleLeaveClub(clubId, clubName) {
    document.querySelectorAll('[id^="membership-menu-"]').forEach(m => m.classList.add('hidden'));
    showConfirm(
        'Leave Club',
        `Are you sure you want to leave <strong>${clubName}</strong>?`,
        async () => {
            try {
                await api.leaveClub(clubId);
                showCustomAlert('Success', `You have left ${clubName}.`, true);
                await loadClubs();
            } catch (err) {
                showCustomAlert('Error', err.message, false);
            }
        }
    );
}

function closeErrorModal() {
    document.getElementById('error-modal').classList.add('hidden');
}

function showCustomAlert(title, message, isSuccess = false) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').innerText = title;
    document.getElementById('error-modal-message').innerText = message;
    
    const iconSpan = modal.querySelector('span.text-xl');
    const iconContainer = iconSpan.parentElement;
    const button = modal.querySelector('button');
    const box = modal.querySelector('.bg-white');
    
    if (isSuccess) {
        iconSpan.innerText = '✅';
        iconContainer.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4';
        box.className = 'bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center border-t-4 border-emerald-500';
        button.className = 'w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold transition';
        button.innerText = 'Great';
    } else {
        iconSpan.innerText = '❌';
        iconContainer.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4';
        box.className = 'bg-white rounded-xl shadow-lg w-full max-w-sm p-6 text-center border-t-4 border-red-500';
        button.className = 'w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition';
        button.innerText = 'Understood';
    }
    
    modal.classList.remove('hidden');
}


function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-modal-title').innerText = title;
    document.getElementById('confirm-modal-message').innerHTML = message;
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    const close = () => modal.classList.add('hidden');
    okBtn.onclick = () => { close(); onConfirm(); };
    cancelBtn.onclick = close;
}

async function loadMyRegistrations() {
    try {
        myRegistrationsGlobal = await api.getMyRegistrations();
        const grid = document.getElementById('my-registrations-grid');
        if (myRegistrationsGlobal.length === 0) {
            grid.innerHTML = '<p class="text-gray-500 italic">You have no event registrations yet.</p>';
            return;
        }
        
        grid.innerHTML = myRegistrationsGlobal.map(r => {
            const sd = new Date(r.event_date);
            const ed = new Date(r.event_end_date);
            const now = new Date();
            let localState = r.computed_state;
            if (localState !== 'Cancelled') {
                if (now > ed) localState = 'Completed';
                else if (now >= sd && now <= ed) localState = 'Ongoing';
                else localState = 'Upcoming';
            }

            const startStr = sd.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let cardBgClass = 'bg-white border-gray-200 hover:shadow-indigo-200/50';
            if (localState === 'Cancelled') cardBgClass = 'bg-red-100 border-red-400 hover:shadow-red-300/50';
            else if (localState === 'Ongoing') cardBgClass = 'bg-teal-100 border-teal-500 hover:shadow-teal-400/50';
            else if (localState === 'Upcoming') cardBgClass = 'bg-blue-100 border-blue-400 hover:shadow-blue-300/50';
            else if (localState === 'Completed') cardBgClass = 'bg-white border-gray-200 hover:shadow-gray-300/50';

            const safeDesc = (r.description || '').replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            const endStr = new Date(r.event_end_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            return `
            <div class="p-5 ${cardBgClass} border rounded-2xl flex flex-col justify-between h-full shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 cursor-pointer relative group" onclick="openEventDetailsModal('${r.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${safeDesc}', '${r.location.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${r.category}', '${startStr}', '${endStr}', ${r.is_members_only}, ${r.max_attendees}, '${r.creator_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${r.creator_email.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', false)">
                <!-- Info Icon visible always -->
                <button class="absolute top-4 right-4 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition hover:bg-indigo-600 hover:text-white shadow-sm" title="Event Details">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                
                <div class="pr-10">
                    <p class="font-bold text-lg text-indigo-950 line-clamp-1 mb-4">${r.title}</p>
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center text-sm font-semibold text-indigo-800 bg-white/60 p-2 rounded-lg">
                            <span class="mr-2">📅</span> ${startStr}
                        </div>
                        <div class="flex items-center text-sm font-semibold text-emerald-800 bg-white/60 p-2 rounded-lg">
                            <span class="mr-2">📍</span> ${r.location}
                        </div>
                    </div>
                </div>
                <div class="mt-auto pt-4 border-t border-gray-300/50 flex justify-between items-center">
                    <span class="text-xs font-bold text-gray-600">Registered: ${new Date(r.registered_at).toLocaleDateString()}</span>
                    ${(() => {
                        if (localState === 'Cancelled') return '<span class="text-xs font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg border border-rose-600 shadow-sm shrink-0">Cancelled</span>';
                        if (localState === 'Completed') return '<span class="text-xs font-bold bg-slate-500 text-white px-3 py-1.5 rounded-lg border border-slate-500 shadow-sm shrink-0">Completed</span>';
                        if (localState === 'Ongoing') return '<span class="text-xs font-bold bg-teal-600 text-white px-3 py-1.5 rounded-lg border border-teal-600 shadow-sm shrink-0 animate-pulse">Ongoing</span>';
                        return '<span class="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg border border-blue-600 shadow-sm shrink-0">Upcoming</span>';
                    })()}
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadUpcomingEvents() {
    try {
        campusEventsGlobal = await api.getUpcomingEvents();
        await loadMyRegistrations();
        renderCampusEvents();
    } catch (error) {
        console.error("Failed to load campus events:", error);
    }
}

function filterCampusEvents(filterName) {
    currentCampusFilter = filterName;
    
    ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'].forEach(f => {
        const btn = document.getElementById(`filter-${f}`);
        if(btn) {
            if(f === filterName) {
                btn.className = "pb-3 border-b-2 font-bold text-base transition-colors border-indigo-600 text-indigo-600";
            } else {
                btn.className = "pb-3 border-b-2 font-bold text-base transition-colors border-transparent text-black hover:text-indigo-600 hover:border-indigo-300";
            }
        }
    });
    
    renderCampusEvents();
}

function renderCampusEvents() {
    const grid = document.getElementById('upcoming-events-grid');
    const now = new Date();
    
    let processedEvents = campusEventsGlobal.map(e => {
        const start = new Date(e.event_date);
        const end = new Date(e.event_end_date);
        let state = 'Upcoming';
        let badgeHtml = '';
        
        if (e.event_state === 'Cancelled') {
            state = 'Cancelled';
            badgeHtml = '<span class="text-xs font-bold bg-rose-600 text-white px-2 py-1 rounded-md border border-rose-600 shrink-0 shadow-sm">Cancelled</span>';
        } else if (now > end) {
            state = 'Completed';
            badgeHtml = '<span class="text-xs font-bold bg-slate-500 text-white px-2 py-1 rounded-md border border-slate-500 shrink-0 shadow-sm">Completed</span>';
        } else if (now >= start && now <= end) {
            state = 'Ongoing';
            badgeHtml = '<span class="text-xs font-bold bg-teal-600 text-white px-2 py-1 rounded-md border border-teal-600 shrink-0 animate-pulse">Ongoing</span>';
        } else {
            state = 'Upcoming';
            badgeHtml = '<span class="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-md border border-blue-600 shrink-0 shadow-sm">Upcoming</span>';
        }
        
        return { ...e, computedState: state, badgeHtml };
    });
    
    if (currentCampusFilter !== 'All') {
        if (currentCampusFilter === 'Default') {
            processedEvents = processedEvents.filter(e => e.computedState === 'Upcoming' || e.computedState === 'Ongoing');
        } else {
            processedEvents = processedEvents.filter(e => e.computedState === currentCampusFilter);
        }
    }
    
    if (processedEvents.length === 0) {
        grid.innerHTML = `<p class="col-span-3 text-gray-500 italic">No events found for this filter.</p>`;
        return;
    }

    grid.innerHTML = processedEvents.map(e => {
        const isRegistered = myRegistrationsGlobal.some(r => r.event_id === e.event_id);
        const isMember = myMembershipsGlobal.some(m => m.club_id === e.club_id);
        const isFull = e.current_capacity >= e.max_attendees;
        
        let btnHtml = '';
        if (e.computedState === 'Completed' || e.computedState === 'Cancelled') {
            btnHtml = `<button disabled class="w-full py-2 bg-gray-100 text-gray-400 font-bold rounded-lg cursor-not-allowed">Event ${e.computedState}</button>`;
        } else if (isRegistered) {
            btnHtml = `<button disabled class="w-full py-2 bg-indigo-100 text-indigo-500 font-bold rounded-lg cursor-not-allowed shadow-inner border border-indigo-200">Registered</button>`;
        } else if (e.is_members_only && !isMember) {
            btnHtml = `<button disabled class="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed" title="You must join the club first">🔒 Members Only</button>`;
        } else if (isFull) {
            btnHtml = `<button disabled class="w-full py-2 bg-red-50 text-red-500 border border-red-100 font-bold rounded-lg cursor-not-allowed">Capacity Full</button>`;
        } else {
            btnHtml = `<button onclick="handleRegisterEvent(${e.event_id})" id="reg-btn-${e.event_id}" class="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm">Register for Event</button>`;
        }
        
        let cardBgClass = 'bg-white border-gray-200 hover:shadow-indigo-200/50';
        if (e.computedState === 'Ongoing') cardBgClass = 'bg-teal-100 border-teal-500 hover:shadow-teal-400/50';
        else if (e.computedState === 'Upcoming') cardBgClass = 'bg-blue-100 border-blue-400 hover:shadow-blue-300/50';
        else if (e.computedState === 'Cancelled') cardBgClass = 'bg-red-100 border-red-400 hover:shadow-red-300/50';
        else if (e.computedState === 'Completed') cardBgClass = 'bg-gray-100 border-gray-400 opacity-90 hover:opacity-100 hover:shadow-gray-400/50 transition-opacity';

        const startDateFormatted = new Date(e.event_date).toLocaleString([], { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        const safeDesc = (e.description || '').replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');

        return `
            <div class="${cardBgClass} p-6 rounded-xl border shadow-md transform hover:-translate-y-2 hover:shadow-2xl transition duration-300 flex flex-col justify-between h-full relative">
                <button onclick="openEventDetailsModal('${e.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${safeDesc}', '${e.location.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${e.category}', '${startDateFormatted}', '${new Date(e.event_end_date).toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}', ${e.is_members_only}, ${e.max_attendees}, '${e.creator_name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${e.creator_email.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', false)" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white text-indigo-700 flex items-center justify-center transition hover:bg-indigo-700 hover:text-white shadow-sm border border-indigo-200" title="Event Details">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                <div class="flex justify-between items-start mb-4 pr-10">
                    <h3 class="font-bold text-xl leading-tight text-gray-900 line-clamp-2 min-h-[3rem]">${e.title}</h3>
                </div>
                <div class="mb-4">
                    ${e.badgeHtml}
                </div>
                
                <div class="space-y-3 mb-6 mt-auto">
                    <div class="flex items-center text-xs text-gray-900 font-bold">
                        <span class="mr-2 text-base">📍</span> ${e.location}
                    </div>
                    <div class="flex items-center text-xs text-gray-900 font-bold">
                        <span class="mr-2 text-base">📅</span> ${startDateFormatted}
                    </div>
                    <div class="flex items-center text-xs text-gray-900 font-bold justify-between">
                        <div><span class="mr-2 text-base">🏛️</span> ${e.club_name}</div>
                        <div class="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">👥 ${e.current_capacity}/${e.max_attendees}</div>
                    </div>
                </div>
                
                <div>
                    ${btnHtml}
                </div>
            </div>
        `;
    }).join('');
}

async function handleRegisterEvent(eventId) {
    const btn = document.getElementById(`reg-btn-${eventId}`);
    const originalText = btn.innerText;
    try {
        btn.disabled = true;
        btn.innerText = "Registering...";
        btn.classList.add("opacity-75", "cursor-not-allowed");
        
        await api.registerForEvent(eventId);
        
        await loadUpcomingEvents(); 
    } catch (error) {
        showCustomAlert("Registration Failed", error.message || "Could not register for this event.", false);
        btn.disabled = false;
        btn.innerText = originalText;
        btn.classList.remove("opacity-75", "cursor-not-allowed");
    }
}

async function submitApplication() {
    const message = document.getElementById('app-message').value.trim();
    if (!message) {
        showCustomAlert("Missing Information", "Please explain why you want to become a manager.", false);
        return;
    }
    await api.applyForManager(applyingClubId, message);
    closeApplyModal();
    loadClubs();
}

async function submitEvent() {
    const title = document.getElementById('ev-title').value.trim();
    const desc = document.getElementById('ev-desc').value.trim();
    const loc = document.getElementById('ev-loc').value.trim();
    const category = document.getElementById('ev-category').value;
    const dateStr = document.getElementById('ev-date').value;
    const endDateStr = document.getElementById('ev-end-date').value;
    const maxAtt = document.getElementById('ev-quota').value || "100";
    const isMembersOnly = document.getElementById('ev-members-only').checked;

    if (!title || !desc || !loc || !dateStr || !endDateStr) {
        showCustomAlert("Missing Fields", "Please fill in all required fields (Title, Description, Location, Start/End Dates).");
        return;
    }
    
    const eventDateObj = new Date(dateStr);
    const eventEndDateObj = new Date(endDateStr);
    
    if (eventDateObj < new Date()) {
        const evDateEl = document.getElementById('ev-date');
        evDateEl.setCustomValidity("Event start date cannot be in the past.");
        evDateEl.reportValidity();
        return;
    } else {
        document.getElementById('ev-date').setCustomValidity("");
    }
    
    if (eventEndDateObj <= eventDateObj) {
        const evEndDateEl = document.getElementById('ev-end-date');
        evEndDateEl.setCustomValidity("The end date must be after the start date.");
        evEndDateEl.reportValidity();
        return;
    } else {
        document.getElementById('ev-end-date').setCustomValidity("");
    }
    
    // Convert date string directly avoiding UTC shift
    const eventDateIso = dateStr.length === 16 ? dateStr + ":00" : dateStr;
    const eventEndDateIso = endDateStr.length === 16 ? endDateStr + ":00" : endDateStr;

    try {
        await api.createEvent(title, desc, loc, eventDateIso, eventEndDateIso, category, maxAtt, isMembersOnly);
        document.getElementById('create-event-modal').classList.add('hidden');
        showCustomAlert("Success!", "Event created successfully! Waiting for Admin approval.", true);
        document.getElementById('ev-title').value = '';
        document.getElementById('ev-desc').value = '';
        document.getElementById('ev-loc').value = '';
        document.getElementById('ev-date').value = '';
        document.getElementById('ev-end-date').value = '';
        document.getElementById('ev-quota').value = '';
        document.getElementById('ev-members-only').checked = false;
        loadMyEvents();
    } catch (e) {
        showCustomAlert("Submission Failed", e.message);
    }
}

async function loadMyEvents() {
    const events = await api.getMyEvents();
    myEventsGlobal = events;
    
    // The "Create Event" card that sits at the beginning of the grid
    const createCard = `
        <div onclick="openCreateEventModal()" class="p-5 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition min-h-[200px] group">
            <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition mb-3">+</div>
            <p class="font-bold text-indigo-900">Create New Event</p>
        </div>
    `;

    document.getElementById('my-events-list').innerHTML = createCard + events.map(e => {
        const sd = new Date(e.event_date);
        const ed = new Date(e.event_end_date);
        
        const startStr = sd.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const endStr = ed.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        // Escape quotes in description for JSON encoding
        const safeDesc = (e.description || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        return `
        <div class="p-5 bg-white border rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 relative group cursor-pointer" onclick="openManagerEventModal(${e.event_id})">
            <!-- Info Icon visible always -->
            <button class="absolute top-4 right-4 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition hover:bg-indigo-600 hover:text-white shadow-sm" title="Event Details">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>

            <div>
                <div class="flex justify-between items-start mb-2 pr-10">
                    <p class="font-bold text-lg text-indigo-950 line-clamp-1">${e.title}</p>
                </div>
                
                <div class="flex items-center gap-2 mb-3">
                    <span class="${
                        e.approval_status === 1 ? 'text-emerald-700 bg-emerald-100' : 
                        e.approval_status === 2 ? 'text-red-700 bg-red-100' : 
                        'text-orange-700 bg-orange-100'
                    } font-bold text-xs px-2 py-1 rounded-lg shrink-0">
                        ${
                            e.approval_status === 1 ? 'Approved' : 
                            e.approval_status === 2 ? 'Rejected' : 
                            'Pending'
                        }
                    </span>
                    ${(() => {
                        const now = new Date();
                        if (e.event_state === 'Cancelled' && e.approval_status !== 2) return '<span class="text-xs font-bold bg-rose-600 text-white px-2 py-1 rounded-md border border-rose-600 shrink-0 shadow-sm">Cancelled</span>';
                        if (e.approval_status === 0) return '';
                        if (e.approval_status === 2) return '';
                        if (now > ed) return '<span class="text-xs font-bold bg-slate-500 text-white px-2 py-1 rounded-md border border-slate-500 shrink-0 shadow-sm">Completed</span>';
                        if (now >= sd && now <= ed) return '<span class="text-xs font-bold bg-teal-600 text-white px-2 py-1 rounded-md border border-teal-600 shrink-0 animate-pulse">Ongoing</span>';
                        return '<span class="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-md border border-blue-600 shrink-0 shadow-sm">Upcoming</span>';
                    })()}
                </div>
                
                <div class="space-y-2 mt-auto">
                    <div class="flex items-center text-sm font-semibold text-indigo-800 bg-indigo-50 p-2 rounded-lg">
                        <span class="mr-2">📅</span> ${startStr}
                    </div>
                    <div class="flex items-center text-sm font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                        <span class="mr-2">📍</span> ${e.location}
                    </div>
                </div>
                <button onclick="openParticipantsModal(${e.event_id}, event)" class="mt-4 w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center justify-center">
                    <span class="mr-2 text-lg">👥</span> View Participants (${e.current_capacity || 0}/${e.max_attendees})
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function openEventDetailsModal(title, desc, loc, category, startStr, endStr, isMembersOnly, maxAtt, creatorName, creatorEmail, showActions) {
    document.getElementById('detail-modal-title').innerText = title;
    document.getElementById('detail-modal-desc').innerText = desc || "No description provided.";
    document.getElementById('detail-modal-loc').innerText = loc;
    document.getElementById('detail-modal-cat').innerText = category || "General";
    document.getElementById('detail-modal-start').innerText = startStr;
    document.getElementById('detail-modal-end').innerText = endStr;
    document.getElementById('detail-modal-quota').innerText = maxAtt + " People";
    document.getElementById('detail-modal-creator').innerText = creatorName || "Unknown";
    document.getElementById('detail-modal-email').innerText = creatorEmail || "";
    
    const membersOnlyBadge = document.getElementById('detail-modal-privacy');
    if (isMembersOnly) {
        membersOnlyBadge.innerText = "Members Only 🔒";
        membersOnlyBadge.className = "px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-lg";
    } else {
        membersOnlyBadge.innerText = "Public 🌍";
        membersOnlyBadge.className = "px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg";
    }

    if (!showActions) {
        document.getElementById('detail-modal-buttons').classList.add('hidden');
    } else {
        document.getElementById('detail-modal-buttons').classList.remove('hidden');
    }

    document.getElementById('event-details-modal').classList.remove('hidden');
}

function closeEventDetailsModal() {
    document.getElementById('event-details-modal').classList.add('hidden');
}

async function loadPendingApps() {
    const apps = await api.getPendingApplications();
    const list = document.getElementById('pending-apps-list');
    
    if (apps.length === 0) {
        list.innerHTML = '<tr><td colspan="2"></td><td colspan="2" class="p-4 text-left text-gray-400">No pending applications.</td></tr>';
        return;
    }

    list.innerHTML = apps.map(a => `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4">
                <span class="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm border border-indigo-100">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    User #${a.user_id}
                </span>
            </td>
            <td class="p-4 text-sm text-gray-800 font-semibold">
                ${a.request_date ? new Date(a.request_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
            </td>
            <td class="p-4">
                <p class="font-bold text-gray-900">${a.club_name}</p>
                <p class="text-gray-800 font-medium text-sm mt-1">"${a.application_message}"</p>
            </td>
            <td class="p-4 text-right">
                <button onclick="handleApprove('${a.manager_id}', true)" class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm">Approve</button>
                <button onclick="handleApprove('${a.manager_id}', false)" class="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-bold ml-2 hover:bg-red-600 hover:text-white transition shadow-sm">Reject</button>
            </td>
        </tr>
    `).join('');
}

async function handleApprove(id, status) {
    const res = await api.approveManager(id, status);
    showCustomAlert(status ? "Approved" : "Rejected", res.message, status);
    loadPendingApps();
}

function switchAdminTab(tabName) {
    if (tabName === 'pending') {
        document.getElementById('admin-pending-view').classList.remove('hidden');
        document.getElementById('admin-history-view').classList.add('hidden');
        document.getElementById('admin-tab-pending').className = "w-full text-left px-4 py-3 rounded-lg bg-indigo-800 text-white font-bold transition flex items-center";
        document.getElementById('admin-tab-history').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
    } else {
        document.getElementById('admin-pending-view').classList.add('hidden');
        document.getElementById('admin-history-view').classList.remove('hidden');
        document.getElementById('admin-tab-history').className = "w-full text-left px-4 py-3 rounded-lg bg-indigo-800 text-white font-bold transition flex items-center";
        document.getElementById('admin-tab-pending').className = "w-full text-left px-4 py-3 rounded-lg text-indigo-100 hover:text-white hover:bg-indigo-900 transition font-medium flex items-center";
        loadAdminHistory();
    }
}

async function loadPendingEvents() {
    const events = await api.getPendingEvents();
    pendingEventsGlobal = events;
    const list = document.getElementById('pending-events-list');
    
    if (events.length === 0) {
        list.innerHTML = '<tr><td colspan="2"></td><td colspan="2" class="p-4 text-left text-gray-400">No pending events.</td></tr>';
        return;
    }

    list.innerHTML = events.map(e => {
        return `
        <tr class="border-b hover:bg-gray-50 transition">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <button onclick="openAdminEventModal(${e.event_id}, 'pending')" class="w-7 h-7 shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition hover:bg-indigo-600 hover:text-white" title="Event Details">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                    <div>
                        <p class="font-bold text-gray-900">${e.title}</p>
                    </div>
                </div>
            </td>
            <td class="p-4 text-sm text-gray-800 font-semibold">
                ${e.request_date ? new Date(e.request_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
            </td>
            <td class="p-4">
                <p class="font-bold text-gray-900 flex items-center gap-2">
                    ${e.creator_name}
                    <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                        ID: #${e.creator_id}
                    </span>
                </p>
                <p class="text-sm text-gray-700 font-semibold flex items-center gap-1 mt-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    ${e.club_name}
                </p>
            </td>
            <td class="p-4 text-right">
                <button onclick="handleEventApprove(${e.event_id}, true)" class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm">Approve</button>
                <button onclick="handleEventApprove(${e.event_id}, false)" class="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-bold ml-2 hover:bg-red-600 hover:text-white transition shadow-sm">Reject</button>
            </td>
        </tr>
    `}).join('');
}

async function loadAdminHistory() {
    const [apps, events] = await Promise.all([
        api.getAdminAppsHistory(),
        api.getAdminEventsHistory()
    ]);

    const appsList = document.getElementById('history-apps-list');
    if (apps.length === 0) {
        appsList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">No application history.</td></tr>';
    } else {
        appsList.innerHTML = apps.map(a => `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4 font-bold text-gray-900 flex items-center gap-2">
                    ${a.applicant_name}
                    <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                        ID: #${a.applicant_id}
                    </span>
                </td>
                <td class="p-4 text-gray-700 font-medium">${a.club_name}</td>
                <td class="p-4 text-sm text-gray-600 font-medium">
                    ${a.request_date ? new Date(a.request_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                </td>
                <td class="p-4 text-sm text-gray-600 font-bold">
                    ${a.decision_date ? new Date(a.decision_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                </td>
                <td class="p-4 text-right">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${a.request_status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${a.request_status === 1 ? 'Approved' : 'Rejected'}</span>
                </td>
            </tr>
        `).join('');
    }

    adminHistoryEventsGlobal = events;
    const eventsList = document.getElementById('history-events-list');
    if (events.length === 0) {
        eventsList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">No events history.</td></tr>';
    } else {
        eventsList.innerHTML = events.map(e => {
            const sd = new Date(e.event_date);
            const ed = new Date(e.event_end_date);
            const startStr = sd.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const endStr = ed.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const safeDesc = (e.description || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            return `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <button onclick="openAdminEventModal(${e.event_id}, 'history')" class="w-7 h-7 shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center transition hover:bg-indigo-600 hover:text-white" title="Event Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        <p class="font-bold text-gray-900">${e.title}</p>
                    </div>
                </td>
                <td class="p-4">
                    <p class="font-bold text-gray-900 flex items-center gap-2">
                        ${e.creator_name}
                        <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                            ID: #${e.creator_id}
                        </span>
                    </p>
                    <p class="text-sm text-gray-700 font-semibold flex items-center gap-1 mt-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        ${e.club_name}
                    </p>
                </td>
                <td class="p-4 text-sm text-gray-600 font-medium">
                    ${e.request_date ? new Date(e.request_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                </td>
                <td class="p-4 text-sm text-gray-600 font-bold">
                    ${e.decision_date ? new Date(e.decision_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                </td>
                <td class="p-4 text-right">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${e.approval_status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${e.approval_status === 1 ? 'Approved' : 'Rejected'}</span>
                </td>
            </tr>
        `}).join('');
    }
}

async function handleEventApprove(id, status) {
    const res = await api.approveEvent(id, status);
    showCustomAlert(status ? "Approved" : "Rejected", res.message, status);
    loadPendingEvents(); 
}

function logout() {
    showConfirm(
        "Log Out",
        "Are you sure you want to log out of the Uni Event Portal?",
        () => {
            localStorage.clear();
            window.location.href = "index.html";
        }
    );
}

init();

let myEventsGlobal = [];

function openManagerEventModal(eventId) {
    const e = myEventsGlobal.find(ev => ev.event_id === eventId);
    if (!e) return;
    
    const sd = new Date(e.event_date);
    const ed = new Date(e.event_end_date);
    const startStr = sd.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const endStr = ed.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    document.getElementById('detail-modal-title').innerText = e.title;
    document.getElementById('detail-modal-desc').innerText = e.description || "No description provided.";
    document.getElementById('detail-modal-loc').innerText = e.location;
    document.getElementById('detail-modal-cat').innerText = e.category || "General";
    document.getElementById('detail-modal-start').innerText = startStr;
    document.getElementById('detail-modal-end').innerText = endStr;
    document.getElementById('detail-modal-quota').innerText = e.max_attendees + " People";
    document.getElementById('detail-modal-creator').innerText = currentUser.full_name;
    document.getElementById('detail-modal-email').innerText = currentUser.email;
    
    const membersOnlyBadge = document.getElementById('detail-modal-privacy');
    if (e.is_members_only) {
        membersOnlyBadge.innerText = "Members Only 🔒";
        membersOnlyBadge.className = "px-3 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-lg";
    } else {
        membersOnlyBadge.innerText = "Public 🌍";
        membersOnlyBadge.className = "px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg";
    }

    const now = new Date();
    let buttons = '';
    const isCancelled = e.approval_status === 2 || e.event_state === 'Cancelled';
    const isCompleted = ed < now;
    const isOngoing = sd <= now && now <= ed;
    
    if (!isCancelled && !isCompleted && !isOngoing) {
        buttons = `
        <button onclick="openEditEventModal(${e.event_id})" class="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold rounded-xl transition border border-blue-100">Edit Event</button>
        <button onclick="cancelEvent(${e.event_id})" class="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold rounded-xl transition border border-red-100">Cancel Event</button>
        `;
    }

    document.getElementById('detail-modal-buttons').innerHTML = buttons;
    document.getElementById('detail-modal-buttons').classList.remove('hidden');
    document.getElementById('event-details-modal').classList.remove('hidden');
}

function openEditEventModal(eventId) {
    closeEventDetailsModal();
    const e = myEventsGlobal.find(ev => ev.event_id === eventId);
    if (!e) return;
    
    document.getElementById('edit-ev-id').value = e.event_id;
    document.getElementById('edit-ev-title').value = e.title;
    document.getElementById('edit-ev-desc').value = e.description;
    document.getElementById('edit-ev-loc').value = e.location;
    
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    document.getElementById('edit-ev-date').value = e.event_date.slice(0, 16);
    document.getElementById('edit-ev-end-date').value = e.event_end_date.slice(0, 16);
    document.getElementById('edit-ev-quota').value = e.max_attendees;
    document.getElementById('edit-ev-members-only').checked = e.is_members_only;
    
    const nowLocalStr = (new Date(new Date() - tzOffset)).toISOString().slice(0, 16);
    document.getElementById('edit-ev-date').setAttribute('min', nowLocalStr);
    document.getElementById('edit-ev-end-date').setAttribute('min', nowLocalStr);

    document.getElementById('edit-event-modal').classList.remove('hidden');
}

function openCreateEventModal() {
    // Set min date to current local time
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const nowLocalStr = (new Date(new Date() - tzOffset)).toISOString().slice(0, 16);
    document.getElementById('ev-date').setAttribute('min', nowLocalStr);
    document.getElementById('ev-end-date').setAttribute('min', nowLocalStr);

    document.getElementById('create-event-modal').classList.remove('hidden');
}

function closeEditEventModal() {
    document.getElementById('edit-event-modal').classList.add('hidden');
}

async function submitEditEvent(event) {
    event.preventDefault();
    const eventId = document.getElementById('edit-ev-id').value;
    const d1 = document.getElementById('edit-ev-date').value;
    const d2 = document.getElementById('edit-ev-end-date').value;
    const payload = {
        title: document.getElementById('edit-ev-title').value,
        description: document.getElementById('edit-ev-desc').value,
        location: document.getElementById('edit-ev-loc').value,
        event_date: d1.length === 16 ? d1 + ":00" : d1,
        event_end_date: d2.length === 16 ? d2 + ":00" : d2,
        max_attendees: parseInt(document.getElementById('edit-ev-quota').value) || 100,
        is_members_only: document.getElementById('edit-ev-members-only').checked
    };
    
    if (d1 >= d2) {
        const endEl = document.getElementById('edit-ev-end-date');
        endEl.setCustomValidity("The end date must be after the start date.");
        endEl.reportValidity();
        return;
    } else {
        document.getElementById('edit-ev-end-date').setCustomValidity("");
    }

    try {
        await api.updateEvent(eventId, payload);
        showCustomAlert("Success", "Event details have been updated successfully.", true);
        closeEditEventModal();
        loadMyEvents();
        loadUpcomingEvents();
    } catch(err) {
        showCustomAlert("Update Failed", err.message || "Failed to update event.", false);
    }
}

async function cancelEvent(eventId) {
    showConfirm(
        "Cancel Event",
        "Are you sure you want to cancel this event? This action cannot be undone.",
        async () => {
            try {
                await api.cancelEvent(eventId);
                showCustomAlert("Event Cancelled", "The event has been successfully cancelled.", true);
                closeEventDetailsModal();
                loadMyEvents();
                loadUpcomingEvents();
            } catch(err) {
                showCustomAlert("Cancellation Failed", err.message || "Failed to cancel event.", false);
            }
        }
    );
}



function openAdminEventModal(eventId, source) {
    let e;
    if(source === "pending") e = pendingEventsGlobal.find(ev => ev.event_id === eventId);
    else e = adminHistoryEventsGlobal.find(ev => ev.event_id === eventId);
    if(!e) return;
    const fmtOpts = { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    openEventDetailsModal(e.title, e.description, e.location, e.category, new Date(e.event_date).toLocaleString([], fmtOpts), new Date(e.event_end_date).toLocaleString([], fmtOpts), e.is_members_only, e.max_attendees, e.creator_name, e.creator_email, false);
}

function openCampusEventModal(eventId) {
    const e = campusEventsGlobal.find(ev => ev.event_id === eventId);
    if(!e) return;
    const fmtOpts = { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    openEventDetailsModal(e.title, e.description, e.location, e.category, new Date(e.event_date).toLocaleString([], fmtOpts), new Date(e.event_end_date).toLocaleString([], fmtOpts), e.is_members_only, e.max_attendees, e.creator_name, e.creator_email, false);
}

// ==========================================
// PARTICIPANTS MODAL
// ==========================================
async function openParticipantsModal(eventId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const tbody = document.getElementById('participants-table-body');
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-gray-500">Loading participants...</td></tr>`;
    document.getElementById('participants-modal').classList.remove('hidden');

    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to fetch participants");
        }

        const participants = await response.json();
        
        if (participants.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10">
                <div class="flex flex-col items-center">
                    <span class="text-4xl mb-3">👻</span>
                    <p class="text-gray-500 font-medium">No one has registered for this event yet.</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = participants.map(p => {
            const regDate = p.registered_at ? new Date(p.registered_at).toLocaleString([], {
                year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }) : 'Unknown';
            
            return `
            <tr class="hover:bg-indigo-50/20 transition border-b border-gray-100">
                <td class="py-4 px-6">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mr-3">
                            ${p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span class="font-bold text-black text-sm">${p.full_name}</span>
                    </div>
                </td>
                <td class="py-4 px-6 text-sm text-black font-medium">${p.email}</td>
                <td class="py-4 px-6 text-sm text-black font-medium">${regDate}</td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500 font-bold">Error: ${err.message}</td></tr>`;
    }
}

function closeParticipantsModal() {
    document.getElementById('participants-modal').classList.add('hidden');
}
