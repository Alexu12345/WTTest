import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
// This must be consistent with the one you use for your Firebase project.
const firebaseConfig = {
    apiKey: "AIzaSyBu_MfB_JXvzBFaKY-Yxze1JotejU--4as",
    authDomain: "worktrackerapp-a32af.firebaseapp.com",
    projectId: "worktrackerapp-a32af",
    storageBucket: "worktrackerapp-a32af.firebasestorage.app",
    messagingSenderId: "246595598451",
    appId: "1:246595598451:web:c6842f1618dffe765a5206"
};

// Initialize Firebase App and Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global state
let loggedInUser = null; // Stores current user data { id, name, role }
let allAccounts = []; // Stores all account definitions from Firestore
let allTaskDefinitions = []; // Stores all task definitions from Firestore
let allUsers = []; // Stores all user definitions from Firestore (for admin panel and filters)
let selectedAccount = null; // The account selected for the current work session
let selectedTaskDefinition = null; // The task definition selected for the current work session
let currentSessionTasks = []; // Tasks added in the current unsaved session
let isSavingWork = false; // Flag to prevent beforeunload warning during save

// Constants (HOURLY_RATE will now be dynamic based on account/custom rate)
// const HOURLY_RATE = 75; // This will be removed or made dynamic

// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainDashboard = document.getElementById('mainDashboard');
const startWorkPage = document.getElementById('startWorkPage');
const trackWorkPage = document.getElementById('trackWorkPage');
const adminPanelPage = document.getElementById('adminPanelPage');

// Login Page Elements
const pinInputs = [];
for (let i = 1; i <= 8; i++) {
    pinInputs.push(document.getElementById(`pinInput${i}`));
}
const loginError = document.getElementById('loginError');

// Main Dashboard Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const totalHoursDisplay = document.getElementById('totalHoursDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay'); // New: Total Balance Display
const startWorkOptionBtn = document.getElementById('startWorkOption');
const trackWorkOptionBtn = document.getElementById('trackWorkOption');
const logoutDashboardBtn = document.getElementById('logoutDashboardBtn'); // Logout from main dashboard

// Track Work Page Elements (now includes chart)
const taskChartCanvas = document.getElementById('taskChart'); // Canvas for chart (now on track work page)
let taskChart = null; // Chart.js instance for track work page
const trackTasksTableBody = document.getElementById('trackTasksTableBody');
const trackTasksTableFoot = document.getElementById('trackTasksTableFoot'); // New: Table footer for totals
const backToDashboardFromTrackBtn = document.getElementById('backToDashboardFromTrack');

// Start Work Page Elements
const taskSelectionPopup = document.getElementById('taskSelectionPopup');
const accountSelect = document.getElementById('accountSelect');
const taskTypeSelect = document.getElementById('taskTypeSelect');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
const backToDashboardFromPopup = document.getElementById('backToDashboardFromPopup'); // Back button in popup
const completedTasksCount = document.getElementById('completedTasksCount');
const recordedTotalTime = document.getElementById('recordedTotalTime');
const detailedSummaryContainer = document.getElementById('detailedSummaryContainer'); // For detailed timing summary
const taskTimingButtonsContainer = document.getElementById('taskTimingButtonsContainer'); // This is the div with class 'task-timing-buttons-section'
const saveWorkBtn = document.getElementById('saveWorkBtn');
const backToDashboardFromStartWork = document.getElementById('backToDashboardFromStartWork'); // Back button from start work page
const taskDetailsContainer = document.getElementById('taskDetailsContainer'); // Reference to the container that holds summary and timing buttons

// Admin Panel Elements - Users
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserPINInput = document.getElementById('newUserPINInput');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');

// Admin Panel Elements - Accounts
const newAccountNameInput = document.getElementById('newAccountNameInput');
const newAccountPriceInput = document.getElementById('newAccountPriceInput'); // New: Default price input
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsTableBody = document.getElementById('accountsTableBody');

// Admin Panel Elements - Task Definitions
const newTaskNameInput = document.getElementById('newTaskNameInput');
const newTimingsContainer = document.getElementById('newTimingsContainer');
const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');

// Admin Panel Elements - Work Records
const recordFilterDate = document.getElementById('recordFilterDate');
const recordFilterUser = document.getElementById('recordFilterUser');
const filterRecordsBtn = document.getElementById('filterRecordsBtn');
const workRecordsTableBody = document.getElementById('workRecordsTableBody');

// Edit Record Modal Elements
const editRecordModal = document.getElementById('editRecordModal');
const closeEditRecordModalBtn = editRecordModal.querySelector('.close-button');
const editAccountSelect = document.getElementById('editAccountSelect');
const editTaskTypeSelect = document.getElementById('editTaskTypeSelect');
const editTotalTasksCount = document.getElementById('editTotalTasksCount');
const editTotalTime = document.getElementById('editTotalTime');
const editRecordDate = document.getElementById('editRecordDate'); // New: Date input for editing
const editRecordTime = document.getElementById('editRecordTime'); // New: Time input for editing
const saveEditedRecordBtn = document.getElementById('saveEditedRecordBtn');
let currentEditingRecordId = null; // Stores the ID of the record being edited

// New Admin Panel Elements for Employee Rates
const employeeRatesTableBody = document.getElementById('employeeRatesTableBody');
const editEmployeeRateModal = document.getElementById('editEmployeeRateModal');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalAccountName = document.getElementById('modalAccountName');
const modalDefaultPrice = document.getElementById('modalDefaultPrice');
const modalCustomPriceInput = document.getElementById('modalCustomPriceInput');
const saveCustomRateBtn = document.getElementById('saveCustomRateBtn');
let currentEditingRate = { userId: null, accountId: null, docId: null };


// Common Admin Elements
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

// Toast Message Elements
const toastMessage = document.getElementById('toastMessage');

// Loading Indicator Elements
const loadingIndicator = document.getElementById('loadingIndicator');

// Language Switcher Elements
const langArBtn = document.getElementById('langArBtn');
const langEnBtn = document.getElementById('langEnBtn');

// Dark Mode Toggle Elements
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;


// 2. Global Variables (Updated)
// HOURLY_RATE is now dynamic, so removed from constants.
// SESSION_DURATION_MS remains for session expiry.
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds (Changed from 3 hours)

// 3. Utility Functions

// Function to get document data with ID
const getDocData = (documentSnapshot) => {
    if (documentSnapshot.exists()) {
        return { id: documentSnapshot.id, ...documentSnapshot.data() };
    }
    return null;
};

// Function to show/hide pages
const showPage = (pageElement) => {
    const pages = [loginPage, mainDashboard, startWorkPage, trackWorkPage, adminPanelPage];
    pages.forEach(p => p.style.display = 'none'); // Hide all pages
    pageElement.style.display = 'flex'; // Show the requested page (using flex for centering)

    // Hide popups/modals when changing main pages
    if (pageElement !== startWorkPage) {
        taskSelectionPopup.style.display = 'none';
    }
    editRecordModal.style.display = 'none'; // Ensure modal is hidden
    editEmployeeRateModal.style.display = 'none'; // Ensure new modal is hidden
};

// Function to show toast messages (notifications)
const showToastMessage = (message, type) => {
    toastMessage.textContent = message;
    toastMessage.className = `toast-message ${type}`; // Add type class (success/error)
    toastMessage.style.display = 'block';
    // Force reflow to ensure CSS animation plays
    void toastMessage.offsetWidth;
    toastMessage.classList.add('show');

    setTimeout(() => {
        toastMessage.classList.remove('show');
        toastMessage.addEventListener('transitionend', function handler() {
            toastMessage.style.display = 'none';
            toastMessage.removeEventListener('transitionend', handler);
        }, { once: true });
    }, 3000); // Hide after 3 seconds
};

// Function to show/hide loading indicator
function showLoadingIndicator(show) { // Changed to function declaration for hoisting
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Internet connection status check
const checkConnectionStatus = () => {
    if (!navigator.onLine) {
        showToastMessage(getTranslatedText('noInternet'), 'error');
    }
};

// Dark Mode Functions
const loadDarkModePreference = () => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    } else {
        updateDarkModeIcon(false); // Ensure correct icon if not dark mode
    }
};

const toggleDarkMode = () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    updateDarkModeIcon(isDarkMode);
    if (taskChart) {
        renderTrackWorkPage(); // Re-render chart to apply new colors (will also re-render table)
    }
};

const updateDarkModeIcon = (isDarkMode) => {
    if (darkModeIcon) {
        if (isDarkMode) {
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun'); // Sun icon for light mode
        } else {
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon'); // Moon icon for dark mode
        }
    }
};

// Function to format decimal minutes (e.g., 9.2) to MM:SS (e.g., 9:12)
const formatMinutesToMMSS = (decimalMinutes) => {
    if (isNaN(decimalMinutes) || decimalMinutes < 0) {
        return '00:00';
    }
    const minutes = Math.floor(decimalMinutes);
    const seconds = Math.round((decimalMinutes - minutes) * 60);
    
    // Handle cases where seconds might round up to 60
    if (seconds === 60) {
        return `${minutes + 1}:00`;
    }
    
    const formattedMinutes = String(minutes).padStart(1, '0'); // No need for 2 digits if single digit
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
};

// Function to format total minutes into HH:MM:SS
const formatTotalMinutesToHHMMSS = (totalMinutes) => {
    if (isNaN(totalMinutes) || totalMinutes < 0) {
        return '00:00:00';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes % 1) * 60); // Get seconds from the decimal part

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

