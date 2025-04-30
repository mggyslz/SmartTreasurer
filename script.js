document.addEventListener('DOMContentLoaded', () => {
    // Global state
    let students = [];
    let currentUser = null; // Keep track of logged-in user

    // DOM Elements
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const openingScreen = document.getElementById('openingScreen');
    const addStudentModal = document.getElementById('addStudentModal');
    const studentForm = document.getElementById('studentForm');
    const studentEditForm = document.getElementById('studentEditForm');
    const editFormDiv = document.getElementById('editForm');
    const sectionLists = document.getElementById('sectionLists');
    const sectionSummaryBody = document.getElementById('sectionSummary');
    const totalAmountSpan = document.getElementById('totalAmount');
    const totalStudentsSpan = document.getElementById('totalStudents');
    const totalPaidSpan = document.getElementById('totalPaid');
    const totalUnpaidSpan = document.getElementById('totalUnpaid');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const noStudentsMessage = document.getElementById('noStudentsMessage');
    const sectionSummaryDefaultRow = sectionSummaryBody.querySelector('tr'); // Get the default row

    // --- Initialization ---
    function initialize() {
        setupEventListeners();
        loadThemePreference();
        // Don't load students yet, wait for login
        // checkLoginStatus(); // Optional: Auto-login if session exists
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        themeToggle.addEventListener('change', handleThemeToggle);
        studentForm.addEventListener('submit', handleAddStudent);
        studentEditForm.addEventListener('submit', handleEditStudent);

        // Close modal on outside click
        window.onclick = (event) => {
            if (event.target == addStudentModal) {
                hideAddStudentModal();
            }
        };

        // Attach functions to window object for inline HTML onclick calls
        window.showLogin = showLogin;
        window.showSignup = showSignup;
        window.login = login;
        window.signup = signup;
        window.deleteAccount = deleteAccount;
        window.showAddStudentModal = showAddStudentModal;
        window.hideAddStudentModal = hideAddStudentModal;
        window.importFromExcel = importFromExcel; // Make sure this is accessible
        window.exportToExcel = exportToExcel;
        window.showEditForm = showEditForm;
        window.hideEditForm = hideEditForm;
        window.togglePaymentStatus = togglePaymentStatus;
        window.deleteStudent = deleteStudent;
    }

    // --- Theme Handling ---
    function loadThemePreference() {
        const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
        setTheme(savedTheme);
    }

    function handleThemeToggle() {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        setTheme(newTheme);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.checked = theme === 'dark';
        themeLabel.innerHTML = `<i class="fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i> ${theme === 'dark' ? 'Dark' : 'Light'} Mode`;
    }

    // --- Authentication ---
    function showLogin() {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        document.querySelector('.toggle-btn.active')?.classList.remove('active');
        document.querySelector('.toggle-btn:first-child').classList.add('active');
        loginError.style.display = 'none'; // Hide errors on switch
    }

    function showSignup() {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        document.querySelector('.toggle-btn.active')?.classList.remove('active');
        document.querySelector('.toggle-btn:last-child').classList.add('active');
        signupError.style.display = 'none'; // Hide errors on switch
    }

    function login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        loginError.style.display = 'none'; // Reset error

        if (!username || !password) {
            showError(loginError, 'Please enter both username and password.');
            return;
        }

        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const user = storedUsers.find(u => u.username === username && u.password === password); // Basic check

        if (user) {
            currentUser = user.username;
            // Load data specific to this user
            const savedStudents = localStorage.getItem(`students_${currentUser}`);
            students = savedStudents ? JSON.parse(savedStudents) : [];
            startApp();
        } else {
            showError(loginError, 'Incorrect username or password.');
        }
    }

    function signup() {
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        signupError.style.display = 'none'; // Reset error

        if (!username || !password || !confirmPassword) {
             showError(signupError, 'Please fill in all fields.');
             return;
        }
        if (password.length < 6) { // Example validation
             showError(signupError, 'Password must be at least 6 characters long.');
             return;
        }
        if (password !== confirmPassword) {
            showError(signupError, 'Passwords do not match.');
            return;
        }

        let users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.some(u => u.username === username)) {
            showError(signupError, 'Username already exists. Please choose another.');
            return;
        }

        // In a real app: Hash the password before storing!
        // For this example, storing plaintext (SECURITY RISK)
        users.push({ username, password });
        localStorage.setItem('users', JSON.stringify(users));

        // Clear form and switch to login
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        showLogin();
        // Optional: Show a success message briefly
        alert('Sign up successful! Please log in.');
    }

    function deleteAccount() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        loginError.style.display = 'none';

        if (!username || !password) {
             showError(loginError, 'Please enter username and password to delete.');
             return;
        }

        let users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === username && u.password === password);

        if (userIndex !== -1) {
            // **CRITICAL**: Confirm deletion!
            if (confirm(`Are you absolutely sure you want to delete the account "${username}"? ALL associated student data will be permanently lost!`)) {
                 if(confirm(`FINAL WARNING: This cannot be undone. Delete account "${username}"?`)) {
                    // Remove user
                    users.splice(userIndex, 1);
                    localStorage.setItem('users', JSON.stringify(users));

                    // Remove associated student data
                    localStorage.removeItem(`students_${username}`);

                    // Clear the login form
                    document.getElementById('loginUsername').value = '';
                    document.getElementById('loginPassword').value = '';

                    alert('Account and associated data successfully deleted.');
                    // Potentially reload or force logout if they were logged in
                    currentUser = null; // Log them out conceptually
                    // We stay on the login screen here
                 }
            }
        } else {
            showError(loginError,'Invalid credentials. Cannot delete account.');
        }
    }

    function startApp() {
        openingScreen.style.opacity = '0';
        setTimeout(() => {
            openingScreen.style.display = 'none';
            updateDisplay(); // Initial display render after login
        }, 500); // Match CSS transition duration
    }

    // --- Student Data Management ---
    function handleAddStudent(e) {
        e.preventDefault();
        const isPaid = document.getElementById('isPaid').value === 'true';
        const amountInput = document.getElementById('amount');
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount < 0) {
             alert("Please enter a valid non-negative amount.");
             amountInput.focus();
             return;
        }

        const student = {
            id: Date.now().toString(), // Simple unique ID
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            section: document.getElementById('section').value.trim().toUpperCase(), // Standardize section format
            amount: amount,
            isPaid: isPaid,
            paymentDate: isPaid ? new Date().toISOString().split('T')[0] : null
        };

         if (!student.firstName || !student.lastName || !student.section) {
             alert("Please fill in First Name, Last Name, and Section.");
             return;
         }


        students.push(student);
        updateDisplay();
        hideAddStudentModal(); // Resets form inside
    }

    function handleEditStudent(e) {
        e.preventDefault();
        const index = parseInt(document.getElementById('editIndex').value, 10); // Ensure index is integer
        if (isNaN(index) || index < 0 || index >= students.length) {
             console.error("Invalid edit index:", index);
             alert("Error saving changes. Invalid student index.");
             hideEditForm();
             return;
        }

        const isPaid = document.getElementById('editIsPaid').value === 'true';
        const amountInput = document.getElementById('editAmount');
        const amount = parseFloat(amountInput.value);
        const paymentDateInput = document.getElementById('editPaymentDate').value;

         if (isNaN(amount) || amount < 0) {
             alert("Please enter a valid non-negative amount.");
             amountInput.focus();
             return;
         }
         const editedFirstName = document.getElementById('editFirstName').value.trim();
         const editedLastName = document.getElementById('editLastName').value.trim();
         const editedSection = document.getElementById('editSection').value.trim().toUpperCase();

         if (!editedFirstName || !editedLastName || !editedSection) {
              alert("Please fill in First Name, Last Name, and Section.");
              return;
         }

        // Determine payment date
        let paymentDate = null;
        if (isPaid) {
             // Use provided date if valid, otherwise use today, or keep existing if already paid and no new date given
            if (paymentDateInput && !isNaN(new Date(paymentDateInput))) {
                paymentDate = paymentDateInput;
            } else if (students[index].isPaid && students[index].paymentDate) {
                 // If already paid and no new date, keep the old date unless user cleared it
                 paymentDate = paymentDateInput === "" ? null : students[index].paymentDate; // Allow clearing date explicitly? Maybe not best UX. Let's default to today if new date is invalid/empty
                 if (!paymentDate) paymentDate = new Date().toISOString().split('T')[0]; // Default to today if toggled to paid or date is bad
            } else {
                paymentDate = new Date().toISOString().split('T')[0]; // Default to today if newly marked as paid
            }
        }


        students[index] = {
            ...students[index], // Keep original ID
            firstName: editedFirstName,
            lastName: editedLastName,
            section: editedSection,
            amount: amount,
            isPaid: isPaid,
            paymentDate: paymentDate
        };

        hideEditForm();
        updateDisplay();
    }

    function showEditForm(index) {
        if (index < 0 || index >= students.length) {
             console.error("Attempted to edit invalid index:", index);
             return;
        }
        const student = students[index];
        document.getElementById('editIndex').value = index;
        document.getElementById('editFirstName').value = student.firstName;
        document.getElementById('editLastName').value = student.lastName;
        document.getElementById('editSection').value = student.section;
        document.getElementById('editAmount').value = student.amount;
        document.getElementById('editIsPaid').value = student.isPaid.toString();
        document.getElementById('editPaymentDate').value = student.paymentDate || ''; // Set to empty string if null

        editFormDiv.style.display = 'block';
        editFormDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to the form
    }

    function hideEditForm() {
        editFormDiv.style.display = 'none';
        studentEditForm.reset(); // Clear the form
    }

    function togglePaymentStatus(index) {
         if (index < 0 || index >= students.length) {
              console.error("Attempted to toggle payment for invalid index:", index);
              return;
         }
        const student = students[index];
        const wasPaid = student.isPaid;
        student.isPaid = !student.isPaid;

        if (student.isPaid) {
            // If newly marked as paid, set payment date to today
            student.paymentDate = new Date().toISOString().split('T')[0];
            showFeedback(`Payment recorded for ${student.firstName} ${student.lastName} on ${student.paymentDate}.`);
        } else {
             // If marked as unpaid, clear the payment date
            student.paymentDate = null;
            showFeedback(`${student.firstName} ${student.lastName} marked as UNPAID.`);
        }

        updateDisplay();
    }

    function deleteStudent(index) {
         if (index < 0 || index >= students.length) {
             console.error("Attempted to delete invalid index:", index);
             return;
         }
        const student = students[index];
        if (confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`)) {
            students.splice(index, 1);
            updateDisplay();
            showFeedback(`Student ${student.firstName} ${student.lastName} deleted.`);
        }
    }

    // --- UI Updates ---
    function updateDisplay() {
        if (!currentUser) return; // Don't update if not logged in

        updateStudentList();
        updateSummary();
        updateSectionSummary();
        saveStudents(); // Save changes to local storage for the current user

        // Show/hide the "no students" message
        noStudentsMessage.style.display = students.length === 0 ? 'block' : 'none';
        // Show/hide the default section summary row
        sectionSummaryDefaultRow.style.display = Object.keys(groupStudentsBySection()).length === 0 ? 'table-row' : 'none';

    }

    function groupStudentsBySection() {
         // Helper to group students
        const sectionData = {};
        students.forEach(student => {
            const sectionKey = student.section || 'Uncategorized'; // Handle potential empty section
            if (!sectionData[sectionKey]) {
                sectionData[sectionKey] = [];
            }
            sectionData[sectionKey].push(student);
        });
        return sectionData;
    }

    function updateStudentList() {
        sectionLists.innerHTML = ''; // Clear existing list
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort(); // Sort sections alphabetically

        if (sortedSections.length === 0) return; // Exit if no students

        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'card section-card'; // Add card styling

            // Sort students within section (e.g., by last name)
            sectionStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            sectionDiv.innerHTML = `
                <h3 class="section-header"><i class="fas fa-users-rectangle"></i> Section: ${section}</h3>
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Amount (₱)</th>
                                <th>Status</th>
                                <th>Payment Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sectionStudents.map(student => {
                                // Find the original index in the main 'students' array
                                const originalIndex = students.findIndex(s => s.id === student.id);
                                return `
                                <tr>
                                    <td>${student.firstName}</td>
                                    <td>${student.lastName}</td>
                                    <td>${student.amount.toFixed(2)}</td>
                                    <td class="status-${student.isPaid ? 'paid' : 'unpaid'}">
                                        <i class="fas ${student.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                                        ${student.isPaid ? 'Paid' : 'Unpaid'}
                                    </td>
                                    <td>${student.paymentDate || 'N/A'}</td>
                                    <td>
                                        <button onclick="togglePaymentStatus(${originalIndex})" class="btn btn-secondary btn-sm" title="${student.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                                            <i class="fas ${student.isPaid ? 'fa-times' : 'fa-check'}"></i>
                                        </button>
                                        <button onclick="showEditForm(${originalIndex})" class="btn btn-primary btn-sm" title="Edit Student">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="deleteStudent(${originalIndex})" class="btn btn-danger btn-sm" title="Delete Student">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            sectionLists.appendChild(sectionDiv);
        });
    }

    function updateSummary() {
        const totalAmount = students.reduce((sum, student) => sum + student.amount, 0);
        const totalPaidCount = students.filter(student => student.isPaid).length;
        const totalUnpaidCount = students.length - totalPaidCount;

        totalAmountSpan.textContent = totalAmount.toFixed(2);
        totalStudentsSpan.textContent = students.length;
        totalPaidSpan.textContent = totalPaidCount;
        totalUnpaidSpan.textContent = totalUnpaidCount;
    }

    function updateSectionSummary() {
        sectionSummaryBody.innerHTML = ''; // Clear existing summary
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        if (sortedSections.length === 0) {
             sectionSummaryBody.appendChild(sectionSummaryDefaultRow); // Show default row if no sections
             sectionSummaryDefaultRow.style.display = 'table-row';
             return;
        }

        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            const data = {
                count: sectionStudents.length,
                total: sectionStudents.reduce((sum, s) => sum + s.amount, 0),
                paid: sectionStudents.filter(s => s.isPaid).length,
                unpaid: sectionStudents.filter(s => !s.isPaid).length,
                latestPayment: sectionStudents
                    .filter(s => s.isPaid && s.paymentDate)
                    .map(s => s.paymentDate)
                    .sort()
                    .pop() || 'N/A' // Get the latest date string
            };

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${section}</td>
                <td>${data.count}</td>
                <td>₱${data.total.toFixed(2)}</td>
                <td><span class="status-paid">${data.paid} <i class="fas fa-check-circle"></i></span></td>
                 <td><span class="status-unpaid">${data.unpaid} <i class="fas fa-exclamation-circle"></i></span></td>
                <td>${data.latestPayment}</td>
            `;
            sectionSummaryBody.appendChild(row);
        });
    }

    // --- Persistence ---
    function saveStudents() {
        if (currentUser) {
            localStorage.setItem(`students_${currentUser}`, JSON.stringify(students));
        } else {
             console.warn("Attempted to save students without a logged-in user.");
        }
    }

    // --- Modal Handling ---
    function showAddStudentModal() {
        addStudentModal.style.display = 'block';
    }

    function hideAddStudentModal() {
        addStudentModal.style.display = 'none';
        studentForm.reset(); // Clear the form when hiding
    }

    // --- Utility Functions ---
    function showError(element, message) {
         // Safely set text content
         const icon = element.querySelector('i') ? element.querySelector('i').outerHTML : '<i class="fas fa-exclamation-triangle"></i>'; // Keep icon if exists
         element.innerHTML = `${icon} ${message}`;
         element.style.display = 'block';
    }

     function showFeedback(message, duration = 3000) {
        // Simple feedback using alert for now, replace with a toast notification element later if desired
        console.info("Feedback:", message); // Log feedback
        alert(message); // Use alert as a basic feedback mechanism
     }


    // --- Excel Import/Export ---
    function importFromExcel(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // Try to parse dates

                let importedStudents = [];
                let importErrors = [];

                workbook.SheetNames.forEach(sheetName => {
                    if (sheetName.toLowerCase() === 'summary') return; // Skip summary sheet

                    const worksheet = workbook.Sheets[sheetName];
                    // Convert to JSON with header row detection, but we'll process row by row
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                    let currentSection = sheetName; // Use sheet name as default section
                    let inPaidBlock = false;
                    let inUnpaidBlock = false;
                    let headerRowFound = false;
                    const expectedHeaders = ["first name", "last name", "amount", "payment status", "payment date"];

                    jsonData.forEach((row, rowIndex) => {
                        if (!row || row.every(cell => cell === null || String(cell).trim() === '')) return; // Skip empty rows

                         // Detect section headers like "Section: BSCS-3A"
                         if (typeof row[0] === 'string' && row[0].toLowerCase().startsWith('section:')) {
                             currentSection = row[0].substring(8).trim().toUpperCase();
                             inPaidBlock = false; // Reset blocks when section changes
                             inUnpaidBlock = false;
                             headerRowFound = false;
                             return; // Move to next row
                         }

                         // Detect block headers
                         if (typeof row[0] === 'string') {
                              if (row[0].toUpperCase() === 'PAID STUDENTS') {
                                  inPaidBlock = true;
                                  inUnpaidBlock = false;
                                  headerRowFound = false; // Expect headers after this
                                  return;
                              }
                              if (row[0].toUpperCase() === 'UNPAID STUDENTS') {
                                   inUnpaidBlock = true;
                                   inPaidBlock = false;
                                   headerRowFound = false; // Expect headers after this
                                   return;
                              }
                         }


                        // Detect Header Row within a block (flexible check)
                        if ((inPaidBlock || inUnpaidBlock) && !headerRowFound) {
                            const rowHeaders = row.map(h => String(h || '').trim().toLowerCase());
                            // Check if *most* headers are present
                            const matchedHeaders = expectedHeaders.filter(eh => rowHeaders.includes(eh));
                             if (matchedHeaders.length >= 3) { // Require at least 3 matching headers
                                 headerRowFound = true;
                                 return; // Skip the header row itself
                             }
                        }

                        // Process data row if we are inside a block AND have found headers
                        if ((inPaidBlock || inUnpaidBlock) && headerRowFound && row.length >= 3) {
                             // Basic validation: Need at least first name, last name, amount
                             const firstName = String(row[0] || '').trim();
                             const lastName = String(row[1] || '').trim();
                             let amountStr = String(row[2] || '0').replace(/[^0-9.-]+/g,""); // Clean currency symbols etc.
                             const amount = parseFloat(amountStr);
                             const paymentDateRaw = row[4]; // Get potential date

                             if (firstName && lastName && !isNaN(amount) && amount >= 0) {
                                 let paymentDate = null;
                                 if (inPaidBlock && paymentDateRaw) {
                                     if (paymentDateRaw instanceof Date && !isNaN(paymentDateRaw)) {
                                         // Adjust for potential timezone offset if XLSX reads as UTC noon/midnight
                                         const adjustedDate = new Date(paymentDateRaw.getTime() - (paymentDateRaw.getTimezoneOffset() * 60000));
                                         paymentDate = adjustedDate.toISOString().split('T')[0];
                                     } else if (typeof paymentDateRaw === 'string' && !isNaN(new Date(paymentDateRaw))) {
                                          paymentDate = new Date(paymentDateRaw).toISOString().split('T')[0];
                                     } else {
                                          // If date is invalid but should be paid, maybe default to today or null? Let's default to null and log.
                                          console.warn(`Invalid payment date format for ${firstName} ${lastName} in section ${currentSection}. Setting to null.`);
                                     }
                                 } else if (inPaidBlock && !paymentDateRaw) {
                                     // Paid but no date provided - default to today? Or null? Let's use null.
                                     console.warn(`Missing payment date for paid student ${firstName} ${lastName} in section ${currentSection}. Setting to null.`);
                                 }


                                 importedStudents.push({
                                     id: Date.now().toString() + Math.random(), // Temp ID
                                     firstName: firstName,
                                     lastName: lastName,
                                     amount: amount,
                                     section: currentSection,
                                     isPaid: inPaidBlock, // Status determined by block
                                     paymentDate: paymentDate
                                 });
                             } else {
                                 importErrors.push(`Skipped row ${rowIndex + 1} in Section/Sheet '${currentSection}': Invalid data (Name: "${firstName} ${lastName}", Amount: "${row[2]}")`);
                             }
                        }
                    });
                });

                if (importErrors.length > 0) {
                    alert("Import completed with some issues:\n\n" + importErrors.join("\n"));
                }

                if (importedStudents.length > 0) {
                    // Ask user whether to replace or append
                     if (students.length === 0 || confirm("Import successful. Do you want to REPLACE existing student data with the imported data? \n\n(Cancel will APPEND the new data)")) {
                         students = importedStudents;
                         showFeedback(`${importedStudents.length} students imported, replacing existing data.`);
                     } else {
                         students = students.concat(importedStudents);
                         showFeedback(`${importedStudents.length} students imported and appended to existing data.`);
                     }
                    updateDisplay();
                } else {
                     alert("No valid student data found in the Excel file according to the expected format.");
                }

            } catch (error) {
                console.error("Error reading or processing Excel file:", error);
                alert("Error reading Excel file. Make sure it's a valid .xlsx file and not corrupted. \n\nDetails: " + error.message);
            } finally {
                // Reset the file input so the same file can be selected again
                input.value = null;
            }
        };

        reader.onerror = function(e) {
            console.error("FileReader error:", e);
            alert("Error reading file.");
            input.value = null; // Reset input
        };

        reader.readAsArrayBuffer(file);
    }

    function exportToExcel() {
        if (students.length === 0) {
            alert("No student data to export.");
            return;
        }

        const wb = XLSX.utils.book_new();
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        // Create sheets for each section
        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            const paidStudentsList = sectionStudents.filter(s => s.isPaid).sort((a,b) => a.lastName.localeCompare(b.lastName));
            const unpaidStudentsList = sectionStudents.filter(s => !s.isPaid).sort((a,b) => a.lastName.localeCompare(b.lastName));

            const ws_data = [
                [`Section: ${section}`], // Section Header
                [], // Empty row
                ['PAID STUDENTS'], // Paid Block Header
                ['First Name', 'Last Name', 'Amount', 'Payment Status', 'Payment Date'], // Headers
                ...paidStudentsList.map(student => [
                    student.firstName,
                    student.lastName,
                    student.amount, // Export as number for easier calculations
                    'PAID',
                    student.paymentDate ? new Date(student.paymentDate) : null // Export dates as Date objects
                ]),
                [], // Empty row separator
                ['UNPAID STUDENTS'], // Unpaid Block Header
                ['First Name', 'Last Name', 'Amount', 'Payment Status', 'Payment Date'], // Headers
                ...unpaidStudentsList.map(student => [
                    student.firstName,
                    student.lastName,
                    student.amount,
                    'UNPAID',
                    null // No payment date for unpaid
                ]),
                 [], // Empty row
                 // Optional: Section Summary within the sheet (can be complex for import)
                 // ['Section Summary'],
                 // ['Total Students:', sectionStudents.length],
                 // ... etc
            ];

            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            // --- Formatting (Basic Example) ---
             // Set column widths (approximate character widths)
             ws['!cols'] = [ {wch:15}, {wch:15}, {wch:10}, {wch:15}, {wch:15} ];

             // Find header rows and apply bold formatting (requires iterating rows)
             // This is more complex with aoa_to_sheet, easier if using sheet_add_json
             // Example: Find "PAID STUDENTS" row and apply bold style
             // Note: Styling requires the full xlsx library or specific cell formatting logic

             // Apply number format for amount column (Column C, starting from row 5 for paid, etc.)
             // Apply date format for payment date column (Column E)
              ws['C'] = { t: 'n', z: '"₱"#,##0.00' }; // Currency format
              ws['E'] = { t: 'd', z: 'yyyy-mm-dd' }; // Date format

             // Add the worksheet to the workbook
             XLSX.utils.book_append_sheet(wb, ws, section);
        });


        // Create Overall Summary Sheet
        const summaryData = [
            ['Overall Summary'],
            [],
            ['Section', 'Total Students', 'Total Amount', 'Paid Students', 'Unpaid Students', 'Latest Payment Date'],
            ...sortedSections.map(section => {
                const sectionStudents = groupedStudents[section];
                const latestPayment = sectionStudents
                    .filter(s => s.isPaid && s.paymentDate)
                    .map(s => s.paymentDate)
                    .sort()
                    .pop() || null; // Get latest date string or null

                return [
                    section,
                    sectionStudents.length,
                    sectionStudents.reduce((sum, s) => sum + s.amount, 0), // Total Amount
                    sectionStudents.filter(s => s.isPaid).length, // Paid Count
                    sectionStudents.filter(s => !s.isPaid).length, // Unpaid Count
                    latestPayment ? new Date(latestPayment) : null // Export date as Date object or null
                ];
            })
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        // Formatting for summary sheet
        summaryWs['!cols'] = [ {wch:20}, {wch:15}, {wch:15}, {wch:15}, {wch:15}, {wch:20} ];
        summaryWs['C'] = { t: 'n', z: '"₱"#,##0.00' }; // Currency
        summaryWs['F'] = { t: 'd', z: 'yyyy-mm-dd' }; // Date
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Generate filename with timestamp
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `SmartTreasurer_Export_${currentUser || 'All'}_${dateStr}.xlsx`;

        // Write the workbook and trigger download
        XLSX.writeFile(wb, filename);
        showFeedback("Data exported successfully!");
    }


    // --- Start the application ---
    initialize();

}); // End DOMContentLoaded