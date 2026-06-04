let currentManagerClubId = null;
let applyingClubId = null;
let currentUser = null;
let myAppsGlobal = [];
let clubsGlobal = [];
let myMembershipsGlobal = [];
let myRegistrationsGlobal = [];
let campusEventsGlobal = [];
let currentCampusFilter = 'Default';

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
        document.getElementById('admin-view').classList.remove('hidden');
        document.getElementById('upcoming-events-view').classList.add('hidden');
        loadPendingApps();   
        loadPendingEvents(); 
    }

    // Set minimum date for event pickers to disable past dates
    if (document.getElementById('ev-date') && document.getElementById('ev-end-date')) {
        const nowLocal = new Date();
        const tzOffset = nowLocal.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(nowLocal - tzOffset)).toISOString().slice(0, 16);
        
        document.getElementById('ev-date').min = localISOTime;
        document.getElementById('ev-end-date').min = localISOTime;
        
        document.getElementById('ev-date').addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('ev-end-date').min = e.target.value;
            }
        });
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
        }
            
        if (currentUser.role_id === 2 && currentManagerClubId === c.club_id) {
            joinHTML = '';
        } else {
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
            await loadClubs();
            renderCampusEvents();
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

async function loadMyRegistrations() {
    try {
        myRegistrationsGlobal = await api.getMyRegistrations();
        const grid = document.getElementById('my-registrations-grid');
        if (myRegistrationsGlobal.length === 0) {
            grid.innerHTML = '<p class="text-gray-500 italic">You have no event registrations yet.</p>';
            return;
        }
        
        grid.innerHTML = myRegistrationsGlobal.map(r => `
            <div class="bg-white p-6 rounded-xl border shadow-sm">
                <span class="text-xs font-bold text-indigo-600">Event ID: ${r.event_id}</span>
                <p class="text-sm text-gray-500 mt-2">Registered At: ${new Date(r.registered_at).toLocaleDateString()}</p>
            </div>
        `).join('');
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
        
        if (e.approval_status === 2) {
            state = 'Cancelled';
            badgeHtml = '<span class="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100 shrink-0">Cancelled</span>';
        } else if (now > end) {
            state = 'Completed';
            badgeHtml = '<span class="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200 shrink-0">Completed</span>';
        } else if (now >= start && now <= end) {
            state = 'Ongoing';
            badgeHtml = '<span class="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 shrink-0 animate-pulse">Ongoing</span>';
        } else {
            state = 'Upcoming';
            badgeHtml = '<span class="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 shrink-0">Upcoming</span>';
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
            btnHtml = `<button disabled class="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold rounded-lg cursor-not-allowed">✅ Registered</button>`;
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
        else if (e.computedState === 'Completed') cardBgClass = 'bg-gray-100 border-gray-400 hover:shadow-gray-300/50';

        const startDateFormatted = new Date(e.event_date).toLocaleString([], { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        return `
            <div class="${cardBgClass} p-6 rounded-xl border shadow-md transform hover:-translate-y-2 hover:shadow-2xl transition duration-300 flex flex-col relative">
                <button onclick="openEventDetailsModal('${e.title.replace(/'/g, "\\'")}', '${(e.description||'').replace(/'/g, "\\'")}', '${e.location}', '${e.category}', '${startDateFormatted}', '${new Date(e.event_end_date).toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}', ${e.is_members_only}, ${e.max_attendees}, '${e.creator_name}', '${e.creator_email}', false)" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white text-indigo-700 flex items-center justify-center transition hover:bg-indigo-700 hover:text-white shadow-sm border border-indigo-200" title="Event Details">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                <div class="flex justify-between items-start mb-4 pr-10">
                    <h3 class="font-bold text-xl leading-tight text-gray-900">${e.title}</h3>
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
        alert("Registration failed: " + error.message);
        btn.disabled = false;
        btn.innerText = originalText;
        btn.classList.remove("opacity-75", "cursor-not-allowed");
    }
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
        showCustomAlert("Invalid Date", "Event start date cannot be in the past.");
        return;
    }
    if (eventEndDateObj <= eventDateObj) {
        showCustomAlert("Invalid Time", "Event end time must be after the start time.");
        return;
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
    
    // The "Create Event" card that sits at the beginning of the grid
    const createCard = `
        <div onclick="document.getElementById('create-event-modal').classList.remove('hidden')" class="p-5 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition min-h-[200px] group">
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
        <div class="p-5 bg-white border rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-300 relative group cursor-pointer" onclick="openEventDetailsModal('${e.title.replace(/'/g, "\\'")}', '${safeDesc}', '${e.location}', '${e.category}', '${startStr}', '${endStr}', ${e.is_members_only}, ${e.max_attendees}, currentUser.full_name, currentUser.email, true)">
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
                        if (e.approval_status === 2) return '<span class="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100 shrink-0">Cancelled</span>';
                        if (now > ed) return '<span class="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200 shrink-0">Completed</span>';
                        if (now >= sd && now <= ed) return '<span class="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded-md border border-teal-100 shrink-0 animate-pulse">Ongoing</span>';
                        return '<span class="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 shrink-0">Upcoming</span>';
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