// Language Support (Updated with new keys)
const translations = {
    'ar': {
        'loginTitle': 'تسجيل الدخول',
        'pinPlaceholder': 'أدخل رمز PIN',
        'loginBtn': 'دخول',
        'pinError': 'الرجاء إدخال رمز PIN مكون من 8 أرقام فقط.',
        'pinIncorrect': 'رمز PIN غير صحيح. الرجاء المحاولة مرة أخرى.',
        'loginError': 'حدث خطأ أثناء تسجيل الدخول. الرجاء المحاولة لاحقاً.',
        'admin': 'المدير',
        'totalHoursTitle': 'إجمالي ساعات العمل:',
        'hoursUnit': 'ساعة',
        'totalBalanceTitle': 'إجمالي الرصيد:', 
        'currencyUnit': 'جنيه', 
        'startWorkOption': 'بدء العمل',
        'trackWorkOption': 'متابعة العمل',
        'chooseTask': 'اختر المهمة',
        'accountName': 'اسم الحساب:',
        'taskType': 'نوع المهمة:',
        'confirmBtn': 'تأكيد',
        'backToDashboard': 'رجوع للرئيسية',
        'selectAccountTask': 'الرجاء اختيار الحساب ونوع المهمة.',
        'taskCount': 'عدد المهام المنجزة:',
        'totalTimeRecorded': 'إجمالي الوقت المسجل:',
        'saveWorkBtn': 'حفظ العمل',
        'noTasksToSave': 'لم يتم تسجيل أي مهام لحفظها.',
        'confirmSave': 'هل أنت متأكد من حفظ العمل الحالي؟',
        'workSavedSuccess': 'تم حفظ العمل بنجاح!',
        'errorSavingWork': 'حدث خطأ أثناء حفظ العمل. الرجاء المحاولة مرة أخرى.',
        'unsavedTasksWarning': 'لديك مهام غير محفوظة. هل أنت متأكد من العودة؟ سيتم فقدان البيانات غير المحفوظة.',
        'trackWorkTitle': 'متابعة العمل',
        'serialColumn': 'المسلسل', 
        'dateColumn': 'التاريخ', 
        'dailyTotalTimeColumn': 'إجمالي اليوم', 
        'timingValueColumn': 'التوقيت (دقيقة)', 
        'taskTimingsSummary': 'ملخص توقيتات المهمة', 
        'totalForTaskColumn': 'إجمالي المهمة', 
        'totalForAccountColumn': 'إجمالي الحساب', 
        'taskColumn': 'المهمة', 
        'totalTimeMinutesColumn': 'إجمالي الوقت (دقيقة)', 
        'completedTasksColumn': 'عدد المهام المنجزة', 
        'noDataToShow': 'لا توجد بيانات لعرضها',
        'adminPanelTitle': 'لوحة تحكم المدير',
        'manageUsers': 'إدارة المستخدمين',
        'newUserName': 'اسم المستخدم الجديد',
        'newUserPIN': 'رمز PIN للمستخدم (8 أرقام)',
        'addUserBtn': 'إضافة مستخدم',
        'currentUsers': 'المستخدمون الحاليون:',
        'nameColumn': 'الاسم',
        'pinColumn': 'PIN',
        'actionsColumn': 'إجراءات',
        'deleteBtn': 'حذف',
        'confirmDeleteUser': 'هل أنت متأكد من حذف المستخدم {name}؟',
        'userDeletedSuccess': 'تم حذف المستخدم بنجاح.',
        'enterUserNamePin': 'الرجاء إدخال اسم مستخدم ورمز PIN مكون من 8 أرقام.',
        'pinAlreadyUsed': 'رمز PIN هذا مستخدم بالفعل. الرجاء اختيار رمز آخر.',
        'userAddedSuccess': 'تم إضافة المستخدم بنجاح!',
        'errorAddingUser': 'حدث خطأ أثناء إضافة المستخدم.',
        'manageAccounts': 'إدارة الحسابات',
        'newAccountName': 'اسم الحساب الجديد',
        'defaultPricePlaceholder': 'السعر الافتراضي للساعة (جنيه)', // New
        'addAccountBtn': 'إضافة حساب',
        'currentAccounts': 'الحسابات الحالية:',
        'accountNameColumn': 'اسم الحساب',
        'defaultPriceColumn': 'السعر الافتراضي/ساعة', // New
        'confirmDeleteAccount': 'هل أنت متأكد من حذف الحساب {name}؟',
        'accountDeletedSuccess': 'تم حذف الحساب بنجاح.',
        'enterAccountName': 'الرجاء إدخال اسم الحساب.',
        'accountExists': 'اسم الحساب هذا موجود بالفعل. الرجاء اختيار اسم آخر.',
        'accountAddedSuccess': 'تم إضافة الحساب بنجاح!',
        'errorAddingAccount': 'حدث خطأ أثناء إضافة الحساب.',
        'manageTasks': 'إدارة المهام والتوقيتات',
        'newTaskName': 'اسم المهمة الجديدة',
        'timingPlaceholder': 'التوقيت (بالدقائق)',
        'minutesPlaceholder': 'دقائق', // New
        'secondsPlaceholder': 'ثواني', // New
        'addTimingField': 'إضافة حقل توقيت',
        'addTaskBtn': 'إضافة مهمة جديدة',
        'currentTasks': 'المهام الحالية:',
        'taskNameColumn': 'المهمة',
        'timingsColumn': 'التوقيتات (دقائق:ثواني)', // Updated display text
        'confirmDeleteTask': 'هل أنت متأكد من حذف المهمة {name}؟',
        'taskDeletedSuccess': 'تم حذف المهمة بنجاح.',
        'enterTaskNameTiming': 'الرجاء إدخال اسم المهمة وتوقيت واحد على الأقل.',
        'taskExists': 'اسم المهمة هذا موجود بالفعل. الرجاء اختيار اسم آخر.',
        'taskAddedSuccess': 'تم إضافة المهمة بنجاح!',
        'errorAddingTask': 'حدث خطأ أثناء إضافة المهمة.',
        'logoutAdmin': 'تسجيل الخروج',
        'minutesUnit': 'دقيقة',
        'cancelSelection': 'إلغاء الاختيار',
        'undoLastAdd': 'إلغاء آخر إضافة',
        'noInternet': 'لا يوجد اتصال بالإنترنت. قد لا يتم حفظ البيانات.',
        'internetRestored': 'تم استعادة الاتصال بالإنترنت.',
        'internetLost': 'تم فقدان الاتصال بالإنترنت. يرجى التحقق من اتصالك.',
        'errorLoadingData': 'حدث خطأ في تحميل البيانات. الرجاء المحاولة مرة أخرى.',
        'manageWorkRecords': 'إدارة سجلات العمل',
        'allUsers': 'جميع المستخدمين',
        'filterBtn': 'تصفية',
        'noMatchingRecords': 'لا توجد سجلات عمل مطابقة.',
        'userColumn': 'المستخدم',
        'dateColumn': 'التاريخ',
        'timeColumn': 'الوقت', 
        'confirmDeleteRecord': 'هل أنت متأكد من حذف هذا السجل للمستخدم {name}؟',
        'recordDeletedSuccess': 'تم حذف السجل بنجاح.',
        'errorDeletingRecord': 'حدث خطأ أثناء حذف السجل.',
        'editRecord': 'تعديل سجل العمل',
        'taskCountEdit': 'عدد المهام:',
        'totalTimeEdit': 'إجمالي الوقت (دقيقة):',
        'saveChangesBtn': 'حفظ التعديلات',
        'invalidEditData': 'الرجاء إدخال بيانات صحيحة لجميع الحقول.',
        'recordUpdatedSuccess': 'تم تحديث السجل بنجاح!',
        'errorUpdatingRecord': 'حدث خطأ أثناء تحديث السجل.',
        'sessionResumed': 'تم استئناف الجلسة السابقة.',
        'sessionResumeError': 'تعذر استئناف الجلسة. البيانات غير متناسقة.',
        'errorLoadingRecords': 'حدث خطأ أثناء تحميل سجلات العمل.',
        'notImplemented': 'هذه الميزة لم يتم تطبيقها بعد.',
        'hello': 'مرحباً، ',
        'taskDetailsByTiming': 'تفاصيل المهام حسب التوقيت:',
        'tasksTiming': 'مهام {timing} دقيقة: {count} مهمة (إجمالي {totalTime} دقيقة)',
        'grandTotal': 'الإجمالي الكلي', 
        'totalTasksOverall': 'إجمالي عدد المهام', 
        'totalTimeOverall': ' الوقت', 
        'totalBalanceOverall': ' الرصيد', 
        'sessionWarning': 'ستنتهي جلستك بعد ساعتين أو بعد ساعة من إغلاق المتصفح. هل ترغب في تسجيل الخروج الآن؟',
        'manageEmployeeRates': 'إدارة أسعار الموظفين والإجماليات', // New
        'employeeNameColumn': 'الموظف', // New
        'customPriceColumn': 'السعر المخصص/ساعة', // New
        'employeeTotalHoursColumn': 'إجمالي الساعات', // New
        'employeeTotalBalanceColumn': 'إجمالي الرصيد المستحق', // New
        'editCustomRateTitle': 'تعديل السعر المخصص', // New
        'employeeNameLabel': 'الموظف:', // New
        'accountNameLabel': 'الحساب:', // New
        'defaultPriceLabel': 'السعر الافتراضي:', // New
        'customPriceInputLabel': 'السعر المخصص (جنيه):', // New
        'rateUpdated': 'تم تحديث السعر المخصص بنجاح.', // New
        'invalidTime': 'يرجى إدخال قيم صالحة للدقائق والثواني.', // New
        'invalidPrice': 'يرجى إدخال سعر صالح.', // New
        'modify': 'تعديل', // New
        'notSet': 'غير محدد', // New
        'unauthorizedAccess': 'وصول غير مصرح به. يرجى تسجيل الدخول كمسؤول.' // New
    },
    'en': {
        'loginTitle': 'Login',
        'pinPlaceholder': 'Enter PIN',
        'loginBtn': 'Login',
        'pinError': 'Please enter an 8-digit PIN only.',
        'pinIncorrect': 'Incorrect PIN. Please try again.',
        'loginError': 'An error occurred during login. Please try again later.',
        'admin': 'Admin',
        'totalHoursTitle': 'Total Work Hours:',
        'hoursUnit': 'hours',
        'totalBalanceTitle': 'Total Balance:', 
        'currencyUnit': 'EGP', 
        'startWorkOption': 'Start Work',
        'trackWorkOption': 'Track Work',
        'chooseTask': 'Select Task',
        'accountName': 'Account Name:',
        'taskType': 'Task Type:',
        'confirmBtn': 'Confirm',
        'backToDashboard': 'Back to Dashboard',
        'selectAccountTask': 'Please select both an account and a task type.',
        'taskCount': 'Completed Tasks:',
        'totalTimeRecorded': 'Total Recorded Time:',
        'saveWorkBtn': 'Save Work',
        'noTasksToSave': 'No tasks recorded to save.',
        'confirmSave': 'Are you sure you want to save the current work?',
        'workSavedSuccess': 'Work saved successfully!',
        'errorSavingWork': 'An error occurred while saving work. Please try again.',
        'unsavedTasksWarning': 'You have unsaved tasks. Are you sure you want to go back? Unsaved data will be lost.',
        'trackWorkTitle': 'Work Tracking',
        'serialColumn': 'Serial', 
        'dateColumn': 'Date', 
        'dailyTotalTimeColumn': 'Daily Total Time', 
        'timingValueColumn': 'Timing (minutes)', 
        'taskTimingsSummary': 'Task Timings Summary', 
        'totalForTaskColumn': 'Total for Task', 
        'totalForAccountColumn': 'Total for Account', 
        'taskColumn': 'Task', 
        'totalTimeMinutesColumn': 'Total Time (minutes)', 
        'completedTasksColumn': 'Completed Tasks', 
        'noDataToShow': 'No data to display',
        'adminPanelTitle': 'Admin Panel',
        'manageUsers': 'Manage Users',
        'newUserName': 'New User Name',
        'newUserPIN': 'User PIN (8 digits)',
        'addUserBtn': 'Add User',
        'currentUsers': 'Current Users:',
        'nameColumn': 'Name',
        'pinColumn': 'PIN',
        'actionsColumn': 'Actions',
        'deleteBtn': 'Delete',
        'confirmDeleteUser': 'Are you sure you want to delete user {name}?',
        'userDeletedSuccess': 'User deleted successfully.',
        'enterUserNamePin': 'Please enter a username and an 8-digit PIN.',
        'pinAlreadyUsed': 'This PIN is already in use. Please choose another.',
        'userAddedSuccess': 'User added successfully!',
        'errorAddingUser': 'An error occurred while adding the user.',
        'manageAccounts': 'Manage Accounts',
        'newAccountName': 'New Account Name',
        'defaultPricePlaceholder': 'Default Price per Hour (EGP)', // New
        'addAccountBtn': 'Add Account',
        'currentAccounts': 'Current Accounts:',
        'accountNameColumn': 'Account Name',
        'defaultPriceColumn': 'Default Price/Hour', // New
        'confirmDeleteAccount': 'Are you sure you want to delete account {name}?',
        'accountDeletedSuccess': 'Account deleted successfully.',
        'enterAccountName': 'Please enter an account name.',
        'accountExists': 'This account name already exists. Please choose another.',
        'accountAddedSuccess': 'Account added successfully!',
        'errorAddingAccount': 'An error occurred while adding the account.',
        'manageTasks': 'Manage Tasks & Timings',
        'newTaskName': 'New Task Name',
        'timingPlaceholder': 'Timing (minutes)',
        'minutesPlaceholder': 'Minutes', // New
        'secondsPlaceholder': 'Seconds', // New
        'addTimingField': 'Add Timing Field',
        'addTaskBtn': 'Add New Task',
        'currentTasks': 'Current Tasks:',
        'taskNameColumn': 'Task',
        'timingsColumn': 'Timings (minutes:seconds)', // Updated display text
        'confirmDeleteTask': 'Are you sure you want to delete task {name}?',
        'taskDeletedSuccess': 'Task deleted successfully.',
        'enterTaskNameTiming': 'Please enter a task name and at least one timing.',
        'taskExists': 'This task name already exists. Please choose another.',
        'taskAddedSuccess': 'Task added successfully!',
        'errorAddingTask': 'An error occurred while adding the task.',
        'logoutAdmin': 'Logout',
        'minutesUnit': 'minutes',
        'cancelSelection': 'Cancel Selection',
        'undoLastAdd': 'Undo Last Add',
        'noInternet': 'No internet connection. Data might not be saved.',
        'internetRestored': 'Internet connection restored.',
        'internetLost': 'Internet connection lost. Please check your connection.',
        'errorLoadingData': 'An error occurred while loading data. Please try again.',
        'manageWorkRecords': 'Manage Work Records',
        'allUsers': 'All Users',
        'filterBtn': 'Filter',
        'noMatchingRecords': 'No matching work records.',
        'userColumn': 'User',
        'dateColumn': 'Date',
        'timeColumn': 'Time', 
        'confirmDeleteRecord': 'Are you sure you want to delete this record for user {name}?',
        'recordDeletedSuccess': 'Record deleted successfully.',
        'errorDeletingRecord': 'An error occurred while deleting the record.',
        'editRecord': 'Edit',
        'taskCountEdit': 'Task Count:',
        'totalTimeEdit': 'Total Time (minutes):',
        'saveChangesBtn': 'Save Changes',
        'invalidEditData': 'Please enter valid data for all fields.',
        'recordUpdatedSuccess': 'Record updated successfully!',
        'errorUpdatingRecord': 'An error occurred while updating the record.',
        'sessionResumed': 'Previous session resumed.',
        'sessionResumeError': 'Could not resume session. Data inconsistent.',
        'errorLoadingRecords': 'An error occurred while loading work records.',
        'notImplemented': 'This feature is not yet implemented.',
        'hello': 'Hi, ',
        'taskDetailsByTiming': 'Task Details by Timing:',
        'tasksTiming': '{count} tasks of {timing} minutes (Total {totalTime} minutes)',
        'grandTotal': 'Grand Total', 
        'totalTasksOverall': 'Total Tasks Overall', 
        'totalTimeOverall': 'Total Time Overall', 
        'totalBalanceOverall': 'Total Balance Overall', 
        'sessionWarning': 'Your session will expire in 2 hours or 1 hour after closing the browser. Do you want to log out now?',
        'manageEmployeeRates': 'Manage Employee Rates & Totals', // New
        'employeeNameColumn': 'Employee', // New
        'customPriceColumn': 'Custom Price/Hour', // New
        'employeeTotalHoursColumn': 'Total Hours', // New
        'employeeTotalBalanceColumn': 'Total Balance Due', // New
        'editCustomRateTitle': 'Edit Custom Rate', // New
        'employeeNameLabel': 'Employee:', // New
        'accountNameLabel': 'Account:', // New
        'defaultPriceLabel': 'Default Price:', // New
        'customPriceInputLabel': 'Custom Price (EGP):', // New
        'rateUpdated': 'Custom rate updated successfully.', // New
        'invalidTime': 'Please enter valid values for minutes and seconds.', // New
        'invalidPrice': 'Please enter a valid price.', // New
        'modify': 'Modify', // New
        'notSet': 'Not Set', // New
        'unauthorizedAccess': 'Unauthorized access. Please log in as an administrator.' // New
    }
};

