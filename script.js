document.addEventListener('DOMContentLoaded', function() {
  // --- Configuration ---
  // The APPS_SCRIPT_WEB_APP_URL will now be loaded dynamically from clients.json
  // Initial default (will be overridden by client config)
  let APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzVqjYwONLN9fimVm1R274mvScD_VfCSDwwq02OVYQkSPC-LzKMSkOZbpH-wOiOy7HB/exec';

  // --- DOM Elements ---
  const htmlElement = document.documentElement;
  const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
  const logoImg = document.getElementById('logo');
  const qrCodeImg = document.getElementById('qr-code');
  const qrContainer = document.getElementById('qr-container');
  const dateTimeDiv = document.getElementById('datetime');
  const form = document.getElementById('signin-form');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const serviceInput = document.getElementById('service');
  const confirmationDiv = document.getElementById('confirmation');
  const welcomeText = document.getElementById('welcome-text');
  const modal = document.getElementById('modal');
  const modalContentWrapper = document.getElementById('modal-content-wrapper');
  const modalText = document.getElementById('modal-text');
  const closeModalButton = document.querySelector('.close-modal');
  const termsLink = document.getElementById('terms-link');
  const privacyLink = document.getElementById('privacy-link');

  // --- Device ID Management ---
  let deviceId = localStorage.getItem('kiosk_device_id');
  if (!deviceId) {
    deviceId = 'kiosk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kiosk_device_id', deviceId);
    console.log('Generated new device ID:', deviceId);
  } else {
    console.log('Using existing device ID:', deviceId);
  }

  // --- Theme Management ---
  function applyTheme(theme) {
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      // Set checkbox to unchecked for dark theme
      if (themeToggleCheckbox) themeToggleCheckbox.checked = false;
    } else { // 'light' theme
      htmlElement.classList.remove('dark');
      // Set checkbox to checked for light theme
      if (themeToggleCheckbox) themeToggleCheckbox.checked = true;
    }
    localStorage.setItem('theme', theme);
  }

  // Initialize theme based on localStorage, clients.json, or system preference
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // --- Client Configuration Loading ---
  const urlParams = new URLSearchParams(window.location.search);
  // Get the client key from the URL (e.g., ?client=papered)
  const clientKey = urlParams.get('client') || 'papered'; // Default to 'papered' if no client param

  fetch('clients.json') // Fetch the central clients.json file
    .then(response => {
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status} - Could not load clients.json from server. Using defaults.`);
        throw new Error('Failed to load clients.json');
      }
      return response.json();
    })
    .then(clients => { // FIX IS HERE: Corrected 'cliaents' to 'clients'
      const client = clients[clientKey];
      if (!client) {
        console.warn(`Client configuration for "${clientKey}" not found in clients.json. Using defaults.`);
        applyInitialTheme(null); // Pass null to allow fallback
        setupDefaultBranding();
        return;
      }

      // Set the Apps Script Web App URL from the loaded client config
      APPS_SCRIPT_WEB_APP_URL = client.webhook;
      if (!APPS_SCRIPT_WEB_APP_URL || APPS_SCRIPT_WEB_APP_URL.includes('YOUR_CLIENT_A_GOOGLE_APPS_SCRIPT_WEB_APP_URL')) { // Check for placeholder URL
        console.error(`Webhook URL not configured or is placeholder for client "${clientKey}" in clients.json.`);
        displayMessage('Configuration error: Webhook URL missing for this client.', 'error', 10000);
        // Optionally, prevent form submission if webhook is missing
        if (form) form.querySelector('button[type="submit"]').disabled = true;
        return;
      }

      // Apply Branding from clients.json
      document.title = client.name || "Sign-In Kiosk";
      if (logoImg && client.logo) logoImg.src = client.logo;
      else if (logoImg) logoImg.src = 'https://img1.wsimg.com/isteam/ip/671a344d-c6c0-4496-b4cf-01ac2aae4d3a/PaperedLogo.png/:/'; // Fallback if client.logo is missing or empty

      // Set QR Code
      if (qrCodeImg && client.qr) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(client.qr)}&bgcolor=FFFFFF&color=000000&qzone=1`;
        if(qrContainer) qrContainer.classList.remove('hidden');
      } else {
        if(qrContainer) qrContainer.classList.add('hidden');
      }

      // Apply Theme from clients.json
      applyInitialTheme(client.theme);
    })
    .catch(err => {
      console.error("Error loading client config:", err.message);
      // Fallback to initial theme logic if clients.json loading fails
      applyInitialTheme(null); // Pass null to allow fallback
      setupDefaultBranding();
      displayMessage('Error loading client configuration. Using default settings.', 'error', 10000);
    });

  function applyInitialTheme(clientThemePreference) {
    if (storedTheme) {
        applyTheme(storedTheme);
    } else if (clientThemePreference) {
        applyTheme(clientThemePreference);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
  }

  function setupDefaultBranding() {
      document.title = "Sign-In Kiosk";
      // Ensure the default logo is displayed if client config isn't loaded
      if (logoImg) logoImg.src = 'https://img1.wsimg.com/isteam/ip/671a344d-c6c0-4496-b4cf-01ac2aae4d3a/PaperedLogo.png/:/';
      if (qrContainer) qrContainer.classList.add('hidden'); // Hide QR if no client config
  }

  // Theme toggle event listener
  if (themeToggleCheckbox) {
    themeToggleCheckbox.addEventListener('change', function() {
      // If checkbox is checked, it means light mode is desired. If unchecked, dark mode.
      applyTheme(this.checked ? 'light' : 'dark');
    });
  }

  // --- Clock ---
  function updateClock() {
    const now = new Date();
    if (dateTimeDiv) {
      dateTimeDiv.textContent = `📅 ${now.toLocaleDateString()} | 🕒 ${now.toLocaleTimeString()}`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- Form Submission ---
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      // Ensure the webhook URL has been loaded from clients.json
      if (!APPS_SCRIPT_WEB_APP_URL || APPS_SCRIPT_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
        displayMessage('Configuration error: Apps Script URL not loaded for this client.', 'error', 10000);
        return;
      }

      const formData = {
        name: nameInput.value,
        phone: phoneInput.value,
        email: emailInput.value,
        service: serviceInput.value,
        timestamp: new Date().toISOString(),
        device_id: deviceId // Include the unique device ID
      };

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Submitting...';
      submitButton.disabled = true;
      submitButton.classList.add('opacity-75', 'cursor-not-allowed');

      fetch(APPS_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain' }, // Keep as text/plain for Google Apps Script
        body: JSON.stringify(formData)
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`Network response was not ok. Status: ${response.status}. Message: ${text}`);
          });
        }
        return response.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (e) {
            // If it's not JSON, return the raw text. Google Apps Script sometimes returns plain text.
            console.warn('Apps Script response was not JSON. Attempting to parse as plain text.');
            return text;
          }
        });
      })
      .then(data => {
        let status = 'error';
        let message = 'Unknown error during submission.';

        // Robust check for success from Apps Script
        if (typeof data === 'object' && data !== null && data.status === "success") {
          status = 'success';
          message = `Thank you, ${formData.name}! Your sign-in for ${formData.service} is confirmed.`;
        } else if (typeof data === 'string' && (data.includes("Success") || data.toLowerCase().includes("ok"))) {
          status = 'success';
          message = `Thank you, ${formData.name}! Your sign-in for ${formData.service} is confirmed.`;
          console.warn('Apps Script returned plain text. Consider updating it to return JSON for better error handling (e.g., {"status": "success", "message": "..."}).');
        } else if (typeof data === 'object' && data !== null && data.message) {
          message = `Submission failed: ${data.message}`;
        } else if (typeof data === 'string' && data.length > 0) {
          message = `Submission failed: ${data}`;
        }

        if (status === "success") {
          displayMessage(message, 'success');
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`Thank you ${formData.name} for your ${formData.service} appointment`);
            speechSynthesis.speak(utterance);
          }
          resetFormAndUI(3000);
        } else {
          console.error('Submission failed (Apps Script response):', data);
          displayMessage(message, 'error', 10000);
          resetFormAndUI(5000, false); // Don't clear form on error, allow user to correct
        }
      })
      .catch((error) => {
        console.error('Error during submission (Network/JS):', error);
        displayMessage(`Error: ${error.message || 'Could not connect. Please try again.'}`, 'error', 10000);
        resetFormAndUI(5000, false); // Don't clear form on error
      })
      .finally(() => {
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
      });
    });
  }

  function displayMessage(message, type = 'info', duration = 3000) {
    if (!confirmationDiv || !form || !welcomeText) return;

    confirmationDiv.innerHTML = `<p class="text-lg">${message}</p>`;
    confirmationDiv.className = 'my-6 p-4 rounded-lg text-center';
    if (type === 'success') {
      confirmationDiv.classList.add('bg-green-100', 'dark:bg-green-900', 'border', 'border-green-500', 'dark:border-green-700', 'text-green-700', 'dark:text-green-200');
    } else if (type === 'error') {
      confirmationDiv.classList.add('bg-red-100', 'dark:bg-red-900', 'border', 'border-red-500', 'dark:border-red-700', 'text-red-700', 'dark:text-red-200');
    } else { // info
      confirmationDiv.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border', 'border-blue-500', 'dark:border-blue-700', 'text-blue-700', 'dark:text-blue-200');
    }
    confirmationDiv.classList.remove('hidden');

    form.classList.add('hidden');
    if (welcomeText) welcomeText.classList.add('hidden');
  }

  function resetFormAndUI(delay, clearForm = true) {
    setTimeout(function() {
      if (clearForm && form) {
        form.reset();
        if (serviceInput) serviceInput.value = "";
      }
      if (confirmationDiv) confirmationDiv.classList.add('hidden');
      if (form) form.classList.remove('hidden');
      if (welcomeText) welcomeText.classList.remove('hidden');
    }, delay);
  }

  // --- Modal for Terms/Privacy ---
  function showModal(htmlContent) {
    if (modalText) modalText.innerHTML = htmlContent;
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            if(modalContentWrapper) {
                modalContentWrapper.classList.remove('scale-95', 'opacity-0');
                modalContentWrapper.classList.add('scale-100', 'opacity-100');
            }
            if(modal) modal.classList.remove('opacity-0'); // Ensure modal is not hidden by opacity
        }, 20);
    }
  }

  function hideModal() {
    if (modal && modalContentWrapper) {
        modalContentWrapper.classList.add('scale-95', 'opacity-0');
        modalContentWrapper.classList.remove('scale-100', 'opacity-100');
        if(modal) modal.classList.add('opacity-0'); // Set opacity to 0 before hiding
        setTimeout(() => {
            if(modal) modal.classList.add('hidden');
        }, 300); // Match this with your CSS transition duration
    }
  }

  const termsContent = `<h2>Terms and Conditions</h2>
                        <p><strong>Last Updated:</strong> May 30, 2025</p>
                        <h3>1. Acceptance of Terms</h3>
                        <p>By using this sign-in kiosk, you agree to these terms and our Privacy Policy.</p>
                        <h3>2. Permitted Use</h3>
                        <p>This kiosk is for legitimate customer sign-ins only. Do not enter false information. Business owners and administrators must respect visitor privacy according to applicable laws.</p>
                        <h3>3. Limitations of Liability</h3>
                        <p>The provider of this kiosk software (PAPERED PAK N SHIP) is not liable for data breaches caused by unauthorized physical or network access to the system where data is stored (e.g., the Google Sheet). The application is provided "as is" without warranties of absolute security, though reasonable measures are encouraged for its setup.</p>
                        <h3>4. Data Handling</h3>
                        <p>Data submitted through this form is transmitted to a Google Sheet controlled by the business operating this kiosk. Refer to their specific data retention and usage policies.</p>
                        <h3>5. Termination of Use</h3>
                        <p>The business operating this kiosk may restrict access for users who violate these terms or misuse the system.</p>
                        <h3>6. Governing Law</h3>
                        <p>These terms are governed by the laws of the State of Georgia, USA.</p>
                        <p><strong>Contact:</strong> SUPPORT@PAPEREDPAKNSHIP.COM</p>`;

  const privacyContent = `<h2>Privacy Policy</h2>
                          <p><strong>Last Updated:</strong> May 30, 2025</p>
                          <h3>1. Information We Collect</h3>
                          <p>When you use this sign-in kiosk, we (the business operating this kiosk) may collect:</p>
                          <ul>
                            <li><strong>Personal Data:</strong> Full Name, Phone Number, Email Address (if provided), and Service Selected.</li>
                            <li><strong>Timestamp:</strong> Date and time of sign-in.</li>
                            <li><strong>Device ID:</strong> A unique identifier for the kiosk device.</li>
                          </ul>
                          <h3>2. How We Use Your Data</h3>
                          <p>Your data is used for:</p>
                          <ul>
                            <li>Logging your visit for service provision and record-keeping.</li>
                            <li>Contacting you regarding your service or visit if necessary.</li>
                            <li>Internal analysis to improve services (anonymized where possible).</li>
                          </ul>
                          <p><strong>We (the business operating this kiosk) commit not to sell your personal data collected through this kiosk to third parties.</strong></p>
                          <h3>3. Data Storage & Security</h3>
                          <p>Data is stored in a Google Sheet managed by the business operating this kiosk. Access to this Google Sheet is restricted to authorized personnel of the business. Please inquire with the business for their specific data retention policies.</p>
                          <h3>4. Your Rights</h3>
                          <p>You may have the right to:</p>
                          <ul>
                            <li>Request access to the personal data held about you by the business.</li>
                            <li>Request correction or deletion of your data, subject to legal and operational requirements.</li>
                          </ul>
                          <p>To exercise these rights, please contact the business operating this kiosk directly. For general inquiries about the software itself, contact SUPPORT@PAPEREDPAKNSHIP.COM.</p>
                          <h3>5. Changes to This Policy</h3>
                          <p>The business operating this kiosk may update this privacy policy. Please refer to any notices provided by them or check with them for the latest version.</p>
                          <p><strong>Contact (for software-related privacy questions):</strong> SUPPORT@PAPEREDPAKNSHIP.COM</p>
                          <p><strong>Contact (for data collected by the business):</strong> Please contact the front desk or management of the establishment.</p>`;

  if (termsLink) {
    termsLink.addEventListener('click', function(e) { e.preventDefault(); showModal(termsContent); });
  }
  if (privacyLink) {
    privacyLink.addEventListener('click', function(e) { e.preventDefault(); showModal(privacyContent); });
  }
  if (closeModalButton) closeModalButton.addEventListener('click', hideModal);
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) hideModal();
    });
  }

  // --- Kiosk Features (Optional) ---
  document.addEventListener('dblclick', function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting full-screen: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  });
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
});