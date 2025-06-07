// Initialize token from localStorage
let token = localStorage.getItem('vaultToken') || '';
let currentEmail = '';
let currentModifyId = null; // Track item ID being modified
let currentLogPage = 1; // Track current logs page
const logsPerPage = 15; // Logs per page
let isPasswordReset = false; // Flag for password reset OTP

// Feedback modal function
function showFeedback(message, isError = false) {
  const modal = document.getElementById('feedback-modal');
  const title = document.getElementById('feedback-title');
  const messageEl = document.getElementById('feedback-message');
  title.textContent = isError ? 'Error' : 'Success';
  title.className = `text-lg font-semibold mb-4 ${isError ? 'text-red-500' : 'text-green-500'}`;
  messageEl.textContent = message;
  modal.classList.remove('hidden');
  setTimeout(() => { modal.classList.add('hidden'); }, 3000);
}

// Close feedback modal
document.getElementById('feedback-close')?.addEventListener('click', () => {
  document.getElementById('feedback-modal').classList.add('hidden');
});

// Toggle button loading state
function toggleButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

// Login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  currentEmail = document.getElementById('email').value.toLowerCase().trim();
  const password = document.getElementById('password').value;
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, password })
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) setTimeout(() => { window.location.href = 'otp.html'; }, 1000);
  } catch (err) {
    console.error('Login error:', err);
    showFeedback('Error logging in. Please check your connection.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// Register form submission
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value.toLowerCase().trim();
  const dob = document.getElementById('dob').value;
  const favorite_color = document.getElementById('favorite_color').value;
  const password = document.getElementById('password').value;
  const repeat_password = document.getElementById('repeat_password').value;
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, dob, favorite_color, password, repeat_password })
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (err) {
    console.error('Register error:', err);
    showFeedback('Error registering. Please check your connection.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// OTP form submission
document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  const email = document.getElementById('email').value.toLowerCase().trim();
  const otp = document.getElementById('otp').value;
  try {
    const response = await fetch('/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, isPasswordReset })
    });
    const result = await response.json();
    if (result.token && !isPasswordReset) {
      token = result.token;
      localStorage.setItem('vaultToken', token);
      console.log('Token stored:', token);
      showFeedback('OTP verified successfully.', false);
      setTimeout(() => { window.location.href = '/home'; }, 1000);
    } else if (result.message && isPasswordReset) {
      showFeedback('OTP verified. Reset your password.', false);
      currentEmail = email;
      setTimeout(() => { window.location.href = 'reset-password.html'; }, 1000);
    } else {
      showFeedback(result.error, true);
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    showFeedback('Error verifying OTP. Please check your connection.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// Resend OTP
document.getElementById('resend-otp')?.addEventListener('click', async () => {
  const resendButton = document.getElementById('resend-otp');
  toggleButtonLoading(resendButton, true);
  try {
    const email = document.getElementById('email').value.toLowerCase().trim() || currentEmail;
    if (!email) {
      showFeedback('Please enter your email.', true);
      toggleButtonLoading(resendButton, false);
      return;
    }
    const response = await fetch('/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, isPasswordReset })
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
  } catch (err) {
    console.error('Resend OTP error:', err);
    showFeedback('Error resending OTP.', true);
  } finally {
    toggleButtonLoading(resendButton, false);
  }
});

// Forgot Password form submission
document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  const email = document.getElementById('email').value.toLowerCase().trim();
  try {
    isPasswordReset = true;
    const response = await fetch('/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) {
      currentEmail = email;
      setTimeout(() => { window.location.href = 'otp.html'; }, 1000);
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    showFeedback('Error sending reset OTP.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// Reset Password form submission
document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  const email = document.getElementById('email').value.toLowerCase().trim();
  const password = document.getElementById('password').value;
  const repeat_password = document.getElementById('repeat_password').value;
  if (password !== repeat_password) {
    showFeedback('Passwords do not match.', true);
    toggleButtonLoading(submitButton, false);
    return;
  }
  try {
    const response = await fetch('/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) {
      isPasswordReset = false;
      currentEmail = '';
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    }
  } catch (err) {
    console.error('Reset password error:', err);
    showFeedback('Error resetting password.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// Logout (no spinner needed)
document.getElementById('logout-btn')?.addEventListener('click', () => {
  token = '';
  localStorage.removeItem('vaultToken');
  currentEmail = '';
  isPasswordReset = false;
  showFeedback('Logged out successfully.', false);
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
});

// Store form
document.getElementById('store-type')?.addEventListener('change', (e) => {
  const isDocument = e.target.value === 'document';
  document.getElementById('key-value-field').classList.toggle('hidden', isDocument);
  document.getElementById('document-field').classList.toggle('hidden', !isDocument);
});

document.getElementById('store-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  if (!token) {
    console.warn('No token for store request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    toggleButtonLoading(submitButton, false);
    return;
  }
  const type = document.getElementById('store-type').value;
  const title = document.getElementById('store-title').value;
  const formData = new FormData();
  formData.append('type', type);
  formData.append('title', title);
  if (type === 'key') {
    const keyValue = document.getElementById('key-value').value;
    if (!keyValue) {
      showFeedback('Key value is required.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    formData.append('key_value', keyValue);
  } else {
    const file = document.getElementById('document').files[0];
    if (!file) {
      showFeedback('Please upload a document.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    if (!['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      showFeedback('Only PDF, TXT, DOC, or DOCX files are allowed.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    formData.append('document', file);
  }
  try {
    const response = await fetch('/vault/store', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) document.getElementById('store-form').reset();
  } catch (err) {
    console.error('Store error:', err);
    showFeedback('Error storing data. Please try again.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

// Verify function
async function verify(section) {
  if (!token) {
    console.warn('No token for verify request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }
  const submitButton = document.getElementById(`submit-${section}-verify`);
  toggleButtonLoading(submitButton, true);
  const verifyType = document.getElementById(`${section}-verify-type`).value;
  const answer = document.getElementById(`${section}-verify-answer`).value;
  try {
    const response = await fetch('/vault/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ answer, type: verifyType })
    });
    const result = await response.json();
    if (result.message) {
      document.getElementById(`${section}-list`).classList.remove('hidden');
      if (section === 'retrieve') {
        await getItems();
      } else if (section === 'modify') {
        await getModifyItems();
      }
      showFeedback(result.message, false);
    } else {
      showFeedback(result.error, true);
    }
  } catch (err) {
    console.error('Verify error:', err);
    showFeedback('Error verifying. Please try again.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
}

document.getElementById('retrieve-verify-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await verify('retrieve');
});

document.getElementById('modify-verify-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await verify('modify');
});

// Get items
async function getItems() {
  if (!token) {
    console.warn('No token for retrieve request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }
  try {
    const response = await fetch('/vault/retrieve', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    const itemsList = document.getElementById('retrieve-items');
    itemsList.innerHTML = '';
    if (result.items.length === 0) {
      itemsList.innerHTML = '<li class="text-gray-500">No items found.</li>';
      return;
    }
    for (const item of result.items) {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="w-full text-left py-2 px-3 bg-white rounded-md hover:bg-gray-100 border border-gray-300" onclick="viewItem(${item.id})">
          ${item.title} (${item.type})
        </button>
      `;
      itemsList.appendChild(li);
    }
  } catch (err) {
    console.error('Retrieve error:', err);
    showFeedback('Error retrieving items. Please try again.', true);
  }
}

// View item
async function viewItem(id) {
  if (!token) {
    console.warn('No token for view item request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }
  try {
    const response = await fetch(`/vault/item/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.error) {
      showFeedback(result.error, true);
      return;
    }
    if (result.type === 'document') {
      const byteCharacters = atob(result.data);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const mimeTypes = {
        pdf: 'application/pdf',
        txt: 'text/plain',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      const extension = result.title.split('.').pop()?.toLowerCase() || 'pdf';
      const mimeType = mimeTypes[extension] || 'application/pdf';
      const blob = new Blob([byteNumbers], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.title}.${extension}`;
      a.textContent = `Download ${result.title}`;
      a.className = 'hidden';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      showFeedback(`Downloaded ${result.title}.`, false);
    } else {
      showFeedback(`Title: ${result.title}\nType: ${result.type}\nData: ${result.data}`, false);
    }
  } catch (err) {
    console.error('View item error:', err);
    showFeedback('Error viewing item. Please try again.', true);
  }
}

// Get modify items
async function getModifyItems() {
  if (!token) {
    console.warn('No token for modify items request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }
  try {
    const response = await fetch('/vault/retrieve', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    const itemsList = document.getElementById('modify-items');
    itemsList.innerHTML = '';
    if (result.items.length === 0) {
      itemsList.innerHTML = '<li class="text-gray-500">No items found.</li>';
      return;
    }
    for (const item of result.items) {
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="w-full text-left py-2 px-3 bg-white rounded-md hover:bg-gray-100 border border-gray-300" onclick="modifyItem(${item.id})">
          ${item.title} (${item.type})
        </button>
      `;
      itemsList.appendChild(li);
    }
  } catch (err) {
    console.error('Modify items error:', err);
    showFeedback('Error retrieving items. Please try again.', true);
  }
}

// Modify item
async function modifyItem(id) {
  if (!token) {
    console.warn('No token for modify item request');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    return;
  }
  currentModifyId = id;
  const modal = document.getElementById('modify-modal');
  modal.classList.remove('hidden');
  const form = document.getElementById('modify-item-form');
  form.reset();
  document.getElementById('modify-key-field').classList.add('hidden');
  document.getElementById('modify-document-field').classList.add('hidden');
  const typeSelect = document.getElementById('modify-type');
  typeSelect.replaceWith(typeSelect.cloneNode(true));
  const newTypeSelect = document.getElementById('modify-type');
  newTypeSelect.addEventListener('change', () => {
    const type = newTypeSelect.value;
    document.getElementById('modify-key-field').classList.toggle('hidden', type !== 'key');
    document.getElementById('modify-document-field').classList.toggle('hidden', type !== 'document');
  });
}

document.getElementById('modify-item-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(submitButton, true);
  if (!token || !currentModifyId) {
    showFeedback('Please log in and select an item.', true);
    toggleButtonLoading(submitButton, false);
    return;
  }
  const type = document.getElementById('modify-type').value;
  const title = document.getElementById('modify-title').value;
  const formData = new FormData();
  formData.append('type', type);
  formData.append('title', title);
  if (type === 'key') {
    const keyValue = document.getElementById('modify-key-value').value;
    if (!keyValue) {
      showFeedback('Key value is required.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    formData.append('key_value', keyValue);
  } else {
    const file = document.getElementById('modify-document-upload').files[0];
    if (!file) {
      showFeedback('Please upload a document.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    if (!['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      showFeedback('Only PDF, TXT, DOC, or DOCX files are allowed.', true);
      toggleButtonLoading(submitButton, false);
      return;
    }
    formData.append('document', file);
  }
  try {
    const response = await fetch(`/vault/modify/${currentModifyId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const result = await response.json();
    showFeedback(result.message || result.error, !!result.error);
    if (result.message) {
      document.getElementById('modify-modal').classList.add('hidden');
      document.getElementById('modify-verify-form').reset();
      document.getElementById('modify-list').classList.add('hidden');
      currentModifyId = null;
      await getModifyItems();
    }
  } catch (err) {
    console.error('Modify item error:', err);
    showFeedback('Error modifying item. Please try again.', true);
  } finally {
    toggleButtonLoading(submitButton, false);
  }
});

document.getElementById('modify-cancel')?.addEventListener('click', () => {
  document.getElementById('modify-modal').classList.add('hidden');
  currentModifyId = null;
});

// Load logs
async function loadLogs(page = 1) {
    if (!token) {
        console.warn('No token for loadLogs');
        showFeedback('Please log in first.', true);
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        return;
    }
    try {
        const response = await fetch('/logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            console.warn('Auth error:', response.status);
            showFeedback('Session expired. Please log in again.', true);
            localStorage.removeItem('vaultToken');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            return;
        }
        const result = await response.json();
        console.log('Logs response:', result); // Debug
        const logsContent = document.getElementById('logs-content');
        const pagination = document.getElementById('logs-pagination');
        if (result.error) {
            console.warn('Logs error:', result.error);
            logsContent.innerHTML = `<p class="text-gray-500 text-sm">${result.error}</p>`;
            showFeedback(result.error, true);
            return;
        }
        const sortedLogs = result.logs.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            if (isNaN(dateA) || isNaN(dateB)) {
                console.warn('Invalid timestamp:', a.timestamp, b.timestamp);
                return 0;
            }
            return dateB - dateA;
        });
        console.log('Sorted logs:', sortedLogs); // Debug
        const totalLogs = sortedLogs.length;
        if (totalLogs === 0) {
            logsContent.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">No logs available yet. Try storing or retrieving items!</p>`;
            pagination.innerHTML = '';
            console.log('No logs to display');
            return;
        }
        const totalPages = Math.ceil(totalLogs / logsPerPage);
        currentLogPage = Math.min(Math.max(page, 1), totalPages);
        const start = (currentLogPage - 1) * logsPerPage;
        const end = start + logsPerPage;
        const paginatedLogs = sortedLogs.slice(start, end);
        logsContent.innerHTML = `
            <h3 class="text-md font-semibold text-black mb-3">Analytics</h3>
            <p class="text-gray-700 text-sm">Items Stored: ${result.analytics.itemCount}</p>
            <p class="text-gray-700 text-sm">Last Login: ${result.analytics.lastLogin || 'N/A'}</p>
            <h3 class="text-md font-semibold text-black mt-5 mb-3">Logs</h3>
            <ul class="space-y-1">
                ${paginatedLogs.map(log => `<li class="text-gray-700 text-sm py-1 border-b border-gray-200">${log.action} at ${log.timestamp}</li>`).join('')}
            </ul>
        `;
        console.log('Rendered logs:', paginatedLogs); // Debug
        pagination.innerHTML = '';
        if (totalPages > 1) {
            pagination.innerHTML += `
                <button class="py-1 px-3 bg-white border border-gray-300 rounded-md text-black hover:bg-gray-100 ${currentLogPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${currentLogPage === 1 ? 'disabled' : `onclick="loadLogs(${currentLogPage - 1})"`}>
                    Previous
                </button>
            `;
            for (let i = 1; i <= totalPages; i++) {
                pagination.innerHTML += `
                    <button class="py-1 px-3 border border-gray-300 rounded-md ${i === currentLogPage ? 'bg-yellow-500 text-black' : 'bg-white text-black hover:bg-gray-100'}"
                            onclick="loadLogs(${i})">
                        ${i}
                    </button>
                `;
            }
            pagination.innerHTML += `
                <button class="py-1 px-3 bg-white border border-gray-300 rounded-md text-black hover:bg-gray-100 ${currentLogPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${currentLogPage === totalPages ? 'disabled' : `onclick="loadLogs(${currentLogPage + 1})"`}>
                    Next
                </button>
            `;
        }
    } catch (err) {
        console.error('Load logs error:', err);
        document.getElementById('logs-content').innerHTML = '<p class="text-gray-500 text-sm">Error loading logs.</p>';
        showFeedback('Error loading logs.', true);
    }
}

// Check token and load logs on home page load
if (window.location.pathname.includes('home.html')) {
  console.log('Home page loaded, token:', token);
  if (!token) {
    console.warn('No token on home page load');
    showFeedback('Please log in first.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } else {
    loadLogs();
  }
}