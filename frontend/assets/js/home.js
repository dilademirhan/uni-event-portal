let currentUser = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const token = localStorage.getItem('access_token');
    if (!token) return window.location.href = "index.html";

    const user = await api.getMe();
    if (!user || !user.user_id) return window.location.href = "index.html";

    currentUser = user;

    // Sidebar Info
    document.getElementById('display-name').innerText = user.full_name;
    const roleMap = {1: 'STUDENT', 2: 'CLUB MANAGER', 3: 'ADMIN'};
    document.getElementById('display-role').innerText = roleMap[user.role_id] || 'USER';

    // Role-based Nav
    if (user.role_id === 3) {
        document.getElementById('admin-sidebar-nav').classList.remove('hidden');
        document.getElementById('admin-sidebar-nav').classList.add('flex');
    } else {
        document.getElementById('sidebar-nav').classList.remove('hidden');
        document.getElementById('sidebar-nav').classList.add('flex');
        if (user.role_id === 2) {
            document.getElementById('tab-manager-view').classList.remove('hidden');
            document.getElementById('tab-manager-view').classList.add('flex');
        }
    }

    setupRoleBasedWidgets(user);
}

async function setupRoleBasedWidgets(user) {
    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeSubtitle = document.getElementById('welcome-subtitle');

    welcomeTitle.innerText = `Welcome, ${user.full_name.split(' ')[0]}!`;

    if (user.role_id === 2) {
        // ---- MANAGER LAYOUT ----
        welcomeSubtitle.innerText = "Ready to manage your club and upcoming events?";
        renderManagerLayout();
    } else if (user.role_id === 3) {
        // ---- ADMIN LAYOUT ----
        welcomeSubtitle.innerText = "Here's a quick overview of the system.";
        const allEvents = await api.getUpcomingEvents();
        const allClubs = await api.getClubs();
        const now = new Date();
        const trueUpcoming = allEvents.filter(e =>
            new Date(e.event_date) > now &&
            e.event_state !== 'Cancelled' &&
            e.event_state !== 'Completed'
        );
        renderEventsWidget(trueUpcoming.slice(0, 3), null);
        renderClubsWidget(allClubs.slice(0, 3), []);
    } else {
        // ---- STUDENT LAYOUT ----
        welcomeSubtitle.innerText = "Discover what's happening around campus today.";
        const allEvents = await api.getUpcomingEvents();
        const allClubs = await api.getClubs();
        const myMemberships = await api.getMyMemberships();
        const myMembershipIds = myMemberships.map(m => m.club_id);
        const now = new Date();

        // Filter truly upcoming: date in future, not cancelled/completed
        const trueUpcoming = allEvents.filter(e =>
            new Date(e.event_date) > now &&
            e.event_state !== 'Cancelled' &&
            e.event_state !== 'Completed'
        );

        // Store all clubs globally so joinClubFromHome can re-render
        window._homeAllClubs = allClubs;
        window._homeMyMembershipIds = myMembershipIds;

        const unjoinedClubs = allClubs.filter(c => !myMembershipIds.includes(c.club_id));
        renderEventsWidget(trueUpcoming.slice(0, 3), null);
        renderClubsWidget(unjoinedClubs.slice(0, 3), myMembershipIds);
    }
}

async function joinClubFromHome(clubId) {
    openHomeJoinModal(clubId);
}

function openHomeJoinModal(clubId) {
    const club = window._homeAllClubs.find(c => c.club_id == clubId);
    if (!club) return;

    const name = club.club_name || club.name || '';
    document.getElementById('home-join-modal-logo').innerText = name.charAt(0).toUpperCase();
    document.getElementById('home-join-modal-name').innerText = name;
    document.getElementById('home-join-modal-category').innerText = club.category || 'General';
    document.getElementById('home-join-modal-desc').innerText = club.description || 'No description provided.';

    const managersContainer = document.getElementById('home-join-modal-managers');
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

    const confirmBtn = document.getElementById('home-join-modal-confirm-btn');
    confirmBtn.disabled = false;
    confirmBtn.innerText = 'Confirm & Join';
    confirmBtn.className = 'flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg';
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Joining...';
        try {
            await api.joinClub(clubId);
            window._homeMyMembershipIds.push(clubId);
            const updated = window._homeAllClubs.filter(c => !window._homeMyMembershipIds.includes(c.club_id));
            renderClubsWidget(updated.slice(0, 3), window._homeMyMembershipIds);
            closeHomeJoinModal();
        } catch (err) {
            alert(err.message || 'Could not join club.');
            confirmBtn.disabled = false;
            confirmBtn.innerText = 'Confirm & Join';
        }
    };

    document.getElementById('join-modal').classList.remove('hidden');
}

function closeHomeJoinModal() {
    document.getElementById('join-modal').classList.add('hidden');
}