let currentLanguage = localStorage.getItem('appLanguage') || 'ar'; // Default to Arabic

const setLanguage = (lang) => {
    currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    applyTranslations();
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    // Re-render chart if it exists to update labels direction and colors
    if (taskChart) {
        taskChart.options.plugins.legend.rtl = (lang === 'ar');
        taskChart.options.plugins.tooltip.rtl = (lang === 'ar');
        // Update legend and title colors based on dark mode
        const isDarkMode = document.body.classList.contains('dark-mode');
        taskChart.options.plugins.legend.labels.color = isDarkMode ? '#e0e0e0' : '#333';
        taskChart.options.plugins.title.color = isDarkMode ? '#cadcff' : '#2c3e50';
        taskChart.update();
    }
    // Update PIN input direction if needed (usually handled by dir=rtl/ltr on html)
    pinInputs.forEach(input => {
        if (lang === 'ar') {
            input.style.direction = 'ltr'; // PIN numbers are usually LTR even in RTL context
        } else {
            input.style.direction = 'ltr';
        }
    });
};

const getTranslatedText = (key, params = {}) => {
    let text = translations[currentLanguage][key];
    if (text) {
        for (const param in params) {
            text = text.replace(`{${param}}`, params[param]);
        }
        return text;
    }
    return `[${key}]`; // Fallback for missing translation
};

const applyTranslations = () => {
    // Translate elements with data-key attribute
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
            element.placeholder = getTranslatedText(key);
        } else if (key === 'hello') {
            // Special handling for "Hello, [User Name]"
            element.childNodes[0].nodeValue = getTranslatedText(key);
        } else if (key === 'taskCount' || key === 'totalTimeRecorded' || key === 'totalHoursTitle' || key === 'totalBalanceTitle' || key === 'employeeNameLabel' || key === 'accountNameLabel' || key === 'defaultPriceLabel' || key === 'customPriceInputLabel') {
            // Special handling for summary table labels and dashboard titles and modal labels
            const spanElement = element.querySelector('span');
            if (spanElement) {
                spanElement.textContent = getTranslatedText(key);
            } else {
                element.textContent = getTranslatedText(key);
            }
        }
        else {
            element.textContent = getTranslatedText(key);
        }
    });

    // Specific elements that need manual translation or re-rendering
    // Update placeholder for dynamically added timing inputs
    const newTimingMinutesInputs = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    newTimingMinutesInputs.forEach(input => {
        input.placeholder = getTranslatedText('minutesPlaceholder');
    });
    const newTimingSecondsInputs = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    newTimingSecondsInputs.forEach(input => {
        input.placeholder = getTranslatedText('secondsPlaceholder');
    });

    // Update undo button text if they exist
    document.querySelectorAll('.undo-btn').forEach(btn => {
        btn.textContent = getTranslatedText('undoLastAdd');
    });

    // Re-render dynamic elements that contain text, like task timing buttons
    if (startWorkPage.style.display === 'flex' && taskSelectionPopup.style.display === 'none') {
         renderTaskTimingButtons(); // Re-render to update units
         updateWorkSummary(); // Re-render detailed summary
    }
    // Admin panel tables need re-rendering to update texts
    if (adminPanelPage.style.display === 'flex') {
        renderAdminPanel(); // This will call loadAndDisplay functions which re-render tables
    }
    // Re-render track work page to update headers and content
    if (trackWorkPage.style.display === 'flex') {
        renderTrackWorkPage();
    }
};

// 4. Session Management Functions
const saveSession = (user) => {
    const sessionExpiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    localStorage.setItem('sessionExpiry', sessionExpiry.toString());
};

const clearSession = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionExpiry');
    loggedInUser = null; // Clear in-memory user data
};

const loadSession = async () => {
    const storedUser = localStorage.getItem('loggedInUser');
    const storedExpiry = localStorage.getItem('sessionExpiry');

    if (storedUser && storedExpiry && Date.now() < parseInt(storedExpiry)) {
        loggedInUser = JSON.parse(storedUser);
        // Fetch all static data once on session load
        await fetchAllStaticData();
        if (loggedInUser.id === 'admin') {
            showPage(adminPanelPage); // This will hide loginPage
            await renderAdminPanel(); // Ensure admin panel is rendered
        } else {
            showPage(mainDashboard); // This will hide loginPage
            await renderMainDashboard(); // Ensure main dashboard is rendered
        }
        return true; // Session resumed
    } else {
        clearSession(); // Clear expired or invalid session
        // loginPage is already visible by default in HTML, no need to call showPage(loginPage)
        return false; // No session or not resumed
    }
};

// Warn user before leaving if there are unsaved tasks
window.addEventListener('beforeunload', (event) => {
    if (currentSessionTasks.length > 0 && !isSavingWork && loggedInUser && loggedInUser.id !== 'admin') {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome to show the prompt
        return ''; // Required for Firefox to show the prompt
    }
    // Optional: Add a general warning for session expiry if the user is logged in
    if (loggedInUser) {
        // This will show the browser's default "Are you sure you want to leave?" prompt.
        // Custom modals are not allowed here for security reasons.
        event.preventDefault();
        event.returnValue = getTranslatedText('sessionWarning');
        return getTranslatedText('sessionWarning');
    }
});

