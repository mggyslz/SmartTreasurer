document.addEventListener('DOMContentLoaded', () => {
    // Global state
    let students = [];
    let currentUser = null; // Keep track of logged-in user
    let appData = {
        students: [],
        categories: [],
        activeCategory: null,
        currentUser: null
    };

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

// ---- Initialization & Setup ----
    function initialize() {
        setupEventListeners();
        loadThemePreference();
        
        // Check if there's a logged-in user in sessionStorage
        currentUser = sessionStorage.getItem('currentUser');
        
        if (currentUser) {
            // User is logged in, load their data
            const savedData = localStorage.getItem(`smartTreasurerData_${currentUser}`);
            
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    
                    // Initialize appData with defaults first
                    appData = {
                        students: [],
                        categories: [],
                        activeCategory: null,
                        currentUser: currentUser
                    };
                    
                    // Then merge the saved data
                    if (parsedData.students) appData.students = parsedData.students;
                    if (parsedData.categories) appData.categories = parsedData.categories;
                    if (parsedData.activeCategory) appData.activeCategory = parsedData.activeCategory;
                    
                    // Only migrate if we have students but no categories
                    if (appData.students.length > 0 && appData.categories.length === 0) {
                        migrateOldData();
                    }
                    
                    // Ensure we have at least one category
                    if (appData.categories.length === 0) {
                        appData.categories.push({
                            id: 'default',
                            name: 'Default Payments',
                            description: 'General student payments',
                            targetAmount: 0
                        });
                        appData.activeCategory = 'default';
                    }
                    
                    // Ensure activeCategory is valid
                    if (!appData.activeCategory || !appData.categories.some(c => c.id === appData.activeCategory)) {
                        appData.activeCategory = appData.categories[0].id;
                    }
                    
                    saveData(); // Save any corrections
                    
                } catch (e) {
                    console.error("Error parsing saved data:", e);
                    // Initialize with default values if parsing fails
                    appData = {
                        students: [],
                        categories: [{
                            id: 'default',
                            name: 'Default Payments',
                            description: 'General student payments',
                            targetAmount: 0
                        }],
                        activeCategory: 'default',
                        currentUser: currentUser
                    };
                }
            } else {
                // Initialize with default category if no data exists
                appData = {
                    students: [],
                    categories: [{
                        id: 'default',
                        name: 'Default Payments',
                        description: 'General student payments',
                        targetAmount: 0
                    }],
                    activeCategory: 'default',
                    currentUser: currentUser
                };
                saveData();
            }
            
            // Now render the UI
            renderActiveCategorySelect();
            updateCurrentCategoryDisplay();
            updateDisplay();
            startApp();
        } else {
            // No user logged in, show opening screen
            openingScreen.style.display = 'flex';
            openingScreen.style.opacity = '1';
        }
    }

    function migrateOldData() {
        const oldStudents = JSON.parse(localStorage.getItem(`students_${currentUser}`)) || [];
        
        // Only migrate if we don't have any categories yet
        if (appData.categories.length === 0) {
            // Create default category
            const defaultCategory = {
                id: "default",
                name: "Default Payment",
                description: "Migrated from old system",
                targetAmount: 0
            };

            const migratedStudents = oldStudents.map(student => {
                const categories = {
                    default: {
                        amount: student.amount || 0,
                        isPaid: student.isPaid || false,
                        paymentDate: student.paymentDate || null,
                        transactions: student.paymentDate ? [{
                            id: `t${Date.now()}`,
                            amount: student.amount || 0,
                            date: student.paymentDate,
                            notes: "Migrated from old system"
                        }] : []
                    }
                };

                return {
                    ...student,
                    categories
                };
            });

            appData.students = migratedStudents;
            appData.categories = [defaultCategory];
            appData.activeCategory = "default";
            saveData();
            localStorage.removeItem(`students_${currentUser}`);
        }
    }

    function saveData() {
        if (currentUser) {
            try {
                const dataToSave = {
                    students: appData.students,
                    categories: appData.categories,
                    activeCategory: appData.activeCategory,
                    currentUser: currentUser
                };
                localStorage.setItem(`smartTreasurerData_${currentUser}`, JSON.stringify(dataToSave));
            } catch (e) {
                console.error("Error saving data:", e);
                alert("Error saving data. Please check console for details.");
            }
        }
    }

    function setupEventListeners() {
        // Theme and form listeners
        themeToggle.addEventListener('change', handleThemeToggle);
        studentForm.addEventListener('submit', handleAddStudent);
        studentEditForm.addEventListener('submit', handleEditStudent);
        document.getElementById('bulkAddForm').addEventListener('submit', handleBulkAdd);

        // Modal and overlay listeners
        document.addEventListener('click', (e) => {
            // Close sidebar when clicking outside
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.querySelector('.sidebar-toggle');
            
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                e.target !== sidebarToggle) {
                toggleSidebar();
            }

            // Close modal when clicking outside
            if (e.target === addStudentModal) {
                hideAddStudentModal();
            }
        });

        // Category form listener
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const categoryId = `cat${Date.now()}`;
            const newCategory = {
                id: categoryId,
                name: document.getElementById('categoryName').value.trim(),
                description: document.getElementById('categoryDescription').value.trim(),
                targetAmount: parseFloat(document.getElementById('categoryTarget').value) || 0
            };
            
            appData.categories.push(newCategory);
            
            // Add this category to all students with default values
            appData.students.forEach(student => {
                if (!student.categories) student.categories = {};
                student.categories[categoryId] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            });
            
            // Set as active if it's the first category
            if (appData.categories.length === 1) {
                appData.activeCategory = categoryId;
            }
            
            saveData();
            renderCategories();
            renderActiveCategorySelect();
            updateCurrentCategoryDisplay();
            updateDisplay();
            document.getElementById('categoryForm').reset();
        });

        // Category select listener
        document.getElementById('activeCategorySelect')?.addEventListener('change', (e) => {
            appData.activeCategory = e.target.value || null;
            saveData();
            updateCurrentCategoryDisplay();
            updateDisplay();
        });

        // Mobile sidebar behavior
        document.querySelectorAll('.sidebar-menu a').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleSidebar();
                }
            });
        });

        // Global window functions (for HTML onclick handlers)
        const windowFunctions = {
            // Authentication
            showLogin, showSignup, login, signup, deleteAccount, logout,
            
            // Student management
            showAddStudentModal, hideAddStudentModal, showEditForm, hideEditForm,
            togglePaymentStatus, deleteStudent, 
            
            // Section management
            deleteSectionPrompt, deleteSection, toggleSection,
            
            // Import/export
            importFromExcel: handleFileImport, exportToExcel,
            
            // UI controls
            toggleSidebar, toggleSettings, toggleThemeFromSidebar,
            
            // Category management
            showCategoryManagement, hideCategoryManagement,
            editCategory: function(categoryId) {
                const category = appData.categories.find(c => c.id === categoryId);
                if (!category) return;
                
                document.getElementById('categoryName').value = category.name;
                document.getElementById('categoryDescription').value = category.description || '';
                document.getElementById('categoryTarget').value = category.targetAmount;
                
                // Remove the old category
                appData.categories = appData.categories.filter(c => c.id !== categoryId);
                
                // Scroll to form
                document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
            },
            deleteCategory: function(categoryId) {
                if (!confirm('Are you sure you want to delete this category? This will remove all related transaction data.')) return;
                
                // Remove category from categories list
                appData.categories = appData.categories.filter(c => c.id !== categoryId);
                
                // Remove category from all students
                appData.students.forEach(student => {
                    if (student.categories && student.categories[categoryId]) {
                        delete student.categories[categoryId];
                    }
                });

                // Reset active category if it was deleted
                if (appData.activeCategory === categoryId) {
                    appData.activeCategory = appData.categories.length > 0 ? appData.categories[0].id : null;
                }
                
                saveData();
                renderCategories();
                renderActiveCategorySelect();
                updateCurrentCategoryDisplay();
                updateDisplay();
            },
            
            // Bulk operations
            showBulkAddModal: () => {
                document.getElementById('bulkAddModal').style.display = 'block';
                document.getElementById('addStudentModal').style.display = 'none';
            },
            hideBulkAddModal: () => {
                document.getElementById('bulkAddModal').style.display = 'none';
                document.getElementById('bulkAddForm').reset();
            },
            
            // Charts
            showSectionCharts, hideSectionChartsModal
        };

        // Assign all window functions at once
        Object.assign(window, windowFunctions);
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
        const user = storedUsers.find(u => u.username === username && u.password === password);

        if (user) {
            currentUser = user.username;
            // Store current user in sessionStorage
            sessionStorage.setItem('currentUser', currentUser);
            
            // Load data specific to this user
            const savedData = localStorage.getItem(`smartTreasurerData_${currentUser}`);
            if (savedData) {
                appData = JSON.parse(savedData);
            }
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

        let users = JSON.parse(localStorage.getItem('users') || []);
        const userIndex = users.findIndex(u => u.username === username && u.password === password);

        if (userIndex !== -1) {
            // **CRITICAL**: Confirm deletion!
            if (confirm(`Are you absolutely sure you want to delete the account "${username}"? ALL associated student data will be permanently lost!`)) {
                if(confirm(`FINAL WARNING: This cannot be undone. Delete account "${username}"?`)) {
                    // Remove user from users list
                    users.splice(userIndex, 1);
                    localStorage.setItem('users', JSON.stringify(users));

                    // Remove ALL associated data (both old and new formats)
                    localStorage.removeItem(`students_${username}`);
                    localStorage.removeItem(`smartTreasurerData_${username}`);

                    // If the deleted account is currently logged in, clear everything and reset
                    if (currentUser === username) {
                        // Clear session storage
                        sessionStorage.removeItem('currentUser');
                        
                        // Reset current user and app data
                        currentUser = null;
                        appData = {
                            students: [],
                            categories: [],
                            activeCategory: null,
                            currentUser: null
                        };
                        
                        // Clear any displayed data immediately
                        updateDisplay();
                        
                        // Show opening screen again
                        openingScreen.style.display = 'flex';
                        openingScreen.style.opacity = '1';
                    }

                    // Clear the login form
                    document.getElementById('loginUsername').value = '';
                    document.getElementById('loginPassword').value = '';

                    alert('Account and associated data successfully deleted.');
                }
            }
        } else {
            showError(loginError,'Invalid credentials. Cannot delete account.');
        }
    }

    function logout() {
        if (confirm("Are you sure you want to logout?")) {
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            appData = { students: [], categories: [], activeCategory: null, currentUser: null }; // Clear app data
            window.location.reload(); // Reload the page to show the login screen
        }
    }

    function startApp() {
        openingScreen.style.opacity = '0';
        setTimeout(() => {
            openingScreen.style.display = 'none';
            updateDisplay(); // Initial display render after login
        }, 500); // Match CSS transition duration
    }