async function renderManagerLayout() {
    // Update events section header
    document.getElementById('events-section-title').innerText = "Your Upcoming Events";
    document.querySelector('#events-section .section-subtitle').innerText = "Events you are managing";
    document.querySelector('#events-section .section-subtitle').className = 'section-subtitle text-sm text-gray-900 font-semibold mt-1';
    const seeAllLink = document.querySelector('#events-section .see-all-link');
    seeAllLink.href = "dashboard.html?tab=manager-view";
    seeAllLink.innerText = "Manage My Events ➔";

    // Replace clubs section with stats
    const rightSection = document.getElementById('clubs-section');
    rightSection.innerHTML = `
        <div class="flex justify-between items-end mb-6">
            <div>
                <h2 class="text-2xl font-bold text-indigo-950">My Club Stats</h2>
                <p class="text-sm text-gray-900 font-semibold mt-1">Overview of your managed club</p>
            </div>
        </div>
        <div id="stats-widget-container" class="space-y-4">
            <div class="text-center text-gray-400 py-8">Loading stats...</div>
        </div>
    `;

    // Fetch manager's own events
    const myEvents = await api.getMyEvents();
    const now = new Date();

    // approval_status: 1 = approved, 2 = rejected, 0 = pending
    // event_state: 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'
    const upcomingMyEvents = myEvents.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate > now && e.approval_status === 1 && e.event_state !== 'Cancelled';
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    renderEventsWidget(upcomingMyEvents.slice(0, 3));

    // Stats — use correct field names from backend
    // event_state values: 'Upcoming', 'Ongoing', 'Completed', 'Cancelled' (Pascal Case)
    // approval_status: 0=Pending, 1=Approved, 2=Rejected (Integer)
    const totalEvents = myEvents.length;
    const upcomingCount = myEvents.filter(e => new Date(e.event_date) > now && e.approval_status === 1 && e.event_state !== 'Cancelled').length;
    const totalParticipants = myEvents.reduce((sum, e) => sum + (e.current_capacity || 0), 0);
    const completedEvents = myEvents.filter(e => {
        // Backend never sets event_state to 'Completed' automatically.
        // Use date comparison (same as backend's computed_state logic).
        return e.event_state !== 'Cancelled' && e.approval_status !== 2 &&
               new Date(e.event_end_date) < now;
    }).length;

    document.getElementById('stats-widget-container').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span class="text-4xl font-extrabold text-indigo-700">${totalParticipants}</span>
                <span class="text-sm font-semibold text-indigo-500 mt-1">Total Participants</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span class="text-4xl font-extrabold text-emerald-700">${upcomingCount}</span>
                <span class="text-sm font-semibold text-emerald-500 mt-1">Upcoming Events</span>
            </div>
            <div class="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span class="text-4xl font-extrabold text-gray-700">${totalEvents}</span>
                <span class="text-sm font-semibold text-gray-500 mt-1">Total Events Created</span>
            </div>
            <div class="bg-violet-50 border border-violet-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span class="text-4xl font-extrabold text-violet-700">${completedEvents}</span>
                <span class="text-sm font-semibold text-violet-500 mt-1">Completed Events</span>
            </div>
        </div>
    `;
}

function renderEventsWidget(events, targetUrl = null) {
    const container = document.getElementById('events-widget-container');
    if (events.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-2xl border shadow-sm text-center text-gray-500 font-medium">No upcoming events found.</div>`;
        return;
    }

    container.innerHTML = events.map(e => {
        const startStr = new Date(e.event_date).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const clickAttr = targetUrl ? `onclick="window.location.href='${targetUrl}'" style="cursor:pointer"` : '';
        return `
        <div ${clickAttr} class="bg-white p-5 rounded-2xl border shadow-sm ${targetUrl ? 'hover:shadow-md hover:border-indigo-200 transition group' : ''} flex items-center">
            <div class="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 text-xl mr-4 flex-shrink-0">
                📅
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 truncate">${e.title}</h3>
                <p class="text-sm text-gray-700 font-semibold mt-1 truncate">${startStr} • ${e.location}</p>
            </div>
        </div>
        `;
    }).join('');
}

function renderClubsWidget(clubs, myMembershipIds = []) {
    const container = document.getElementById('clubs-widget-container');
    if (!container) return;
    if (clubs.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-2xl border shadow-sm text-center text-gray-500 font-medium">You have joined all available clubs!</div>`;
        return;
    }

    container.innerHTML = clubs.map(c => {
        const isFull = c.member_count >= c.max_quota;
        const joinBtn = isFull
            ? `<span class="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full shrink-0">Full</span>`
            : `<button onclick="joinClubFromHome(${c.club_id})" class="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition px-4 py-1.5 rounded-full shrink-0 shadow-sm">+ Join</button>`;

        return `
        <div class="bg-white px-5 py-4 rounded-2xl border shadow-sm hover:-translate-y-0.5 hover:shadow-md transition duration-200 flex items-center gap-3">
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 text-sm truncate">${c.club_name || c.name}</h3>
                <div class="flex gap-2 mt-1.5 flex-wrap">
                    <span class="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">Managers: ${c.manager_count}/${c.max_managers}</span>
                    <span class="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">Members: ${c.member_count}/${c.max_quota}</span>
                </div>
            </div>
            ${joinBtn}
        </div>
        `;
    }).join('');
}

function logout() {
    localStorage.removeItem("access_token");
    window.location.href = "index.html";
}