// New function to fetch all static data
const fetchAllStaticData = async () => {
    showLoadingIndicator(true);
    try {
        // Fetch Users
        const usersCollectionRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollectionRef);
        allUsers = usersSnapshot.docs.map(getDocData);

        // Fetch Accounts
        const accountsCollectionRef = collection(db, 'accounts');
        const accountsSnapshot = await getDocs(accountsCollectionRef);
        allAccounts = accountsSnapshot.docs.map(getDocData);

        // Fetch Task Definitions
        const tasksCollectionRef = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollectionRef);
        allTaskDefinitions = tasksSnapshot.docs.map(getDocData);

        console.log("All static data fetched and cached.");
    } catch (error) {
        console.error("Error fetching all static data:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// 5. Login Logic (Updated for 8 PIN fields)
const handleLogin = async () => {
    const fullPin = pinInputs.map(input => input.value).join('');
    loginError.style.display = 'none';

    if (fullPin.length !== 8 || !/^\d+$/.test(fullPin)) { // Check for 8 digits only
        loginError.textContent = getTranslatedText('pinError');
        loginError.style.display = 'block';
        return;
    }

    showLoadingIndicator(true);
    try {
        // Ensure adminPin document exists and retrieve its value
        const adminDocRef = doc(db, 'settings', 'adminPin'); 
        let adminPinValue = "12345678"; // Default admin PIN

        try {
            const adminDocSnapshot = await getDoc(adminDocRef); 
            
            // If the document exists, use its pin. Provide a fallback in case 'pin' field is missing.
            if (adminDocSnapshot.exists()) { 
                adminPinValue = adminDocSnapshot.data().pin || adminPinValue;
            } else {
                // If the document does not exist, create it with the default PIN
                await setDoc(adminDocRef, { pin: adminPinValue }); 
                console.log("Admin PIN document created with default PIN:", adminPinValue);
            }
        } catch (error) {
            console.error("Error fetching or creating admin PIN document:", error);
            // In case of an error accessing Firestore, we proceed with the default PIN.
            // The user will see a login error if the default PIN doesn't match their input.
        }

        // Fetch all static data immediately after successful login or session load
        await fetchAllStaticData();

        // Now use adminPinValue for comparison
        if (fullPin === adminPinValue) {
            loggedInUser = { id: 'admin', name: getTranslatedText('admin'), role: 'admin' };
            saveSession(loggedInUser); // Save admin session
            showPage(adminPanelPage);
            await renderAdminPanel(); // Call renderAdminPanel here after successful login
            pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
            return;
        }

        const usersCollectionRef = collection(db, 'users'); 
        const userQueryRef = query(usersCollectionRef, where('pin', '==', fullPin), limit(1)); 
        const userQuerySnapshot = await getDocs(userQueryRef); 

        if (!userQuerySnapshot.empty) {
            loggedInUser = getDocData(userQuerySnapshot.docs[0]);
            // Ensure user has a role, default to 'user' if not explicitly set
            if (!loggedInUser.role) {
                loggedInUser.role = 'user';
            }
            saveSession(loggedInUser); // Save user session
            showPage(mainDashboard);
            await renderMainDashboard(); // Call renderMainDashboard here after successful login
            pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
            return;
        }

        loginError.textContent = getTranslatedText('pinIncorrect');
        loginError.style.display = 'block';

    } catch (error) {
        console.error("Login error:", error);
        // Check if the error is due to network or permissions
        if (error.code === 'unavailable' || error.code === 'permission-denied') {
            showToastMessage(getTranslatedText('noInternet') + ' أو مشكلة في الصلاحيات.', 'error');
        } else {
            showToastMessage(getTranslatedText('loginError'), 'error');
        }
        loginError.textContent = getTranslatedText('loginError'); // Update login error message
        loginError.style.display = 'block';
    } finally {
        showLoadingIndicator(false);
    }
};

// Login button is removed, so no event listener for it.
// PIN input logic is handled in DOMContentLoaded.

// 6. Main Dashboard Logic (Updated for dynamic balance calculation)
const renderMainDashboard = async () => {
    if (!loggedInUser || loggedInUser.role === 'admin') {
        // If admin, they should not be on main dashboard, redirect to login or admin panel
        showPage(adminPanelPage); // Or loginPage if they are not truly admin
        return;
    }
    userNameDisplay.textContent = loggedInUser.name; // Display user name
    showLoadingIndicator(true);
    try {
        const userId = loggedInUser.id;
        const workRecordsCollectionRef = collection(db, 'workRecords'); 
        const recordsQueryRef = query(workRecordsCollectionRef, where('userId', '==', userId)); 
        const recordsSnapshot = await getDocs(recordsQueryRef); 
        let totalMinutesWorked = 0;
        let totalBalance = 0;
        
        // Fetch all accounts to get default prices
        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));

        // Fetch custom rates for the logged-in user
        const userCustomRatesMap = new Map(); // Map<accountId, customPricePerHour>
        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userAccountRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        userRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            userCustomRatesMap.set(rate.accountId, rate.customPricePerHour);
        });


        if (!recordsSnapshot.empty) {
            recordsSnapshot.forEach(doc => {
                const record = doc.data();
                totalMinutesWorked += record.totalTime; // totalTime is already in minutes

                const account = accountsMap.get(record.accountId);
                if (account) {
                    let pricePerHour = account.defaultPricePerHour || 0; // Default price
                    // Check if there's a custom rate for this user and account
                    if (userCustomRatesMap.has(record.accountId)) {
                        pricePerHour = userCustomRatesMap.get(record.accountId);
                    }
                    totalBalance += (record.totalTime / 60) * pricePerHour;
                }
            });
        }

        totalHoursDisplay.textContent = formatTotalMinutesToHHMMSS(totalMinutesWorked); // Display in HH:MM:SS
        totalBalanceDisplay.textContent = totalBalance.toFixed(2); // Display total balance

    } catch (error) {
        console.error("Error rendering dashboard:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

startWorkOptionBtn.addEventListener('click', async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(startWorkPage);
        await initializeStartWorkPage();
        updateSaveButtonState(); // Initial state for save button
    }
});

trackWorkOptionBtn.addEventListener('click', async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(trackWorkPage);
        await renderTrackWorkPage(); // This will now also render the chart
    }
});

// Logout Buttons
logoutDashboardBtn.addEventListener('click', () => {
    clearSession();
    showPage(loginPage);
    pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
    pinInputs[0].focus(); // Focus on first PIN input
});
logoutAdminBtn.addEventListener('click', () => {
    clearSession();
    showPage(loginPage);
    pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
    pinInputs[0].focus(); // Focus on first PIN input
});

// 7. Start Work Page Logic
const fetchAccountsAndTasks = async () => {
    // Now using cached data from allAccounts and allTaskDefinitions
    // No need to fetch from Firestore again here
    try {
        // Populate dropdowns from cached data
        accountSelect.innerHTML = `<option value="">${getTranslatedText('accountName')}</option>`;
        allAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            accountSelect.appendChild(option);
        });

        taskTypeSelect.innerHTML = `<option value="">${getTranslatedText('taskType')}</option>`;
        allTaskDefinitions.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            taskTypeSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating accounts or tasks from cache:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const initializeStartWorkPage = async () => {
    currentSessionTasks = [];
    completedTasksCount.textContent = '0';
    recordedTotalTime.textContent = '00:00'; // Initial display formatted
    detailedSummaryContainer.innerHTML = ''; // Clear detailed summary
    taskTimingButtonsContainer.innerHTML = '';
    selectedAccount = null;
    selectedTaskDefinition = null;
    taskDetailsContainer.style.display = 'none'; // Hide details until confirmed
    taskSelectionPopup.style.display = 'flex'; // Show popup for selection (using flex)
    accountSelect.value = "";
    taskTypeSelect.value = "";
    await fetchAccountsAndTasks(); // This now uses cached data
};

confirmSelectionBtn.addEventListener('click', () => {
    const accountId = accountSelect.value;
    const taskDefinitionId = taskTypeSelect.value;

    if (!accountId || !taskDefinitionId) {
        showToastMessage(getTranslatedText('selectAccountTask'), 'error'); // Changed alert to toast
        return;
    }

    selectedAccount = allAccounts.find(acc => acc.id === accountId);
    selectedTaskDefinition = allTaskDefinitions.find(task => task.id === taskDefinitionId);

    if (selectedAccount && selectedTaskDefinition) {
        taskSelectionPopup.style.display = 'none';
        taskDetailsContainer.style.display = 'block'; // Show details container
        renderTaskTimingButtons();
        updateWorkSummary(); // Initialize summary display
    } else {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error'); // Changed alert to toast
    }
});

// Event listener for the new "Back" button in the task selection popup
backToDashboardFromPopup.addEventListener('click', () => {
    if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
        return;
    }
    currentSessionTasks = []; // Clear tasks if user goes back without saving
    showPage(mainDashboard);
});

const renderTaskTimingButtons = () => {
    taskTimingButtonsContainer.innerHTML = '';
    if (selectedTaskDefinition && selectedTaskDefinition.timings && selectedTaskDefinition.timings.length > 0) {
        selectedTaskDefinition.timings.forEach((timingValue) => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('timing-button-wrapper');
            // Ensure wrapper has relative positioning for absolute child
            wrapper.style.position = 'relative'; 

            const button = document.createElement('button');
            button.classList.add('task-timing-btn');
            button.textContent = `${formatMinutesToMMSS(timingValue)}`; // Use formatted time
            button.dataset.timing = timingValue;
            button.addEventListener('click', () => {
                currentSessionTasks.push({
                    accountId: selectedAccount.id,
                    accountName: selectedAccount.name,
                    taskId: selectedTaskDefinition.id,
                    taskName: selectedTaskDefinition.name,
                    timing: parseFloat(timingValue),
                    timestamp: Date.now() // Use client-side timestamp for session
                });
                updateWorkSummary();
                // Show undo button for this specific timing
                wrapper.querySelector('.undo-btn').classList.add('show');
            });
            wrapper.appendChild(button);

            const undoButton = document.createElement('button');
            undoButton.classList.add('undo-btn');
            undoButton.textContent = getTranslatedText('undoLastAdd');
            // Initially hidden by CSS classes, will be shown with .show class
            undoButton.addEventListener('click', () => {
                // Find and remove the last added task of this specific timing
                const indexToRemove = currentSessionTasks.map(task => task.timing).lastIndexOf(parseFloat(timingValue));
                if (indexToRemove > -1) {
                    currentSessionTasks.splice(indexToRemove, 1); // Remove only one instance
                    updateWorkSummary();
                }
                // Hide undo button if no more tasks of this timing exist
                const countOfThisTiming = currentSessionTasks.filter(task => task.timing === parseFloat(timingValue)).length;
                if (countOfThisTiming === 0) {
                    undoButton.classList.remove('show');
                }
            });
            wrapper.appendChild(undoButton);
            taskTimingButtonsContainer.appendChild(wrapper);
        });
    } else {
         taskTimingButtonsContainer.innerHTML = `<p style="text-align: center; color: #888;">${getTranslatedText('noDataToShow')}</p>`;
    }
};

const updateWorkSummary = () => {
    let totalCount = 0;
    let totalTime = 0;
    
    // Group tasks by timing for detailed summary
    const timingSummary = {};
    
    currentSessionTasks.forEach(task => {
        const timingKey = task.timing.toFixed(1); // Use fixed decimal for key consistency
        if (!timingSummary[timingKey]) {
            timingSummary[timingKey] = { count: 0, totalTime: 0 };
        }
        timingSummary[timingKey].count++;
        timingSummary[timingKey].totalTime += task.timing;
        totalCount++; // Global count
        totalTime += task.timing; // Global total time
    });

    completedTasksCount.textContent = totalCount;
    recordedTotalTime.textContent = formatMinutesToMMSS(totalTime); // Use formatted time

    detailedSummaryContainer.innerHTML = ''; // Clear previous content

    // Display detailed summary for each timing
    if (Object.keys(timingSummary).length > 0) {
        const heading = document.createElement('h3');
        heading.textContent = getTranslatedText('taskDetailsByTiming');
        detailedSummaryContainer.appendChild(heading);
        
        // Sort timings for consistent display
        const sortedTimings = Object.keys(timingSummary).sort((a, b) => parseFloat(a) - parseFloat(b));

        sortedTimings.forEach(timing => {
            const summary = timingSummary[timing];
            const p = document.createElement('p');
            p.textContent = getTranslatedText('tasksTiming', {
                timing: formatMinutesToMMSS(parseFloat(timing)), // Use formatted time
                count: summary.count,
                totalTime: formatMinutesToMMSS(summary.totalTime) // Use formatted time
            });
            detailedSummaryContainer.appendChild(p);
        });
    }
    updateSaveButtonState(); // Update save button state
};

const updateSaveButtonState = () => {
    saveWorkBtn.disabled = currentSessionTasks.length === 0;
    if (currentSessionTasks.length === 0) {
        saveWorkBtn.classList.add('disabled');
    } else {
        saveWorkBtn.classList.remove('disabled');
    }
};