//---- Student Data Management ----

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
            middleInitial: document.getElementById('middleInitial').value.trim().toUpperCase(),
            lastName: document.getElementById('lastName').value.trim(),
            section: document.getElementById('section').value.trim().toUpperCase(),
            categories: {}
        };

        if (!student.firstName || !student.lastName || !student.section) {
            alert("Please fill in First Name, Last Name, and Section.");
            return;
        }

        // Initialize categories for the student
        appData.categories.forEach(category => {
            student.categories[category.id] = {
                amount: 0,
                isPaid: false,
                paymentDate: null,
                transactions: []
            };
        });

        // If active category exists, set the payment data
        if (appData.activeCategory) {
            student.categories[appData.activeCategory] = {
                amount: amount,
                isPaid: isPaid,
                paymentDate: isPaid ? new Date().toISOString().split('T')[0] : null,
                transactions: isPaid ? [{
                    id: `t${Date.now()}`,
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    notes: "Initial payment"
                }] : []
            };
        }

        appData.students.push(student);
        saveData(); // Make sure to save the data
        updateDisplay();
        hideAddStudentModal();
    }

    function handleBulkAdd(e) {
        e.preventDefault();
        const section = document.getElementById('bulkSection').value.trim().toUpperCase();
        const namesRaw = document.getElementById('studentNames').value.trim();
        const lines = namesRaw.split('\n');

        if (!section || lines.length === 0) {
            alert("Please enter a section and at least one student name.");
            return;
        }

        const newStudents = lines.map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return null;

            // Parse name formats
            let firstName, middleInitial = '', lastName;

            // Try to parse as "Last, First Middle" format first
            if (trimmedLine.includes(',')) {
                const [lastNamePart, firstNamePart] = trimmedLine.split(',').map(part => part.trim());
                const firstNameParts = firstNamePart ? firstNamePart.split(' ') : [];
                
                if (firstNameParts.length > 1) {
                    const possibleMiddle = firstNameParts[firstNameParts.length - 1];
                    if (possibleMiddle.length === 1 || possibleMiddle.endsWith('.')) {
                        middleInitial = possibleMiddle.charAt(0).toUpperCase();
                        firstName = firstNameParts.slice(0, -1).join(' ');
                    } else {
                        firstName = firstNameParts.join(' ');
                    }
                } else {
                    firstName = firstNameParts.join(' ');
                }
                lastName = lastNamePart;
            } else {
                // Try to parse as "First Middle Last" format
                const parts = trimmedLine.split(' ').filter(p => p.trim());
                if (parts.length < 2) return null;

                if (parts.length === 2) {
                    firstName = parts[0];
                    lastName = parts[1];
                } else {
                    const possibleMiddle = parts[parts.length - 2];
                    if (possibleMiddle.length === 1 || possibleMiddle.endsWith('.')) {
                        firstName = parts.slice(0, -2).join(' ');
                        middleInitial = possibleMiddle.charAt(0).toUpperCase();
                        lastName = parts[parts.length - 1];
                    } else {
                        firstName = parts.slice(0, -1).join(' ');
                        lastName = parts[parts.length - 1];
                    }
                }
            }

            if (!firstName || !lastName) return null;

            // Create student object with categories
            const student = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                firstName,
                middleInitial,
                lastName,
                section,
                categories: {}
            };

            // Initialize all categories for the student
            appData.categories.forEach(category => {
                student.categories[category.id] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            });

            // If active category exists, initialize it (but keep amount 0 and unpaid)
            if (appData.activeCategory) {
                student.categories[appData.activeCategory] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            }

            return student;
        }).filter(s => s !== null);

        if (newStudents.length === 0) {
            alert("No valid student names found. Please use format: LastName, FirstName MiddleInitial");
            return;
        }

        // Add new students to the array
        appData.students = [...appData.students, ...newStudents];
        saveData();
        updateDisplay();
        hideBulkAddModal();
        showFeedback(`${newStudents.length} students added to section ${section}.`);
    }

    function handleEditStudent(e) {
        e.preventDefault();
        const index = parseInt(document.getElementById('editIndex').value, 10);
        if (isNaN(index) || index < 0 || index >= appData.students.length) {
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
            if (paymentDateInput && !isNaN(new Date(paymentDateInput))) {
                paymentDate = paymentDateInput;
            } else {
                paymentDate = new Date().toISOString().split('T')[0];
            }
        }

        // Update student basic info
        appData.students[index] = {
            ...appData.students[index],
            firstName: editedFirstName,
            lastName: editedLastName,
            section: editedSection,
            middleInitial: document.getElementById('editMiddleInitial').value.trim().toUpperCase()
        };

        // Update category-specific data if active category exists
        if (appData.activeCategory) {
            const student = appData.students[index];
            if (!student.categories) student.categories = {};
            
            if (!student.categories[appData.activeCategory]) {
                student.categories[appData.activeCategory] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            }

            // Update category data
            student.categories[appData.activeCategory].amount = amount;
            student.categories[appData.activeCategory].isPaid = isPaid;
            student.categories[appData.activeCategory].paymentDate = paymentDate;

            // Add transaction if marked as paid and no transactions exist
            if (isPaid && student.categories[appData.activeCategory].transactions.length === 0) {
                student.categories[appData.activeCategory].transactions.push({
                    id: `t${Date.now()}`,
                    amount: amount,
                    date: paymentDate,
                    notes: "Payment recorded"
                });
            }
        }

        hideEditForm();
        updateDisplay();
    }

    function showEditForm(index) {
        if (index < 0 || index >= appData.students.length) {
            console.error("Attempted to edit invalid index:", index);
            return;
        }
        
        const student = appData.students[index];
        const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
        
        document.getElementById('editIndex').value = index;
        document.getElementById('editFirstName').value = student.firstName;
        document.getElementById('editLastName').value = student.lastName;
        document.getElementById('editSection').value = student.section;
        document.getElementById('editAmount').value = categoryData ? categoryData.amount : 0;
        document.getElementById('editIsPaid').value = categoryData ? categoryData.isPaid.toString() : 'false';
        document.getElementById('editPaymentDate').value = categoryData ? (categoryData.paymentDate || '') : '';
        document.getElementById('editMiddleInitial').value = student.middleInitial || '';

        editFormDiv.style.display = 'block';
        editFormDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideEditForm() {
        editFormDiv.style.display = 'none';
        studentEditForm.reset(); // Clear the form
    }

    function togglePaymentStatus(index) {
        if (index < 0 || index >= appData.students.length || !appData.activeCategory) {
            console.error("Attempted to toggle payment for invalid index or no active category:", index);
            return;
        }
        
        const student = appData.students[index];
        if (!student.categories[appData.activeCategory]) {
            student.categories[appData.activeCategory] = {
                amount: 0,
                isPaid: false,
                paymentDate: null,
                transactions: []
            };
        }
        
        const categoryData = student.categories[appData.activeCategory];
        const wasPaid = categoryData.isPaid;
        categoryData.isPaid = !wasPaid;

        if (categoryData.isPaid) {
            // If newly marked as paid, set payment date to today
            categoryData.paymentDate = new Date().toISOString().split('T')[0];
            
            // Add a transaction if none exists
            if (categoryData.transactions.length === 0) {
                categoryData.transactions.push({
                    id: `t${Date.now()}`,
                    amount: categoryData.amount,
                    date: categoryData.paymentDate,
                    notes: "Payment recorded"
                });
            }
            
            showFeedback(`Payment recorded for ${student.firstName} ${student.lastName} on ${categoryData.paymentDate}.`);
        } else {
            // If marked as unpaid, clear the payment date
            categoryData.paymentDate = null;
            showFeedback(`${student.firstName} ${student.lastName} marked as UNPAID.`);
        }

        updateDisplay();
    }

    function deleteStudent(index) {
        if (index < 0 || index >= appData.students.length) {
            console.error("Attempted to delete invalid index:", index);
            return;
        }
        const student = appData.students[index];
        if (confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}? This action cannot be undone.`)) {
            appData.students.splice(index, 1);
            saveData();
            updateDisplay();
            showFeedback(`Student ${student.firstName} ${student.lastName} deleted.`);
        }
    }

    function groupStudentsBySection() {
         // Helper to group students
        const sectionData = {};
        appData.students.forEach(student => {
            const sectionKey = student.section || 'Uncategorized'; // Handle potential empty section
            if (!sectionData[sectionKey]) {
                sectionData[sectionKey] = [];
            }
            sectionData[sectionKey].push(student);
        });
        return sectionData;
    }
    // --- UI Updates ---

    function updateDisplay() {
        if (!currentUser) return;
        
        // Show warning if no categories exist
        if (appData.categories.length === 0) {
            // Don't show alert every time, just show a message in the UI
            console.warn("No categories available. Please create a category first.");
            const noStudentsMsg = document.getElementById('noStudentsMessage');
            if (noStudentsMsg) {
                noStudentsMsg.innerHTML = '<p>Please create at least one payment category before adding students. <button onclick="showCategoryManagement()" class="btn btn-primary">Manage Categories</button></p>';
                noStudentsMsg.style.display = 'block';
            }
            return;
        }

        updateStudentList();
        updateSummary();
        updateSectionSummary();
        
        // Only create charts if we have students and an active category
        if (appData.students.length > 0 && appData.activeCategory) {
            // Add a small delay to ensure DOM is updated
            setTimeout(() => {
                createSummaryCharts();
            }, 100);
        } else {
            // Destroy charts if no data
            if (summaryPieChart) {
                summaryPieChart.destroy();
                summaryPieChart = null;
            }
            if (summaryBarChart) {
                summaryBarChart.destroy();
                summaryBarChart = null;
            }
        }
        
        saveData();

        // Show/hide the "no students" message
        const noStudentsMsg = document.getElementById('noStudentsMessage');
        if (noStudentsMsg) {
            if (appData.students.length === 0) {
                noStudentsMsg.innerHTML = '<p>No students added yet. Click "Add Student" to get started!</p>';
                noStudentsMsg.style.display = 'block';
            } else {
                noStudentsMsg.style.display = 'none';
            }
        }
        
        // Show/hide the default section summary row
        if (sectionSummaryDefaultRow) {
            sectionSummaryDefaultRow.style.display = Object.keys(groupStudentsBySection()).length === 0 ? 'table-row' : 'none';
        }
    }

    function updateStudentList() {
        sectionLists.innerHTML = '';
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        if (sortedSections.length === 0) return;

        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'card section-card';

            // Sort students by last name
            sectionStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            sectionDiv.innerHTML = `
                <h3 class="section-header" onclick="toggleSection(this)"><i class="fas fa-users-rectangle"></i> Section: ${section}</h3>
                <div class="section-content">
                    <div class="table-responsive">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Amount (₱)</th>
                                    <th>Status</th>
                                    <th>Payment Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sectionStudents.map(student => {
                                    const originalIndex = appData.students.findIndex(s => s.id === student.id);
                                    const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
                                    
                                    return `
                                    <tr>
                                        <td>${student.lastName}, ${student.firstName} ${student.middleInitial || ''}</td>
                                        <td>${categoryData ? categoryData.amount.toFixed(2) : '0.00'}</td>
                                        <td class="status-${categoryData && categoryData.isPaid ? 'paid' : 'unpaid'}">
                                            <i class="fas ${categoryData && categoryData.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                                            ${categoryData && categoryData.isPaid ? 'Paid' : 'Unpaid'}
                                        </td>
                                        <td>${categoryData && categoryData.paymentDate ? categoryData.paymentDate : 'N/A'}</td>
                                        <td>
                                            <button onclick="togglePaymentStatus(${originalIndex})" class="btn btn-secondary btn-sm" title="${categoryData && categoryData.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                                                <i class="fas ${categoryData && categoryData.isPaid ? 'fa-times' : 'fa-check'}"></i>
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
                </div>
            `;
            sectionLists.appendChild(sectionDiv);
        });
    }

    function updateSummary() {
        if (!appData.activeCategory) {
            totalAmountSpan.textContent = '0.00';
            totalStudentsSpan.textContent = '0';
            totalPaidSpan.textContent = '0';
            totalUnpaidSpan.textContent = '0';
            document.getElementById('targetProgress').textContent = '₱0 / ₱0 (0%)';
            document.getElementById('targetAchieved').style.display = 'none';
            return;
        }

        const activeCategory = appData.categories.find(c => c.id === appData.activeCategory);
        const targetAmount = activeCategory ? activeCategory.targetAmount : 0;

        let totalAmount = 0;
        let totalPaidCount = 0;
        
        appData.students.forEach(student => {
            const categoryData = student.categories[appData.activeCategory];
            if (categoryData) {
                totalAmount += categoryData.amount;
                if (categoryData.isPaid) {
                    totalPaidCount++;
                }
            }
        });

        const totalUnpaidCount = appData.students.length - totalPaidCount;

        totalAmountSpan.textContent = totalAmount.toFixed(2);
        totalStudentsSpan.textContent = appData.students.length;
        totalPaidSpan.textContent = totalPaidCount;
        totalUnpaidSpan.textContent = totalUnpaidCount;

        // Update target progress
        const progressElement = document.getElementById('targetProgress');
        const achievedElement = document.getElementById('targetAchieved');
        
        if (targetAmount > 0) {
            const percentage = Math.min(100, (totalAmount / targetAmount) * 100);
            progressElement.textContent = `₱${totalAmount.toFixed(2)} / ₱${targetAmount.toFixed(2)} (${percentage.toFixed(1)}%)`;
            
            if (totalAmount >= targetAmount) {
                achievedElement.style.display = 'inline';
                progressElement.style.color = 'var(--success-color)';
            } else {
                achievedElement.style.display = 'none';
                progressElement.style.color = '';
            }
        } else {
            progressElement.textContent = 'No target set';
            achievedElement.style.display = 'none';
        }
    }

    function updateSectionSummary() {
        sectionSummaryBody.innerHTML = ''; // Clear existing summary
        
        if (!appData.activeCategory) {
            sectionSummaryBody.appendChild(sectionSummaryDefaultRow);
            sectionSummaryDefaultRow.style.display = 'table-row';
            return;
        }

        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        if (sortedSections.length === 0) {
            sectionSummaryBody.appendChild(sectionSummaryDefaultRow);
            sectionSummaryDefaultRow.style.display = 'table-row';
            return;
        }

        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            
            // Calculate summary for the active category
            const data = {
                count: sectionStudents.length,
                total: sectionStudents.reduce((sum, student) => {
                    const categoryData = student.categories[appData.activeCategory];
                    return sum + (categoryData ? categoryData.amount : 0);
                }, 0),
                paid: sectionStudents.filter(student => {
                    const categoryData = student.categories[appData.activeCategory];
                    return categoryData && categoryData.isPaid;
                }).length,
                unpaid: sectionStudents.filter(student => {
                    const categoryData = student.categories[appData.activeCategory];
                    return !categoryData || !categoryData.isPaid;
                }).length,
                latestPayment: sectionStudents
                    .map(student => {
                        const categoryData = student.categories[appData.activeCategory];
                        return categoryData && categoryData.isPaid ? categoryData.paymentDate : null;
                    })
                    .filter(date => date)
                    .sort()
                    .pop() || 'N/A'
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

    function updateCurrentCategoryDisplay() {
        const display = document.getElementById('currentCategoryDisplay');
        const name = document.getElementById('currentCategoryName');
        const desc = document.getElementById('currentCategoryDescription');
        
        if (!display || !name || !desc) return;
        
        if (appData.activeCategory) {
            const activeCategory = appData.categories.find(c => c.id === appData.activeCategory);
            if (activeCategory) {
                name.textContent = activeCategory.name;
                desc.textContent = activeCategory.description || 'No description provided';
                display.style.display = 'block';
                return;
            }
        }
        
        name.textContent = 'No Category Selected';
        desc.textContent = 'Please select a category to view student payments';
        display.style.display = 'block';
    }

    function renderActiveCategorySelect() {
        const select = document.getElementById('activeCategorySelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a category</option>';
        
        // Ensure we have categories to render
        if (!appData.categories || appData.categories.length === 0) {
            return;
        }
        
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id === appData.activeCategory) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // If no active category is set but we have categories, set the first one as active
        if (!appData.activeCategory && appData.categories.length > 0) {
            appData.activeCategory = appData.categories[0].id;
            saveData();
        }
    }

    function renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        appData.categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.innerHTML = `
                <div class="category-header">
                    <h3>${category.name}</h3>
                    <div class="category-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editCategory('${category.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${category.description ? `<p>${category.description}</p>` : ''}
                <p class="category-target">Target: ₱${category.targetAmount.toFixed(2)}</p>
            `;
            container.appendChild(categoryCard);
        });
    }

