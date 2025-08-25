document.addEventListener('DOMContentLoaded', () => {
    // Global state with improved structure
    let currentUser = null;
    let appData = {
        students: [],
        categories: [],
        activeCategory: null,
        currentUser: null
    };
    
    // Cache for DOM elements and previous states
    let domCache = {};
    let previousState = {
        students: [],
        categories: [],
        activeCategory: null,
        pieData: null,
        barData: null
    };
    let summaryPieChart = null;
    let summaryBarChart = null;
    let sectionCharts = new Map(); 
    let chartDataCache = {
        pie: null,
        bar: null,
        sections: new Map()
    };
    let updateDebounceTimer = null;


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
    const sectionSummaryDefaultRow = sectionSummaryBody.querySelector('tr');

    // ---- Initialization & Setup ----
    function initialize() {
        setupEventListeners();
        loadThemePreference();
        cacheDOMElements();
        setupEfficientEventHandling();

        // Check if there's a logged-in user in sessionStorage
        currentUser = sessionStorage.getItem('currentUser');

        if (currentUser) {
            loadUserData();
            // Immediately render UI after loading data
            setTimeout(() => {
                renderActiveCategorySelect();
                updateCurrentCategoryDisplay();
                updateDisplay();
                populateSectionFilter();
            }, 100);
        } else {
            openingScreen.style.display = 'flex';
            openingScreen.style.opacity = '1';
        }
    }
    function cacheDOMElements() {
        // Cache frequently accessed DOM elements
        domCache = {
            activeCategorySelect: document.getElementById('activeCategorySelect'),
            currentCategoryDisplay: document.getElementById('currentCategoryDisplay'),
            currentCategoryName: document.getElementById('currentCategoryName'),
            currentCategoryDescription: document.getElementById('currentCategoryDescription'),
            categoriesContainer: document.getElementById('categoriesContainer'),
            searchInput: document.getElementById('searchInput'),
            searchPaid: document.getElementById('searchPaid'),
            searchUnpaid: document.getElementById('searchUnpaid'),
            searchSection: document.getElementById('searchSection'),
            searchResults: document.getElementById('searchResults'),
            targetProgress: document.getElementById('targetProgress'),
            targetAchieved: document.getElementById('targetAchieved'),
            bulkAddModal: document.getElementById('bulkAddModal'),
            categoryManagementModal: document.getElementById('categoryManagementModal'),
            sectionChartsModal: document.getElementById('sectionChartsModal')
        };
    }

    function setupEfficientEventHandling() {
        // Use event delegation for section toggling and payment actions
        document.addEventListener('click', (e) => {
            // Handle section header clicks for toggling
            if (e.target.classList.contains('section-header') || 
                e.target.closest('.section-header')) {
                const header = e.target.classList.contains('section-header') ? 
                    e.target : e.target.closest('.section-header');
                toggleSection(header);
            }
            
            // Handle payment toggle buttons with delegation
            if (e.target.closest('[data-action="togglePayment"]')) {
                const button = e.target.closest('[data-action="togglePayment"]');
                const studentId = button.dataset.studentId;
                
                const index = appData.students.findIndex(s => s.id === studentId);
                if (index !== -1) {
                    togglePaymentStatus(index);
                }
            }
            
            // Handle edit buttons with delegation - FIXED
            if (e.target.closest('[data-action="editStudent"]')) {
                const button = e.target.closest('[data-action="editStudent"]');
                const studentId = button.dataset.studentId;
                
                const index = appData.students.findIndex(s => s.id === studentId);
                if (index !== -1) {
                    showEditForm(index);
                }
            }
            
            // Handle delete buttons with delegation
            if (e.target.closest('[data-action="deleteStudent"]')) {
                const button = e.target.closest('[data-action="deleteStudent"]');
                const studentId = button.dataset.studentId;
                
                const index = appData.students.findIndex(s => s.id === studentId);
                if (index !== -1) {
                    deleteStudent(index);
                }
            }
        });
}

    function loadUserData() {
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

                    appData.students.forEach(student => {
                        if (!student.categories) student.categories = {};
                        if (!student.categories['default']) {
                            student.categories['default'] = {
                                amount: 0,
                                isPaid: false,
                                paymentDate: null,
                                transactions: []
                            };
                        }
                    });
                }

                // Ensure activeCategory is valid
                if (!appData.activeCategory || !appData.categories.some(c => c.id === appData.activeCategory)) {
                    appData.activeCategory = appData.categories[0]?.id || null;
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
        }
        
        // Now render the UI - IMPORTANT: Render category select first!
        renderActiveCategorySelect();
        updateCurrentCategoryDisplay();
        updateDisplay();
        populateSectionFilter();
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

    let saveDebounceTimer = null;

    function saveData() {
        // Clear existing timer
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
        }
        
        // Debounce saves to prevent excessive localStorage writes
        saveDebounceTimer = setTimeout(() => {
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
            saveDebounceTimer = null;
        }, 300); // 300ms debounce
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
            
            // Add this category to all students
            appData.students.forEach(student => {
                if (!student.categories) student.categories = {};
                student.categories[categoryId] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            });
            
            if (appData.categories.length === 1) {
                appData.activeCategory = categoryId;
            }
            
            saveData();
            renderCategories();
            renderActiveCategorySelect();
            updateCurrentCategoryDisplay();
            updateDisplay();
            document.getElementById('categoryForm').reset();
            
            // Close the modal explicitly
            hideCategoryManagement();
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
                
                // Store the category data before deletion (in case we need to migrate to default)
                const categoryToDelete = appData.categories.find(c => c.id === categoryId);
                const wasLastCategory = appData.categories.length === 1;
                
                // Remove category from categories list
                appData.categories = appData.categories.filter(c => c.id !== categoryId);
                
                // If this was the last category, create a default category and migrate data
                if (wasLastCategory && appData.students.length > 0) {
                    const defaultCategory = {
                        id: 'default',
                        name: 'Default Payments',
                        description: 'Created after category deletion',
                        targetAmount: categoryToDelete ? categoryToDelete.targetAmount : 0
                    };
                    
                    appData.categories.push(defaultCategory);
                    appData.activeCategory = 'default';
                    
                    // Migrate existing student data to the new default category
                    appData.students.forEach(student => {
                        // Get the data from the deleted category
                        const deletedCategoryData = student.categories && student.categories[categoryId] ? 
                            student.categories[categoryId] : {
                                amount: 0,
                                isPaid: false,
                                paymentDate: null,
                                transactions: []
                            };
                        
                        // Clear all categories
                        student.categories = {};
                        
                        // Set the default category with the migrated data
                        student.categories['default'] = {
                            amount: deletedCategoryData.amount,
                            isPaid: deletedCategoryData.isPaid,
                            paymentDate: deletedCategoryData.paymentDate,
                            transactions: deletedCategoryData.transactions || []
                        };
                    });
                    
                    console.log(`Migrated ${appData.students.length} students to default category`);
                } else {
                    // Remove category from all students (standard deletion)
                    appData.students.forEach(student => {
                        if (student.categories && student.categories[categoryId]) {
                            delete student.categories[categoryId];
                        }
                    });

                    // Reset active category if it was deleted
                    if (appData.activeCategory === categoryId) {
                        appData.activeCategory = appData.categories.length > 0 ? appData.categories[0].id : null;
                    }
                }
                
                saveData();
                renderCategories();
                renderActiveCategorySelect();
                updateCurrentCategoryDisplay();
                updateDisplay();
                
                // Show appropriate feedback
                if (wasLastCategory && appData.students.length > 0) {
                    showFeedback(`Category deleted and ${appData.students.length} students migrated to default category.`);
                } else {
                    showFeedback('Category deleted successfully.');
                }
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

            switchTab: function(tabName) {
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Deactivate all tabs
                document.querySelectorAll('.modal-tabs .tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // Activate selected tab
                if (tabName === 'single') {
                    document.getElementById('studentForm').classList.add('active');
                    document.querySelector('.modal-tabs .tab:first-child').classList.add('active');
                } else if (tabName === 'bulk') {
                    document.getElementById('bulkAddForm').classList.add('active');
                    document.querySelector('.modal-tabs .tab:last-child').classList.add('active');
                }
                
                // Reset forms when switching tabs
                document.getElementById('studentForm').reset();
                document.getElementById('bulkAddForm').reset();
            },

            // Search functions
            searchStudents: function() {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                const showPaid = document.getElementById('searchPaid').checked;
                const showUnpaid = document.getElementById('searchUnpaid').checked;
                const sectionFilter = document.getElementById('searchSection').value;
                
                // If no search term and no section filter, show all students that match status filters
                if (!searchTerm && !sectionFilter && showPaid && showUnpaid) {
                    alert("Please enter a search term or select a section to filter");
                    return;
                }

                let results = appData.students.filter(student => {
                    // Check if student matches search term
                    const nameMatch = searchTerm ? 
                        (student.firstName.toLowerCase().includes(searchTerm) || 
                        student.lastName.toLowerCase().includes(searchTerm) ||
                        student.section.toLowerCase().includes(searchTerm)) : true;
                    
                    // Check if student matches section filter
                    const sectionMatch = sectionFilter ? 
                        student.section === sectionFilter : true;
                    
                    // Check payment status if active category exists
                    let statusMatch = true;
                    if (appData.activeCategory) {
                        const categoryData = student.categories[appData.activeCategory];
                        if (categoryData) {
                            if (categoryData.isPaid && !showPaid) statusMatch = false;
                            if (!categoryData.isPaid && !showUnpaid) statusMatch = false;
                        }
                    }
                    
                    return nameMatch && sectionMatch && statusMatch;
                });
                
                if (results.length === 0) {
                    showFeedback("No students found matching your criteria");
                }
                
                displaySearchResults(results);
            },
            clearSearch: function() {
                document.getElementById('searchInput').value = '';
                document.getElementById('searchPaid').checked = true;
                document.getElementById('searchUnpaid').checked = true;
                document.getElementById('searchSection').value = '';
                document.getElementById('searchResults').innerHTML = '';
                document.getElementById('searchResults').classList.remove('show-results');
            },
            
            // Charts
            showSectionCharts, hideSectionChartsModal
        };

        // Assign all window functions at once
        Object.assign(window, windowFunctions);
    }

    // --- Theme Handling ---
    function loadThemePreference() {
        // For login screen, always use light theme
        if (!sessionStorage.getItem('currentUser')) {
            setTheme('light');
            return;
        }
        
        // For logged-in users, use their preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }

    function handleThemeToggle() {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        setTheme(newTheme);
        refreshCharts();
    }

    function setTheme(theme) {
        // Set the theme attribute on document element
        document.documentElement.setAttribute('data-theme', theme);
        // Save theme preference to localStorage
        localStorage.setItem('theme', theme);
        // Update theme toggle checkbox state
        themeToggle.checked = theme === 'dark';
        // Update theme label text and icon
        themeLabel.innerHTML = `<i class="fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}"></i> ${theme === 'dark' ? 'Dark' : 'Light'} Mode`;
        // Apply theme-specific styles to form elements if user is logged in
        if (sessionStorage.getItem('currentUser')) {
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.style.color = theme === 'dark' ? '#e0e0e0' : '#333333';
                input.style.backgroundColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
                
                // Handle placeholders
                if (theme === 'dark') {
                    input.setAttribute('data-placeholder', input.getAttribute('placeholder') || '');
                    input.setAttribute('placeholder', '');
                } else {
                    const originalPlaceholder = input.getAttribute('data-placeholder');
                    if (originalPlaceholder) {
                        input.setAttribute('placeholder', originalPlaceholder);
                    }
                }
            });
            
            // Special handling for edit form which might be visible
            const editForm = document.getElementById('editForm');
            if (editForm && editForm.style.display !== 'none') {
                // Ensure edit form uses proper theme colors
                editForm.style.backgroundColor = theme === 'dark' ? 
                    getComputedStyle(document.documentElement).getPropertyValue('--container-bg-dark') : 
                    getComputedStyle(document.documentElement).getPropertyValue('--container-bg-light');
                
                editForm.style.color = theme === 'dark' ? 
                    getComputedStyle(document.documentElement).getPropertyValue('--text-color-dark') : 
                    getComputedStyle(document.documentElement).getPropertyValue('--text-color-light');
            }
        } 
        // Force chart recreation when theme changes
        if (appData.students.length > 0 && appData.activeCategory) {
            // Clear cache and recreate charts
            chartDataCache.pie = null;
            chartDataCache.bar = null;
            createSummaryCharts();
        }
        // Dispatch a custom event for any other components that need to respond to theme changes
        const themeChangeEvent = new CustomEvent('themeChanged', { detail: { theme } });
        document.dispatchEvent(themeChangeEvent);
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
            loadUserData();
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
            // Reset to light theme
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            
            // Force light styles on inputs immediately
            const inputs = document.querySelectorAll('#loginForm input, #signupForm input');
            inputs.forEach(input => {
                input.style.color = '#333333';
                input.style.backgroundColor = '#ffffff';
            });
            
            // Clear user data
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            appData = { students: [], categories: [], activeCategory: null, currentUser: null };
            
            // Show login screen
            openingScreen.style.display = 'flex';
            openingScreen.style.opacity = '1';
        }
    }

    function startApp() {
        openingScreen.style.opacity = '0';
        setTimeout(() => {
            openingScreen.style.display = 'none';
            
            // Load user data properly after login
            loadUserData();
            
            // Force immediate UI updates with proper sequencing
            setTimeout(() => {
                renderActiveCategorySelect();
                updateCurrentCategoryDisplay();
                updateDisplay();
                populateSectionFilter();
                
                // Force chart creation if there's data
                if (appData.students.length > 0 && appData.activeCategory) {
                    createSummaryCharts();
                }
            }, 50);
        }, 500);
    }

    //---- Student Data Management ----
    function handleAddStudent(e) {
        e.preventDefault();
        if (!appData.activeCategory || appData.categories.length === 0) {
            alert("No category selected. Redirecting you to create one.");
            hideAddStudentModal();
            showCategoryManagement();
            return;
        }
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
        saveData();
        
        // Optimized update - only refresh what changed
        if (appData.students.length === 1) {
            // First student added, need full update
            updateDisplay();
        } else {
            // Just update the student list and summary
            updateStudentList();
            updateSummary();
            updateSectionSummary();
        }
        
        hideAddStudentModal();
        showFeedback(`Student ${student.firstName} ${student.lastName} added successfully!`);
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
        
        // Optimized update
        if (appData.students.length === newStudents.length) {
            // All students are new, need full update
            updateDisplay();
        } else {
            // Just update the student list and summary
            updateStudentList();
            updateSummary();
            updateSectionSummary();
        }
        
        hideAddStudentModal(); // Hide the modal after successful bulk add
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
        const updatedStudent = {
            ...appData.students[index],
            firstName: editedFirstName,
            lastName: editedLastName,
            section: editedSection,
            middleInitial: document.getElementById('editMiddleInitial').value.trim().toUpperCase()
        };

        // Update category-specific data if active category exists
        if (appData.activeCategory) {
            if (!updatedStudent.categories) updatedStudent.categories = {};
            
            if (!updatedStudent.categories[appData.activeCategory]) {
                updatedStudent.categories[appData.activeCategory] = {
                    amount: 0,
                    isPaid: false,
                    paymentDate: null,
                    transactions: []
                };
            }

            // Update category data
            updatedStudent.categories[appData.activeCategory].amount = amount;
            updatedStudent.categories[appData.activeCategory].isPaid = isPaid;
            updatedStudent.categories[appData.activeCategory].paymentDate = paymentDate;

            // Add transaction if marked as paid and no transactions exist
            if (isPaid && updatedStudent.categories[appData.activeCategory].transactions.length === 0) {
                updatedStudent.categories[appData.activeCategory].transactions.push({
                    id: `t${Date.now()}`,
                    amount: amount,
                    date: paymentDate,
                    notes: "Payment recorded"
                });
            }
        }

        // Update the specific student
        appData.students[index] = updatedStudent;
        saveData();
        
        // IMMEDIATE UI UPDATE - Find and update the specific row
        const studentRow = findStudentRow(updatedStudent.id);
        if (studentRow) {
            const categoryData = appData.activeCategory ? updatedStudent.categories[appData.activeCategory] : null;
            
            // Update the row immediately
            studentRow.innerHTML = `
                <td>${updatedStudent.lastName}, ${updatedStudent.firstName} ${updatedStudent.middleInitial || ''}</td>
                <td>${categoryData ? categoryData.amount.toFixed(2) : '0.00'}</td>
                <td class="status-${categoryData && categoryData.isPaid ? 'paid' : 'unpaid'}">
                    <i class="fas ${categoryData && categoryData.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${categoryData && categoryData.isPaid ? 'Paid' : 'Unpaid'}
                </td>
                <td>${categoryData && categoryData.paymentDate ? categoryData.paymentDate : 'N/A'}</td>
                <td>
                    <button data-action="togglePayment" data-student-id="${updatedStudent.id}" class="btn btn-secondary btn-sm" title="${categoryData && categoryData.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                        <i class="fas ${categoryData && categoryData.isPaid ? 'fa-times' : 'fa-check'}"></i>
                    </button>
                    <button data-action="editStudent" data-student-id="${updatedStudent.id}" class="btn btn-primary btn-sm" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="deleteStudent" data-student-id="${updatedStudent.id}" class="btn btn-danger btn-sm" title="Delete Student">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            // Preserve the student ID data attribute
            studentRow.dataset.studentId = updatedStudent.id;
        }
        
        // Update summary and section summary immediately
        updateSummary();
        updateSectionSummary();
        
        hideEditForm();
        showFeedback(`Student ${updatedStudent.firstName} ${updatedStudent.lastName} updated successfully!`);
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
            console.error("Attempted to toggle payment for invalid index or no active category");
            return;
        }
        
        const student = appData.students[index];
        const categoryData = student.categories[appData.activeCategory];
        
        if (!categoryData) {
            console.error("No category data found for active category");
            return;
        }
        
        const wasPaid = categoryData.isPaid;
        
        // Update the payment status
        categoryData.isPaid = !wasPaid;
        
        // Update payment date
        if (!wasPaid) {
            // Marking as paid
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
        } else {
            // Marking as unpaid
            categoryData.paymentDate = null;
        }
        
        saveData();
        
        // IMMEDIATE UI UPDATE - Find and update the specific row
        updateStudentPaymentUI(index, !wasPaid);
        
        // Update summary and charts
        updateSummary();
        updateSectionSummary();
        debouncedUpdateCharts();
        
        showFeedback(`${student.firstName} ${student.lastName} marked as ${!wasPaid ? 'Paid' : 'Unpaid'}.`);
    }

    function updateStudentPaymentUI(index, isPaid) {
        const student = appData.students[index];
        const row = findStudentRow(student.id);
        
        if (!row) return;
        
        // Update the status cell
        const statusCell = row.querySelector('td:nth-child(3)');
        if (statusCell) {
            statusCell.className = `status-${isPaid ? 'paid' : 'unpaid'}`;
            statusCell.innerHTML = `
                <i class="fas ${isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                ${isPaid ? 'Paid' : 'Unpaid'}
            `;
        }
        
        // Update the payment date cell if it exists
        const dateCell = row.querySelector('td:nth-child(4)');
        if (dateCell) {
            dateCell.textContent = isPaid ? 
                new Date().toISOString().split('T')[0] : 
                'N/A';
        }
        
        // Update the toggle button
        const toggleButton = row.querySelector('[data-action="togglePayment"]');
        if (toggleButton) {
            toggleButton.innerHTML = `<i class="fas ${isPaid ? 'fa-times' : 'fa-check'}"></i>`;
            toggleButton.title = isPaid ? 'Mark as Unpaid' : 'Mark as Paid';
        }
    }

    function deleteStudent(index) {
        if (index < 0 || index >= appData.students.length) {
            console.error("Attempted to delete invalid index:", index);
            return;
        }
        
        if (!confirm("Are you sure you want to delete this student?")) return;
        
        // Remove the student
        const deletedStudent = appData.students.splice(index, 1)[0];
        saveData();
        
        // Optimized update
        if (appData.students.length === 0) {
            // No students left, need full update
            updateDisplay();
        } else {
            // Update UI without full re-render
            updateStudentList();
            updateSummary();
            updateSectionSummary();
        }
        
        showFeedback(`Student ${deletedStudent.firstName} ${deletedStudent.lastName} deleted.`);
    }
    // ---- UI Updates ----
    function updateDisplay() {
        if (!currentUser) return;
        
        // Show warning if no categories exist
        if (appData.categories.length === 0) {
            const noStudentsMsg = document.getElementById('noStudentsMessage');
            if (noStudentsMsg) {
                noStudentsMsg.innerHTML = '<p>Please create at least one payment category before adding students. <button onclick="showCategoryManagement()" class="btn btn-primary">Manage Categories</button></p>';
                noStudentsMsg.style.display = 'block';
            }
            renderActiveCategorySelect();
            populateSectionFilter();
            return;
        }

        // Always render the category select first
        renderActiveCategorySelect();
        updateCurrentCategoryDisplay();
        
        // Force complete UI refresh when category changes
        updateStudentList();
        updateSummary();
        updateSectionSummary();
        
        // Only create charts if we have students and an active category
        if (appData.students.length > 0 && appData.activeCategory) {
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
            const groupedStudents = groupStudentsBySection();
            sectionSummaryDefaultRow.style.display = Object.keys(groupedStudents).length === 0 ? 'table-row' : 'none';
        }
    }

    function updateSummary() {
        if (!appData.activeCategory) {
            totalAmountSpan.textContent = '0.00';
            totalStudentsSpan.textContent = '0';
            totalPaidSpan.textContent = '0';
            totalUnpaidSpan.textContent = '0';
            
            // Reset target progress
            const progressText = document.getElementById('targetProgress');
            const achievedElement = document.getElementById('targetAchieved');
            
            if (progressText) {
                progressText.textContent = '₱0.00 / ₱0.00 (0%)';
            }
            if (achievedElement) {
                achievedElement.style.display = 'none';
            }
            return;
        }

        const activeCategory = appData.categories.find(c => c.id === appData.activeCategory);
        const targetAmount = activeCategory ? activeCategory.targetAmount : 0;

        let totalAmount = 0;
        let totalPaidCount = 0;
        
        // FIX: Calculate based on active category only
        appData.students.forEach(student => {
            const categoryData = student.categories && student.categories[appData.activeCategory];
            if (categoryData) {
                totalAmount += categoryData.amount || 0;
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
        const progressText = document.getElementById('targetProgress');
        const achievedElement = document.getElementById('targetAchieved');
        
        if (progressText) {
            if (targetAmount > 0) {
                const percentage = Math.min(100, (totalAmount / targetAmount) * 100);
                progressText.textContent = `₱${totalAmount.toFixed(2)} / ₱${targetAmount.toFixed(2)} (${percentage.toFixed(1)}%)`;
                
                // Add color coding based on progress
                if (percentage >= 100) {
                    progressText.style.color = 'var(--success-color)';
                    if (achievedElement) {
                        achievedElement.style.display = 'inline';
                    }
                } else if (percentage >= 75) {
                    progressText.style.color = 'var(--warning-color)';
                    if (achievedElement) achievedElement.style.display = 'none';
                } else {
                    progressText.style.color = 'var(--danger-color)';
                    if (achievedElement) achievedElement.style.display = 'none';
                }
            } else {
                progressText.textContent = 'No target set';
                progressText.style.color = ''; // Reset to default
                if (achievedElement) achievedElement.style.display = 'none';
            }
        }
    }

    document.getElementById('activeCategorySelect')?.addEventListener('change', (e) => {
        appData.activeCategory = e.target.value || null;
        saveData();
        updateCurrentCategoryDisplay();
        // Force complete UI refresh when category changes
        updateDisplay();
    });

    function hasDataChanged() {
        // Check if students changed
        if (appData.students.length !== previousState.students.length) {
            return true;
        }
        
        // Check if categories changed
        if (appData.categories.length !== previousState.categories.length) {
            return true;
        }
        
        // Check if active category changed
        if (appData.activeCategory !== previousState.activeCategory) {
            return true;
        }
        
        // Deep check for student changes
        for (let i = 0; i < appData.students.length; i++) {
            const currentStudent = appData.students[i];
            const previousStudent = previousState.students[i];
            
            if (!previousStudent || 
                currentStudent.id !== previousStudent.id ||
                currentStudent.firstName !== previousStudent.firstName ||
                currentStudent.lastName !== previousStudent.lastName ||
                currentStudent.section !== previousStudent.section) {
                return true;
            }
            
            // Check category data changes
            if (appData.activeCategory) {
                const currentCategoryData = currentStudent.categories[appData.activeCategory];
                const previousCategoryData = previousStudent.categories[appData.activeCategory];
                
                if (!currentCategoryData && previousCategoryData) return true;
                if (currentCategoryData && !previousCategoryData) return true;
                if (currentCategoryData && previousCategoryData) {
                    if (currentCategoryData.amount !== previousCategoryData.amount ||
                        currentCategoryData.isPaid !== previousCategoryData.isPaid ||
                        currentCategoryData.paymentDate !== previousCategoryData.paymentDate) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    function updateStudentInUI(index) {
        // Update a single student in the UI without re-rendering everything
        const student = appData.students[index];
        const studentRow = findStudentRow(student.id);
        
        if (studentRow) {
            // Update the existing row
            updateStudentRow(studentRow, student, index);
        } else {
            // Student not found in UI, need to update the section
            updateStudentList();
        }
    }

    function findStudentRow(studentId) {
        // Find the table row for a specific student
        const rows = document.querySelectorAll('#sectionLists tr[data-student-id]');
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].dataset.studentId === studentId) {
                return rows[i];
            }
        }
        return null;
    }

    function updateStudentRow(row, student, index) {
        // Update a single student row
        const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
        
        // Update the row content
        row.innerHTML = `
            <td>${student.lastName}, ${student.firstName} ${student.middleInitial || ''}</td>
            <td>${categoryData ? categoryData.amount.toFixed(2) : '0.00'}</td>
            <td class="status-${categoryData && categoryData.isPaid ? 'paid' : 'unpaid'}">
                <i class="fas ${categoryData && categoryData.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                ${categoryData && categoryData.isPaid ? 'Paid' : 'Unpaid'}
            </td>
            <td>${categoryData && categoryData.paymentDate ? categoryData.paymentDate : 'N/A'}</td>
            <td>
                <button onclick="togglePaymentStatus(${index})" class="btn btn-secondary btn-sm" title="${categoryData && categoryData.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                    <i class="fas ${categoryData && categoryData.isPaid ? 'fa-times' : 'fa-check'}"></i>
                </button>
                <button onclick="showEditForm(${index})" class="btn btn-primary btn-sm" title="Edit Student">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteStudent(${index})" class="btn btn-danger btn-sm" title="Delete Student">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        // Preserve the student ID data attribute
        row.dataset.studentId = student.id;
    }

    function updateStudentList() {
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();

        if (sortedSections.length === 0) {
            sectionLists.innerHTML = '';
            return;
        }

        // Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        
        // Pre-build all HTML in memory first
        const sectionsHTML = sortedSections.map(section => {
            const sectionStudents = groupedStudents[section];
            sectionStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            const studentsHTML = sectionStudents.map(student => {
                const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
                
                return `
                <tr data-student-id="${student.id}">
                    <td>${student.lastName}, ${student.firstName} ${student.middleInitial || ''}</td>
                    <td>${categoryData ? categoryData.amount.toFixed(2) : '0.00'}</td>
                    <td class="status-${categoryData && categoryData.isPaid ? 'paid' : 'unpaid'}">
                        <i class="fas ${categoryData && categoryData.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                        ${categoryData && categoryData.isPaid ? 'Paid' : 'Unpaid'}
                    </td>
                    <td>${categoryData && categoryData.paymentDate ? categoryData.paymentDate : 'N/A'}</td>
                    <td>
                        <button data-action="togglePayment" data-student-id="${student.id}" class="btn btn-secondary btn-sm" title="${categoryData && categoryData.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                            <i class="fas ${categoryData && categoryData.isPaid ? 'fa-times' : 'fa-check'}"></i>
                        </button>
                        <button data-action="editStudent" data-student-id="${student.id}" class="btn btn-primary btn-sm" title="Edit Student">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button data-action="deleteStudent" data-student-id="${student.id}" class="btn btn-danger btn-sm" title="Delete Student">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');

            return `
            <div class="card section-card">
                <h3 class="section-header" onclick="toggleSection(this)">
                    <i class="fas fa-users-rectangle"></i> Section: ${section}
                </h3>
                <div class="section-content collapsed">
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
                            <tbody>${studentsHTML}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Single DOM update
        sectionLists.innerHTML = sectionsHTML;
    }

    function groupStudentsBySection() {
        const grouped = {};
        
        appData.students.forEach(student => {
            if (!grouped[student.section]) {
                grouped[student.section] = [];
            }
            grouped[student.section].push(student);
        });
        
        return grouped;
    }

    function updateSummary() {
        if (!appData.activeCategory) {
            // Use object for batch updates
            const summaryUpdates = {
                totalAmount: '0.00',
                totalStudents: '0',
                totalPaid: '0',
                totalUnpaid: '0',
                targetProgress: '₱0.00 / ₱0.00 (0%)',
                targetAchieved: false
            };
            
            updateSummaryUI(summaryUpdates);
            return;
        }

        const activeCategory = appData.categories.find(c => c.id === appData.activeCategory);
        const targetAmount = activeCategory ? activeCategory.targetAmount : 0;

        // Single pass calculation
        const summary = appData.students.reduce((acc, student) => {
            const categoryData = student.categories[appData.activeCategory];
            if (categoryData) {
                acc.totalAmount += categoryData.amount || 0;
                if (categoryData.isPaid) {
                    acc.totalPaidCount++;
                }
            }
            return acc;
        }, { totalAmount: 0, totalPaidCount: 0 });

        const totalUnpaidCount = appData.students.length - summary.totalPaidCount;
        const percentage = targetAmount > 0 ? Math.min(100, (summary.totalAmount / targetAmount) * 100) : 0;

        const summaryUpdates = {
            totalAmount: summary.totalAmount.toFixed(2),
            totalStudents: appData.students.length.toString(),
            totalPaid: summary.totalPaidCount.toString(),
            totalUnpaid: totalUnpaidCount.toString(),
            targetProgress: targetAmount > 0 ? 
                `₱${summary.totalAmount.toFixed(2)} / ₱${targetAmount.toFixed(2)} (${percentage.toFixed(1)}%)` : 
                'No target set',
            targetAchieved: percentage >= 100
        };

        updateSummaryUI(summaryUpdates);
    }

    // Helper function for batch UI updates
    function updateSummaryUI(updates) {
        totalAmountSpan.textContent = updates.totalAmount;
        totalStudentsSpan.textContent = updates.totalStudents;
        totalPaidSpan.textContent = updates.totalPaid;
        totalUnpaidSpan.textContent = updates.totalUnpaid;

        const progressText = document.getElementById('targetProgress');
        const achievedElement = document.getElementById('targetAchieved');
        
        if (progressText) {
            progressText.textContent = updates.targetProgress;
            
            // Set color based on achievement
            if (updates.targetAchieved) {
                progressText.style.color = 'var(--success-color)';
            } else if (updates.targetProgress.includes('%') && parseFloat(updates.targetProgress.match(/\(([\d.]+)%\)/)?.[1] || 0) >= 75) {
                progressText.style.color = 'var(--warning-color)';
            } else {
                progressText.style.color = 'var(--danger-color)';
            }
        }
        
        if (achievedElement) {
            achievedElement.style.display = updates.targetAchieved ? 'inline' : 'none';
        }
    }

    function updateSectionSummary() {
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();
        
        if (sortedSections.length === 0) {
            if (sectionSummaryDefaultRow) {
                sectionSummaryDefaultRow.style.display = 'table-row';
            }
            sectionSummaryBody.innerHTML = '';
            return;
        }
        
        if (sectionSummaryDefaultRow) {
            sectionSummaryDefaultRow.style.display = 'none';
        }
        
        // Build HTML string instead of creating elements
        const rowsHTML = sortedSections.map(section => {
            const sectionStudents = groupedStudents[section];
            
            // Single pass calculation per section
            const sectionSummary = sectionStudents.reduce((acc, student) => {
                const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
                if (categoryData) {
                    acc.sectionTotal += categoryData.amount || 0;
                    if (categoryData.isPaid) {
                        acc.sectionPaid++;
                        if (categoryData.paymentDate && 
                            (!acc.latestPaymentDate || new Date(categoryData.paymentDate) > new Date(acc.latestPaymentDate))) {
                            acc.latestPaymentDate = categoryData.paymentDate;
                        }
                    } else {
                        acc.sectionUnpaid++;
                    }
                }
                return acc;
            }, { sectionTotal: 0, sectionPaid: 0, sectionUnpaid: 0, latestPaymentDate: null });
            
            return `
            <tr>
                <td>${section}</td>
                <td>${sectionStudents.length}</td>
                <td>₱${sectionSummary.sectionTotal.toFixed(2)}</td>
                <td>${sectionSummary.sectionPaid}</td>
                <td>${sectionSummary.sectionUnpaid}</td>
                <td>${sectionSummary.latestPaymentDate ? formatDate(sectionSummary.latestPaymentDate) : 'N/A'}</td>
            </tr>`;
        }).join('');
        
        // Single DOM update
        sectionSummaryBody.innerHTML = rowsHTML;
    }

    //helper function to format dates
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (e) {
            return dateString;
        }
    }

    function updateNoStudentsMessage() {
        if (!noStudentsMessage) return;
        
        if (appData.students.length === 0) {
            noStudentsMessage.innerHTML = '<p>No students added yet. Click "Add Student" to get started!</p>';
            noStudentsMessage.style.display = 'block';
        } else {
            noStudentsMessage.style.display = 'none';
        }
    }

    function updateSectionSummaryDefaultRow() {
        if (sectionSummaryDefaultRow) {
            const groupedStudents = groupStudentsBySection();
            sectionSummaryDefaultRow.style.display = Object.keys(groupedStudents).length === 0 ? 'table-row' : 'none';
        }
    }

    function debouncedUpdateCharts() {
        // Debounce chart updates to prevent rapid re-renders
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
        }
        
        updateDebounceTimer = setTimeout(() => {
            if (appData.students.length > 0 && appData.activeCategory) {
                createSummaryCharts();
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
            updateDebounceTimer = null;
        }, 100);
    }

    function createSummaryCharts() {
        // Only recreate charts if data has significantly changed
        const currentPieData = JSON.stringify(getPieChartData());
        const currentBarData = JSON.stringify(getBarChartData());
        
        if (previousState.pieData === currentPieData && previousState.barData === currentBarData) {
            return; // No need to update charts
        }
        
        // Update previous chart data state
        previousState.pieData = currentPieData;
        previousState.barData = currentBarData;
        
        // Get canvas contexts
        const pieCtx = document.getElementById('summaryPieChart').getContext('2d');
        const barCtx = document.getElementById('summaryBarChart').getContext('2d');
        
        // Destroy existing charts if they exist
        if (summaryPieChart) {
            summaryPieChart.destroy();
        }
        if (summaryBarChart) {
            summaryBarChart.destroy();
        }
        
        // Get chart data
        const pieData = getPieChartData();
        const barData = getBarChartData();
        
        // Create new charts
        summaryPieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: pieData.labels,
                datasets: [{
                    data: pieData.values,
                    backgroundColor: ['#4caf50', '#f44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Payment Status Distribution'
                    }
                }
            }
        });
        
        summaryBarChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: barData.labels,
                datasets: [{
                    label: 'Total Amount (₱)',
                    data: barData.values,
                    backgroundColor: '#2196f3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Amount by Section'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
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

        let paidAmount = 0;
        let unpaidAmount = 0;

        // Single pass through students
        appData.students.forEach(student => {
            const categoryData = student.categories && student.categories[appData.activeCategory];
            if (categoryData) {
                if (categoryData.isPaid) {
                    paidAmount += categoryData.amount || 0;
                } else {
                    unpaidAmount += categoryData.amount || 0;
                }
            }
        });

        // Handle edge cases
        if (paidAmount === 0 && unpaidAmount === 0) {
            return {
                labels: ['No Payments'],
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

        if (paidAmount > 0) {
            labels.push('Paid Amount');
            data.push(paidAmount);
            backgroundColor.push('#4CAF50');
            borderColor.push('#388E3C');
        }

        if (unpaidAmount > 0) {
            labels.push('Unpaid Amount');
            data.push(unpaidAmount);
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
        const groupedStudents = groupStudentsBySection();
        const sortedSections = Object.keys(groupedStudents).sort();
        
        const labels = [];
        const values = [];
        
        sortedSections.forEach(section => {
            const sectionStudents = groupedStudents[section];
            let sectionTotal = 0;
            
            sectionStudents.forEach(student => {
                const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
                if (categoryData) {
                    sectionTotal += categoryData.amount || 0;
                }
            });
            
            labels.push(section);
            values.push(sectionTotal);
        });
        
        return { labels, values };
    }

    function refreshCharts() {
        if (summaryPieChart || summaryBarChart) {
            createSummaryCharts();
        }
    }

    function renderActiveCategorySelect() {
        if (!domCache.activeCategorySelect) return;
        
        domCache.activeCategorySelect.innerHTML = '';
        
        if (appData.categories.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No categories available';
            domCache.activeCategorySelect.appendChild(option);
            return;
        }
        
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.selected = category.id === appData.activeCategory;
            domCache.activeCategorySelect.appendChild(option);
        });
    }

    function updateCurrentCategoryDisplay() {
        if (!appData.activeCategory || appData.categories.length === 0) {
            domCache.currentCategoryDisplay.style.display = 'none';
            return;
        }
        
        const category = appData.categories.find(c => c.id === appData.activeCategory);
        if (!category) {
            domCache.currentCategoryDisplay.style.display = 'none';
            return;
        }
        
        domCache.currentCategoryDisplay.style.display = 'block';
        domCache.currentCategoryName.textContent = category.name;
        domCache.currentCategoryDescription.textContent = category.description || 'No description';
    }

    function renderCategories() {
        if (!domCache.categoriesContainer) return;
        
        domCache.categoriesContainer.innerHTML = '';
        
        if (appData.categories.length === 0) {
            domCache.categoriesContainer.innerHTML = '<p class="text-muted">No categories created yet.</p>';
            return;
        }
        
        appData.categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            if (category.id === appData.activeCategory) {
                categoryCard.classList.add('active');
            }
            
            categoryCard.innerHTML = `
                <div class="category-info">
                    <h4>${category.name}</h4>
                    <p>${category.description || 'No description'}</p>
                    <small>Target: ₱${category.targetAmount.toFixed(2)}</small>
                </div>
                <div class="category-actions">
                    <button onclick="editCategory('${category.id}')" class="btn btn-primary btn-sm" title="Edit Category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCategory('${category.id}')" class="btn btn-danger btn-sm" title="Delete Category">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            domCache.categoriesContainer.appendChild(categoryCard);
        });
    }

    function populateSectionFilter() {
        const sectionFilter = document.getElementById('searchSection');
        if (!sectionFilter) return;
        
        const currentValue = sectionFilter.value;
        sectionFilter.innerHTML = '<option value="">All Sections</option>';
        
        const sections = [...new Set(appData.students.map(student => student.section))].sort();
        
        sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            if (section === currentValue) {
                option.selected = true;
            }
            sectionFilter.appendChild(option);
        });
    }

    function displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No students found matching your criteria.</p>';
            searchResults.classList.add('show-results');
            return;
        }
        
        // Create a table that matches the student payment section UI
        const resultTable = document.createElement('div');
        resultTable.className = 'table-responsive';
        
        const table = document.createElement('table');
        table.className = 'modern-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Amount (₱)</th>
                <th>Status</th>
                <th>Payment Date</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        results.forEach(student => {
            const categoryData = appData.activeCategory ? student.categories[appData.activeCategory] : null;
            const originalIndex = appData.students.findIndex(s => s.id === student.id);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.lastName}, ${student.firstName} ${student.middleInitial || ''}</td>
                <td>${categoryData ? categoryData.amount.toFixed(2) : '0.00'}</td>
                <td class="status-${categoryData && categoryData.isPaid ? 'paid' : 'unpaid'}">
                    <i class="fas ${categoryData && categoryData.isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${categoryData && categoryData.isPaid ? 'Paid' : 'Unpaid'}
                </td>
                <td>${categoryData && categoryData.paymentDate ? formatDate(categoryData.paymentDate) : 'N/A'}</td>
                <td>
                    <button onclick="togglePaymentStatus(${originalIndex})" class="btn btn-secondary btn-sm" title="${categoryData && categoryData.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                        <i class="fas ${categoryData && categoryData.isPaid ? 'fa-times' : 'fa-check'}"></i>
                    </button>
                    <button onclick="showEditForm(${originalIndex})" class="btn btn-primary btn-sm" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        resultTable.appendChild(table);
        searchResults.appendChild(resultTable);
        searchResults.classList.add('show-results');
    }

    // ---- Modal Controls ----
    function showAddStudentModal() {
        addStudentModal.style.display = 'block';
        document.getElementById('studentForm').reset();
        document.getElementById('amount').value = '';
        document.getElementById('isPaid').value = 'false';
    }

    function hideAddStudentModal() {
        addStudentModal.style.display = 'none';
        document.getElementById('studentForm').reset();
        document.getElementById('bulkAddForm').reset();
    }

    function showCategoryManagement() {
        renderCategories();
        document.getElementById('categoryForm').reset();
        domCache.categoryManagementModal.style.display = 'block';
    }

    function hideCategoryManagement() {
        domCache.categoryManagementModal.style.display = 'none';
    }

    function showSectionCharts() {
        createSummaryCharts();
        domCache.sectionChartsModal.style.display = 'block';
    }

    function hideSectionChartsModal() {
        domCache.sectionChartsModal.style.display = 'none';
    }

    // ---- UI Controls ----
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    function toggleSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        settingsPanel.classList.toggle('show');
    }

    function toggleThemeFromSidebar() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }

    function toggleSection(element) {
        const now = Date.now();

        // Prevent rapid clicks
        if (element.dataset.lastToggle && (now - parseInt(element.dataset.lastToggle)) < 200) {
            return;
        }
        element.dataset.lastToggle = now.toString();
        
        const content = element.nextElementSibling;
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expanding
            content.style.display = 'block';
            content.classList.remove('collapsed');
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                content.style.height = content.scrollHeight + 'px';
            });
        } else {
            // Collapsing  
            content.style.height = content.scrollHeight + 'px';
            requestAnimationFrame(() => {
                content.style.height = '0px';
                content.classList.add('collapsed');
                // Hide after animation completes
                setTimeout(() => {
                    if (content.classList.contains('collapsed')) {
                        content.style.display = 'none';
                    }
                }, 300);
            });
        }
        
        element.classList.toggle('collapsed');
    }

    function deleteSectionPrompt(section) {
        if (!confirm(`Are you sure you want to delete all students in section ${section}? This cannot be undone.`)) return;
        deleteSection(section);
    }

    function deleteSection(section) {
        const originalLength = appData.students.length;
        appData.students = appData.students.filter(student => student.section !== section);
        saveData();
        
        const deletedCount = originalLength - appData.students.length;
        updateDisplay();
        
        if (deletedCount > 0) {
            showFeedback(`Deleted ${deletedCount} students from section ${section}.`);
        } else {
            showFeedback(`No students found in section ${section}.`);
        }
    }

    // ---- Excel/CSV Import/Export ----
    function handleFileImport(input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Get first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                alert("No data found in the Excel file.");
                return;
            }
            
            // Check if we should replace existing data
            const shouldReplace = confirm("Would you like to replace all existing data? Click OK to replace, Cancel to add to existing data.");
            
            importFromExcel(jsonData, shouldReplace);
        };
        reader.readAsBinaryString(file);
        
        // Reset the input to allow importing the same file again
        input.value = '';
    }

    function importFromExcel(jsonData, replace = false) {
        if (jsonData.length === 0) {
            alert("No data found in the Excel file.");
            return;
        }

        const batchSize = 100; // Process in batches to prevent UI freeze
        const importedStudents = [];
        const importedCategories = new Set();
        const existingCategoryIds = new Set(appData.categories.map(c => c.id));
        
        // Process data in batches
        function processBatch(startIndex) {
            const endIndex = Math.min(startIndex + batchSize, jsonData.length);
            
            for (let i = startIndex; i < endIndex; i++) {
                const row = jsonData[i];
                
                // Skip invalid rows
                if (!row['First Name'] || !row['Last Name'] || !row['Section']) {
                    continue;
                }
                
                const student = {
                    id: `imported_${Date.now()}_${i}`,
                    firstName: row['First Name'].toString().trim(),
                    lastName: row['Last Name'].toString().trim(),
                    middleInitial: row['Middle Initial'] ? row['Middle Initial'].toString().trim().toUpperCase() : '',
                    section: row['Section'].toString().trim().toUpperCase(),
                    categories: {}
                };
                
                // Process categories efficiently
                const standardFields = new Set(['First Name', 'Last Name', 'Middle Initial', 'Section', 'Payment Date', 'Status']);
                
                Object.keys(row).forEach(key => {
                    if (!standardFields.has(key) && key !== '') {
                        const categoryName = key.trim();
                        const categoryId = categoryName.toLowerCase().replace(/\s+/g, '_');
                        
                        importedCategories.add(categoryName);
                        
                        if (!existingCategoryIds.has(categoryId)) {
                            appData.categories.push({
                                id: categoryId,
                                name: categoryName,
                                description: `Imported from Excel on ${new Date().toLocaleDateString()}`,
                                targetAmount: 0
                            });
                            existingCategoryIds.add(categoryId);
                        }
                        
                        // Parse amount
                        let amount = 0;
                        const amountValue = row[key];
                        if (typeof amountValue === 'number') {
                            amount = amountValue;
                        } else if (typeof amountValue === 'string') {
                            amount = parseFloat(amountValue.replace(/[^\d.-]/g, ''));
                            if (isNaN(amount)) amount = 0;
                        }
                        
                        // Parse payment status and date
                        const isPaid = row['Status'] ? 
                            row['Status'].toString().toLowerCase().includes('paid') : 
                            amount > 0;
                        
                        let paymentDate = null;
                        if (isPaid) {
                            if (row['Payment Date']) {
                                paymentDate = formatExcelDate(row['Payment Date']);
                            } else {
                                paymentDate = new Date().toISOString().split('T')[0];
                            }
                        }
                        
                        student.categories[categoryId] = {
                            amount: amount,
                            isPaid: isPaid,
                            paymentDate: paymentDate,
                            transactions: isPaid ? [{
                                id: `t${Date.now()}_${i}`,
                                amount: amount,
                                date: paymentDate,
                                notes: "Imported from Excel"
                            }] : []
                        };
                    }
                });
                
                importedStudents.push(student);
            }
            
            // Process next batch or finalize
            if (endIndex < jsonData.length) {
                // Use setTimeout to yield control and prevent UI freeze
                setTimeout(() => processBatch(endIndex), 10);
            } else {
                finalizeImport();
            }
        }
        
        function finalizeImport() {
            if (importedStudents.length === 0) {
                alert("No valid student data found in the Excel file.");
                return;
            }
            
            // Update app data
            if (replace) {
                appData.students = importedStudents;
            } else {
                appData.students.push(...importedStudents);
            }
            
            if (!appData.activeCategory && appData.categories.length > 0) {
                appData.activeCategory = appData.categories[0].id;
            }
            
            saveData();
            updateDisplay();
            showFeedback(`Imported ${importedStudents.length} students and ${importedCategories.size} categories.`);
        }
        
        // Start processing
        processBatch(0);
    }

    // Helper function for Excel date formatting
    function formatExcelDate(excelDate) {
        if (typeof excelDate === 'string') {
            return excelDate;
        } else if (excelDate instanceof Date) {
            return excelDate.toISOString().split('T')[0];
        } else if (typeof excelDate === 'number') {
            // Excel serial date conversion
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    }

    // ---- Excel/CSV Import/Export ----
    function exportToExcel() {
        if (appData.students.length === 0) {
            showFeedback("No student data to export.");
            return;
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toISOString().split('T')[0];
        
        // Prepare data for export - optimized to avoid multiple loops
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
            
            // Prepare worksheet data using array for better performance
            const wsData = new Array(sectionStudents.length + 1);
            
            // Add header row
            const headerRow = ['ID', 'Name', 'Section'];
            appData.categories.forEach(cat => {
                const categoryKey = cat.name.replace(/\s+/g, '_');
                headerRow.push(`${categoryKey}_Amount`, `${categoryKey}_Status`, `${categoryKey}_Date`);
            });
            
            wsData[0] = headerRow;
            
            // Add student rows
            for (let i = 0; i < sectionStudents.length; i++) {
                const student = sectionStudents[i];
                const studentRow = new Array(3 + (appData.categories.length * 3));
                
                // Basic student info
                studentRow[0] = student.id;
                studentRow[1] = `${student.lastName}, ${student.firstName} ${student.middleInitial || ''}`;
                studentRow[2] = student.section;
                
                // Category data
                let colIndex = 3;
                for (let j = 0; j < appData.categories.length; j++) {
                    const cat = appData.categories[j];
                    const categoryData = student.categories[cat.id] || {
                        amount: 0,
                        isPaid: false,
                        paymentDate: null
                    };
                    
                    studentRow[colIndex++] = categoryData.amount;
                    studentRow[colIndex++] = categoryData.isPaid ? 'PAID' : 'UNPAID';
                    studentRow[colIndex++] = categoryData.paymentDate ? new Date(categoryData.paymentDate) : null;
                }
                
                wsData[i + 1] = studentRow;
            }
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Format columns
            const colWidths = [
                { wch: 20 }, // ID
                { wch: 30 }, // Name
                { wch: 15 }  // Section
            ];
            
            // Add column widths for each category
            for (let i = 0; i < appData.categories.length; i++) {
                colWidths.push({ wch: 12 }); // Amount
                colWidths.push({ wch: 10 }); // Status
                colWidths.push({ wch: 15 }); // Date
            }
            
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, section.substring(0, 30)); // Limit sheet name length
        });

        // Create Summary Sheet - optimized to avoid multiple loops
        const summaryData = [
            ['Overall Summary'],
            [],
            ['Category', 'Target Amount', 'Collected Amount', 'Remaining', 'Completion %', 'Paid Students', 'Unpaid Students']
        ];
        
        // Pre-calculate summary data
        for (let i = 0; i < appData.categories.length; i++) {
            const category = appData.categories[i];
            let totalAmount = 0;
            let paidCount = 0;
            
            for (let j = 0; j < appData.students.length; j++) {
                const student = appData.students[j];
                const categoryData = student.categories[category.id];
                
                if (categoryData) {
                    totalAmount += categoryData.amount || 0;
                    if (categoryData.isPaid) {
                        paidCount++;
                    }
                }
            }
            
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
        }
        
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
        
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Save file
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
            const lines = e.target.result.split('\n');
            const newStudents = [];
            const existingIds = new Set(appData.students.map(s => s.id));

            // Process lines in batches for better performance with large files
            const batchSize = 100;
            let currentBatch = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 3) continue;

                const nameParts = parseName(parts[0]);
                if (!nameParts) continue;
                
                const { firstName, middleInitial, lastName } = nameParts;
                const section = parts[1].toUpperCase();

                if (firstName && lastName && section) {
                    const student = {
                        id: `s${Date.now()}_${i}`,
                        firstName,
                        middleInitial,
                        lastName,
                        section,
                        categories: {}
                    };

                    // Initialize all categories
                    for (let j = 0; j < appData.categories.length; j++) {
                        const category = appData.categories[j];
                        student.categories[category.id] = {
                            amount: 0,
                            isPaid: false,
                            paymentDate: null,
                            transactions: []
                        };
                    }

                    currentBatch.push(student);
                    
                    // Process in batches to prevent UI freeze
                    if (currentBatch.length >= batchSize || i === lines.length - 1) {
                        newStudents.push(...currentBatch);
                        currentBatch = [];
                    }
                }
            }

            if (newStudents.length > 0) {
                const replace = confirm(`CSV import successful. Found ${newStudents.length} students. Replace existing data? (Cancel to append)`);
                
                if (replace) {
                    appData.students = newStudents;
                } else {
                    // Filter out duplicates
                    const uniqueNewStudents = newStudents.filter(s => !existingIds.has(s.id));
                    appData.students = [...appData.students, ...uniqueNewStudents];
                }
                
                saveData();
                
                // Optimized update based on the change
                if (replace || appData.students.length === newStudents.length) {
                    updateDisplay();
                } else {
                    updateStudentList();
                    updateSummary();
                    updateSectionSummary();
                    debouncedUpdateCharts();
                }
                
                showFeedback(`${newStudents.length} students imported from CSV.`);
            } else {
                alert("No valid student data found in the CSV file.");
            }

            document.getElementById('excelFile').value = '';
        };
        reader.readAsText(file);
    }

    // ---- Category Management ----
    function renderActiveCategorySelect() {
        const select = document.getElementById('activeCategorySelect');
        if (!select) {
            console.warn("Category select element not found in DOM");
            return;
        }
        
        // Store current selection
        const currentSelection = select.value;
        
        // Clear and rebuild options
        select.innerHTML = '<option value="">Select a category</option>';
        
        if (!appData.categories || appData.categories.length === 0) {
            return;
        }
        
        // Create options in a single batch
        const fragment = document.createDocumentFragment();
        appData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id === appData.activeCategory || category.id === currentSelection) {
                option.selected = true;
            }
            fragment.appendChild(option);
        });
        
        select.appendChild(fragment);
        
        // Set default active category if none exists
        if (!appData.activeCategory && appData.categories.length > 0) {
            appData.activeCategory = appData.categories[0].id;
            select.value = appData.activeCategory;
            saveData();
        }
        
        // Ensure correct selection is shown
        if (appData.activeCategory) {
            select.value = appData.activeCategory;
        }
    }

    function renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        // Use document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
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
            fragment.appendChild(categoryCard);
        });
        
        // Clear and update in one operation
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // ---- Chart Functions ----

    function createSummaryCharts() {
        // Only recreate if data has changed significantly
        const currentPieData = JSON.stringify(getPieChartData());
        const currentBarData = JSON.stringify(getBarChartData());
        
        if (chartDataCache.pie === currentPieData && chartDataCache.bar === currentBarData) {
            return; // No need to update
        }
        
        // Update cache
        chartDataCache.pie = currentPieData;
        chartDataCache.bar = currentBarData;
        
        // Get theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = computedStyle.getPropertyValue('--text-color').trim();
        const borderColor = computedStyle.getPropertyValue('--border-color').trim();
        
        // Get canvas contexts
        const pieCtx = document.getElementById('summaryPieChart')?.getContext('2d');
        const barCtx = document.getElementById('summaryBarChart')?.getContext('2d');
        
        if (!pieCtx || !barCtx) return;
        
        // Destroy old charts
        if (summaryPieChart) summaryPieChart.destroy();
        if (summaryBarChart) summaryBarChart.destroy();
        
        try {
            // Create new charts
            summaryPieChart = new Chart(pieCtx, {
                type: 'doughnut',
                data: getPieChartData(),
                options: getChartOptions('Payment Status', textColor, borderColor, 'pie')
            });

            summaryBarChart = new Chart(barCtx, {
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

        // Single pass through students
        appData.students.forEach(student => {
            const categoryData = student.categories && student.categories[appData.activeCategory];
            if (categoryData) {
                if (categoryData.isPaid) {
                    paidCount++;
                } else {
                    unpaidCount++;
                }
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

        // Single pass through students
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

    function refreshCharts() {
        // Destroy existing charts
        if (summaryPieChart) {
            summaryPieChart.destroy();
            summaryPieChart = null;
        }
        if (summaryBarChart) {
            summaryBarChart.destroy();
            summaryBarChart = null;
        }
        
        // Clear cache to force recreation
        chartDataCache.pie = null;
        chartDataCache.bar = null;
        
        // Recreate charts after theme update
        debouncedUpdateCharts();
    }

    function debouncedUpdateCharts() {
        // Debounce chart updates
        if (updateDebounceTimer) {
            clearTimeout(updateDebounceTimer);
        }
        
        updateDebounceTimer = setTimeout(() => {
            if (appData.students.length > 0 && appData.activeCategory) {
                createSummaryCharts();
            }
            updateDebounceTimer = null;
        }, 100);
    }


    function showSectionCharts() {
        const modal = document.getElementById('sectionChartsModal');
        if (modal) {
            modal.style.display = 'block';
            // Render charts with a small delay
            setTimeout(() => {
                renderSectionCharts();
            }, 100);
        }
    }

    function hideSectionChartsModal() {
        const modal = document.getElementById('sectionChartsModal');
        if (modal) {
            modal.style.display = 'none';
            // Destroy section charts to prevent memory leaks
            sectionCharts.forEach((chart, section) => {
                if (chart) {
                    chart.destroy();
                }
            });
            sectionCharts.clear();
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
        
        // Get theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const textColor = computedStyle.getPropertyValue('--text-color')?.trim() || '#333333';
        
        // Use document fragment for batch updates
        const fragment = document.createDocumentFragment();
        
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
            fragment.appendChild(chartItem);
            
            // Create chart after DOM is updated
            setTimeout(() => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                try {
                    const chart = new Chart(ctx, {
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
                            maintainAspectRatio: false,
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
                            cutout: '65%',
                            animation: {
                                duration: 500,
                                easing: 'easeInOutQuart'
                            }
                        }
                    });
                    
                    // Store chart reference
                    sectionCharts.set(section, chart);
                } catch (error) {
                    console.error(`Error creating chart for section ${section}:`, error);
                    chartItem.querySelector('.chart-wrapper').innerHTML = 
                        '<p class="chart-error">Error loading chart</p>';
                }
            }, 50 * index); // Stagger chart creation
        });
        
        container.appendChild(fragment);
    }

    // ---- Utility Functions ----

    function showError(element, message) {
        if (!element) return;
        
        // Preserve existing icon if present
        const existingIcon = element.querySelector('i');
        const iconHtml = existingIcon ? existingIcon.outerHTML : '<i class="fas fa-exclamation-triangle"></i>';
        
        element.innerHTML = `${iconHtml} ${message}`;
        element.style.display = 'block';
    }

    function showFeedback(message, duration = 3000) {
        // Create toast notification if it doesn't exist
        let toastContainer = document.getElementById('feedbackToast');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'feedbackToast';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'feedback-toast success-message';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    function parseName(nameString) {
        if (!nameString) return null;
        
        let firstName, middleInitial = '', lastName;
        
        // Try to parse as "Last, First Middle" format first
        if (nameString.includes(',')) {
            const parts = nameString.split(',').map(p => p.trim());
            if (parts.length < 2) return null;
            
            lastName = parts[0];
            const firstMiddleParts = parts[1].split(' ').filter(p => p.trim());
            
            if (firstMiddleParts.length === 0) return null;
            
            // Check if last part could be a middle initial
            if (firstMiddleParts.length > 1) {
                const lastPart = firstMiddleParts[firstMiddleParts.length - 1];
                if (lastPart.length === 1 || lastPart.endsWith('.')) {
                    middleInitial = lastPart.charAt(0).toUpperCase();
                    firstName = firstMiddleParts.slice(0, -1).join(' ');
                } else {
                    firstName = firstMiddleParts.join(' ');
                }
            } else {
                firstName = firstMiddleParts[0];
            }
        } else {
            // Try to parse as "First Middle Last" format
            const parts = nameString.split(' ').filter(p => p.trim());
            if (parts.length < 2) return null;
            
            if (parts.length === 2) {
                firstName = parts[0];
                lastName = parts[1];
            } else {
                // Check if second to last part could be a middle initial
                const middleIndex = parts.length - 2;
                const middlePart = parts[middleIndex];
                
                if (middlePart.length === 1 || middlePart.endsWith('.')) {
                    firstName = parts.slice(0, middleIndex).join(' ');
                    middleInitial = middlePart.charAt(0).toUpperCase();
                    lastName = parts[parts.length - 1];
                } else {
                    firstName = parts.slice(0, -1).join(' ');
                    lastName = parts[parts.length - 1];
                }
            }
        }
        
        if (!firstName || !lastName) return null;
        
        return { firstName, middleInitial, lastName };
    }

    // --- Start the application ---
    initialize();
});