saveWorkBtn.addEventListener('click', async () => {
    if (currentSessionTasks.length === 0) {
        showToastMessage(getTranslatedText('noTasksToSave'), 'error'); // Changed alert to toast
        return;
    }

    if (!confirm(getTranslatedText('confirmSave'))) {
        return;
    }

    isSavingWork = true; // Set flag to true before saving
    showLoadingIndicator(true);

    try {
        const recordData = {
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            accountId: selectedAccount.id,
            accountName: selectedAccount.name,
            taskDefinitionId: selectedTaskDefinition.id,
            taskDefinitionName: selectedTaskDefinition.name,
            recordedTimings: currentSessionTasks.map(t => ({
                timing: t.timing,
                timestamp: t.timestamp
            })),
            totalTasksCount: currentSessionTasks.length, // Total count of tasks in this record
            totalTime: currentSessionTasks.reduce((sum, task) => sum + task.timing, 0), // Total time for this record
            timestamp: serverTimestamp() // Use direct import serverTimestamp
        };

        await addDoc(collection(db, 'workRecords'), recordData); // Use direct imports addDoc, collection
        showToastMessage(getTranslatedText('workSavedSuccess'), 'success');
        currentSessionTasks = [];
        isSavingWork = false; // Reset flag
        showPage(mainDashboard);
        await renderMainDashboard();
    } catch (error) {
        console.error("Error saving work:", error);
        showToastMessage(getTranslatedText('errorSavingWork'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
});

// Back button from Start Work Page
backToDashboardFromStartWork.addEventListener('click', () => {
    if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
        return;
    }
    currentSessionTasks = []; // Clear tasks if user abandons it
    showPage(mainDashboard);
});

// 8. Track Work Page Logic
const renderTrackWorkPage = async () => {
    if (!loggedInUser || loggedInUser.id === 'admin') {
        showPage(loginPage);
        return;
    }
    trackTasksTableBody.innerHTML = '';
    trackTasksTableFoot.innerHTML = ''; // Clear footer
    showLoadingIndicator(true);
    try {
        const userId = loggedInUser.id;
        const workRecordsCollectionRef = collection(db, 'workRecords'); 
        const recordsQueryRef = query(workRecordsCollectionRef, where('userId', '==', userId), orderBy('timestamp', 'desc')); 
        const recordsSnapshot = await getDocs(recordsQueryRef); 

        if (recordsSnapshot.empty) {
            const row = trackTasksTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 10; // Adjusted colspan for new table structure (was 9)
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
            showLoadingIndicator(false);
            // Destroy chart if no data
            if (taskChart) {
                taskChart.destroy();
                taskChart = null;
            }
            return;
        }

        // Data processing for the complex table
        const processedData = {};
        let grandTotalTasks = 0;
        let grandTotalTime = 0;
        let chartDataForUser = {}; // For the chart on this page

        // Fetch all accounts to get default prices
        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));

        // Fetch custom rates for the logged-in user
        const userCustomRatesMap = new Map(); // Map<accountId, customPricePerHour>
        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userAccountRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        userRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            userCustomRatesMap.set(rate.accountId, rate.customPricePerHour);
        });


        recordsSnapshot.forEach(documentSnapshot => { 
            const record = documentSnapshot.data();
            // Ensure timestamp is a Date object before formatting
            const recordDateObj = record.timestamp ? new Date(record.timestamp.toDate()) : new Date();
            const recordDate = recordDateObj.toLocaleDateString('en-CA'); // ISO 8601 format (YYYY-MM-DD) for consistent grouping

            if (!processedData[recordDate]) {
                processedData[recordDate] = { accounts: {}, dateTotalTasks: 0, dateTotalTime: 0, dateTotalBalance: 0, totalRows: 0 };
            }
            if (!processedData[recordDate].accounts[record.accountId]) {
                processedData[recordDate].accounts[record.accountId] = { name: record.accountName, tasks: {}, accountTotalTasks: 0, accountTotalTime: 0, accountTotalBalance: 0, totalRows: 0 };
            }
            // Group by taskDefinitionId, but also include the specific record's time for display
            // Use documentSnapshot.id for a truly unique key for each record to avoid merging different records of the same task type
            const taskRecordKey = documentSnapshot.id; 
            if (!processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey]) {
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey] = {
                    name: record.taskDefinitionName,
                    timings: {},
                    taskTotalTasks: 0,
                    taskTotalTime: 0,
                    taskTotalBalance: 0,
                    totalRows: 0 // To calculate rowspan for the task
                };
            }

            record.recordedTimings.forEach(rt => {
                const timingKey = rt.timing.toFixed(1); // Use fixed decimal for key consistency
                if (!processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey]) {
                    processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey] = { count: 0, totalTime: 0 };
                }
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey].count++;
                processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].timings[timingKey].totalTime += rt.timing;

                // Aggregate for chart
                chartDataForUser[record.taskDefinitionName] = (chartDataForUser[record.taskDefinitionName] || 0) + rt.timing;
            });

            // Update totals for the specific record
            processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].taskTotalTasks += record.totalTasksCount;
            processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].taskTotalTime += record.totalTime;

            // Calculate balance for this record using applicable price
            const account = accountsMap.get(record.accountId);
            let pricePerHour = account ? (account.defaultPricePerHour || 0) : 0;
            if (userCustomRatesMap.has(record.accountId)) {
                pricePerHour = userCustomRatesMap.get(record.accountId);
            }
            const recordBalance = (record.totalTime / 60) * pricePerHour;
            processedData[recordDate].accounts[record.accountId].tasks[taskRecordKey].taskTotalBalance += recordBalance;


            // Update totals for account and date
            processedData[recordDate].accounts[record.accountId].accountTotalTasks += record.totalTasksCount;
            processedData[recordDate].accounts[record.accountId].accountTotalTime += record.totalTime;
            processedData[recordDate].accounts[record.accountId].accountTotalBalance += recordBalance;

            processedData[recordDate].dateTotalTasks += record.totalTasksCount;
            processedData[recordDate].dateTotalTime += record.totalTime;
            processedData[recordDate].dateTotalBalance += recordBalance;

            grandTotalTasks += record.totalTasksCount;
            grandTotalTime += record.totalTime;
        });

        // Second pass to calculate totalRows for accounts and dates
        for (const dateKey in processedData) {
            const dateData = processedData[dateKey];
            dateData.totalRows = 0;
            for (const accountId in dateData.accounts) {
                const accountData = dateData.accounts[accountId];
                accountData.totalRows = 0;
                for (const taskRecordKey in accountData.tasks) {
                    const taskData = accountData.tasks[taskRecordKey];
                    accountData.totalRows += taskData.totalRows;
                }
                dateData.totalRows += accountData.totalRows;
            }
        }


        // Render Chart
        if (taskChart) {
            taskChart.destroy(); // Destroy existing chart before creating a new one
        }

        const chartLabels = Object.keys(chartDataForUser);
        const chartDataValues = Object.values(chartDataForUser);

        const isDarkMode = document.body.classList.contains('dark-mode');
        const legendTextColor = isDarkMode ? '#e0e0e0' : '#333';
        const titleTextColor = isDarkMode ? '#cadcff' : '#2c3e50';

        taskChart = new Chart(taskChartCanvas, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartDataValues,
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#17a2b8', '#dc3545', '#6c757d', '#fd7e14', '#663399', '#ff6384', '#36a2eb'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to resize freely
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: legendTextColor // Adjust legend text color for dark mode
                        },
                        rtl: (currentLanguage === 'ar') // Set RTL for legend
                    },
                    title: {
                        display: true,
                        text: getTranslatedText('totalTimeRecorded'), // Use translated title
                        color: titleTextColor // Adjust title text color for dark mode
                    },
                    tooltip: {
                        rtl: (currentLanguage === 'ar') // Set RTL for tooltips
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });


        // Render Table
        let serialCounter = 1;
        const sortedDates = Object.keys(processedData).sort((a, b) => new Date(b) - new Date(a)); // Sort dates descending

        for (const dateKey of sortedDates) {
            const dateData = processedData[dateKey];
            const sortedAccountIds = Object.keys(dateData.accounts).sort((a, b) => {
                const nameA = dateData.accounts[a].name;
                const nameB = dateData.accounts[b].name;
                return nameA.localeCompare(nameB, currentLanguage);
            }); // Sort accounts alphabetically

            let dateRowSpanHandled = false; // Flag to ensure date/daily total cell is added only once per date group

            for (const accountId of sortedAccountIds) {
                const accountData = dateData.accounts[accountId];
                const sortedTaskRecordKeys = Object.keys(accountData.tasks).sort((a, b) => {
                    const taskA = accountData.tasks[a];
                    const taskB = accountData.tasks[b];
                    // Sort by task name first, then by total time (descending)
                    if (taskA.name !== taskB.name) {
                        return taskA.name.localeCompare(taskB.name, currentLanguage);
                    }
                    return taskB.taskTotalTime - taskA.taskTotalTime;
                });
                let accountRowSpanHandled = false; // Flag to ensure account name and total for account cells are added only once per account group

                for (const taskRecordKey of sortedTaskRecordKeys) {
                    const taskData = accountData.tasks[taskRecordKey];
                    const sortedTimings = Object.keys(taskData.timings).sort((a, b) => parseFloat(a) - parseFloat(b));
                    const timingsCount = sortedTimings.length;
                    const actualTaskRows = timingsCount > 0 ? timingsCount : 1; // At least one row for task

                    let taskRowSpanHandled = false; // Flag to ensure task name and total for task cells are added only once per task record

                    for (let i = 0; i < actualTaskRows; i++) {
                        const row = trackTasksTableBody.insertRow();
                        // Add a class to the row for styling the border
                        row.classList.add('daily-record-row');

                        // Column 1: Serial Number (per account)
                        if (!accountRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = serialCounter++; // Increment serial per account
                            cell.rowSpan = accountData.totalRows;
                            cell.classList.add('total-cell');
                        }

                        // Column 2: Date (per date) - Removed time
                        if (!dateRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = new Date(dateKey).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US');
                            cell.rowSpan = dateData.totalRows;
                            cell.classList.add('total-cell', 'date-cell'); // Add date-cell class
                        }

                        // Column 3: Account Name (per account)
                        if (!accountRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = accountData.name;
                            cell.rowSpan = accountData.totalRows;
                            cell.classList.add('total-cell');
                        }

                        // Column 4: Task Name (per task record)
                        if (!taskRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = taskData.name;
                            cell.rowSpan = actualTaskRows;
                        }

                        // Column 5: Timing Value (per timing)
                        const timingValueCell = row.insertCell();
                        const currentTiming = timingsCount > 0 ? taskData.timings[sortedTimings[i]] : null;
                        if (currentTiming) {
                            timingValueCell.textContent = formatMinutesToMMSS(parseFloat(sortedTimings[i]));
                        } else {
                            timingValueCell.textContent = '00:00';
                        }

                        // Column 6: Completed Tasks (per timing)
                        const completedTasksCell = row.insertCell();
                        if (currentTiming) {
                            completedTasksCell.textContent = currentTiming.count;
                        } else {
                            completedTasksCell.textContent = '0';
                        }

                        // Column 7: Total Time (per timing)
                        const totalTimeCell = row.insertCell();
                        if (currentTiming) {
                            totalTimeCell.textContent = formatMinutesToMMSS(currentTiming.totalTime);
                        } else {
                            totalTimeCell.textContent = '00:00';
                        }

                        // Column 8: Total for Task (per task record)
                        if (!taskRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = `${formatMinutesToMMSS(taskData.taskTotalTime)} (${taskData.taskTotalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')})`;
                            cell.rowSpan = actualTaskRows;
                            cell.classList.add('total-cell');
                        }

                        // Column 9: Total for Account (per account)
                        if (!accountRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = `${formatMinutesToMMSS(accountData.accountTotalTime)} (${accountData.accountTotalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')})`;
                            cell.rowSpan = accountData.totalRows;
                            cell.classList.add('total-cell');
                        }

                        // Column 10: Daily Total Time (per date) - New column
                        if (!dateRowSpanHandled) {
                            const cell = row.insertCell();
                            cell.textContent = `${formatMinutesToMMSS(dateData.dateTotalTime)} (${dateData.dateTotalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')})`; // Display daily total
                            cell.rowSpan = dateData.totalRows;
                            cell.classList.add('total-cell', 'daily-total-cell'); // Add daily-total-cell class
                        }

                        // Update flags
                        if (!dateRowSpanHandled) {
                            dateRowSpanHandled = true;
                        }
                        if (!accountRowSpanHandled) {
                            accountRowSpanHandled = true;
                        }
                        if (!taskRowSpanHandled) {
                            taskRowSpanHandled = true;
                        }
                    }
                }
            }
        }

        // Render Footer (Grand Totals)
        const footerRow = trackTasksTableFoot.insertRow();
        
        // Grand Total label
        let cell = footerRow.insertCell();
        cell.colSpan = 4; 
        cell.textContent = getTranslatedText('grandTotal');
        cell.classList.add('grand-total-label');

        // Total Tasks Overall value
        cell = footerRow.insertCell();
        cell.colSpan = 2; // Span across Timing Value, Completed Tasks
        cell.textContent = `${getTranslatedText('totalTasksOverall')}: ${grandTotalTasks}`;
        cell.classList.add('grand-total-value');

        // Total Time Overall value
        cell = footerRow.insertCell();
        cell.colSpan = 2; // Span across Total Time, Total for Task
        cell.textContent = `${getTranslatedText('totalTimeOverall')}: ${formatTotalMinutesToHHMMSS(grandTotalTime)}`;
        cell.classList.add('grand-total-value');

        // Total Balance Overall
        cell = footerRow.insertCell();
        cell.colSpan = 2; // Span across Total for Account, Daily Total Time
        // Recalculate grand total balance using the logic from main dashboard
        let grandTotalBalance = 0;
        recordsSnapshot.forEach(docSnap => {
            const record = docSnap.data();
            const account = accountsMap.get(record.accountId);
            if (account) {
                let pricePerHour = account.defaultPricePerHour || 0;
                if (userCustomRatesMap.has(record.accountId)) {
                    pricePerHour = userCustomRatesMap.get(record.accountId);
                }
                grandTotalBalance += (record.totalTime / 60) * pricePerHour;
            }
        });
        cell.textContent = `${getTranslatedText('totalBalanceOverall')}: ${grandTotalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
        cell.classList.add('grand-total-value');

        // Apply styling to grand total cells
        Array.from(trackTasksTableFoot.rows).forEach(row => {
            Array.from(row.cells).forEach(c => {
                c.style.fontWeight = 'bold';
                // Use CSS classes for background and border for dark mode compatibility
                c.classList.add('grand-total-footer-cell'); 
            });
        });


    } catch (error) {
        console.error("Error rendering track work page:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

backToDashboardFromTrackBtn.addEventListener('click', () => {
    showPage(mainDashboard);
});

// 9. Admin Panel Logic
const renderAdminPanel = async () => {
    if (!loggedInUser || loggedInUser.id !== 'admin') {
        showPage(loginPage);
        showToastMessage(getTranslatedText('unauthorizedAccess'), 'error'); // Show unauthorized message
        return;
    }
    showLoadingIndicator(true); // Start loading indicator for admin panel
    try {
        // These functions now use cached data
        await loadAndDisplayUsers();
        await loadAndDisplayAccounts();
        await loadAndDisplayTaskDefinitions();
        await populateUserFilter(); // Populate user filter dropdown
        recordFilterDate.valueAsDate = new Date(); // Set default date to today
        await loadAndDisplayWorkRecords(null, recordFilterDate.value); // Load all records initially for today
        await renderEmployeeRatesAndTotals(); // New function call
    } catch (error) {
        console.error("Error rendering admin panel:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false); // Hide loading indicator after all admin data is loaded
    }
};

// Admin: Manage Users
const loadAndDisplayUsers = async () => {
    usersTableBody.innerHTML = '';
    try {
        // Use cached allUsers data
        console.log("Users fetched for admin panel (from cache):", allUsers.length); // Debug log
        if (allUsers.length === 0) {
            const row = usersTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            allUsers.forEach(user => { // Iterate over cached users
                console.log("Processing user for admin panel:", user.name); // Debug log for each user
                const row = usersTableBody.insertRow();
                row.insertCell().textContent = user.name;
                row.insertCell().textContent = user.pin;
                const actionCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btn', 'delete');
                deleteBtn.addEventListener('click', async () => {
                    // Prevent deleting admin user from UI
                    if (user.id === 'admin') { // Check if it's the admin user
                        showToastMessage(getTranslatedText('notImplemented'), 'error'); // Or a specific message like 'Cannot delete admin user'
                        return;
                    }
                    if (confirm(getTranslatedText('confirmDeleteUser', { name: user.name }))) {
                        showLoadingIndicator(true);
                        try {
                            await deleteDoc(doc(db, 'users', user.id)); 
                            showToastMessage(getTranslatedText('userDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            await loadAndDisplayUsers(); // Reload after delete
                            await populateUserFilter(); // Update user filter dropdown
                            await renderEmployeeRatesAndTotals(); // Update employee rates table
                        } catch (err) {
                            console.error("Error deleting user:", err);
                            showToastMessage(getTranslatedText('errorAddingUser'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                        }
                    }
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        console.error("Error loading users:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

addUserBtn.addEventListener('click', async () => {
    const name = newUserNameInput.value.trim();
    const pin = newUserPINInput.value.trim();

    if (!name || pin.length !== 8 || !/^\d+$/.test(pin)) { // Ensure PIN is 8 digits and numeric
        showToastMessage(getTranslatedText('enterUserNamePin'), 'error'); // Changed alert to toast
        return;
    }
    showLoadingIndicator(true);
    try {
        const usersCollectionRef = collection(db, 'users'); 
        const existingUserQueryRef = query(usersCollectionRef, where('pin', '==', pin), limit(1)); 
        const existingUserSnapshot = await getDocs(existingUserQueryRef); 
        if (!existingUserSnapshot.empty) {
            showToastMessage(getTranslatedText('pinAlreadyUsed'), 'error'); // Changed alert to toast
            showLoadingIndicator(false);
            return;
        }

        await addDoc(usersCollectionRef, { name: name, pin: pin, role: 'user' }); 
        showToastMessage(getTranslatedText('userAddedSuccess'), 'success');
        newUserNameInput.value = '';
        newUserPINInput.value = '';
        await fetchAllStaticData(); // Re-fetch all static data after adding
        await loadAndDisplayUsers();
        await populateUserFilter(); // Re-populate user filter after adding a new user
        await renderEmployeeRatesAndTotals(); // Update employee rates table
    } catch (error) {
        console.error("Error adding user:", error);
        showToastMessage(getTranslatedText('errorAddingUser'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
});

// Admin: Manage Accounts (Updated for defaultPricePerHour)
const loadAndDisplayAccounts = async () => {
    accountsTableBody.innerHTML = '';
    try {
        // Use cached allAccounts data
        console.log("Accounts fetched for admin panel (from cache):", allAccounts.length); // Debug log
        if (allAccounts.length === 0) {
            const row = accountsTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3; // Adjusted colspan for new column
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            allAccounts.forEach(account => { // Iterate over cached accounts
                console.log("Processing account for admin panel:", account.name); // Debug log
                const row = accountsTableBody.insertRow();
                row.insertCell().textContent = account.name;
                row.insertCell().textContent = (account.defaultPricePerHour || 0).toFixed(2); // Display default price
                const actionCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btn', 'delete');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(getTranslatedText('confirmDeleteAccount', { name: account.name }))) {
                        showLoadingIndicator(true);
                        try {
                            await deleteDoc(doc(db, 'accounts', account.id)); 
                            showToastMessage(getTranslatedText('accountDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            await loadAndDisplayAccounts(); // Reload after delete
                            await renderEmployeeRatesAndTotals(); // Update employee rates table
                        } catch (err) {
                            console.error("Error deleting account:", err);
                            showToastMessage(getTranslatedText('errorAddingAccount'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                        }
                    }
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        console.error("Error loading accounts:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

addAccountBtn.addEventListener('click', async () => {
    const name = newAccountNameInput.value.trim();
    const defaultPrice = parseFloat(newAccountPriceInput.value); // Get default price

    if (!name || isNaN(defaultPrice) || defaultPrice < 0) { // Validate price
        showToastMessage(getTranslatedText('enterAccountName'), 'error'); // Changed alert to toast
        return;
    }
    showLoadingIndicator(true);
    try {
        const accountsCollectionRef = collection(db, 'accounts'); 
        const existingAccountQueryRef = query(accountsCollectionRef, where('name', '==', name), limit(1)); 
        const existingAccountSnapshot = await getDocs(existingAccountQueryRef); 
        if (!existingAccountSnapshot.empty) {
            showToastMessage(getTranslatedText('accountExists'), 'error'); // Changed alert to toast
            showLoadingIndicator(false);
            return;
        }

        await addDoc(accountsCollectionRef, { name: name, defaultPricePerHour: defaultPrice }); // Save default price
        showToastMessage(getTranslatedText('accountAddedSuccess'), 'success');
        newAccountNameInput.value = '';
        newAccountPriceInput.value = ''; // Clear price input
        await fetchAllStaticData(); // Re-fetch all static data after adding
        await loadAndDisplayAccounts();
        await renderEmployeeRatesAndTotals(); // Update employee rates table
    } catch (error) {
        console.error("Error adding account:", error);
        showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
});

// Admin: Manage Task Definitions (Updated for minutes and seconds input)
const loadAndDisplayTaskDefinitions = async () => {
    tasksDefinitionTableBody.innerHTML = '';
    try {
        // Use cached allTaskDefinitions data
        console.log("Task Definitions fetched for admin panel (from cache):", allTaskDefinitions.length); // Debug log
        if (allTaskDefinitions.length === 0) {
            const row = tasksDefinitionTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = getTranslatedText('noDataToShow');
            cell.style.textAlign = 'center';
        } else {
            allTaskDefinitions.forEach(task => { // Iterate over cached tasks
                console.log("Processing task definition for admin panel:", task.name); // Debug log
                const row = tasksDefinitionTableBody.insertRow();
                row.insertCell().textContent = task.name;
                
                const timingsCell = row.insertCell();
                if (task.timings && task.timings.length > 0) {
                    // Display timings in MM:SS format
                    const timingStrings = task.timings.map(t => formatMinutesToMMSS(t));
                    timingsCell.textContent = timingStrings.join(', ');
                } else {
                    timingsCell.textContent = getTranslatedText('noTimings'); // Or empty
                }

                const actionCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btn', 'delete');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(getTranslatedText('confirmDeleteTask', { name: task.name }))) {
                        showLoadingIndicator(true);
                        try {
                            await deleteDoc(doc(db, 'tasks', task.id)); 
                            showToastMessage(getTranslatedText('taskDeletedSuccess'), 'success');
                            await fetchAllStaticData(); // Re-fetch all static data after deletion
                            await loadAndDisplayTaskDefinitions(); // Reload after delete
                        } catch (err) {
                            console.error("Error deleting task definition:", err);
                            showToastMessage(getTranslatedText('errorAddingTask'), 'error'); // Reusing translation key
                        } finally {
                            showLoadingIndicator(false);
                        }
                    }
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        console.error("Error loading task definitions:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

addTimingFieldBtn.addEventListener('click', () => {
    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.classList.add('new-task-timing-minutes');
    minutesInput.placeholder = getTranslatedText('minutesPlaceholder');
    minutesInput.min = '0';

    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.classList.add('new-task-timing-seconds');
    secondsInput.placeholder = getTranslatedText('secondsPlaceholder');
    secondsInput.min = '0';
    secondsInput.max = '59';

    const timingGroupDiv = document.createElement('div');
    timingGroupDiv.classList.add('timing-input-group'); // Apply the new flex styling
    timingGroupDiv.appendChild(minutesInput);
    timingGroupDiv.appendChild(secondsInput);

    newTimingsContainer.appendChild(timingGroupDiv);
});

addTaskDefinitionBtn.addEventListener('click', async () => {
    const name = newTaskNameInput.value.trim();
    if (!name) {
        showToastMessage(getTranslatedText('fillAllFields'), 'error'); // Changed alert to toast
        return;
    }

    const timingInputsMinutes = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    const timingInputsSeconds = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    const timings = [];
    let hasValidTimings = false;

    timingInputsMinutes.forEach((minInput, index) => {
        const secInput = timingInputsSeconds[index];
        const minutes = parseInt(minInput.value);
        const seconds = parseInt(secInput.value);

        if (!isNaN(minutes) && minutes >= 0 && !isNaN(seconds) && seconds >= 0 && seconds < 60) {
            const totalMinutes = minutes + (seconds / 60);
            timings.push(totalMinutes);
            hasValidTimings = true;
        } else if (minInput.value !== '' || secInput.value !== '') { // If fields are not empty but invalid
            showToastMessage(getTranslatedText('invalidTime'), 'error');
            return; // Exit if invalid time is found
        }
    });

    if (!hasValidTimings) {
        showToastMessage(getTranslatedText('enterTaskNameTiming'), 'error'); // Changed alert to toast
        return;
    }

    showLoadingIndicator(true);
    try {
        const tasksCollectionRef = collection(db, 'tasks'); 
        const existingTaskQueryRef = query(tasksCollectionRef, where('name', '==', name), limit(1)); 
        const existingTaskSnapshot = await getDocs(existingTaskQueryRef); 
        if (!existingTaskSnapshot.empty) {
            showToastMessage(getTranslatedText('taskExists'), 'error'); // Changed alert to toast
            showLoadingIndicator(false);
            return;
        }

        await addDoc(tasksCollectionRef, { name: name, timings: timings }); 
        showToastMessage(getTranslatedText('taskAddedSuccess'), 'success');
        newTaskNameInput.value = '';
        newTimingsContainer.innerHTML = `
            <div class="timing-input-group">
                <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0" data-key="minutesPlaceholder">
                <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59" data-key="secondsPlaceholder">
            </div>
        `; // Reset to one pair
        await fetchAllStaticData(); // Re-fetch all static data after adding
        await loadAndDisplayTaskDefinitions();
    } catch (error) {
        console.error("Error adding task definition:", error);
        showToastMessage(getTranslatedText('errorAddingTask'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
});

// Admin: Manage Work Records
const populateUserFilter = async () => {
    recordFilterUser.innerHTML = `<option value="">${getTranslatedText('allUsers')}</option>`;
    try {
        // Use cached allUsers data
        allUsers.forEach(user => { // Iterate over cached users
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            recordFilterUser.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating user filter (from cache):", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const loadAndDisplayWorkRecords = async (userId = null, date = null) => {
    workRecordsTableBody.innerHTML = '';
    showLoadingIndicator(true);
    try {
        const workRecordsCollectionRef = collection(db, 'workRecords'); 
        let recordsQuery = query(workRecordsCollectionRef, orderBy('timestamp', 'desc')); 

        if (userId) {
            recordsQuery = query(recordsQuery, where('userId', '==', userId)); 
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            recordsQuery = query(recordsQuery,
                where('timestamp', '>=', Timestamp.fromDate(startOfDay)), 
                where('timestamp', '<=', Timestamp.fromDate(endOfDay)) 
            );
        }

        const recordsSnapshot = await getDocs(recordsQuery); 
        console.log("Work Records fetched for admin panel:", recordsSnapshot.docs.length); 
        if (recordsSnapshot.empty) {
            const row = workRecordsTableBody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 7;
            cell.textContent = getTranslatedText('noMatchingRecords');
            cell.style.textAlign = 'center';
        } else {
            recordsSnapshot.forEach(documentSnapshot => { 
                const record = getDocData(documentSnapshot);
                console.log("Processing work record for admin panel:", record.id); 
                const row = workRecordsTableBody.insertRow();
                row.insertCell().textContent = record.userName;
                row.insertCell().textContent = record.accountName;
                row.insertCell().textContent = record.taskDefinitionName;
                row.insertCell().textContent = record.totalTasksCount;
                row.insertCell().textContent = formatMinutesToMMSS(record.totalTime); // Format total time
                row.insertCell().textContent = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US') : 'N/A'; // Format date
                
                const actionCell = row.insertCell();
                const editBtn = document.createElement('button');
                editBtn.textContent = getTranslatedText('editRecord');
                editBtn.classList.add('admin-action-btn');
                editBtn.addEventListener('click', () => openEditRecordModal(record));
                actionCell.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = getTranslatedText('deleteBtn');
                deleteBtn.classList.add('admin-action-btn', 'delete');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(getTranslatedText('confirmDeleteRecord', { name: record.userName }))) {
                        showLoadingIndicator(true);
                        try {
                            await deleteDoc(doc(db, 'workRecords', record.id)); 
                            showToastMessage(getTranslatedText('recordDeletedSuccess'), 'success');
                            await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value); // Reload with current filters
                            await renderEmployeeRatesAndTotals(); // Update employee rates table
                        } catch (err) {
                            console.error("Error deleting record:", err);
                            showToastMessage(getTranslatedText('errorDeletingRecord'), 'error');
                        } finally {
                            showLoadingIndicator(false);
                        }
                    }
                });
                actionCell.appendChild(deleteBtn);
            });
        }
    } catch (error) {
        console.error("Error loading work records:", error);
        showToastMessage(getTranslatedText('errorLoadingRecords'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

filterRecordsBtn.addEventListener('click', async () => {
    const selectedUserId = recordFilterUser.value === "" ? null : recordFilterUser.value;
    const selectedDate = recordFilterDate.value === "" ? null : recordFilterDate.value;
    showLoadingIndicator(true); // Show loading for filter action
    try {
        await loadAndDisplayWorkRecords(selectedUserId, selectedDate);
    } finally {
        showLoadingIndicator(false); // Hide loading after filter
    }
});

// Edit Record Modal Functions
const openEditRecordModal = (record) => {
    currentEditingRecordId = record.id;

    // Populate accounts select from cached data
    editAccountSelect.innerHTML = '';
    allAccounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = acc.name;
        editAccountSelect.appendChild(option);
    });
    editAccountSelect.value = record.accountId;

    // Populate tasks select from cached data
    editTaskTypeSelect.innerHTML = '';
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        editTaskTypeSelect.appendChild(option);
    });
    editTaskTypeSelect.value = record.taskDefinitionId;

    editTotalTasksCount.value = record.totalTasksCount;
    editTotalTime.value = record.totalTime.toFixed(2); // Keep as decimal for input

    // Populate date and time inputs
    if (record.timestamp) {
        const recordDate = new Date(record.timestamp.toDate());
        editRecordDate.value = recordDate.toISOString().split('T')[0]; // ISO 8601 (YYYY-MM-DD)
        editRecordTime.value = recordDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    } else {
        editRecordDate.value = '';
        editRecordTime.value = '';
    }

    editRecordModal.style.display = 'flex'; // Use flex to center
};

closeEditRecordModalBtn.addEventListener('click', () => {
    editRecordModal.style.display = 'none';
    currentEditingRecordId = null;
});

window.addEventListener('click', (event) => {
    if (event.target === editRecordModal) {
        editRecordModal.style.display = 'none';
        currentEditingRecordId = null;
    }
});

saveEditedRecordBtn.addEventListener('click', async () => {
    if (!currentEditingRecordId) return;

    const newAccountId = editAccountSelect.value;
    const newTaskDefinitionId = editTaskTypeSelect.value;
    const newTotalTasksCount = parseInt(editTotalTasksCount.value);
    const newTotalTime = parseFloat(editTotalTime.value);
    const newDate = editRecordDate.value;
    const newTime = editRecordTime.value;

    if (!newAccountId || !newTaskDefinitionId || isNaN(newTotalTasksCount) || newTotalTasksCount < 0 || isNaN(newTotalTime) || newTotalTime < 0 || !newDate || !newTime) {
        showToastMessage(getTranslatedText('invalidEditData'), 'error'); // Changed alert to toast
        return;
    }

    const newAccountName = allAccounts.find(acc => acc.id === newAccountId)?.name || 'Unknown';
    const newTaskDefinitionName = allTaskDefinitions.find(task => task.id === newTaskDefinitionId)?.name || 'Unknown';

    // Combine date and time into a new Date object for timestamp
    const newTimestampDate = new Date(`${newDate}T${newTime}:00`); // Assuming time is HH:MM
    const newTimestamp = Timestamp.fromDate(newTimestampDate); // Use direct import Timestamp

    showLoadingIndicator(true);
    try {
        const recordDocRef = doc(db, 'workRecords', currentEditingRecordId); 
        await updateDoc(recordDocRef, { 
            accountId: newAccountId,
            accountName: newAccountName,
            taskDefinitionId: newTaskDefinitionId,
            taskDefinitionName: newTaskDefinitionName,
            totalTasksCount: newTotalTasksCount,
            totalTime: newTotalTime,
            timestamp: newTimestamp, // Update the main timestamp of the record
            lastModified: serverTimestamp() 
        });
        showToastMessage(getTranslatedText('recordUpdatedSuccess'), 'success');
        editRecordModal.style.display = 'none';
        currentEditingRecordId = null;
        await loadAndDisplayWorkRecords(recordFilterUser.value, recordFilterDate.value); // Reload records
        await renderEmployeeRatesAndTotals(); // Update employee rates table
    } catch (error) {
        console.error("Error updating record:", error);
        showToastMessage(getTranslatedText('errorUpdatingRecord'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
});

// --- New Admin Section: Employee Rates and Totals ---

const renderEmployeeRatesAndTotals = async () => {
    employeeRatesTableBody.innerHTML = '';
    showLoadingIndicator(true);
    try {
        // Use cached allUsers and allAccounts
        const users = allUsers;
        const accounts = allAccounts;
        const accountsMap = new Map(accounts.map(acc => [acc.id, acc])); // Map for quick lookup

        const workRecordsCol = collection(db, 'workRecords');
        const workRecordsSnapshot = await getDocs(workRecordsCol);
        const workRecords = workRecordsSnapshot.docs.map(getDocData);

        const userAccountRatesCol = collection(db, 'userAccountRates');
        const userAccountRatesSnapshot = await getDocs(userAccountRatesCol);
        const userAccountRates = userAccountRatesSnapshot.docs.map(getDocData);
        // Map custom rates: Map<userId, Map<accountId, {docId, customPricePerHour}>>
        const customRatesMap = new Map();
        userAccountRates.forEach(rate => {
            if (!customRatesMap.has(rate.userId)) {
                customRatesMap.set(rate.userId, new Map());
            }
            customRatesMap.get(rate.userId).set(rate.accountId, { docId: rate.id, customPricePerHour: rate.customPricePerHour });
        });

        const employeeWorkData = new Map(); // Map<userId, { totalHours: 0, totalBalance: 0, workedAccounts: Map<accountId, totalMinutes> }>

        workRecords.forEach(record => {
            if (!employeeWorkData.has(record.userId)) {
                employeeWorkData.set(record.userId, { totalHours: 0, totalBalance: 0, workedAccounts: new Map() });
            }
            const userData = employeeWorkData.get(record.userId);
            userData.totalHours += record.totalTime / 60; // Convert to hours
            userData.workedAccounts.set(record.accountId, (userData.workedAccounts.get(record.accountId) || 0) + record.totalTime); // Store total minutes per account

            // Calculate balance for this record using applicable price
            let pricePerHour = accountsMap.get(record.accountId)?.defaultPricePerHour || 0;
            if (customRatesMap.has(record.userId) && customRatesMap.get(record.userId).has(record.accountId)) {
                pricePerHour = customRatesMap.get(record.userId).get(record.accountId).customPricePerHour;
            }
            userData.totalBalance += (record.totalTime / 60) * pricePerHour;
        });

        users.forEach(user => {
            // Skip admin user in this table
            if (user.id === 'admin') return;

            const userData = employeeWorkData.get(user.id) || { totalHours: 0, totalBalance: 0, workedAccounts: new Map() };

            // Get accounts the user has worked on, or all accounts if they haven't worked on any
            const userWorkedAccountIds = Array.from(userData.workedAccounts.keys());
            const accountsToDisplay = userWorkedAccountIds.length > 0 
                ? userWorkedAccountIds.map(id => accountsMap.get(id)).filter(Boolean) // Get actual account objects
                : accounts; // If user hasn't worked, show all accounts with default rates

            if (accountsToDisplay.length === 0) {
                // If no accounts exist at all, or no accounts worked on and no accounts defined
                const row = employeeRatesTableBody.insertRow();
                row.insertCell().textContent = user.name;
                row.insertCell().colSpan = 4; // Span across account, default price, custom price, actions
                row.insertCell().textContent = getTranslatedText('noDataToShow'); 
                row.insertCell().textContent = userData.totalHours.toFixed(2);
                row.insertCell().textContent = `${userData.totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
            } else {
                let isFirstRowForUser = true;
                accountsToDisplay.forEach(account => {
                    let defaultPrice = account.defaultPricePerHour || 0;
                    let customRateData = customRatesMap.get(user.id)?.get(account.id);
                    let customPrice = customRateData?.customPricePerHour || null;
                    let customRateDocId = customRateData?.docId || null;

                    const row = employeeRatesTableBody.insertRow();
                    
                    // Employee Name (span rows if multiple accounts for same user)
                    if (isFirstRowForUser) {
                        const cell = row.insertCell();
                        cell.textContent = user.name;
                        cell.rowSpan = accountsToDisplay.length; // Span for all accounts this user worked on
                        isFirstRowForUser = false;
                    } else {
                        row.insertCell(); // Empty cell for subsequent rows of the same user
                    }

                    row.insertCell().textContent = account.name;
                    row.insertCell().textContent = defaultPrice.toFixed(2);
                    
                    const customPriceCell = row.insertCell();
                    customPriceCell.textContent = customPrice !== null ? customPrice.toFixed(2) : getTranslatedText('notSet');

                    const actionsCell = row.insertCell();
                    const modifyBtn = document.createElement('button');
                    modifyBtn.textContent = getTranslatedText('modify'); 
                    modifyBtn.classList.add('admin-action-btn', 'primary');
                    modifyBtn.addEventListener('click', () => openEditEmployeeRateModal(user.id, user.name, account.id, account.name, defaultPrice, customPrice, customRateDocId));
                    actionsCell.appendChild(modifyBtn);

                    // Total Hours and Total Balance (only for the first row of each user)
                    if (isFirstRowForUser === false && accountsToDisplay.indexOf(account) === 0) { // This condition ensures it's the first row of the first account displayed for the user
                        row.insertCell().textContent = userData.totalHours.toFixed(2);
                        row.insertCell().textContent = `${userData.totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
                    } else if (accountsToDisplay.length === 1) { // If only one account, display totals here
                        row.insertCell().textContent = userData.totalHours.toFixed(2);
                        row.insertCell().textContent = `${userData.totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
                    } else {
                        row.insertCell(); // Empty cell for subsequent rows
                        row.insertCell(); // Empty cell for subsequent rows
                    }
                });
            }
        });

    } catch (error) {
        console.error("Error rendering employee rates and totals:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const openEditEmployeeRateModal = (userId, userName, accountId, accountName, defaultPrice, customPrice, customRateDocId) => {
    currentEditingRate = { userId, accountId, docId: customRateDocId };

    modalEmployeeName.textContent = userName;
    modalAccountName.textContent = accountName;
    modalDefaultPrice.textContent = defaultPrice.toFixed(2);
    modalCustomPriceInput.value = customPrice !== null ? customPrice : defaultPrice; // Pre-fill with custom or default

    editEmployeeRateModal.style.display = 'flex';
};

const saveCustomRate = async () => {
    showLoadingIndicator(true);
    try {
        const customPrice = parseFloat(modalCustomPriceInput.value);
        if (isNaN(customPrice) || customPrice < 0) {
            showToastMessage(getTranslatedText('invalidPrice'), 'error'); 
            return;
        }

        const rateData = {
            userId: currentEditingRate.userId,
            accountId: currentEditingRate.accountId,
            customPricePerHour: customPrice,
            timestamp: serverTimestamp() // Use server timestamp for creation/update time
        };

        if (currentEditingRate.docId) {
            // Update existing custom rate
            const docRef = doc(db, 'userAccountRates', currentEditingRate.docId);
            await updateDoc(docRef, rateData);
        } else {
            // Add new custom rate
            const newDocRef = await addDoc(collection(db, 'userAccountRates'), rateData);
            currentEditingRate.docId = newDocRef.id; // Store the new doc ID
        }

        showToastMessage(getTranslatedText('rateUpdated'), 'success');
        editEmployeeRateModal.style.display = 'none';
        await renderEmployeeRatesAndTotals(); // Refresh the table
        // Also update the main dashboard total balance if the logged-in user is affected
        if (loggedInUser && loggedInUser.id === currentEditingRate.userId) {
            await renderMainDashboard();
        }
    } catch (error) {
        console.error("Error saving custom rate:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Event listener for closing the custom rate modal
editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => {
    editEmployeeRateModal.style.display = 'none';
    currentEditingRate = { userId: null, accountId: null, docId: null };
});

window.addEventListener('click', (event) => {
    if (event.target === editEmployeeRateModal) {
        editEmployeeRateModal.style.display = 'none';
        currentEditingRate = { userId: null, accountId: null, docId: null };
    }
});


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded.");
    checkConnectionStatus();
    loadDarkModePreference();
    setLanguage(currentLanguage); // Apply initial language translations

    // Login PIN inputs logic
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            // Allow only digits
            input.value = input.value.replace(/\D/g, ''); 
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            // Check if all 8 digits are entered
            if (pinInputs.every(i => i.value.length === 1)) {
                const fullPin = pinInputs.map(i => i.value).join('');
                if (fullPin.length === 8) { // Double check length before attempting login
                    handleLogin();
                }
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && input.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // Check for logged-in user on load
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        try {
            loggedInUser = JSON.parse(storedUser);
            // Re-fetch all static data to ensure it's up-to-date after session load
            await fetchAllStaticData();
            if (loggedInUser.id === 'admin') {
                showPage(adminPanelPage);
                await renderAdminPanel();
            } else {
                showPage(mainDashboard);
                await renderMainDashboard();
            }
        } catch (error) {
            console.error("Error loading stored user:", error);
            logout(); // Log out if stored user data is corrupted
        }
    } else {
        showPage(loginPage);
        pinInputs[0].focus(); // Focus on the first PIN input
    }

    // Main Dashboard Buttons
    logoutDashboardBtn.addEventListener('click', logout);
    startWorkOptionBtn.addEventListener('click', async () => {
        if (loggedInUser && loggedInUser.id !== 'admin') {
            showPage(startWorkPage);
            await initializeStartWorkPage();
            updateSaveButtonState();
        }
    });
    trackWorkOptionBtn.addEventListener('click', async () => {
        if (loggedInUser && loggedInUser.id !== 'admin') {
            showPage(trackWorkPage);
            await renderTrackWorkPage();
        }
    });

    // Add Admin Panel button dynamically if not already present
    // This is a temporary way to add the button if it's not in HTML
    // You might want to add this button directly in index.html and control its visibility with CSS/JS
    let adminPanelButton = document.getElementById('adminPanelOption');
    if (!adminPanelButton) {
        adminPanelButton = document.createElement('button');
        adminPanelButton.id = 'adminPanelOption';
        adminPanelButton.classList.add('big-option-btn');
        adminPanelButton.setAttribute('data-key', 'adminPanelTitle'); // For translation
        adminPanelButton.textContent = getTranslatedText('adminPanelTitle'); // Initial text
        mainDashboard.querySelector('.dashboard-options').appendChild(adminPanelButton);
    }
    adminPanelButton.addEventListener('click', async () => {
        if (loggedInUser && loggedInUser.id === 'admin') {
            showPage(adminPanelPage);
            await renderAdminPanel();
        } else {
            showToastMessage(getTranslatedText('unauthorizedAccess'), 'error');
        }
    });


    // Start Work Page Buttons
    confirmSelectionBtn.addEventListener('click', handleConfirmSelection);
    backToDashboardFromPopup.addEventListener('click', () => {
        if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
            return;
        }
        currentSessionTasks = [];
        showPage(mainDashboard);
    });
    saveWorkBtn.addEventListener('click', saveWorkRecord);
    backToDashboardFromStartWork.addEventListener('click', () => {
        if (currentSessionTasks.length > 0 && !confirm(getTranslatedText('unsavedTasksWarning'))) {
            return;
        }
        currentSessionTasks = [];
        showPage(mainDashboard);
    });

    // Track Work Page Buttons
    backToDashboardFromTrackBtn.addEventListener('click', () => {
        showPage(mainDashboard);
    });

    // Admin Panel Buttons
    addUserBtn.addEventListener('click', addUser);
    addAccountBtn.addEventListener('click', addAccount);
    addTimingFieldBtn.addEventListener('click', addTimingField); 
    addTaskDefinitionBtn.addEventListener('click', addTaskDefinition);
    filterRecordsBtn.addEventListener('click', async () => {
        const selectedUserId = recordFilterUser.value === "" ? null : recordFilterUser.value;
        const selectedDate = recordFilterDate.value === "" ? null : recordFilterDate.value;
        showLoadingIndicator(true);
        try {
            await loadAndDisplayWorkRecords(selectedUserId, selectedDate);
        } finally {
            showLoadingIndicator(false);
        }
    });
    logoutAdminBtn.addEventListener('click', logout);

    // Edit Record Modal
    if (closeEditRecordModalBtn) {
        closeEditRecordModalBtn.addEventListener('click', () => editRecordModal.style.display = 'none');
    }
    saveEditedRecordBtn.addEventListener('click', saveEditedRecord);

    // Edit Employee Rate Modal
    if (editEmployeeRateModal) {
        editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => editEmployeeRateModal.style.display = 'none');
    }
    saveCustomRateBtn.addEventListener('click', saveCustomRate);


    // Connection Status Events
    window.addEventListener('online', () => {
        showToastMessage(getTranslatedText('internetRestored'), 'success');
    });
    window.addEventListener('offline', () => {
        showToastMessage(getTranslatedText('internetLost'), 'error');
    });
});