// ---- Modal & Sidebar Handling ----
    function showAddStudentModal() {
        addStudentModal.style.display = 'block';
    }

    function hideAddStudentModal() {
        addStudentModal.style.display = 'none';
        studentForm.reset(); // Clear the form when hiding
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
        document.body.classList.toggle('sidebar-open');
        
        // Adjust theme switch position
        const themeSwitch = document.querySelector('.theme-switch');
        themeSwitch.style.top = sidebar.classList.contains('open') ? '70px' : '15px';
    }

    function toggleSettings() {
        const submenu = document.getElementById('settingsSubmenu');
        const chevron = document.getElementById('settingsChevron');
        
        submenu.classList.toggle('open');
        chevron.classList.toggle('fa-chevron-down');
        chevron.classList.toggle('fa-chevron-up');
    }

    function toggleThemeFromSidebar() {
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.checked = !themeToggle.checked;
        handleThemeToggle(); // This will trigger your existing theme change logic
    }

    function deleteSectionPrompt() {
        if (!currentUser || appData.students.length === 0) {
            alert("No sections available to delete.");
            return;
        }

        const sections = [...new Set(appData.students.map(s => s.section))].sort();
        
        const sectionToDelete = prompt(`Enter the section name to delete (Available sections: ${sections.join(', ')}`);
        
        if (!sectionToDelete) return; // User cancelled
        
        if (!sections.includes(sectionToDelete.trim().toUpperCase())) {
            alert(`Section "${sectionToDelete}" not found. Available sections: ${sections.join(', ')}`);
            return;
        }

        if (confirm(`Are you sure you want to delete ALL students in section "${sectionToDelete}"? This cannot be undone!`)) {
            deleteSection(sectionToDelete.trim().toUpperCase());
        }
    }

    function deleteSection(sectionName) {
        appData.students = appData.students.filter(student => student.section !== sectionName);
        updateDisplay();
        showFeedback(`Section "${sectionName}" and all its students have been deleted.`);
        saveData(); // Make sure to save after deletion
    }

    function toggleSection(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        content.classList.toggle('collapsed');
        
        // If we're expanding, set the height to the actual content height first
        if (!content.classList.contains('collapsed')) {
            content.style.maxHeight = 'none';
            const height = content.scrollHeight;
            content.style.maxHeight = '0';
            // Trigger reflow
            void content.offsetHeight;
            content.style.maxHeight = height + 'px';
            
            // After transition completes, remove the fixed height
            setTimeout(() => {
                if (!content.classList.contains('collapsed')) {
                    content.style.maxHeight = 'none';
                }
            }, 300);
        }
    }

    function showCategoryManagement() {
        document.getElementById('categoryManagementModal').style.display = 'block';
        renderCategories();
    }

    function hideCategoryManagement() {
        document.getElementById('categoryManagementModal').style.display = 'none';
    }

