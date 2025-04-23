// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Function to fetch data with auth
async function fetchWithAuth(url) {
    const username = localStorage.getItem('dashboard_username');
    const password = localStorage.getItem('dashboard_password');
    
    if (!username || !password) {
        throw new Error('Authentication credentials not found');
    }
    
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Basic ' + btoa(username + ':' + password)
        }
    });
    
    if (response.status === 401) {
        // Clear stored credentials and redirect to login
        localStorage.removeItem('dashboard_username');
        localStorage.removeItem('dashboard_password');
        alert('Invalid credentials. Please login again.');
        window.location.reload();
        throw new Error('Authentication failed');
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Function to fetch and update dashboard data
async function updateDashboard() {
    try {
        // Fetch all data
        const [users, reminders, sessions] = await Promise.all([
            fetchWithAuth('/api/users'),
            fetchWithAuth('/api/reminders'),
            fetchWithAuth('/api/sessions')
        ]);

        // Update total counts
        document.getElementById('totalUsers').textContent = users.data.length;
        document.getElementById('totalReminders').textContent = reminders.data.length;
        document.getElementById('totalSessions').textContent = sessions.data.length;

        // Language distribution chart
        const languageData = users.data.reduce((acc, user) => {
            const session = sessions.data.find(s => s.telegram_id === user.telegram_id);
            const lang = session?.data?.lang || 'unknown';
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {});

        new Chart(document.getElementById('languageChart'), {
            type: 'pie',
            data: {
                labels: Object.keys(languageData),
                datasets: [{
                    data: Object.values(languageData),
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc']
                }]
            }
        });

        // Prayer distribution chart
        const prayerData = reminders.data.reduce((acc, reminder) => {
            acc[reminder.prayer] = (acc[reminder.prayer] || 0) + 1;
            return acc;
        }, {});

        new Chart(document.getElementById('prayerChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(prayerData),
                datasets: [{
                    label: 'Number of Reminders',
                    data: Object.values(prayerData),
                    backgroundColor: '#4e73df'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Recent users table
        const recentUsers = users.data
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);

        const recentUsersHtml = recentUsers.map(user => {
            const session = sessions.data.find(s => s.telegram_id === user.telegram_id);
            const userReminders = reminders.data.filter(r => r.user_id === user.id);
            return `
                <tr>
                    <td>${user.full_name || 'N/A'}</td>
                    <td>${user.username || 'N/A'}</td>
                    <td>${user.city}</td>
                    <td>${session?.data?.lang || 'unknown'}</td>
                    <td>${userReminders.length}</td>
                    <td>${formatDate(user.created_at)}</td>
                </tr>
            `;
        }).join('');

        document.getElementById('recentUsers').innerHTML = recentUsersHtml;

    } catch (error) {
        console.error('Error updating dashboard:', error);
        if (error.message.includes('401')) {
            alert('Authentication failed. Please check your credentials.');
        }
    }
}

// Update dashboard every 30 seconds
updateDashboard();
setInterval(updateDashboard, 30000); 