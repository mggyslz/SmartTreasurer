        // This is where we store all our students
        let students = [];

        // When the page loads, get any saved students
        window.onload = function() {
            const savedStudents = localStorage.getItem('students');
            if (savedStudents) {
                students = JSON.parse(savedStudents);
                updateDisplay();
            }
        };

        // Dark/Light mode stuff
        const themeToggle = document.getElementById('themeToggle');
        const themeLabel = document.getElementById('themeLabel');
        
        // Check if they had a theme preference from before
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeToggle.checked = savedTheme === 'dark';
            themeLabel.textContent = savedTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
        }

        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeLabel.textContent = 'Dark Mode';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeLabel.textContent = 'Light Mode';
            }
        });

        // Functions to show/hide the "Add Student" popup
        function showAddStudentModal() {
            document.getElementById('addStudentModal').style.display = 'block';
        }

        function hideAddStudentModal() {
            document.getElementById('addStudentModal').style.display = 'none';
            document.getElementById('studentForm').reset();
        }

        // Closes the popup if you click outside of it
        window.onclick = function(event) {
            const modal = document.getElementById('addStudentModal');
            if (event.target == modal) {
                hideAddStudentModal();
            }
        }

        // Stuff for logging in and signing up
        function showLogin() {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            document.querySelector('.toggle-btn:first-child').classList.add('active');
            document.querySelector('.toggle-btn:last-child').classList.remove('active');
        }

        function showSignup() {
            document.getElementById('loginForm').style.display = 'none'; 
            document.getElementById('signupForm').style.display = 'block';
            document.querySelector('.toggle-btn:first-child').classList.remove('active');
            document.querySelector('.toggle-btn:last-child').classList.add('active');
        }

        function login() {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            // Check if the username and password match what we have saved
            const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
            const user = storedUsers.find(u => u.username === username && u.password === password);

            if (user) {
                document.getElementById('loginError').style.display = 'none';
                startApp();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        }

        function signup() {
            const username = document.getElementById('signupUsername').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                document.getElementById('signupError').style.display = 'block';
                return;
            }

            // Get the list of users we already have
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // Make sure the username isn't taken
            if (users.some(u => u.username === username)) {
                document.getElementById('signupError').textContent = 'Username already exists';
                document.getElementById('signupError').style.display = 'block';
                return;
            }

            // Add the new user to our list
            users.push({ username, password });
            localStorage.setItem('users', JSON.stringify(users));

            // All good! Hide any errors and go to login
            document.getElementById('signupError').style.display = 'none';
            showLogin();
        }

        function deleteAccount() {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            // Find the user in our saved list
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.username === username && u.password === password);

            if (userIndex !== -1) {
                if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // Remove them from our list
                    users.splice(userIndex, 1);
                    // Save the updated list
                    localStorage.setItem('users', JSON.stringify(users));
                    // Clear the login form
                    document.getElementById('loginUsername').value = '';
                    document.getElementById('loginPassword').value = '';
                    // Let them know it worked
                    alert('Account successfully deleted');
                }
            } else {
                alert('Invalid credentials. Please check your username and password.');
            }
        }

        function startApp() {
            const openingScreen = document.getElementById('openingScreen');
            openingScreen.style.opacity = '0';
            setTimeout(() => {
                openingScreen.style.display = 'none';
            }, 500);
        }

        // When someone submits the add student form
        document.getElementById('studentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const student = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                section: document.getElementById('section').value,
                amount: parseFloat(document.getElementById('amount').value),
                isPaid: document.getElementById('isPaid').value === 'true',
                paymentDate: document.getElementById('isPaid').value === 'true' ? new Date().toISOString().split('T')[0] : null
            };
            
            students.push(student);
            updateDisplay();
            this.reset();
            hideAddStudentModal();
        });

        // When someone submits the edit student form
        document.getElementById('studentEditForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const index = document.getElementById('editIndex').value;
            const isPaid = document.getElementById('editIsPaid').value === 'true';
            const currentStudent = students[index];
            
            students[index] = {
                firstName: document.getElementById('editFirstName').value,
                lastName: document.getElementById('editLastName').value,
                section: document.getElementById('editSection').value,
                amount: parseFloat(document.getElementById('editAmount').value),
                isPaid: isPaid,
                paymentDate: isPaid ? (document.getElementById('editPaymentDate').value || new Date().toISOString().split('T')[0]) : null
            };
            
            hideEditForm();
            updateDisplay();
        });

        // Shows the edit form with the student's current info
        function showEditForm(index) {
            const student = students[index];
            document.getElementById('editIndex').value = index;
            document.getElementById('editFirstName').value = student.firstName;
            document.getElementById('editLastName').value = student.lastName;
            document.getElementById('editSection').value = student.section;
            document.getElementById('editAmount').value = student.amount;
            document.getElementById('editIsPaid').value = student.isPaid.toString();
            document.getElementById('editPaymentDate').value = student.paymentDate || '';
            
            document.getElementById('editForm').style.display = 'block';
        }

        // Hides the edit form and clears it
        function hideEditForm() {
            document.getElementById('editForm').style.display = 'none';
            document.getElementById('studentEditForm').reset();
        }

        // Updates everything and saves the data
        function updateDisplay() {
            updateStudentList();
            updateSummary();
            updateSectionSummary();
            // Save everything to storage
            localStorage.setItem('students', JSON.stringify(students));
        }

        // Shows all the students organized by section
        function updateStudentList() {
            const sectionLists = document.getElementById('sectionLists');
            sectionLists.innerHTML = '';
            
            // Sort students into their sections
            const sectionData = {};
            students.forEach(student => {
                if (!sectionData[student.section]) {
                    sectionData[student.section] = [];
                }
                sectionData[student.section].push(student);
            });

            // Make a nice table for each section
            for (const [section, sectionStudents] of Object.entries(sectionData)) {
                const sectionDiv = document.createElement('div');
                sectionDiv.innerHTML = `
                    <h3 class="section-header">Section: ${section}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sectionStudents.map((student, index) => `
                                <tr>
                                    <td>${student.firstName}</td>
                                    <td>${student.lastName}</td>
                                    <td>₱${student.amount}</td>
                                    <td class="${student.isPaid ? 'status-paid' : 'status-unpaid'}">
                                        ${student.isPaid ? 'PAID' : 'UNPAID'}
                                    </td>
                                    <td>${student.paymentDate || '-'}</td>
                                    <td>
                                        <button onclick="togglePaymentStatus(${students.indexOf(student)})" class="btn">
                                            ${student.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                                        </button>
                                        <button onclick="showEditForm(${students.indexOf(student)})" class="btn">Edit</button>
                                        <button onclick="deleteStudent(${students.indexOf(student)})" class="btn">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                sectionLists.appendChild(sectionDiv);
            }
        }

        // Updates the overall summary at the top
        function updateSummary() {
            const totalAmount = students.reduce((sum, student) => sum + student.amount, 0);
            const totalPaid = students.filter(student => student.isPaid).length;
            
            document.getElementById('totalAmount').textContent = totalAmount;
            document.getElementById('totalStudents').textContent = students.length;
            document.getElementById('totalPaid').textContent = totalPaid;
            document.getElementById('totalUnpaid').textContent = students.length - totalPaid;
        }

        // Updates the summary table for each section
        function updateSectionSummary() {
            const sectionData = {};
            
            students.forEach(student => {
                if (!sectionData[student.section]) {
                    sectionData[student.section] = {
                        count: 0,
                        total: 0,
                        paid: 0,
                        unpaid: 0,
                        latestPayment: null
                    };
                }
                sectionData[student.section].count++;
                sectionData[student.section].total += student.amount;
                if (student.isPaid) {
                    sectionData[student.section].paid++;
                    if (student.paymentDate && (!sectionData[student.section].latestPayment || 
                        student.paymentDate > sectionData[student.section].latestPayment)) {
                        sectionData[student.section].latestPayment = student.paymentDate;
                    }
                } else {
                    sectionData[student.section].unpaid++;
                }
            });

            const sectionSummary = document.getElementById('sectionSummary');
            sectionSummary.innerHTML = '';
            
            for (const [section, data] of Object.entries(sectionData)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${section}</td>
                    <td>${data.count}</td>
                    <td>₱${data.total}</td>
                    <td>${data.paid}</td>
                    <td>${data.unpaid}</td>
                    <td>${data.latestPayment || '-'}</td>
                `;
                sectionSummary.appendChild(row);
            }
        }

        // Switches a student between paid and unpaid
        function togglePaymentStatus(index) {
            const currentDate = new Date().toISOString().split('T')[0];
            students[index].isPaid = !students[index].isPaid;
            
            if (students[index].isPaid) {
                students[index].paymentDate = currentDate;
                // Show payment date in a popup or alert
                alert(`Payment recorded on: ${currentDate}`);
            } else {
                students[index].paymentDate = null;
            }
            
            updateDisplay();
        }

        // Removes a student (after confirming)
        function deleteStudent(index) {
            if (confirm('Are you sure you want to delete this student?')) {
                students.splice(index, 1);
                updateDisplay();
            }
        }

        // Gets student data from an Excel file
        function importFromExcel(input) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                // Start fresh with no students
                students = [];

                // Go through each sheet (except Summary)
                workbook.SheetNames.forEach(sheetName => {
                    if (sheetName !== 'Summary') {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

                        // Keep track of what section we're in and if we're looking at paid or unpaid students
                        let currentSection = '';
                        let isPaidSection = false;

                        jsonData.forEach(row => {
                            if (row && row.length > 0) {
                                // Found a section header
                                if (row[0].startsWith('Section:')) {
                                    currentSection = row[0].replace('Section:', '').trim();
                                }
                                // Check if we're in the paid or unpaid part
                                else if (row[0] === 'PAID STUDENTS') {
                                    isPaidSection = true;
                                }
                                else if (row[0] === 'UNPAID STUDENTS') {
                                    isPaidSection = false;
                                }
                                // This looks like a student row
                                else if (row.length >= 3 && row[0] !== 'First Name' && !row[0].startsWith('Section Summary')) {
                                    // Make sure we have all the needed info
                                    if (row[0] && row[1] && row[2]) {
                                        const student = {
                                            firstName: row[0],
                                            lastName: row[1],
                                            amount: parseFloat(row[2].replace('₱', '')),
                                            section: currentSection,
                                            isPaid: isPaidSection,
                                            paymentDate: isPaidSection ? new Date().toISOString().split('T')[0] : null
                                        };
                                        students.push(student);
                                    }
                                }
                            }
                        });
                    }
                });

                // Show all our imported students
                updateDisplay();
            };

            reader.readAsArrayBuffer(file);
        }

        // Saves all our data to an Excel file
        function exportToExcel() {
            // Start a new workbook
            const wb = XLSX.utils.book_new();
            
            // Group students by section
            const sectionData = {};
            students.forEach(student => {
                if (!sectionData[student.section]) {
                    sectionData[student.section] = [];
                }
                sectionData[student.section].push(student);
            });

            // Make a sheet for each section
            for (const [section, sectionStudents] of Object.entries(sectionData)) {
                // Figure out the totals for this section
                const totalStudents = sectionStudents.length;
                const totalAmount = sectionStudents.reduce((sum, student) => sum + student.amount, 0);
                const paidStudents = sectionStudents.filter(student => student.isPaid).length;
                const unpaidStudents = totalStudents - paidStudents;

                // Split into paid and unpaid lists
                const paidStudentsList = sectionStudents.filter(student => student.isPaid);
                const unpaidStudentsList = sectionStudents.filter(student => !student.isPaid);

                // Set up the data for this section's sheet
                const ws_data = [
                    [`Section: ${section}`],
                    [],
                    ['PAID STUDENTS'],
                    ['First Name', 'Last Name', 'Amount', 'Payment Status', 'Payment Date'],
                    ...paidStudentsList.map(student => [
                        student.firstName,
                        student.lastName,
                        `₱${student.amount}`,
                        'PAID',
                        student.paymentDate || '-'
                    ]),
                    [],
                    ['UNPAID STUDENTS'],
                    ['First Name', 'Last Name', 'Amount', 'Payment Status', 'Payment Date'],
                    ...unpaidStudentsList.map(student => [
                        student.firstName,
                        student.lastName,
                        `₱${student.amount}`,
                        'UNPAID',
                        '-'
                    ]),
                    [],
                    ['Section Summary'],
                    ['Total Students:', totalStudents],
                    ['Total Amount:', `₱${totalAmount}`],
                    ['Paid Students:', paidStudents],
                    ['Unpaid Students:', unpaidStudents]
                ];

                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                XLSX.utils.book_append_sheet(wb, ws, section);
            }

            // Make a summary sheet with totals for all sections
            const summaryData = [
                ['Overall Summary'],
                ['Section', 'Total Students', 'Total Amount', 'Paid Students', 'Unpaid Students', 'Latest Payment'],
                ...Object.entries(sectionData).map(([section, sectionStudents]) => {
                    const latestPayment = sectionStudents
                        .filter(s => s.paymentDate)
                        .reduce((latest, student) => 
                            !latest || student.paymentDate > latest ? student.paymentDate : latest, null);
                    return [
                        section,
                        sectionStudents.length,
                        `₱${sectionStudents.reduce((sum, student) => sum + student.amount, 0)}`,
                        sectionStudents.filter(student => student.isPaid).length,
                        sectionStudents.filter(student => !student.isPaid).length,
                        latestPayment || '-'
                    ];
                })
            ];
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

            // Save it all to a file
            XLSX.writeFile(wb, "student_treasurer_data.xlsx");
        }