// ---- Excel/CSV Import/Export ----
    function importFromExcel(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Check if this is a new format export (with categories)
                const isNewFormat = workbook.SheetNames.some(name => name.toLowerCase() === 'categories');
                
                if (isNewFormat) {
                    importNewFormat(workbook);
                } else {
                    importLegacyFormat(workbook);
                }
            } catch (error) {
                console.error("Error reading Excel file:", error);
                alert("Error reading Excel file: " + error.message);
            } finally {
                input.value = null;
            }
        };

        reader.onerror = function(e) {
            console.error("FileReader error:", e);
            alert("Error reading file.");
            input.value = null;
        };

        reader.readAsArrayBuffer(file);

        function importNewFormat(workbook) {
            // Import categories first
            if (workbook.SheetNames.includes('Categories')) {
                const categoriesSheet = workbook.Sheets['Categories'];
                const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet);
                
                const importedCategories = categoriesData.map(cat => ({
                    id: cat.id || `cat${Date.now() + Math.random()}`,
                    name: cat.name,
                    description: cat.description || '',
                    targetAmount: parseFloat(cat.targetAmount) || 0
                }));
                
                // Only replace categories if we found valid ones
                if (importedCategories.length > 0) {
                    appData.categories = importedCategories;
                    
                    // Set active category to first one if none is set
                    if (!appData.activeCategory && importedCategories.length > 0) {
                        appData.activeCategory = importedCategories[0].id;
                    }
                }
            }

            // Import students
            let importedStudents = [];
            const studentsSheets = workbook.SheetNames.filter(name => 
                name !== 'Categories' && name !== 'Summary'
            );

            studentsSheets.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                jsonData.forEach(row => {
                    if (!row.Name) return;
                    
                    // Parse name
                    const nameParts = parseName(row.Name);
                    if (!nameParts) return;
                    
                    const { firstName, middleInitial, lastName } = nameParts;
                    
                    // Create student object
                    const student = {
                        id: row.ID || `s${Date.now() + Math.random()}`,
                        firstName,
                        middleInitial,
                        lastName,
                        section: sheetName.toUpperCase(),
                        categories: {}
                    };
                    
                    // Add category data
                    appData.categories.forEach(category => {
                        const categoryKey = category.name.replace(/\s+/g, '_');
                        const amount = parseFloat(row[`${categoryKey}_Amount`]) || 0;
                        const isPaid = row[`${categoryKey}_Status`] === 'PAID';
                        const paymentDate = row[`${categoryKey}_Date`] ? 
                            new Date(row[`${categoryKey}_Date`]).toISOString().split('T')[0] : null;
                        
                        student.categories[category.id] = {
                            amount,
                            isPaid,
                            paymentDate,
                            transactions: isPaid ? [{
                                id: `t${Date.now()}`,
                                amount,
                                date: paymentDate || new Date().toISOString().split('T')[0],
                                notes: "Imported payment"
                            }] : []
                        };
                    });
                    
                    importedStudents.push(student);
                });
            });

            // Handle the imported data
            if (importedStudents.length > 0) {
                const replace = confirm(`Import successful. Found ${importedStudents.length} students and ${appData.categories.length} categories. Replace existing data? (Cancel to append)`);
                
                if (replace) {
                    appData.students = importedStudents;
                } else {
                    // Merge with existing students
                    const existingIds = new Set(appData.students.map(s => s.id));
                    const newStudents = importedStudents.filter(s => !existingIds.has(s.id));
                    appData.students = [...appData.students, ...newStudents];
                }
                
                saveData();
                updateDisplay();
                showFeedback(`Imported ${importedStudents.length} students and ${appData.categories.length} categories.`);
            } else {
                alert("No valid student data found in the import file.");
            }
        }

        function importLegacyFormat(workbook) {
            let importedStudents = [];
            let importErrors = [];

            workbook.SheetNames.forEach(sheetName => {
                if (sheetName.toLowerCase() === 'summary') return;

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                let currentSection = sheetName;
                let inPaidBlock = false;
                let inUnpaidBlock = false;
                let headerRowFound = false;

                jsonData.forEach((row, rowIndex) => {
                    if (!row || row.every(cell => cell === null || String(cell).trim() === '')) return;

                    if (typeof row[0] === 'string' && row[0].toLowerCase().startsWith('section:')) {
                        currentSection = row[0].substring(8).trim().toUpperCase();
                        inPaidBlock = false;
                        inUnpaidBlock = false;
                        headerRowFound = false;
                        return;
                    }

                    if (typeof row[0] === 'string') {
                        if (row[0].toUpperCase() === 'PAID STUDENTS') {
                            inPaidBlock = true;
                            inUnpaidBlock = false;
                            headerRowFound = false;
                            return;
                        }
                        if (row[0].toUpperCase() === 'UNPAID STUDENTS') {
                            inUnpaidBlock = true;
                            inPaidBlock = false;
                            headerRowFound = false;
                            return;
                        }
                    }

                    if ((inPaidBlock || inUnpaidBlock) && !headerRowFound) {
                        if (row[0] && typeof row[0] === 'string' && row[0].toLowerCase().includes('name')) {
                            headerRowFound = true;
                            return;
                        }
                    }

                    if ((inPaidBlock || inUnpaidBlock) && headerRowFound && row.length >= 2) {
                        const nameParts = parseName(String(row[0] || '').trim());
                        if (!nameParts) {
                            importErrors.push(`Skipped row ${rowIndex + 1}: Invalid name format`);
                            return;
                        }

                        const { firstName, middleInitial, lastName } = nameParts;
                        let amountStr = String(row[1] || '0').replace(/[^0-9.-]+/g,"");
                        const amount = parseFloat(amountStr);
                        const paymentDateRaw = row[3];

                        if (firstName && lastName && !isNaN(amount)) {
                            let paymentDate = null;
                            if (inPaidBlock && paymentDateRaw) {
                                if (paymentDateRaw instanceof Date) {
                                    paymentDate = paymentDateRaw.toISOString().split('T')[0];
                                } else if (typeof paymentDateRaw === 'string') {
                                    paymentDate = new Date(paymentDateRaw).toISOString().split('T')[0];
                                }
                            }

                            // Create student with default category data
                            const student = {
                                id: `s${Date.now() + Math.random()}`,
                                firstName,
                                middleInitial,
                                lastName,
                                section: currentSection,
                                categories: {}
                            };

                            // Initialize all categories (create default if none exist)
                            if (appData.categories.length === 0) {
                                appData.categories.push({
                                    id: 'default',
                                    name: 'Default Payments',
                                    description: 'Imported from legacy data',
                                    targetAmount: 0
                                });
                                appData.activeCategory = 'default';
                            }

                            appData.categories.forEach(category => {
                                student.categories[category.id] = {
                                    amount: category.id === appData.activeCategory ? amount : 0,
                                    isPaid: category.id === appData.activeCategory ? inPaidBlock : false,
                                    paymentDate: category.id === appData.activeCategory ? paymentDate : null,
                                    transactions: []
                                };

                                if (category.id === appData.activeCategory && inPaidBlock && paymentDate) {
                                    student.categories[category.id].transactions.push({
                                        id: `t${Date.now()}`,
                                        amount,
                                        date: paymentDate,
                                        notes: "Imported payment"
                                    });
                                }
                            });

                            importedStudents.push(student);
                        } else {
                            importErrors.push(`Skipped row ${rowIndex + 1}: Invalid data (Amount: "${row[1]}")`);
                        }
                    }
                });
            });

            if (importErrors.length > 0) {
                alert("Import completed with some issues:\n\n" + importErrors.join("\n"));
            }

            if (importedStudents.length > 0) {
                const replace = confirm(`Import successful. Found ${importedStudents.length} students. Replace existing data? (Cancel to append)`);
                
                if (replace) {
                    appData.students = importedStudents;
                } else {
                    // Merge with existing students
                    const existingIds = new Set(appData.students.map(s => s.id));
                    const newStudents = importedStudents.filter(s => !existingIds.has(s.id));
                    appData.students = [...appData.students, ...newStudents];
                }
                
                saveData();
                updateDisplay();
                showFeedback(`Imported ${importedStudents.length} students with legacy format.`);
            } else {
                alert("No valid student data found in the import file.");
            }
        }

        function parseName(nameStr) {
            if (!nameStr) return null;
            
            let firstName, middleInitial = '', lastName;

            if (nameStr.includes(',')) {
                // "Last, First Middle" format
                const [lastNamePart, firstNamePart] = nameStr.split(',').map(part => part.trim());
                const firstNameParts = firstNamePart ? firstNamePart.split(' ') : [];
                
                if (firstNameParts.length > 1) {
                    const possibleMiddle = firstNameParts[firstNameParts.length - 1];
                    if (possibleMiddle.length === 1 || possibleMiddle.endsWith('.')) {
                        middleInitial = possibleMiddle.charAt(0).toUpperCase();
                        firstName = firstNameParts.slice(0, -1).join(' ');
                    } else {
                        firstName = firstNameParts.join(' ');
                    }
                } else {
                    firstName = firstNameParts.join(' ');
                }
                lastName = lastNamePart;
            } else {
                // "First Middle Last" format
                const parts = nameStr.split(' ').filter(p => p.trim());
                if (parts.length >= 2) {
                    if (parts.length === 2) {
                        firstName = parts[0];
                        lastName = parts[1];
                    } else {
                        const possibleMiddle = parts[parts.length - 2];
                        if (possibleMiddle.length === 1 || possibleMiddle.endsWith('.')) {
                            firstName = parts.slice(0, -2).join(' ');
                            middleInitial = possibleMiddle.charAt(0).toUpperCase();
                            lastName = parts[parts.length - 1];
                        } else {
                            firstName = parts.slice(0, -1).join(' ');
                            lastName = parts[parts.length - 1];
                        }
                    }
                } else {
                    return null; // Invalid name format
                }
            }

            return { firstName, middleInitial, lastName };
        }
    }

    function exportToExcel() {
        if (appData.students.length === 0) {
            alert("No student data to export.");
            return;
        }

        const wb = XLSX.utils.book_new();
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        // Export categories
        const categoriesData = appData.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            targetAmount: cat.targetAmount
        }));
        
        const categoriesWs = XLSX.utils.json_to_sheet(categoriesData);
        XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories');

        // Export students by section
        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            
            // Prepare worksheet data
            const wsData = [];
            
            // Add header row
            const headerRow = ['ID', 'Name', 'Section'];
            appData.categories.forEach(cat => {
                const categoryKey = cat.name.replace(/\s+/g, '_');
                headerRow.push(`${categoryKey}_Amount`, `${categoryKey}_Status`, `${categoryKey}_Date`);
            });
            wsData.push(headerRow);
            
            // Add student rows
            sectionStudents.forEach(student => {
                const studentRow = [
                    student.id,
                    `${student.lastName}, ${student.firstName} ${student.middleInitial || ''}`,
                    student.section
                ];
                
                appData.categories.forEach(cat => {
                    const categoryData = student.categories[cat.id] || {
                        amount: 0,
                        isPaid: false,
                        paymentDate: null
                    };
                    
                    studentRow.push(
                        categoryData.amount,
                        categoryData.isPaid ? 'PAID' : 'UNPAID',
                        categoryData.paymentDate ? new Date(categoryData.paymentDate) : null
                    );
                });
                
                wsData.push(studentRow);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Format columns
            const colWidths = [
                { wch: 20 }, // ID
                { wch: 30 }, // Name
                { wch: 15 }  // Section
            ];
            
            // Add column widths for each category (amount, status, date)
            appData.categories.forEach(() => {
                colWidths.push({ wch: 12 }); // Amount
                colWidths.push({ wch: 10 }); // Status
                colWidths.push({ wch: 15 }); // Date
            });
            
            ws['!cols'] = colWidths;
            
            // Format amount columns as currency
            appData.categories.forEach((cat, idx) => {
                const colLetter = XLSX.utils.encode_col(3 + (idx * 3)); // Amount columns start at D (index 3)
                ws[`${colLetter}1`] = { t: 'n', z: '"₱"#,##0.00' };
            });
            
            // Format date columns
            appData.categories.forEach((cat, idx) => {
                const colLetter = XLSX.utils.encode_col(5 + (idx * 3)); // Date columns start at F (index 5)
                ws[`${colLetter}1`] = { t: 'd', z: 'yyyy-mm-dd' };
            });
            
            XLSX.utils.book_append_sheet(wb, ws, section);
        });

        // Create Summary Sheet
        const summaryData = [
            ['Overall Summary'],
            [],
            ['Category', 'Target Amount', 'Collected Amount', 'Remaining', 'Completion %', 'Paid Students', 'Unpaid Students']
        ];
        
        appData.categories.forEach(category => {
            let totalAmount = 0;
            let paidCount = 0;
            
            appData.students.forEach(student => {
                const categoryData = student.categories[category.id];
                if (categoryData) {
                    totalAmount += categoryData.amount || 0;
                    if (categoryData.isPaid) {
                        paidCount++;
                    }
                }
            });
            
            const completion = category.targetAmount > 0 ? 
                Math.min(100, (totalAmount / category.targetAmount) * 100) : 0;
            
            summaryData.push([
                category.name,
                category.targetAmount,
                totalAmount,
                Math.max(0, category.targetAmount - totalAmount),
                completion.toFixed(1) + '%',
                paidCount,
                appData.students.length - paidCount
            ]);
        });
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Format columns
        summaryWs['!cols'] = [
            { wch: 25 }, // Category
            { wch: 15 }, // Target
            { wch: 15 }, // Collected
            { wch: 15 }, // Remaining
            { wch: 12 }, // Completion
            { wch: 12 }, // Paid
            { wch: 12 }  // Unpaid
        ];
        
        // Format currency columns
        ['B', 'C', 'D'].forEach(col => {
            summaryWs[`${col}1`] = { t: 'n', z: '"₱"#,##0.00' };
        });
        
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `SmartTreasurer_Export_${currentUser || 'All'}_${dateStr}.xlsx`;
        XLSX.writeFile(wb, filename);
        showFeedback("Data exported successfully with all categories!");
    }

    function handleFileImport(input) {
        const file = input.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'csv') {
            importFromCSV(file);
        } else {
            importFromExcel(input);
        }
    }

    function importFromCSV(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
            let newStudents = [];

            lines.forEach((line, idx) => {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 3) return;

                const nameParts = parseName(parts[0]);
                if (!nameParts) return;
                
                const { firstName, middleInitial, lastName } = nameParts;
                const section = parts[1].toUpperCase();

                if (firstName && lastName && section) {
                    const student = {
                        id: `s${Date.now() + Math.random()}`,
                        firstName,
                        middleInitial,
                        lastName,
                        section,
                        categories: {}
                    };

                    // Initialize all categories
                    appData.categories.forEach(category => {
                        student.categories[category.id] = {
                            amount: 0,
                            isPaid: false,
                            paymentDate: null,
                            transactions: []
                        };
                    });

                    newStudents.push(student);
                }
            });

            if (newStudents.length > 0) {
                const replace = confirm(`CSV import successful. Found ${newStudents.length} students. Replace existing data? (Cancel to append)`);
                
                if (replace) {
                    appData.students = newStudents;
                } else {
                    // Merge with existing students
                    const existingIds = new Set(appData.students.map(s => s.id));
                    const uniqueNewStudents = newStudents.filter(s => !existingIds.has(s.id));
                    appData.students = [...appData.students, ...uniqueNewStudents];
                }
                
                saveData();
                updateDisplay();
                showFeedback(`${newStudents.length} students imported from CSV.`);
            } else {
                alert("No valid student data found in the CSV file.");
            }

            document.getElementById('excelFile').value = '';
        };
        reader.readAsText(file);
    }
