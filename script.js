import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// DOM Elements
const personsList = document.getElementById('personsList');
const reportForm = document.getElementById('reportForm');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const authForm = document.getElementById('authForm');
const authToggleBtn = document.getElementById('authToggleBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

let isLoginMode = true;

// Auth functions
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    try {
        let result;
        if (isLoginMode) {
            result = await supabase.auth.signInWithPassword({
                email,
                password
            });
        } else {
            result = await supabase.auth.signUp({
                email,
                password
            });
        }

        if (result.error) throw result.error;

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
        modal.hide();
        authForm.reset();

        showNotification(isLoginMode ? 'Successfully logged in' : 'Account created successfully');
        updateAuthUI();
    } catch (error) {
        console.error('Auth error:', error);
        showNotification(error.message);
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authModalTitle').textContent = isLoginMode ? 'Login' : 'Sign Up';
    document.getElementById('authSubmitText').textContent = isLoginMode ? 'Login' : 'Sign Up';
    authToggleBtn.textContent = isLoginMode ? 
        "Don't have an account? Sign up" : 
        'Already have an account? Login';
}

async function updateAuthUI() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        loginBtn.classList.add('d-none');
        logoutBtn.classList.remove('d-none');
    } else {
        loginBtn.classList.remove('d-none');
        logoutBtn.classList.add('d-none');
    }
}

window.handleLogout = async function() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('Successfully logged out');
        updateAuthUI();
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out');
    }
};

window.showAuthModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
};

// Update dashboard stats
async function updateDashboardStats() {
    try {
        const { data: persons, error } = await supabase
            .from('missing_persons')
            .select('*');
        
        if (error) throw error;
        if (!persons) return;
        
        // Total missing
        const missing = persons.filter(p => p.status === 'missing').length;
        document.getElementById('totalMissing').textContent = missing;
        
        // Total safe
        const safe = persons.filter(p => p.status === 'safe').length;
        document.getElementById('totalSafe').textContent = safe;
        
        // Active areas (unique locations)
        const areas = new Set(persons.filter(p => p.status === 'missing').map(p => p.last_location));
        document.getElementById('activeAreas').textContent = areas.size;
        
        // Last 24h
        const last24h = persons.filter(p => {
            const reportTime = new Date(p.timestamp);
            const now = new Date();
            const diff = now - reportTime;
            return diff <= 24 * 60 * 60 * 1000;
        }).length;
        document.getElementById('last24h').textContent = last24h;
    } catch (error) {
        console.error('Error updating stats:', error);
        showNotification('Error updating dashboard stats');
    }
}

// Simulate weather updates
function updateWeather() {
    const temperatures = [26, 27, 28, 29, 30];
    const windSpeeds = [12, 15, 18, 20, 22];
    const humidities = [60, 65, 70, 75, 80];
    
    setInterval(() => {
        document.getElementById('temperature').textContent = 
            temperatures[Math.floor(Math.random() * temperatures.length)] + '°C';
        document.getElementById('windSpeed').textContent = 
            windSpeeds[Math.floor(Math.random() * windSpeeds.length)] + ' km/h';
        document.getElementById('humidity').textContent = 
            humidities[Math.floor(Math.random() * humidities.length)] + '%';
    }, 5000);
}

// Load and display persons
async function loadPersons() {
    try {
        const searchTerm = searchInput.value.toLowerCase();
        const filterStatus = statusFilter.value;

        let query = supabase
            .from('missing_persons')
            .select('*')
            .order('timestamp', { ascending: false });

        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,last_location.ilike.%${searchTerm}%`);
        }

        const { data: persons, error } = await query;

        if (error) throw error;

        personsList.innerHTML = '';

        if (persons && persons.length > 0) {
            persons.forEach(person => {
                const card = createPersonCard(person);
                personsList.appendChild(card);
            });
        } else {
            personsList.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No records found</p>
                </div>
            `;
        }

        await updateDashboardStats();
    } catch (error) {
        console.error('Error loading persons:', error);
        showNotification('Error loading data');
    }
}

// Create person card
function createPersonCard(person) {
    const div = document.createElement('div');
    div.className = 'col-md-4';
    div.innerHTML = `
        <div class="card person-card">
            <div class="card-body">
                <span class="status-badge status-${person.status}">${person.status.toUpperCase()}</span>
                <h5 class="card-title">${person.name}</h5>
                <p class="card-text">
                    <strong>Age:</strong> ${person.age}<br>
                    <strong>Last Seen:</strong> ${person.last_location}<br>
                    <strong>Contact:</strong> ${person.contact_number}
                </p>
                <div class="card-actions">
                    ${person.status === 'missing' ? `
                        <button class="btn btn-success btn-sm" onclick="window.markAsSafe('${person.id}')">
                            <i class="bi bi-check-circle"></i> Mark as Safe
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="window.markAsFound('${person.id}')">
                            <i class="bi bi-geo-alt"></i> Report Found
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    return div;
}

// Add new person
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
            showNotification('Please sign in to report a missing person');
            window.showAuthModal();
            return;
        }

        const newPerson = {
            name: document.getElementById('personName').value,
            age: parseInt(document.getElementById('personAge').value),
            last_location: document.getElementById('lastLocation').value,
            contact_number: document.getElementById('contactNumber').value,
            status: 'missing',
            user_id: user.id,
            timestamp: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from('missing_persons')
            .insert([newPerson]);

        if (insertError) throw insertError;

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
        modal.hide();
        reportForm.reset();

        showNotification('Person reported as missing');
        await loadPersons();
    } catch (error) {
        console.error('Error adding person:', error);
        showNotification('Error adding person');
    }
});

// Mark person as safe
window.markAsSafe = async function(id) {
    try {
        await updatePersonStatus(id, 'safe');
        showNotification('Person marked as safe');
    } catch (error) {
        console.error('Error marking as safe:', error);
        showNotification('Error updating status');
    }
};

// Mark person as found
window.markAsFound = async function(id) {
    try {
        await updatePersonStatus(id, 'found');
        showNotification('Person reported as found');
    } catch (error) {
        console.error('Error marking as found:', error);
        showNotification('Error updating status');
    }
};

// Update person status
async function updatePersonStatus(id, newStatus) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (!user) {
            showNotification('Please sign in to update status');
            window.showAuthModal();
            return;
        }

        const { error: updateError } = await supabase
            .from('missing_persons')
            .update({ 
                status: newStatus,
                timestamp: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        await loadPersons();
    } catch (error) {
        console.error('Error updating status:', error);
        throw error;
    }
}

// Show notification
function showNotification(message) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    
    const toastElement = document.createElement('div');
    toastElement.className = 'toast show';
    toastElement.setAttribute('role', 'alert');
    toastElement.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toastElement);
    document.body.appendChild(toastContainer);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toastContainer.remove();
    }, 3000);
}

// Event listeners
searchInput.addEventListener('input', loadPersons);
statusFilter.addEventListener('change', loadPersons);
authForm.addEventListener('submit', handleAuth);
authToggleBtn.addEventListener('click', toggleAuthMode);

// Initialize
updateWeather();
updateAuthUI();

// Set up real-time subscription
supabase
    .channel('missing_persons_changes')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'missing_persons' 
        }, 
        () => {
            loadPersons();
        }
    )
    .subscribe();

// Initial load
loadPersons();