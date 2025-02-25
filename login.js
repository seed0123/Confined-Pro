function login(event) {
    event.preventDefault(); // Prevent the form from submitting

    // Get values from form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Example of hardcoded valid credentials (replace with your actual logic)
    const validUsername = 'user';
    const validPassword = 'password';

    // Check if username and password match the hardcoded credentials
    if (username === validUsername && password === validPassword) {
        // Login successful, set session storage and redirect to main page (index.html in this example)
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'index.html';
    } else {
        // Login failed, show an error message (using SweetAlert2 for better UI)
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid username or password!',
            confirmButtonText: 'OK'
        });
    }
}

// Function to check if the user is logged in (to be called from other pages)
function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
    }
}

// Function to logout
function logout() {
    // Clear session storage (or cookies, depending on your setup)
    sessionStorage.removeItem('isLoggedIn');

    // Redirect to login page
    window.location.href = 'login.html';
}

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'login.html'; // Redirect to login page if not logged in
    }
});