// ---- Chart Functions ----

    let summaryPieChart = null;
    let summaryBarChart = null;

    function createSummaryCharts() {
        // Destroy existing charts
        if (summaryPieChart) {
            summaryPieChart.destroy();
            summaryPieChart = null;
        }
        if (summaryBarChart) {
            summaryBarChart.destroy();
            summaryBarChart = null;
        }

        const pieCanvas = document.getElementById('summaryPieChart');
        const barCanvas = document.getElementById('summaryBarChart');

        // Skip if elements missing or no students
        if (!pieCanvas || !barCanvas || appData.students.length === 0) return;

        // Get computed styles for theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = computedStyle.getPropertyValue('--text-color')?.trim() || '#333333';
        const borderColor = computedStyle.getPropertyValue('--border-color')?.trim() || '#e0e0e0';

        // Create charts with error handling
        try {
            summaryPieChart = new Chart(pieCanvas.getContext('2d'), {
                type: 'doughnut',
                data: getPieChartData(),
                options: getChartOptions('Payment Status', textColor, borderColor, 'pie')
            });

            summaryBarChart = new Chart(barCanvas.getContext('2d'), {
                type: 'bar',
                data: getBarChartData(),
                options: getChartOptions('Payment Amounts by Status', textColor, borderColor, 'bar')
            });
        } catch (error) {
            console.error('Error creating charts:', error);
        }
    }

    function getPieChartData() {
        if (!appData.activeCategory || appData.students.length === 0) {
            return {
                labels: ['No Data Available'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#cccccc'],
                    borderColor: ['#999999'],
                    borderWidth: 1
                }]
            };
        }

        let paidCount = 0;
        let unpaidCount = 0;

        appData.students.forEach(student => {
            const categoryData = student.categories && student.categories[appData.activeCategory];
            if (categoryData && categoryData.isPaid) {
                paidCount++;
            } else {
                unpaidCount++;
            }
        });

        // Handle case where all students are in one category
        if (paidCount === 0 && unpaidCount === 0) {
            return {
                labels: ['No Students'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#cccccc'],
                    borderColor: ['#999999'],
                    borderWidth: 1
                }]
            };
        }

        const labels = [];
        const data = [];
        const backgroundColor = [];
        const borderColor = [];

        if (paidCount > 0) {
            labels.push('Paid');
            data.push(paidCount);
            backgroundColor.push('#4CAF50');
            borderColor.push('#388E3C');
        }

        if (unpaidCount > 0) {
            labels.push('Unpaid');
            data.push(unpaidCount);
            backgroundColor.push('#FF9800');
            borderColor.push('#F57C00');
        }

        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        };
    }

    function getBarChartData() {
        if (!appData.activeCategory || appData.students.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{
                    label: 'Amount (₱)',
                    data: [0],
                    backgroundColor: ['#cccccc'],
                    borderColor: ['#999999'],
                    borderWidth: 1
                }]
            };
        }

        const activeCategory = appData.categories.find(c => c.id === appData.activeCategory);
        const targetAmount = activeCategory ? activeCategory.targetAmount : 0;
        
        let totalPaidAmount = 0;
        let totalExpectedAmount = 0;

        appData.students.forEach(student => {
            const categoryData = student.categories && student.categories[appData.activeCategory];
            if (categoryData) {
                const amount = categoryData.amount || 0;
                totalExpectedAmount += amount;
                if (categoryData.isPaid) {
                    totalPaidAmount += amount;
                }
            }
        });

        const unpaidAmount = totalExpectedAmount - totalPaidAmount;
        const targetRemaining = Math.max(0, targetAmount - totalPaidAmount);

        return {
            labels: ['Paid Amount', 'Unpaid Amount', 'Target Remaining'],
            datasets: [{
                label: 'Amount (₱)',
                data: [totalPaidAmount, unpaidAmount, targetRemaining],
                backgroundColor: ['#4CAF50', '#FF9800', '#2196F3'],
                borderColor: ['#388E3C', '#F57C00', '#1976D2'],
                borderWidth: 2
            }]
        };
    }

    function getChartOptions(title, textColor, borderColor, chartType = 'bar') {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: title,
                    color: textColor,
                    font: {
                        size: 16,
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(33, 37, 41, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: borderColor,
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            
                            if (chartType === 'pie' || chartType === 'doughnut') {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} students (${percentage}%)`;
                            } else {
                                return `${label}: ₱${value.toFixed(2)}`;
                            }
                        }
                    },
                    bodyFont: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 13
                    },
                    titleFont: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };

        // Add scales only for bar charts
        if (chartType === 'bar') {
            baseOptions.scales = {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 11
                        },
                        callback: function(value) {
                            return '₱' + value.toFixed(0);
                        }
                    },
                    grid: {
                        color: borderColor,
                        drawBorder: true,
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'Amount (₱)',
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 11
                        }
                    },
                    grid: {
                        color: borderColor,
                        drawBorder: true,
                        lineWidth: 1
                    }
                }
            };
        }

        return baseOptions;
    }

    function showSectionCharts() {
        const modal = document.getElementById('sectionChartsModal');
        if (modal) {
            modal.style.display = 'block';
            // Add a small delay to ensure modal is visible before rendering charts
            setTimeout(() => {
                renderSectionCharts();
            }, 100);
        }
    }

    function hideSectionChartsModal() {
        const modal = document.getElementById('sectionChartsModal');
        if (modal) {
            modal.style.display = 'none';
            // Destroy any section charts to prevent memory leaks
            const chartContainers = document.querySelectorAll('[id^="sectionChart-"]');
            chartContainers.forEach(container => {
                const chart = Chart.getChart(container);
                if (chart) {
                    chart.destroy();
                }
            });
        }
    }

    function renderSectionCharts() {
        const container = document.getElementById('sectionChartsContainer');
        if (!container || !appData.activeCategory) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();
        
        if (sortedSections.length === 0) {
            container.innerHTML = '<p class="no-data-message">No sections available to display.</p>';
            return;
        }
        
        // Get current theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = computedStyle.getPropertyValue('--text-color')?.trim() || '#333333';
        
        sortedSections.forEach((section, index) => {
            const sectionStudents = groupedStudents[section];
            let paidCount = 0;
            let unpaidCount = 0;

            // Count paid/unpaid for active category
            sectionStudents.forEach(student => {
                const categoryData = student.categories && student.categories[appData.activeCategory];
                if (categoryData && categoryData.isPaid) {
                    paidCount++;
                } else {
                    unpaidCount++;
                }
            });
            
            const chartItem = document.createElement('div');
            chartItem.className = 'section-chart-item';
            const canvasId = `sectionChart-${section.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
            
            chartItem.innerHTML = `
                <h4 class="section-chart-title">${section} (${sectionStudents.length} students)</h4>
                <div class="chart-wrapper">
                    <canvas id="${canvasId}"></canvas>
                </div>
                <div class="section-stats">
                    <span class="stat-item paid">Paid: ${paidCount}</span>
                    <span class="stat-item unpaid">Unpaid: ${unpaidCount}</span>
                </div>
            `;
            container.appendChild(chartItem);
            
            // Add a small delay before creating the chart
            setTimeout(() => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                try {
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: paidCount > 0 && unpaidCount > 0 ? ['Paid', 'Unpaid'] : 
                                paidCount > 0 ? ['Paid'] : 
                                unpaidCount > 0 ? ['Unpaid'] : ['No Data'],
                            datasets: [{
                                data: paidCount > 0 && unpaidCount > 0 ? [paidCount, unpaidCount] :
                                    paidCount > 0 ? [paidCount] :
                                    unpaidCount > 0 ? [unpaidCount] : [1],
                                backgroundColor: paidCount > 0 && unpaidCount > 0 ? ['#4CAF50', '#FF9800'] :
                                            paidCount > 0 ? ['#4CAF50'] :
                                            unpaidCount > 0 ? ['#FF9800'] : ['#cccccc'],
                                borderColor: paidCount > 0 && unpaidCount > 0 ? ['#388E3C', '#F57C00'] :
                                            paidCount > 0 ? ['#388E3C'] :
                                            unpaidCount > 0 ? ['#F57C00'] : ['#999999'],
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false, // Changed to false for better control
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: textColor,
                                        font: {
                                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                            size: 11
                                        },
                                        padding: 10,
                                        usePointStyle: true
                                    }
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(33, 37, 41, 0.9)',
                                    titleColor: '#ffffff',
                                    bodyColor: '#ffffff',
                                    borderColor: '#666666',
                                    borderWidth: 1,
                                    cornerRadius: 6,
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || '';
                                            const value = context.raw || 0;
                                            const total = sectionStudents.length;
                                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                            return `${label}: ${value} students (${percentage}%)`;
                                        }
                                    },
                                    bodyFont: {
                                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                        size: 12
                                    }
                                }
                            },
                            cutout: '65%', // Make the doughnut hole larger
                            animation: {
                                duration: 500,
                                easing: 'easeInOutQuart'
                            }
                        }
                    });
                } catch (error) {
                    console.error(`Error creating chart for section ${section}:`, error);
                    chartItem.innerHTML = `
                        <h4 class="section-chart-title">${section}</h4>
                        <p class="chart-error">Error loading chart for this section.</p>
                    `;
                }
            }, 50 * index); // Stagger chart creation
        });
    }
// ---- Utility Functions ----

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


    // --- Start the application ---
    initialize();

}); // End DOMContentLoaded