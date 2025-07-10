import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, Timestamp, serverTimestamp, addDoc, orderBy, onSnapshot, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
let lastClickTime = null; // For "time between clicks" feature
let sessionStartTime = null; // Timestamp when the user confirmed account/task for the current session
let sessionIntervalId = null; // To store the interval ID for session time updates

// Firestore unsubscribe functions to manage real-time listeners
let unsubscribeUsers = null; // For admin panel user status updates

// Constants
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const SESSION_CLOSED_BROWSER_MS = 1 * 60 * 60 * 1000; // 1 hour if browser closed
const USER_ONLINE_THRESHOLD_MS = 60 * 1000; // 1 minute for "online now"
const USER_RECENTLY_ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes for "online X minutes ago" (changed from 1 hour)
const RECORDS_PER_PAGE = 50; // Number of records to load per click

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

// Main Dashboard Elements
const userNameDisplay = document.getElementById('userNameDisplay');
const totalHoursDisplay = document.getElementById('totalHoursDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay'); // New: Total Balance Display
const startWorkOptionBtn = document.getElementById('startWorkOption');
const trackWorkOptionBtn = document.getElementById('trackWorkOption');
const logoutDashboardBtn = document.getElementById('logoutDashboardBtn'); // Logout from main dashboard
let adminPanelButton = null; // Will be created dynamically

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

// New Session Time Popup Elements
const sessionTimePopup = document.getElementById('sessionTimePopup');
const sessionStartTimeDisplay = document.getElementById('sessionStartTimeDisplay');
const totalSessionTimeDisplay = document.getElementById('totalSessionTimeDisplay');
const netSessionTimeDisplay = document.getElementById('netSessionTimeDisplay');
const delayTimeDisplay = document.getElementById('delayTimeDisplay');
const variableInfoContent = document.getElementById('variableInfoContent');


// Admin Panel Elements - Users
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserPINInput = document.getElementById('newUserPINInput');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');
const newUserNameInputError = document.getElementById('newUserNameInputError');
const newUserPINInputError = document.getElementById('newUserPINInputError');


// Admin Panel Elements - Accounts
const newAccountNameInput = document.getElementById('newAccountNameInput');
const newAccountPriceInput = document.getElementById('newAccountPriceInput'); // New: Default price input
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsTableBody = document.getElementById('accountsTableBody');
const newAccountNameInputError = document.getElementById('newAccountNameInputError');
const newAccountPriceInputError = document.getElementById('newAccountPriceInputError');


// Admin Panel Elements - Task Definitions
const newTaskNameInput = document.getElementById('newTaskNameInput');
const newTimingsContainer = document.getElementById('newTimingsContainer');
const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');
const newTaskNameInputError = document.getElementById('newTaskNameInputError');
const newTimingsInputError = document.getElementById('newTimingsInputError');


// Admin Panel Elements - Work Records
const recordFilterDate = document.getElementById('recordFilterDate');
const recordFilterUser = document.getElementById('recordFilterUser');
const recordFilterAccount = document.getElementById('recordFilterAccount'); // New filter
const recordFilterTask = document.getElementById('recordFilterTask'); // New filter
const filterRecordsBtn = document.getElementById('filterRecordsBtn');
const workRecordsTableBody = document.getElementById('workRecordsTableBody');
const loadMoreRecordsBtn = document.getElementById('loadMoreRecordsBtn'); // New: Load More button
const loadAllRecordsBtn = document.getElementById('loadAllRecordsBtn'); // New: Load All button
let lastVisibleRecord = null; // For pagination: stores the last document from the previous fetch
let allRecordsLoaded = false; // Flag to indicate if all records have been loaded

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
const editAccountSelectError = document.getElementById('editAccountSelectError');
const editTaskTypeSelectError = document.getElementById('editTaskTypeSelectError');
const editTotalTasksCountError = document.getElementById('editTotalTasksCountError');
const editTotalTimeError = document.getElementById('editTotalTimeError');
const editRecordDateError = document.getElementById('editRecordDateError');
const editRecordTimeError = document.getElementById('editRecordTimeError');


// New Admin Panel Elements for Employee Rates
const employeeRatesTableBody = document.getElementById('employeeRatesTableBody');
const editEmployeeRateModal = document.getElementById('editEmployeeRateModal');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalAccountName = document.getElementById('modalAccountName');
const modalDefaultPrice = document.getElementById('modalDefaultPrice');
const modalCustomPriceInput = document.getElementById('modalCustomPriceInput');
const saveCustomRateBtn = document.getElementById('saveCustomRateBtn');
let currentEditingRate = { userId: null, accountId: null, docId: null };
const modalCustomPriceInputError = document.getElementById('modalCustomPriceInputError');


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

// New Login Error Modal Elements
const loginErrorModal = document.getElementById('loginErrorModal');
const loginErrorModalTitle = document.getElementById('loginErrorModalTitle');
const loginErrorModalMessage = document.getElementById('loginErrorModalMessage');
const closeLoginErrorModalBtn = document.getElementById('closeLoginErrorModal');
const loginErrorModalCloseBtn = document.getElementById('loginErrorModalCloseBtn');

// New Custom Confirmation Modal Elements
const confirmationModal = document.getElementById('confirmationModal');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalMessage = document.getElementById('confirmationModalMessage');
const confirmModalBtn = document.getElementById('confirmModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
let confirmCallback = null; // Stores the callback for confirmation
let cancelCallback = null; // Stores the callback for cancellation


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
        // Stop session interval if leaving start work page
        if (sessionIntervalId) {
            clearInterval(sessionIntervalId);
            sessionIntervalId = null;
        }
        sessionTimePopup.classList.remove('show'); // Hide the session time popup
    }
    editRecordModal.style.display = 'none'; // Ensure modal is hidden
    editEmployeeRateModal.style.display = 'none'; // Ensure new modal is hidden
    loginErrorModal.style.display = 'none'; // Ensure login error modal is hidden
    confirmationModal.style.display = 'none'; // Ensure confirmation modal is hidden
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

// Function to show custom confirmation modal
const showConfirmationModal = (message, onConfirm, onCancel, titleKey = 'confirmAction') => {
    confirmationModalTitle.textContent = getTranslatedText(titleKey);
    confirmationModalMessage.textContent = message;
    confirmationModal.style.display = 'flex'; // Use flex to center

    confirmCallback = onConfirm;
    cancelCallback = onCancel;
};

// Event listeners for custom confirmation modal
confirmModalBtn.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (confirmCallback) {
        confirmCallback();
    }
});

cancelModalBtn.addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (cancelCallback) {
        cancelCallback();
    }
});

// Close confirmation modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === confirmationModal) {
        confirmationModal.style.display = 'none';
        if (cancelCallback) { // Call cancel callback if modal is dismissed by clicking outside
            cancelCallback();
        }
    }
});
document.getElementById('closeConfirmationModal').addEventListener('click', () => {
    confirmationModal.style.display = 'none';
    if (cancelCallback) {
        cancelCallback();
    }
});


// Function to show input validation error message
const showInputError = (inputElement, errorMessageElement, messageKey) => {
    inputElement.classList.add('is-invalid');
    errorMessageElement.textContent = getTranslatedText(messageKey);
    errorMessageElement.classList.add('show');
};

// Function to clear input validation error message
const clearInputError = (inputElement, errorMessageElement) => {
    inputElement.classList.remove('is-invalid');
    errorMessageElement.textContent = '';
    errorMessageElement.classList.remove('show');
};

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
    // Re-apply translations to update colors of translated elements if they change with dark mode
    applyTranslations();
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
    // Convert total minutes to total seconds, then round to handle floating point inaccuracies
    const totalSeconds = Math.round(decimalMinutes * 60); 
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Handle cases where seconds might round up to 60 (e.g., 59.9999 -> 60)
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

// New helper function to format milliseconds to HH:MM:SS
const formatMillisecondsToHHMMSS = (ms) => {
    if (isNaN(ms) || ms < 0) {
        return '00:00:00';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

// New helper function to get the maximum timing from a task definition
const getMaxTimingForTask = (taskDefinitionId) => {
    const task = allTaskDefinitions.find(t => t.id === taskDefinitionId);
    if (task && task.timings && task.timings.length > 0) {
        return Math.max(...task.timings); // Returns max timing in minutes
    }
    return 0; // Default to 0 if no timings or task not found
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
        'statusColumn': 'الحالة', // New
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
        'editRecord': 'تعديل',
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
        'tasksTiming': '{count} مهمات بـ {time} دقيقة', // Updated to match requested format
        'grandTotal': 'الإجمالي الكلي', 
        'totalTasksOverall': 'إجمالي عدد المهام', 
        'totalTimeOverall': ' الوقت', 
        'totalBalanceOverall': ' الرصيد', 
        'sessionWarning': 'ستنتهي جلستك بعد {duration} أو {closedBrowserDuration} من إغلاق المتصفح. هل ترغب في تسجيل الخروج الآن؟', // Updated
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
        'unauthorizedAccess': 'وصول غير مصرح به. يرجى تسجيل الدخول كمسؤول.', // New
        'error': 'خطأ', // New translation for modal title
        'close': 'إغلاق', // New translation for modal button
        'accountTotalTimeColumnShort': 'وقت الحساب', // New shorter translation for the column
        'accountBalanceColumn': 'رصيد الحساب', // New
        'timeSinceLastClick': 'آخر نقرة منذ {minutes} دقيقة و {seconds} ثانية.', // New
        'tasksSummaryTooltip': '{count} مهمات بـ {time} دقيقة', // New
        'confirmAction': 'تأكيد الإجراء', // New translation for custom confirmation modal title
        'cancelBtn': 'إلغاء', // New translation for custom confirmation modal cancel button
        'allAccounts': 'جميع الحسابات', // New translation for account filter
        'allTasks': 'جميع المهام', // New translation for task filter
        'requiredField': 'هذا الحقل مطلوب.', // New validation message
        'invalidPinLength': 'يجب أن يتكون رمز PIN من 8 أرقام.', // New validation message
        'invalidNumber': 'الرجاء إدخال رقم صالح.', // New validation message
        'invalidTimeInput': 'الرجاء إدخال قيم صحيحة للدقائق والثواني.', // New validation message
        'saving': 'جارٍ الحفظ...', // New button text for saving state
        'deleting': 'جارٍ الحذف...', // New button text for deleting state
        'adding': 'جارٍ الإضافة...', // New button text for adding state
        'updating': 'جارٍ التحديث...', // New button text for updating state
        'onlineNow': 'متصل الآن', // New
        'onlineOnAccountTask': 'متصل الآن على "{account}" - "{task}"', // New status
        'onlineButNotWorking': 'متصل ولكن لا يعمل', // New status
        'workingButNoRecord': 'يعمل ولكنه لم يسجل أي مهمة منذ {minutes} دقيقة و {seconds} ثانية', // New status
        'lastActivity': 'آخر نشاط: {date} {time}', // New
        'loadMoreBtn': 'أعرض أكثر ({count})', // New
        'loadAllBtn': 'عرض الكل', // New
        'noTimings': 'لا توقيتات محددة', // New
        'hoursUnitShort': 'س', // Short for hours unit
        'minutesUnitShort': 'د', // Short for minutes unit
        'secondsUnitShort': 'ث', // Short for seconds unit
        'netSessionTime': 'صافي وقت الجلسة', // New
        'delayAmount': 'مقدار التأخير', // New
        'totalSessionTime': 'إجمالي وقت الجلسة', // New
        'sessionStartTime': 'وقت بداية الجلسة', // New
        'delayTooltip': 'التأخير: {hours} ساعة، {minutes} دقيقة، {seconds} ثانية' // New tooltip for delay
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
        'statusColumn': 'Status', // New
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
        'tasksTiming': '{count} tasks of {time} minutes', // Updated to match requested format
        'grandTotal': 'Grand Total', 
        'totalTasksOverall': 'Total Tasks Overall', 
        'totalTimeOverall': 'Total Time Overall', 
        'totalBalanceOverall': 'Total Balance Overall', 
        'sessionWarning': 'Your session will expire in {duration} or {closedBrowserDuration} after closing the browser. Do you want to log out now?', // Updated
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
        'unauthorizedAccess': 'Unauthorized access. Please log in as an administrator.', // New
        'error': 'Error', // New translation for modal title
        'close': 'Close', // New translation for modal button
        'accountTotalTimeColumnShort': 'Account Time', // New shorter translation for the column
        'accountBalanceColumn': 'Account Balance', // New
        'timeSinceLastClick': 'Last click was {minutes} minutes and {seconds} seconds ago.', // New
        'tasksSummaryTooltip': '{count} tasks of {time} minutes', // New
        'confirmAction': 'Confirm Action', // New translation for custom confirmation modal title
        'cancelBtn': 'Cancel', // New translation for custom confirmation modal cancel button
        'allAccounts': 'All Accounts', // New translation for account filter
        'allTasks': 'All Tasks', // New translation for task filter
        'requiredField': 'This field is required.', // New validation message
        'invalidPinLength': 'PIN must be 8 digits.', // New validation message
        'invalidNumber': 'Please enter a valid number.', // New validation message
        'invalidTimeInput': 'Please enter valid minutes and seconds.', // New validation message
        'saving': 'Saving...', // New button text for saving state
        'deleting': 'Deleting...', // New button text for deleting state
        'adding': 'Adding...', // New button text for adding state
        'updating': 'Updating...', // New button text for updating state
        'onlineNow': 'Online Now', // New
        'onlineOnAccountTask': 'Online now on "{account}" - "{task}"', // New status
        'onlineButNotWorking': 'Online but not working', // New status
        'workingButNoRecord': 'Working but hasn\'t recorded any task since {minutes} minutes and {seconds} seconds ago', // New status
        'lastActivity': 'Last activity: {date} {time}', // New
        'loadMoreBtn': 'Show More ({count})', // New
        'loadAllBtn': 'Show All', // New
        'noTimings': 'No timings defined', // New
        'hoursUnitShort': 'h', // Short for hours unit
        'minutesUnitShort': 'm', // Short for minutes unit
        'secondsUnitShort': 's', // Short for seconds unit
        'netSessionTime': 'Net session time', // New
        'delayAmount': 'Delay amount', // New
        'totalSessionTime': 'Total session time', // New
        'sessionStartTime': 'Session start time', // New
        'delayTooltip': 'Delay: {hours} hours, {minutes} minutes, {seconds} seconds' // New tooltip for delay
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
        taskChart.options.plugins.legend.labels.color = isDarkMode ? '#BDC3C7' : '#333'; // Light gray in dark, dark gray in light
        taskChart.options.plugins.title.color = isDarkMode ? '#76D7C4' : '#2c3e50'; // Soft teal in dark, dark blue/gray in light
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
        } else if (key === 'sessionWarning') { // Special handling for session warning to include dynamic duration
            const durationHours = SESSION_DURATION_MS / (60 * 60 * 1000);
            const closedBrowserDurationHours = SESSION_CLOSED_BROWSER_MS / (60 * 60 * 1000);
            element.textContent = getTranslatedText(key, { duration: `${durationHours} ${getTranslatedText('hoursUnit')}`, closedBrowserDuration: `${closedBrowserDurationHours} ${getTranslatedText('hoursUnit')}` }); // Changed to hoursUnit for consistency
        } else if (key === 'loadMoreBtn') { // Special handling for load more button count
            element.textContent = getTranslatedText(key, { count: RECORDS_PER_PAGE });
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
    
    // Update confirm/cancel buttons in custom modal
    document.getElementById('confirmModalBtn').textContent = getTranslatedText('confirmBtn');
    document.getElementById('cancelModalBtn').textContent = getTranslatedText('cancelBtn');


    // Re-render dynamic elements that contain text, like task timing buttons
    if (startWorkPage.style.display === 'flex' && taskSelectionPopup.style.display === 'none') {
         renderTaskTimingButtons(); // Re-render to update units
         updateWorkSummary(); // Re-render detailed summary
         updateSessionTimePopup(); // Update session time popup translations
    }
    // Admin panel tables need re-rendering to update texts
    if (adminPanelPage.style.display === 'flex') {
        // No need to call renderAdminPanel here, as onSnapshot will handle it.
        // Just ensure loadAndDisplayUsers is called if translations affect status.
        loadAndDisplayUsers(); // Call to update status column translations
    }
    // Re-render track work page to update headers and content
    if (trackWorkPage.style.display === 'flex') {
        renderTrackWorkPage();
    }
};

// Function to format numbers to English digits
const formatNumberToEnglish = (num) => {
    // Ensure numbers are formatted using English digits, even in RTL context
    return num.toLocaleString('en-US', { useGrouping: false });
};

// 4. Session Management Functions
const saveSession = async (user) => {
    const sessionExpiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    localStorage.setItem('sessionExpiry', sessionExpiry.toString());

    // Update user's lastActivityTimestamp in Firestore upon login/session save
    if (user && user.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, { 
                lastActivityTimestamp: serverTimestamp(),
                // Clear current activity status on new login/session save
                currentAccountId: null,
                currentAccountName: null,
                currentTaskDefinitionId: null,
                currentTaskDefinitionName: null,
                lastRecordedTaskTimestamp: null,
                sessionStartTime: null // Clear session start time on new login
            });
        } catch (error) {
            console.error("Error updating user activity on session save:", error);
        }
    }
};

const clearSession = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            await updateDoc(userDocRef, {
                lastActivityTimestamp: serverTimestamp(), // Mark as last activity on logout
                currentAccountId: null,
                currentAccountName: null,
                currentTaskDefinitionId: null,
                currentTaskDefinitionName: null,
                lastRecordedTaskTimestamp: null,
                sessionStartTime: null // Clear session start time on logout
            });
        } catch (error) {
            console.error("Error clearing user activity on logout:", error);
        }
    }
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionExpiry');
    loggedInUser = null; // Clear in-memory user data
    sessionStartTime = null; // Clear session start time
    if (sessionIntervalId) { // Clear any running session interval
        clearInterval(sessionIntervalId);
        sessionIntervalId = null;
    }
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
            await renderMainDashboard();
            trackUserActivity(); // Start tracking activity for regular users
            // Update user's lastActivityTimestamp in Firestore on session load
            try {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Restore sessionStartTime if available in Firestore
                    if (userData.sessionStartTime) {
                        sessionStartTime = userData.sessionStartTime.toDate();
                    }
                }
                await updateDoc(userDocRef, { lastActivityTimestamp: serverTimestamp() });
            } catch (error) {
                console.error("Error updating last activity timestamp on session load:", error);
            }
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
        event.returnValue = getTranslatedText('sessionWarning', {
            duration: `${SESSION_DURATION_MS / (60 * 60 * 1000)} ${getTranslatedText('hoursUnit')}`,
            closedBrowserDuration: `${SESSION_CLOSED_BROWSER_MS / (60 * 60 * 1000)} ${getTranslatedText('hoursUnit')}` // Changed to hoursUnit for consistency
        });
        return event.returnValue;
    }
});

// New function to fetch all static data
const fetchAllStaticData = async () => {
    showLoadingIndicator(true);
    try {
        // Fetch Users (will be handled by onSnapshot in admin panel, but initial fetch here)
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

    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Function to show the custom login error modal
const showLoginErrorModal = (message) => {
    loginErrorModalTitle.textContent = getTranslatedText('error');
    loginErrorModalMessage.textContent = message;
    loginErrorModal.style.display = 'flex'; // Use flex to center
};

// 5. Login Logic (Updated for 8 PIN fields and custom error modal)
const handleLogin = async () => {
    const fullPin = pinInputs.map(input => input.value).join('');
    loginErrorModal.style.display = 'none'; // Hide any previous error modal

    // Clear any previous PIN input errors
    pinInputs.forEach(input => {
        input.classList.remove('is-invalid');
    });

    if (fullPin.length !== 8 || !/^\d+$/.test(fullPin)) { // Check for 8 digits only
        showLoginErrorModal(getTranslatedText('pinError'));
        pinInputs.forEach(input => input.classList.add('is-invalid')); // Highlight invalid PIN inputs
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
            }
        } catch (error) {
            // In case of an error accessing Firestore, we proceed with the default PIN.
            // The user will see a login error if the default PIN doesn't match their input.
        }

        // Fetch all static data immediately after successful login or session load
        await fetchAllStaticData();

        // Now use adminPinValue for comparison
        if (fullPin === adminPinValue) {
            loggedInUser = { id: 'admin', name: getTranslatedText('admin'), role: 'admin' };
            await saveSession(loggedInUser); // Save admin session
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
            await saveSession(loggedInUser); // Save user session
            trackUserActivity(); // Start tracking activity for regular users
            showPage(mainDashboard);
            await renderMainDashboard(); // Call renderMainDashboard here after successful login
            pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
            return;
        }

        showLoginErrorModal(getTranslatedText('pinIncorrect')); // Use custom modal for incorrect PIN
        pinInputs.forEach(input => input.classList.add('is-invalid')); // Highlight invalid PIN inputs

    } catch (error) {
        // Check if the error is due to network or permissions
        if (error.code === 'unavailable' || error.code === 'permission-denied') {
            showLoginErrorModal(getTranslatedText('noInternet') + ' أو مشكلة في الصلاحيات.');
        } else {
            showLoginErrorModal(getTranslatedText('loginError'));
        }
    } finally {
        showLoadingIndicator(false);
    }
};

// Logout function (defined globally for accessibility)
const logout = async () => {
    await clearSession(); // Ensure session is cleared and Firestore status updated
    showPage(loginPage);
    pinInputs.forEach(input => input.value = ''); // Clear all PIN inputs
    pinInputs[0].focus(); // Focus on first PIN input
};

// User Activity Tracking (for "Status" column)
let activityInterval = null;

const updateLastActivityTimestamp = async (clearCurrentActivity = false) => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        try {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            const updateData = { lastActivityTimestamp: serverTimestamp() };

            if (clearCurrentActivity) {
                updateData.currentAccountId = null;
                updateData.currentAccountName = null;
                updateData.currentTaskDefinitionId = null;
                updateData.currentTaskDefinitionName = null;
                updateData.lastRecordedTaskTimestamp = null;
                updateData.sessionStartTime = null; // Clear session start time
            }
            await updateDoc(userDocRef, updateData);
        } catch (error) {
            // console.error("Error updating last activity timestamp:", error);
            // Don't show toast for this, as it's a background operation
        }
    }
};

const trackUserActivity = () => {
    // Clear any existing interval to prevent multiple intervals running
    if (activityInterval) {
        clearInterval(activityInterval);
    }

    // Update immediately on page load/login
    updateLastActivityTimestamp();

    // Update every 30 seconds while the user is active
    activityInterval = setInterval(updateLastActivityTimestamp, 30 * 1000); // Every 30 seconds

    // Update on visibility change (tab focus/unfocus)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updateLastActivityTimestamp();
        }
    });

    // Update on user interaction (e.g., mouse move, key press)
    document.addEventListener('mousemove', updateLastActivityTimestamp, { passive: true, once: true });
    document.addEventListener('keypress', updateLastActivityTimestamp, { passive: true, once: true });
};


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
        
        // Fetch all accounts to get default prices (using cached data)
        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));

        // Fetch custom rates for the logged-in user
        const userCustomRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userCustomRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        const userCustomRatesMap = new Map(); // Map<accountId, customPricePerHour>
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

        totalHoursDisplay.textContent = formatNumberToEnglish(formatTotalMinutesToHHMMSS(totalMinutesWorked)); // Display in HH:MM:SS
        totalBalanceDisplay.textContent = formatNumberToEnglish(totalBalance.toFixed(2)); // Display total balance

    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Moved event listener logic into named functions for clarity and proper binding
const handleStartWorkOptionClick = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(startWorkPage);
        await initializeStartWorkPage();
        updateSaveButtonState(); // Initial state for save button
    }
};

const handleTrackWorkOptionClick = async () => {
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showPage(trackWorkPage);
        await renderTrackWorkPage(); // This will now also render the chart
        // Clear current activity status when navigating to Track Work page
        await updateLastActivityTimestamp(true); 
    }
};

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
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    }
};

const initializeStartWorkPage = async () => {
    currentSessionTasks = [];
    completedTasksCount.textContent = formatNumberToEnglish(0);
    recordedTotalTime.textContent = formatNumberToEnglish('00:00'); // Initial display formatted
    detailedSummaryContainer.innerHTML = ''; // Clear detailed summary
    taskTimingButtonsContainer.innerHTML = '';
    selectedAccount = null;
    selectedTaskDefinition = null;
    taskDetailsContainer.style.display = 'none';

    // Check for an existing session to resume
    if (loggedInUser && loggedInUser.id !== 'admin') {
        showLoadingIndicator(true);
        try {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.currentAccountId && userData.currentTaskDefinitionId && userData.sessionStartTime) {
                    const account = allAccounts.find(acc => acc.id === userData.currentAccountId);
                    const task = allTaskDefinitions.find(t => t.id === userData.currentTaskDefinitionId);
                    
                    if (account && task) {
                        selectedAccount = account;
                        selectedTaskDefinition = task;
                        sessionStartTime = userData.sessionStartTime.toDate(); // Convert Firestore Timestamp to Date object
                        currentSessionTasks = userData.currentSessionTasks || []; // Load tasks if available

                        taskSelectionPopup.style.display = 'none';
                        taskDetailsContainer.style.display = 'flex';
                        renderTaskTimingButtons();
                        updateWorkSummary();
                        startSessionTimer(); // Start the session timer for the resumed session
                        showToastMessage(getTranslatedText('sessionResumed'), 'success');
                    } else {
                        // Inconsistent data, clear session and start fresh
                        await updateDoc(userDocRef, {
                            currentAccountId: null,
                            currentTaskDefinitionId: null,
                            sessionStartTime: null,
                            currentSessionTasks: []
                        });
                        showToastMessage(getTranslatedText('sessionResumeError'), 'error');
                        taskSelectionPopup.style.display = 'flex'; // Show selection popup
                        await fetchAccountsAndTasks(); // Populate dropdowns
                    }
                } else {
                    taskSelectionPopup.style.display = 'flex'; // Show selection popup
                    await fetchAccountsAndTasks(); // Populate dropdowns
                }
            } else {
                taskSelectionPopup.style.display = 'flex'; // Show selection popup
                await fetchAccountsAndTasks(); // Populate dropdowns
            }
        } catch (error) {
            console.error("Error resuming session:", error);
            showToastMessage(getTranslatedText('sessionResumeError'), 'error');
            taskSelectionPopup.style.display = 'flex'; // Show selection popup
            await fetchAccountsAndTasks(); // Populate dropdowns
        } finally {
            showLoadingIndicator(false);
        }
    } else {
        taskSelectionPopup.style.display = 'flex'; // Show selection popup
        await fetchAccountsAndTasks(); // Populate dropdowns
    }
};

const handleConfirmSelection = async () => {
    const accountId = accountSelect.value;
    const taskDefinitionId = taskTypeSelect.value;

    if (!accountId || !taskDefinitionId) {
        showToastMessage(getTranslatedText('selectAccountTask'), 'error');
        return;
    }

    selectedAccount = allAccounts.find(acc => acc.id === accountId);
    selectedTaskDefinition = allTaskDefinitions.find(task => task.id === taskDefinitionId);

    if (selectedAccount && selectedTaskDefinition) {
        taskSelectionPopup.style.display = 'none';
        taskDetailsContainer.style.display = 'flex';
        renderTaskTimingButtons();
        updateWorkSummary();
        
        // Set session start time only when a new session is confirmed
        if (!sessionStartTime) {
            sessionStartTime = new Date();
        }
        startSessionTimer(); // Start the session timer

        // Update user's current activity in Firestore
        if (loggedInUser && loggedInUser.id !== 'admin') {
            try {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                await updateDoc(userDocRef, {
                    currentAccountId: selectedAccount.id,
                    currentAccountName: selectedAccount.name,
                    currentTaskDefinitionId: selectedTaskDefinition.id,
                    currentTaskDefinitionName: selectedTaskDefinition.name,
                    sessionStartTime: Timestamp.fromDate(sessionStartTime), // Store as Firestore Timestamp
                    currentSessionTasks: currentSessionTasks // Save current tasks for resume
                });
            } catch (error) {
                console.error("Error updating user activity on session start:", error);
                // Don't block UI, but log the error
            }
        }
    }
};

const renderTaskTimingButtons = () => {
    taskTimingButtonsContainer.innerHTML = ''; // Clear previous buttons
    if (selectedTaskDefinition && selectedTaskDefinition.timings) {
        selectedTaskDefinition.timings.sort((a, b) => a - b); // Sort timings for consistent display
        selectedTaskDefinition.timings.forEach(timing => {
            const timingInMinutes = timing; // Timing is already in minutes
            const timingInMMSS = formatMinutesToMMSS(timingInMinutes);

            const wrapper = document.createElement('div');
            wrapper.className = 'timing-button-wrapper';

            const button = document.createElement('button');
            button.className = 'task-timing-btn';
            button.textContent = timingInMMSS; // Display in MM:SS
            button.dataset.timing = timingInMinutes; // Store timing in minutes

            const undoButton = document.createElement('button');
            undoButton.className = 'undo-btn';
            undoButton.textContent = getTranslatedText('undoLastAdd');
            undoButton.style.display = 'none'; // Hidden by default

            const timeSinceLastClickSpan = document.createElement('span');
            timeSinceLastClickSpan.className = 'time-since-last-click';
            timeSinceLastClickSpan.style.display = 'none'; // Hidden by default

            // Event listener for timing button click
            button.addEventListener('click', () => {
                const now = Date.now();
                if (lastClickTime) {
                    const timeDiffMs = now - lastClickTime;
                    const minutesDiff = Math.floor(timeDiffMs / 60000);
                    const secondsDiff = Math.round((timeDiffMs % 60000) / 1000);
                    timeSinceLastClickSpan.textContent = getTranslatedText('timeSinceLastClick', { minutes: minutesDiff, seconds: secondsDiff });
                    timeSinceLastClickSpan.classList.add('show');
                    setTimeout(() => timeSinceLastClickSpan.classList.remove('show'), 3000); // Hide after 3 seconds
                }
                lastClickTime = now;

                currentSessionTasks.push({
                    timing: parseFloat(timingInMinutes), // Store as number
                    timestamp: new Date().toISOString() // Store as ISO string for consistency
                });
                updateWorkSummary();
                updateSaveButtonState();

                // Show undo button for 3 seconds
                undoButton.classList.add('show');
                setTimeout(() => undoButton.classList.remove('show'), 3000);
            });

            // Event listener for undo button click
            undoButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the main button's click event from firing
                if (currentSessionTasks.length > 0) {
                    currentSessionTasks.pop(); // Remove the last added task
                    updateWorkSummary();
                    updateSaveButtonState();
                    undoButton.classList.remove('show'); // Hide undo button immediately
                }
            });

            wrapper.appendChild(timeSinceLastClickSpan);
            wrapper.appendChild(button);
            wrapper.appendChild(undoButton);
            taskTimingButtonsContainer.appendChild(wrapper);
        });
    } else {
        taskTimingButtonsContainer.innerHTML = `<p>${getTranslatedText('noTimings')}</p>`;
    }
};

const updateWorkSummary = () => {
    const totalCompletedTasks = currentSessionTasks.length;
    let totalRecordedTime = 0; // In minutes
    const timingCounts = {}; // To store counts for variable info: { 'timing_minutes': count }

    currentSessionTasks.forEach(task => {
        totalRecordedTime += task.timing;
        const timingKey = task.timing.toFixed(2); // Use fixed decimal for key
        timingCounts[timingKey] = (timingCounts[timingKey] || 0) + 1;
    });

    completedTasksCount.textContent = formatNumberToEnglish(totalCompletedTasks);
    recordedTotalTime.textContent = formatNumberToEnglish(formatMinutesToMMSS(totalRecordedTime));

    // Update detailed summary
    detailedSummaryContainer.innerHTML = `<h3>${getTranslatedText('taskDetailsByTiming')}</h3>`;
    if (Object.keys(timingCounts).length === 0) {
        detailedSummaryContainer.innerHTML += `<p>${getTranslatedText('noDataToShow')}</p>`;
    } else {
        for (const timing in timingCounts) {
            const count = timingCounts[timing];
            const formattedTiming = formatMinutesToMMSS(parseFloat(timing)); // Format timing back to MM:SS
            const p = document.createElement('p');
            p.textContent = getTranslatedText('tasksTiming', { count: formatNumberToEnglish(count), time: formatNumberToEnglish(formattedTiming) });
            detailedSummaryContainer.appendChild(p);
        }
    }
    // Update session time popup when summary updates
    updateSessionTimePopup();
};

const updateSaveButtonState = () => {
    saveWorkBtn.disabled = currentSessionTasks.length === 0;
};

const saveWork = async () => {
    if (currentSessionTasks.length === 0) {
        showToastMessage(getTranslatedText('noTasksToSave'), 'error');
        return;
    }

    showConfirmationModal(getTranslatedText('confirmSave'), async () => {
        isSavingWork = true; // Set flag to prevent beforeunload warning
        showLoadingIndicator(true);
        try {
            const totalTasks = currentSessionTasks.length;
            let totalTime = 0; // in minutes
            currentSessionTasks.forEach(task => {
                totalTime += task.timing;
            });

            const workRecord = {
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                accountId: selectedAccount.id,
                accountName: selectedAccount.name,
                taskDefinitionId: selectedTaskDefinition.id,
                taskDefinitionName: selectedTaskDefinition.name,
                totalTasks: totalTasks,
                totalTime: totalTime, // Total minutes
                timestamp: serverTimestamp(), // Firestore server timestamp
                sessionStartTime: sessionStartTime ? Timestamp.fromDate(sessionStartTime) : null, // Store session start time
                // Store the raw currentSessionTasks array for detailed breakdown
                detailedTasks: currentSessionTasks
            };

            await addDoc(collection(db, 'workRecords'), workRecord);

            // Clear session data after saving
            currentSessionTasks = [];
            selectedAccount = null;
            selectedTaskDefinition = null;
            sessionStartTime = null; // Clear session start time
            if (sessionIntervalId) { // Clear any running session interval
                clearInterval(sessionIntervalId);
                sessionIntervalId = null;
            }

            // Clear user's current activity in Firestore
            if (loggedInUser && loggedInUser.id !== 'admin') {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                await updateDoc(userDocRef, {
                    currentAccountId: null,
                    currentAccountName: null,
                    currentTaskDefinitionId: null,
                    currentTaskDefinitionName: null,
                    lastRecordedTaskTimestamp: null,
                    sessionStartTime: null, // Clear session start time
                    currentSessionTasks: [] // Clear saved tasks
                });
            }

            updateWorkSummary(); // Reset display
            updateSaveButtonState(); // Disable save button
            showToastMessage(getTranslatedText('workSavedSuccess'), 'success');
            showPage(mainDashboard); // Go back to dashboard after saving
            await renderMainDashboard(); // Refresh dashboard totals

        } catch (error) {
            console.error("Error saving work:", error);
            showToastMessage(getTranslatedText('errorSavingWork'), 'error');
        } finally {
            isSavingWork = false; // Reset flag
            showLoadingIndicator(false);
        }
    });
};

const backToDashboardFromStartWorkPage = () => {
    if (currentSessionTasks.length > 0) {
        showConfirmationModal(getTranslatedText('unsavedTasksWarning'), () => {
            currentSessionTasks = []; // Discard unsaved tasks
            sessionStartTime = null; // Clear session start time
            if (sessionIntervalId) { // Clear any running session interval
                clearInterval(sessionIntervalId);
                sessionIntervalId = null;
            }
            // Clear user's current activity in Firestore
            if (loggedInUser && loggedInUser.id !== 'admin') {
                const userDocRef = doc(db, 'users', loggedInUser.id);
                updateDoc(userDocRef, {
                    currentAccountId: null,
                    currentAccountName: null,
                    currentTaskDefinitionId: null,
                    currentTaskDefinitionName: null,
                    lastRecordedTaskTimestamp: null,
                    sessionStartTime: null, // Clear session start time
                    currentSessionTasks: [] // Clear saved tasks
                }).catch(error => console.error("Error clearing user activity on back:", error));
            }
            showPage(mainDashboard);
        }, () => {
            // User cancelled going back, do nothing
        });
    } else {
        sessionStartTime = null; // Clear session start time
        if (sessionIntervalId) { // Clear any running session interval
            clearInterval(sessionIntervalId);
            sessionIntervalId = null;
        }
        // Clear user's current activity in Firestore if no tasks were added
        if (loggedInUser && loggedInUser.id !== 'admin') {
            const userDocRef = doc(db, 'users', loggedInUser.id);
            updateDoc(userDocRef, {
                currentAccountId: null,
                currentAccountName: null,
                currentTaskDefinitionId: null,
                currentTaskDefinitionName: null,
                lastRecordedTaskTimestamp: null,
                sessionStartTime: null, // Clear session start time
                currentSessionTasks: [] // Clear saved tasks
            }).catch(error => console.error("Error clearing user activity on back (no tasks):", error));
        }
        showPage(mainDashboard);
    }
};

// New: Session Timer and Popup Logic
const startSessionTimer = () => {
    if (sessionIntervalId) {
        clearInterval(sessionIntervalId); // Clear any existing timer
    }
    // Update immediately
    updateSessionTimePopup();
    // Update every second
    sessionIntervalId = setInterval(updateSessionTimePopup, 1000);
};

const updateSessionTimePopup = () => {
    if (!sessionStartTime) {
        sessionTimePopup.classList.remove('show');
        return;
    }

    const now = new Date();
    const totalSessionDurationMs = now.getTime() - sessionStartTime.getTime();
    
    // Calculate Net Session Time (sum of all recorded task timings)
    let netSessionMinutes = 0;
    currentSessionTasks.forEach(task => {
        netSessionMinutes += task.timing;
    });
    const netSessionDurationMs = netSessionMinutes * 60 * 1000;

    // Calculate Delay
    const delayMs = Math.max(0, totalSessionDurationMs - netSessionDurationMs);

    // Update Basic Info
    sessionStartTimeDisplay.textContent = sessionStartTime.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    totalSessionTimeDisplay.textContent = formatMillisecondsToHHMMSS(totalSessionDurationMs);
    netSessionTimeDisplay.textContent = formatMillisecondsToHHMMSS(netSessionDurationMs);
    delayTimeDisplay.textContent = formatMillisecondsToHHMMSS(delayMs);
    
    // Add tooltip to delayTimeDisplay
    const delayHours = Math.floor(delayMs / (1000 * 60 * 60));
    const delayMinutes = Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60));
    const delaySeconds = Math.floor((delayMs % (1000 * 60)) / 1000);
    delayTimeDisplay.title = getTranslatedText('delayTooltip', {
        hours: formatNumberToEnglish(delayHours),
        minutes: formatNumberToEnglish(delayMinutes),
        seconds: formatNumberToEnglish(delaySeconds)
    });

    // Update Variable Info
    const timingCounts = {};
    currentSessionTasks.forEach(task => {
        const timingKey = task.timing.toFixed(2);
        timingCounts[timingKey] = (timingCounts[timingKey] || 0) + 1;
    });

    variableInfoContent.innerHTML = '';
    if (Object.keys(timingCounts).length === 0) {
        variableInfoContent.innerHTML = `<p>${getTranslatedText('noDataToShow')}</p>`;
    } else {
        for (const timing in timingCounts) {
            const count = timingCounts[timing];
            const formattedTiming = formatMinutesToMMSS(parseFloat(timing));
            const div = document.createElement('div');
            div.textContent = getTranslatedText('tasksTiming', { count: formatNumberToEnglish(count), time: formatNumberToEnglish(formattedTiming) });
            variableInfoContent.appendChild(div);
        }
    }
};

// Event listeners for showing/hiding the session time popup
recordedTotalTime.addEventListener('mouseenter', () => {
    if (sessionStartTime) { // Only show if a session has started
        updateSessionTimePopup(); // Update immediately on hover
        sessionTimePopup.classList.add('show');
    }
});

recordedTotalTime.addEventListener('mouseleave', () => {
    sessionTimePopup.classList.remove('show');
});


// 8. Track Work Page Logic (Updated for Chart.js and pagination)
const renderTrackWorkPage = async (loadAll = false) => {
    if (!loggedInUser || loggedInUser.role === 'admin') {
        showToastMessage(getTranslatedText('unauthorizedAccess'), 'error');
        showPage(loginPage); // Redirect to login if not a regular user
        return;
    }

    showLoadingIndicator(true);
    try {
        const userId = loggedInUser.id;
        const workRecordsCollectionRef = collection(db, 'workRecords');
        let recordsQuery = query(
            workRecordsCollectionRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc') // Order by timestamp descending
        );

        // Apply filters
        const filterDate = recordFilterDate.value;
        const filterAccount = recordFilterAccount.value;
        const filterTask = recordFilterTask.value;

        if (filterDate) {
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            recordsQuery = query(recordsQuery, 
                where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
                where('timestamp', '<=', Timestamp.fromDate(endOfDay))
            );
        }
        if (filterAccount) {
            recordsQuery = query(recordsQuery, where('accountId', '==', filterAccount));
        }
        if (filterTask) {
            recordsQuery = query(recordsQuery, where('taskDefinitionId', '==', filterTask));
        }

        if (!loadAll && lastVisibleRecord) {
            recordsQuery = query(recordsQuery, startAfter(lastVisibleRecord), limit(RECORDS_PER_PAGE));
        } else if (!loadAll) {
            recordsQuery = query(recordsQuery, limit(RECORDS_PER_PAGE));
        }
        // If loadAll is true, no limit is applied, fetching all matching records

        const querySnapshot = await getDocs(recordsQuery);
        const records = querySnapshot.docs.map(getDocData);

        // Update lastVisibleRecord for pagination
        if (!querySnapshot.empty && !loadAll) {
            lastVisibleRecord = querySnapshot.docs[querySnapshot.docs.length - 1];
        } else {
            lastVisibleRecord = null; // Reset if no more records or loading all
        }

        // Determine if all records have been loaded
        allRecordsLoaded = querySnapshot.empty || querySnapshot.docs.length < RECORDS_PER_PAGE;
        if (loadAll) {
            allRecordsLoaded = true;
        }

        // Clear table and footer if not appending
        if (!lastVisibleRecord || loadAll) { // Clear only if it's the first load or loading all
            trackTasksTableBody.innerHTML = '';
            trackTasksTableFoot.innerHTML = '';
        }

        if (records.length === 0 && trackTasksTableBody.children.length === 0) {
            trackTasksTableBody.innerHTML = `<tr><td colspan="10">${getTranslatedText('noDataToShow')}</td></tr>`;
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
            if (taskChart) {
                taskChart.destroy(); // Destroy existing chart if no data
                taskChart = null;
            }
            return;
        }

        let totalTasksOverall = 0;
        let totalTimeOverall = 0; // in minutes
        let totalBalanceOverall = 0;
        const taskDataForChart = {}; // { taskName: totalMinutes }
        const accountDataForChart = {}; // { accountName: totalMinutes }

        // Fetch all accounts and tasks for display purposes (using cached data)
        const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));
        const tasksMap = new Map(allTaskDefinitions.map(task => [task.id, task]));

        // Fetch custom rates for the logged-in user
        const userCustomRatesCol = collection(db, 'userAccountRates');
        const userRatesQuery = query(userCustomRatesCol, where('userId', '==', userId));
        const userRatesSnapshot = await getDocs(userRatesQuery);
        const userCustomRatesMap = new Map(); // Map<accountId, customPricePerHour>
        userRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            userCustomRatesMap.set(rate.accountId, rate.customPricePerHour);
        });

        // Group records by date for daily totals
        const recordsByDate = {};
        records.forEach(record => {
            const date = record.timestamp.toDate().toLocaleDateString('en-CA'); // YYYY-MM-DD for grouping
            if (!recordsByDate[date]) {
                recordsByDate[date] = [];
            }
            recordsByDate[date].push(record);
        });

        let serial = trackTasksTableBody.children.length + 1; // Continue serial from existing rows

        for (const date in recordsByDate) {
            let dailyTotalTime = 0; // in minutes
            let dailyTotalBalance = 0;

            recordsByDate[date].forEach(record => {
                const recordDate = record.timestamp.toDate();
                const account = accountsMap.get(record.accountId);
                const task = tasksMap.get(record.taskDefinitionId);

                const accountName = account ? account.name : 'N/A';
                const taskName = task ? task.name : 'N/A';
                const timingValue = task ? getMaxTimingForTask(task.id) : 0; // Max timing for the task

                totalTasksOverall += record.totalTasks;
                totalTimeOverall += record.totalTime;
                dailyTotalTime += record.totalTime;

                // Calculate balance for this record
                if (account) {
                    let pricePerHour = account.defaultPricePerHour || 0;
                    if (userCustomRatesMap.has(record.accountId)) {
                        pricePerHour = userCustomRatesMap.get(record.accountId);
                    }
                    const recordBalance = (record.totalTime / 60) * pricePerHour;
                    totalBalanceOverall += recordBalance;
                    dailyTotalBalance += recordBalance;
                }

                // Prepare data for chart
                taskDataForChart[taskName] = (taskDataForChart[taskName] || 0) + record.totalTime;
                accountDataForChart[accountName] = (accountDataForChart[accountName] || 0) + record.totalTime;

                const row = trackTasksTableBody.insertRow();
                row.innerHTML = `
                    <td>${formatNumberToEnglish(serial++)}</td>
                    <td>${recordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td>${accountName}</td>
                    <td>${taskName}</td>
                    <td>${formatNumberToEnglish(formatMinutesToMMSS(timingValue))}</td>
                    <td>${formatNumberToEnglish(record.totalTasks)}</td>
                    <td>${formatNumberToEnglish(formatMinutesToMMSS(record.totalTime))}</td>
                    <td class="total-cell">${formatNumberToEnglish(formatTotalMinutesToHHMMSS(record.totalTime))}</td>
                    <td class="total-cell">${formatNumberToEnglish(formatTotalMinutesToHHMMSS(record.totalTime))}</td>
                    <td></td> <!-- Placeholder for daily total -->
                `;
            });

            // Add daily total row
            const dailyTotalRow = trackTasksTableBody.insertRow();
            dailyTotalRow.classList.add('daily-record-row'); // Add class for styling
            dailyTotalRow.innerHTML = `
                <td colspan="9" class="grand-total-label">${getTranslatedText('dailyTotalTimeColumn')} (${recordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US')}):</td>
                <td class="grand-total-value">${formatNumberToEnglish(formatTotalMinutesToHHMMSS(dailyTotalTime))}</td>
            `;
        }

        // Update grand totals in the footer
        trackTasksTableFoot.innerHTML = `
            <tr>
                <td colspan="5" class="grand-total-label grand-total-footer-cell">${getTranslatedText('grandTotal')}</td>
                <td class="grand-total-value grand-total-footer-cell">${formatNumberToEnglish(totalTasksOverall)}</td>
                <td class="grand-total-value grand-total-footer-cell">${formatNumberToEnglish(formatTotalMinutesToHHMMSS(totalTimeOverall))}</td>
                <td colspan="2" class="grand-total-value grand-total-footer-cell">${formatNumberToEnglish(totalBalanceOverall.toFixed(2))} ${getTranslatedText('currencyUnit')}</td>
                <td class="grand-total-value grand-total-footer-cell"></td>
            </tr>
        `;

        // Render Chart
        renderTaskChart(taskDataForChart);

        // Update pagination button visibility
        loadMoreRecordsBtn.style.display = allRecordsLoaded ? 'none' : 'block';
        loadAllRecordsBtn.style.display = allRecordsLoaded ? 'none' : 'block';

        // Populate filter dropdowns (only once)
        if (recordFilterUser.options.length <= 1) { // Check if already populated (only "All Users" exists)
            populateFilterDropdowns();
        }

    } catch (error) {
        console.error("Error rendering track work page:", error);
        showToastMessage(getTranslatedText('errorLoadingRecords'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const renderTaskChart = (data) => {
    const taskNames = Object.keys(data);
    const totalMinutes = Object.values(data);

    if (taskChart) {
        taskChart.destroy(); // Destroy existing chart instance
    }

    const isDarkMode = document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#BDC3C7' : '#333';
    const titleColor = isDarkMode ? '#76D7C4' : '#2c3e50';

    taskChart = new Chart(taskChartCanvas, {
        type: 'pie',
        data: {
            labels: taskNames,
            datasets: [{
                data: totalMinutes,
                backgroundColor: [
                    '#3498DB', '#2ECC71', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#D35400', '#C0392B', '#2C3E50', '#7F8C8D'
                ],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor, // Dynamic color for legend labels
                        font: {
                            size: 14
                        }
                    },
                    rtl: (currentLanguage === 'ar') // Set RTL for legend
                },
                title: {
                    display: true,
                    text: getTranslatedText('taskTimingsSummary'),
                    color: titleColor, // Dynamic color for title
                    font: {
                        size: 18
                    }
                },
                tooltip: {
                    rtl: (currentLanguage === 'ar'), // Set RTL for tooltips
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatMinutesToMMSS(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
};

const populateFilterDropdowns = async () => {
    // Populate User Filter
    recordFilterUser.innerHTML = `<option value="">${getTranslatedText('allUsers')}</option>`;
    allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        recordFilterUser.appendChild(option);
    });

    // Populate Account Filter
    recordFilterAccount.innerHTML = `<option value="">${getTranslatedText('allAccounts')}</option>`;
    allAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        recordFilterAccount.appendChild(option);
    });

    // Populate Task Filter
    recordFilterTask.innerHTML = `<option value="">${getTranslatedText('allTasks')}</option>`;
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        recordFilterTask.appendChild(option);
    });
};

// 9. Admin Panel Logic
const renderAdminPanel = async () => {
    if (!loggedInUser || loggedInUser.role !== 'admin') {
        showToastMessage(getTranslatedText('unauthorizedAccess'), 'error');
        showPage(loginPage); // Redirect to login if not admin
        return;
    }
    showLoadingIndicator(true);
    try {
        await loadAndDisplayUsers();
        await loadAndDisplayAccounts();
        await loadAndDisplayTaskDefinitions();
        await loadAndDisplayEmployeeRates(); // New: Load employee rates
        await loadAndDisplayWorkRecords(); // Load work records for admin
    } catch (error) {
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

// Users Management
const loadAndDisplayUsers = async () => {
    // If there's an existing listener, unsubscribe first to prevent duplicates
    if (unsubscribeUsers) {
        unsubscribeUsers();
    }

    const usersCollectionRef = collection(db, 'users');
    // Listen for real-time updates to users collection
    unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
        allUsers = snapshot.docs.map(getDocData); // Update cached allUsers
        usersTableBody.innerHTML = ''; // Clear existing table rows

        if (allUsers.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="4">${getTranslatedText('noDataToShow')}</td></tr>`;
            return;
        }

        allUsers.forEach(user => {
            const row = usersTableBody.insertRow();
            const lastActivity = user.lastActivityTimestamp ? user.lastActivityTimestamp.toDate() : null;
            const now = new Date();
            let statusText = getTranslatedText('notSet'); // Default status

            if (lastActivity) {
                const timeDiffMs = now.getTime() - lastActivity.getTime();

                if (timeDiffMs <= USER_ONLINE_THRESHOLD_MS) {
                    // Check if they are currently working on an account/task
                    if (user.currentAccountId && user.currentTaskDefinitionId) {
                        const account = allAccounts.find(acc => acc.id === user.currentAccountId);
                        const task = allTaskDefinitions.find(t => t.id === user.currentTaskDefinitionId);
                        if (account && task) {
                            statusText = getTranslatedText('onlineOnAccountTask', { account: account.name, task: task.name });
                        } else {
                            statusText = getTranslatedText('onlineButNotWorking');
                        }
                    } else {
                        statusText = getTranslatedText('onlineButNotWorking');
                    }
                } else if (timeDiffMs <= USER_RECENTLY_ONLINE_THRESHOLD_MS) {
                    const minutesAgo = Math.floor(timeDiffMs / (60 * 1000));
                    const secondsAgo = Math.round((timeDiffMs % (60 * 1000)) / 1000);
                    statusText = getTranslatedText('lastActivity', {
                        date: lastActivity.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US'),
                        time: lastActivity.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                    });
                } else {
                    statusText = getTranslatedText('lastActivity', {
                        date: lastActivity.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US'),
                        time: lastActivity.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                    });
                }
            } else {
                statusText = getTranslatedText('notSet');
            }

            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.pin}</td>
                <td>${statusText}</td>
                <td>
                    <button class="admin-action-btntp delete" data-user-id="${user.id}" data-user-name="${user.name}">${getTranslatedText('deleteBtn')}</button>
                </td>
            `;
        });

        // Add event listeners for delete buttons
        usersTableBody.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', handleDeleteUser);
        });
    }, (error) => {
        console.error("Error listening to users:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    });
};


const handleDeleteUser = (event) => {
    const userId = event.target.dataset.userId;
    const userName = event.target.dataset.userName;

    showConfirmationModal(getTranslatedText('confirmDeleteUser', { name: userName }), async () => {
        showLoadingIndicator(true);
        try {
            await deleteDoc(doc(db, 'users', userId));
            showToastMessage(getTranslatedText('userDeletedSuccess'), 'success');
        } catch (error) {
            console.error("Error deleting user:", error);
            showToastMessage(getTranslatedText('errorDeletingUser'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });
};

const handleAddUser = async () => {
    const userName = newUserNameInput.value.trim();
    const userPIN = newUserPINInput.value.trim();

    clearInputError(newUserNameInput, newUserNameInputError);
    clearInputError(newUserPINInput, newUserPINInputError);

    if (!userName) {
        showInputError(newUserNameInput, newUserNameInputError, 'requiredField');
        return;
    }
    if (userPIN.length !== 8 || !/^\d+$/.test(userPIN)) {
        showInputError(newUserPINInput, newUserPINInputError, 'invalidPinLength');
        return;
    }

    showLoadingIndicator(true);
    addUserBtn.textContent = getTranslatedText('adding'); // Change button text
    addUserBtn.disabled = true; // Disable button

    try {
        // Check if PIN already exists
        const usersCollectionRef = collection(db, 'users');
        const q = query(usersCollectionRef, where('pin', '==', userPIN), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            showInputError(newUserPINInput, newUserPINInputError, 'pinAlreadyUsed');
            return;
        }

        await addDoc(usersCollectionRef, {
            name: userName,
            pin: userPIN,
            role: 'user', // Default role
            lastActivityTimestamp: null, // Initialize last activity
            currentAccountId: null,
            currentAccountName: null,
            currentTaskDefinitionId: null,
            currentTaskDefinitionName: null,
            lastRecordedTaskTimestamp: null,
            sessionStartTime: null, // Initialize session start time
            currentSessionTasks: [] // Initialize current session tasks
        });

        newUserNameInput.value = '';
        newUserPINInput.value = '';
        showToastMessage(getTranslatedText('userAddedSuccess'), 'success');
    } catch (error) {
        console.error("Error adding user:", error);
        showToastMessage(getTranslatedText('errorAddingUser'), 'error');
    } finally {
        showLoadingIndicator(false);
        addUserBtn.textContent = getTranslatedText('addUserBtn'); // Restore button text
        addUserBtn.disabled = false; // Enable button
    }
};

// Accounts Management
const loadAndDisplayAccounts = async () => {
    showLoadingIndicator(true);
    try {
        const accountsCollectionRef = collection(db, 'accounts');
        const accountsSnapshot = await getDocs(accountsCollectionRef);
        allAccounts = accountsSnapshot.docs.map(getDocData); // Update cached allAccounts
        accountsTableBody.innerHTML = ''; // Clear existing table rows

        if (allAccounts.length === 0) {
            accountsTableBody.innerHTML = `<tr><td colspan="3">${getTranslatedText('noDataToShow')}</td></tr>`;
            return;
        }

        allAccounts.forEach(account => {
            const row = accountsTableBody.insertRow();
            row.innerHTML = `
                <td>${account.name}</td>
                <td>${formatNumberToEnglish(account.defaultPricePerHour ? account.defaultPricePerHour.toFixed(2) : '0.00')} ${getTranslatedText('currencyUnit')}</td>
                <td>
                    <button class="admin-action-btntp delete" data-account-id="${account.id}" data-account-name="${account.name}">${getTranslatedText('deleteBtn')}</button>
                </td>
            `;
        });

        // Add event listeners for delete buttons
        accountsTableBody.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', handleDeleteAccount);
        });
    } catch (error) {
        console.error("Error loading accounts:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleDeleteAccount = (event) => {
    const accountId = event.target.dataset.accountId;
    const accountName = event.target.dataset.accountName;

    showConfirmationModal(getTranslatedText('confirmDeleteAccount', { name: accountName }), async () => {
        showLoadingIndicator(true);
        try {
            await deleteDoc(doc(db, 'accounts', accountId));
            showToastMessage(getTranslatedText('accountDeletedSuccess'), 'success');
            await loadAndDisplayAccounts(); // Refresh the list
        } catch (error) {
            console.error("Error deleting account:", error);
            showToastMessage(getTranslatedText('errorDeletingAccount'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });
};

const handleAddAccount = async () => {
    const accountName = newAccountNameInput.value.trim();
    const defaultPrice = parseFloat(newAccountPriceInput.value);

    clearInputError(newAccountNameInput, newAccountNameInputError);
    clearInputError(newAccountPriceInput, newAccountPriceInputError);

    if (!accountName) {
        showInputError(newAccountNameInput, newAccountNameInputError, 'requiredField');
        return;
    }
    if (isNaN(defaultPrice) || defaultPrice < 0) {
        showInputError(newAccountPriceInput, newAccountPriceInputError, 'invalidPrice');
        return;
    }

    showLoadingIndicator(true);
    addAccountBtn.textContent = getTranslatedText('adding');
    addAccountBtn.disabled = true;

    try {
        // Check if account name already exists
        const accountsCollectionRef = collection(db, 'accounts');
        const q = query(accountsCollectionRef, where('name', '==', accountName), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            showInputError(newAccountNameInput, newAccountNameInputError, 'accountExists');
            return;
        }

        await addDoc(accountsCollectionRef, {
            name: accountName,
            defaultPricePerHour: defaultPrice
        });

        newAccountNameInput.value = '';
        newAccountPriceInput.value = '';
        showToastMessage(getTranslatedText('accountAddedSuccess'), 'success');
        await loadAndDisplayAccounts(); // Refresh the list
    } catch (error) {
        console.error("Error adding account:", error);
        showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
    } finally {
        showLoadingIndicator(false);
        addAccountBtn.textContent = getTranslatedText('addAccountBtn');
        addAccountBtn.disabled = false;
    }
};

// Task Definitions Management
const loadAndDisplayTaskDefinitions = async () => {
    showLoadingIndicator(true);
    try {
        const tasksCollectionRef = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollectionRef);
        allTaskDefinitions = tasksSnapshot.docs.map(getDocData); // Update cached allTaskDefinitions
        tasksDefinitionTableBody.innerHTML = ''; // Clear existing table rows

        if (allTaskDefinitions.length === 0) {
            tasksDefinitionTableBody.innerHTML = `<tr><td colspan="3">${getTranslatedText('noDataToShow')}</td></tr>`;
            return;
        }

        allTaskDefinitions.forEach(task => {
            const row = tasksDefinitionTableBody.insertRow();
            const timingsDisplay = task.timings && task.timings.length > 0
                ? task.timings.map(t => formatMinutesToMMSS(t)).join(', ')
                : getTranslatedText('noTimings'); // Display "No timings defined" if empty

            row.innerHTML = `
                <td>${task.name}</td>
                <td>${timingsDisplay}</td>
                <td>
                    <button class="admin-action-btntp delete" data-task-id="${task.id}" data-task-name="${task.name}">${getTranslatedText('deleteBtn')}</button>
                </td>
            `;
        });

        // Add event listeners for delete buttons
        tasksDefinitionTableBody.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', handleDeleteTask);
        });
    } catch (error) {
        console.error("Error loading tasks:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleDeleteTask = (event) => {
    const taskId = event.target.dataset.taskId;
    const taskName = event.target.dataset.taskName;

    showConfirmationModal(getTranslatedText('confirmDeleteTask', { name: taskName }), async () => {
        showLoadingIndicator(true);
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
            showToastMessage(getTranslatedText('taskDeletedSuccess'), 'success');
            await loadAndDisplayTaskDefinitions(); // Refresh the list
        } catch (error) {
            console.error("Error deleting task:", error);
            showToastMessage(getTranslatedText('errorDeletingTask'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });
};

const handleAddTimingField = () => {
    const timingInputGroup = document.createElement('div');
    timingInputGroup.className = 'timing-input-group';
    timingInputGroup.innerHTML = `
        <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0">
        <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59">
        <button type="button" class="admin-action-btntp delete remove-timing-field" style="background-color: #E74C3C; width: auto; margin-top: 0; padding: 5px 10px;">&times;</button>
    `;
    newTimingsContainer.appendChild(timingInputGroup);

    // Add event listener to the new remove button
    timingInputGroup.querySelector('.remove-timing-field').addEventListener('click', (event) => {
        event.target.closest('.timing-input-group').remove();
        clearInputError(newTaskNameInput, newTimingsInputError); // Clear error if fields are removed
    });
};

const handleAddTaskDefinition = async () => {
    const taskName = newTaskNameInput.value.trim();
    const timingInputsMinutes = newTimingsContainer.querySelectorAll('.new-task-timing-minutes');
    const timingInputsSeconds = newTimingsContainer.querySelectorAll('.new-task-timing-seconds');
    const timings = [];

    clearInputError(newTaskNameInput, newTaskNameInputError);
    clearInputError(newTimingsContainer.querySelector('input') || newTaskNameInput, newTimingsInputError); // Clear error for timing inputs

    if (!taskName) {
        showInputError(newTaskNameInput, newTaskNameInputError, 'requiredField');
        return;
    }

    let hasValidTiming = false;
    for (let i = 0; i < timingInputsMinutes.length; i++) {
        const minutes = parseInt(timingInputsMinutes[i].value);
        const seconds = parseInt(timingInputsSeconds[i].value);

        if (isNaN(minutes) || minutes < 0 || isNaN(seconds) || seconds < 0 || seconds > 59) {
            showInputError(timingInputsMinutes[i], newTimingsInputError, 'invalidTimeInput'); // Show error on the first invalid input
            return;
        }
        const totalMinutes = minutes + (seconds / 60);
        if (totalMinutes > 0) {
            timings.push(totalMinutes);
            hasValidTiming = true;
        }
    }

    if (timings.length === 0 && !hasValidTiming) {
        showInputError(newTimingsContainer.querySelector('.new-task-timing-minutes') || newTaskNameInput, newTimingsInputError, 'enterTaskNameTiming');
        return;
    }

    showLoadingIndicator(true);
    addTaskDefinitionBtn.textContent = getTranslatedText('adding');
    addTaskDefinitionBtn.disabled = true;

    try {
        // Check if task name already exists
        const tasksCollectionRef = collection(db, 'tasks');
        const q = query(tasksCollectionRef, where('name', '==', taskName), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            showInputError(newTaskNameInput, newTaskNameInputError, 'taskExists');
            return;
        }

        await addDoc(tasksCollectionRef, {
            name: taskName,
            timings: timings // Store timings as numbers (minutes.seconds)
        });

        newTaskNameInput.value = '';
        newTimingsContainer.innerHTML = `
            <div class="timing-input-group">
                <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0">
                <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59">
            </div>
        `; // Reset timing fields
        showToastMessage(getTranslatedText('taskAddedSuccess'), 'success');
        await loadAndDisplayTaskDefinitions(); // Refresh the list
    } catch (error) {
        console.error("Error adding task:", error);
        showToastMessage(getTranslatedText('errorAddingTask'), 'error');
    } finally {
        showLoadingIndicator(false);
        addTaskDefinitionBtn.textContent = getTranslatedText('addTaskBtn');
        addTaskDefinitionBtn.disabled = false;
    }
};

// Employee Rates Management (New Section)
const loadAndDisplayEmployeeRates = async () => {
    showLoadingIndicator(true);
    try {
        employeeRatesTableBody.innerHTML = ''; // Clear existing table rows

        // Fetch all users, accounts, and custom rates
        const users = allUsers; // Use cached users
        const accounts = allAccounts; // Use cached accounts

        const userAccountRatesCollectionRef = collection(db, 'userAccountRates');
        const customRatesSnapshot = await getDocs(userAccountRatesCollectionRef);
        const customRatesMap = new Map(); // Key: `${userId}-${accountId}`, Value: customPricePerHour
        customRatesSnapshot.forEach(docSnap => {
            const rate = getDocData(docSnap);
            customRatesMap.set(`${rate.userId}-${rate.accountId}`, { price: rate.customPricePerHour, docId: rate.id });
        });

        // Calculate totals for each employee and each account
        const workRecordsCollectionRef = collection(db, 'workRecords');
        const allWorkRecordsSnapshot = await getDocs(workRecordsCollectionRef);
        const employeeAccountTotals = {}; // { userId: { accountId: { totalTime: X, totalBalance: Y } } }
        const employeeOverallTotals = {}; // { userId: { totalHours: X, totalBalance: Y } }

        allWorkRecordsSnapshot.forEach(docSnap => {
            const record = getDocData(docSnap);
            const userId = record.userId;
            const accountId = record.accountId;
            const totalTime = record.totalTime; // In minutes

            if (!employeeAccountTotals[userId]) {
                employeeAccountTotals[userId] = {};
            }
            if (!employeeAccountTotals[userId][accountId]) {
                employeeAccountTotals[userId][accountId] = { totalTime: 0, totalBalance: 0 };
            }
            employeeAccountTotals[userId][accountId].totalTime += totalTime;

            const account = accounts.find(acc => acc.id === accountId);
            if (account) {
                let pricePerHour = account.defaultPricePerHour || 0;
                const customRateEntry = customRatesMap.get(`${userId}-${accountId}`);
                if (customRateEntry) {
                    pricePerHour = customRateEntry.price;
                }
                const recordBalance = (totalTime / 60) * pricePerHour;
                employeeAccountTotals[userId][accountId].totalBalance += recordBalance;
            }

            // Update overall employee totals
            if (!employeeOverallTotals[userId]) {
                employeeOverallTotals[userId] = { totalHours: 0, totalBalance: 0 };
            }
            employeeOverallTotals[userId].totalHours += totalTime / 60; // Convert to hours
            employeeOverallTotals[userId].totalBalance += employeeAccountTotals[userId][accountId].totalBalance; // Sum up balance from each record
        });

        // Render table rows
        users.forEach(user => {
            if (user.role === 'admin') return; // Skip admin user

            accounts.forEach(account => {
                const row = employeeRatesTableBody.insertRow();
                const customRateEntry = customRatesMap.get(`${user.id}-${account.id}`);
                const customPrice = customRateEntry ? customRateEntry.price : null;
                const customRateDocId = customRateEntry ? customRateEntry.docId : null;

                const accountTotal = employeeAccountTotals[user.id] && employeeAccountTotals[user.id][account.id]
                    ? employeeAccountTotals[user.id][account.id]
                    : { totalTime: 0, totalBalance: 0 };

                const employeeOverall = employeeOverallTotals[user.id] || { totalHours: 0, totalBalance: 0 };

                row.innerHTML = `
                    <td>
                        <button class="edit-icon-circle" 
                                data-user-id="${user.id}" 
                                data-user-name="${user.name}" 
                                data-account-id="${account.id}" 
                                data-account-name="${account.name}"
                                data-default-price="${account.defaultPricePerHour || 0}"
                                data-custom-price="${customPrice !== null ? customPrice : ''}"
                                data-custom-rate-doc-id="${customRateDocId || ''}"
                                title="${getTranslatedText('modify')} ${user.name} - ${account.name} ${getTranslatedText('customPriceColumn')}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                    <td>${user.name}</td>
                    <td>${account.name}</td>
                    <td>${formatNumberToEnglish(account.defaultPricePerHour ? account.defaultPricePerHour.toFixed(2) : '0.00')} ${getTranslatedText('currencyUnit')}</td>
                    <td>${customPrice !== null ? formatNumberToEnglish(customPrice.toFixed(2)) + ' ' + getTranslatedText('currencyUnit') : getTranslatedText('notSet')}</td>
                    <td>${formatNumberToEnglish(formatTotalMinutesToHHMMSS(accountTotal.totalTime))}</td>
                    <td>${formatNumberToEnglish(accountTotal.totalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')}</td>
                    <td>${formatNumberToEnglish(employeeOverall.totalHours.toFixed(2))} ${getTranslatedText('hoursUnitShort')}</td>
                    <td>${formatNumberToEnglish(employeeOverall.totalBalance.toFixed(2))} ${getTranslatedText('currencyUnit')}</td>
                `;
            });
        });

        // Add event listeners for edit icons
        employeeRatesTableBody.querySelectorAll('.edit-icon-circle').forEach(button => {
            button.addEventListener('click', handleEditEmployeeRate);
        });

    } catch (error) {
        console.error("Error loading employee rates:", error);
        showToastMessage(getTranslatedText('errorLoadingData'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleEditEmployeeRate = (event) => {
    const button = event.currentTarget;
    currentEditingRate.userId = button.dataset.userId;
    currentEditingRate.accountId = button.dataset.accountId;
    currentEditingRate.docId = button.dataset.customRateDocId || null; // Existing doc ID if any

    modalEmployeeName.textContent = button.dataset.userName;
    modalAccountName.textContent = button.dataset.accountName;
    modalDefaultPrice.textContent = `${formatNumberToEnglish(parseFloat(button.dataset.defaultPrice).toFixed(2))} ${getTranslatedText('currencyUnit')}`;
    modalCustomPriceInput.value = button.dataset.customPrice; // Pre-fill with existing custom price

    clearInputError(modalCustomPriceInput, modalCustomPriceInputError); // Clear previous errors

    editEmployeeRateModal.style.display = 'flex'; // Show the modal
};

const saveCustomRate = async () => {
    const customPrice = parseFloat(modalCustomPriceInput.value);

    clearInputError(modalCustomPriceInput, modalCustomPriceInputError);

    if (isNaN(customPrice) || customPrice < 0) {
        showInputError(modalCustomPriceInput, modalCustomPriceInputError, 'invalidPrice');
        return;
    }

    showLoadingIndicator(true);
    saveCustomRateBtn.textContent = getTranslatedText('updating');
    saveCustomRateBtn.disabled = true;

    try {
        const userAccountRatesCollectionRef = collection(db, 'userAccountRates');
        const rateData = {
            userId: currentEditingRate.userId,
            accountId: currentEditingRate.accountId,
            customPricePerHour: customPrice,
            timestamp: serverTimestamp()
        };

        if (currentEditingRate.docId) {
            // Update existing document
            await updateDoc(doc(db, 'userAccountRates', currentEditingRate.docId), rateData);
        } else {
            // Add new document
            await addDoc(userAccountRatesCollectionRef, rateData);
        }

        showToastMessage(getTranslatedText('rateUpdated'), 'success');
        editEmployeeRateModal.style.display = 'none'; // Hide modal
        await loadAndDisplayEmployeeRates(); // Refresh the table
    } catch (error) {
        console.error("Error saving custom rate:", error);
        showToastMessage(getTranslatedText('errorSavingWork'), 'error');
    } finally {
        showLoadingIndicator(false);
        saveCustomRateBtn.textContent = getTranslatedText('saveChangesBtn');
        saveCustomRateBtn.disabled = false;
    }
};


// Work Records Management (Admin Panel)
const loadAndDisplayWorkRecords = async (loadMore = false) => {
    showLoadingIndicator(true);
    try {
        const workRecordsCollectionRef = collection(db, 'workRecords');
        let recordsQuery = query(
            workRecordsCollectionRef,
            orderBy('timestamp', 'desc') // Order by timestamp descending
        );

        // Apply filters
        const filterDate = recordFilterDate.value;
        const filterUser = recordFilterUser.value;
        const filterAccount = recordFilterAccount.value;
        const filterTask = recordFilterTask.value;

        if (filterDate) {
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            recordsQuery = query(recordsQuery, 
                where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
                where('timestamp', '<=', Timestamp.fromDate(endOfDay))
            );
        }
        if (filterUser) {
            recordsQuery = query(recordsQuery, where('userId', '==', filterUser));
        }
        if (filterAccount) {
            recordsQuery = query(recordsQuery, where('accountId', '==', filterAccount));
        }
        if (filterTask) {
            recordsQuery = query(recordsQuery, where('taskDefinitionId', '==', filterTask));
        }

        if (loadMore && lastVisibleRecord) {
            recordsQuery = query(recordsQuery, startAfter(lastVisibleRecord), limit(RECORDS_PER_PAGE));
        } else if (!loadMore && !loadAllRecordsBtn.classList.contains('active')) { // Initial load or new filter, not "Load All"
            recordsQuery = query(recordsQuery, limit(RECORDS_PER_PAGE));
        }
        // If "Load All" is active, no limit is applied, fetching all matching records

        const querySnapshot = await getDocs(recordsQuery);
        const records = querySnapshot.docs.map(getDocData);

        // Update lastVisibleRecord for pagination
        if (!querySnapshot.empty && !loadAllRecordsBtn.classList.contains('active')) {
            lastVisibleRecord = querySnapshot.docs[querySnapshot.docs.length - 1];
        } else {
            lastVisibleRecord = null; // Reset if no more records or loading all
        }

        // Determine if all records have been loaded
        allRecordsLoaded = querySnapshot.empty || querySnapshot.docs.length < RECORDS_PER_PAGE;
        if (loadAllRecordsBtn.classList.contains('active')) {
            allRecordsLoaded = true;
        }

        // Clear table if it's not a "load more" action
        if (!loadMore) {
            workRecordsTableBody.innerHTML = '';
        }

        if (records.length === 0 && workRecordsTableBody.children.length === 0) {
            workRecordsTableBody.innerHTML = `<tr><td colspan="6">${getTranslatedText('noMatchingRecords')}</td></tr>`;
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
            return;
        }

        records.forEach(record => {
            const row = workRecordsTableBody.insertRow();
            const recordDate = record.timestamp.toDate();
            row.innerHTML = `
                <td>${record.userName}</td>
                <td>${record.accountName}</td>
                <td>${record.taskDefinitionName}</td>
                <td>${formatNumberToEnglish(record.totalTime.toFixed(2))}</td>
                <td>${recordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US')} ${recordDate.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    <button class="admin-action-btntp primary" data-record-id="${record.id}" data-record-data='${JSON.stringify(record)}'>${getTranslatedText('editRecord')}</button>
                    <button class="admin-action-btntp delete" data-record-id="${record.id}" data-user-name="${record.userName}">${getTranslatedText('deleteBtn')}</button>
                </td>
            `;
        });

        // Update pagination button visibility
        loadMoreRecordsBtn.style.display = allRecordsLoaded ? 'none' : 'block';
        loadAllRecordsBtn.style.display = allRecordsLoaded ? 'none' : 'block';

        // Add event listeners for edit and delete buttons
        workRecordsTableBody.querySelectorAll('.admin-action-btntp.primary').forEach(button => {
            button.addEventListener('click', handleEditRecord);
        });
        workRecordsTableBody.querySelectorAll('.admin-action-btntp.delete').forEach(button => {
            button.addEventListener('click', handleDeleteRecord);
        });

        // Populate filter dropdowns (only once)
        if (recordFilterUser.options.length <= 1) { // Check if already populated (only "All Users" exists)
            populateFilterDropdowns();
        }

    } catch (error) {
        console.error("Error loading work records:", error);
        showToastMessage(getTranslatedText('errorLoadingRecords'), 'error');
    } finally {
        showLoadingIndicator(false);
    }
};

const handleDeleteRecord = (event) => {
    const recordId = event.target.dataset.recordId;
    const userName = event.target.dataset.userName;

    showConfirmationModal(getTranslatedText('confirmDeleteRecord', { name: userName }), async () => {
        showLoadingIndicator(true);
        try {
            await deleteDoc(doc(db, 'workRecords', recordId));
            showToastMessage(getTranslatedText('recordDeletedSuccess'), 'success');
            await loadAndDisplayWorkRecords(); // Refresh the list
        } catch (error) {
            console.error("Error deleting record:", error);
            showToastMessage(getTranslatedText('errorDeletingRecord'), 'error');
        } finally {
            showLoadingIndicator(false);
        }
    });
};

const handleEditRecord = (event) => {
    const recordData = JSON.parse(event.target.dataset.recordData);
    currentEditingRecordId = recordData.id;

    // Populate account select
    editAccountSelect.innerHTML = '';
    allAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        editAccountSelect.appendChild(option);
    });
    editAccountSelect.value = recordData.accountId;

    // Populate task type select
    editTaskTypeSelect.innerHTML = '';
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        editTaskTypeSelect.appendChild(option);
    });
    editTaskTypeSelect.value = recordData.taskDefinitionId;

    editTotalTasksCount.value = recordData.totalTasks;
    editTotalTime.value = recordData.totalTime.toFixed(2); // Display with 2 decimal places

    // Set date and time inputs
    const recordDate = recordData.timestamp.toDate();
    editRecordDate.value = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD
    editRecordTime.value = recordDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Clear any previous errors
    clearInputError(editAccountSelect, editAccountSelectError);
    clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
    clearInputError(editTotalTasksCount, editTotalTasksCountError);
    clearInputError(editTotalTime, editTotalTimeError);
    clearInputError(editRecordDate, editRecordDateError);
    clearInputError(editRecordTime, editRecordTimeError);

    editRecordModal.style.display = 'flex'; // Show the modal
};

const saveEditedRecord = async () => {
    const accountId = editAccountSelect.value;
    const taskDefinitionId = editTaskTypeSelect.value;
    const totalTasks = parseInt(editTotalTasksCount.value);
    const totalTime = parseFloat(editTotalTime.value);
    const recordDate = editRecordDate.value;
    const recordTime = editRecordTime.value;

    // Clear any previous errors
    clearInputError(editAccountSelect, editAccountSelectError);
    clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
    clearInputError(editTotalTasksCount, editTotalTasksCountError);
    clearInputError(editTotalTime, editTotalTimeError);
    clearInputError(editRecordDate, editRecordDateError);
    clearInputError(editRecordTime, editRecordTimeError);

    if (!accountId) {
        showInputError(editAccountSelect, editAccountSelectError, 'requiredField');
        return;
    }
    if (!taskDefinitionId) {
        showInputError(editTaskTypeSelect, editTaskTypeSelectError, 'requiredField');
        return;
    }
    if (isNaN(totalTasks) || totalTasks < 0) {
        showInputError(editTotalTasksCount, editTotalTasksCountError, 'invalidNumber');
        return;
    }
    if (isNaN(totalTime) || totalTime < 0) {
        showInputError(editTotalTime, editTotalTimeError, 'invalidNumber');
        return;
    }
    if (!recordDate) {
        showInputError(editRecordDate, editRecordDateError, 'requiredField');
        return;
    }
    if (!recordTime) {
        showInputError(editRecordTime, editRecordTimeError, 'requiredField');
        return;
    }

    showLoadingIndicator(true);
    saveEditedRecordBtn.textContent = getTranslatedText('updating');
    saveEditedRecordBtn.disabled = true;

    try {
        const newTimestamp = new Date(`${recordDate}T${recordTime}:00`); // Combine date and time
        if (isNaN(newTimestamp.getTime())) {
            showInputError(editRecordDate, editRecordDateError, 'invalidEditData');
            showInputError(editRecordTime, editRecordTimeError, 'invalidEditData');
            return;
        }

        const updatedRecord = {
            accountId: accountId,
            accountName: allAccounts.find(acc => acc.id === accountId)?.name || 'N/A',
            taskDefinitionId: taskDefinitionId,
            taskDefinitionName: allTaskDefinitions.find(task => task.id === taskDefinitionId)?.name || 'N/A',
            totalTasks: totalTasks,
            totalTime: totalTime,
            timestamp: Timestamp.fromDate(newTimestamp) // Convert to Firestore Timestamp
        };

        await updateDoc(doc(db, 'workRecords', currentEditingRecordId), updatedRecord);

        showToastMessage(getTranslatedText('recordUpdatedSuccess'), 'success');
        editRecordModal.style.display = 'none'; // Hide modal
        await loadAndDisplayWorkRecords(); // Refresh the list
    } catch (error) {
        console.error("Error updating record:", error);
        showToastMessage(getTranslatedText('errorUpdatingRecord'), 'error');
    } finally {
        showLoadingIndicator(false);
        saveEditedRecordBtn.textContent = getTranslatedText('saveChangesBtn');
        saveEditedRecordBtn.disabled = false;
    }
};


// 10. Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    setLanguage(currentLanguage); // Apply initial language
    loadDarkModePreference(); // Apply dark mode preference

    // Login Page
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', (event) => {
            if (event.target.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            // If all filled, attempt login
            if (pinInputs.every(input => input.value.length === 1)) {
                handleLogin();
            }
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && event.target.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    // Main Dashboard
    startWorkOptionBtn.addEventListener('click', handleStartWorkOptionClick);
    trackWorkOptionBtn.addEventListener('click', handleTrackWorkOptionClick);
    logoutDashboardBtn.addEventListener('click', logout);

    // Start Work Page
    confirmSelectionBtn.addEventListener('click', handleConfirmSelection);
    backToDashboardFromPopup.addEventListener('click', backToDashboardFromStartWorkPage);
    saveWorkBtn.addEventListener('click', saveWork);
    backToDashboardFromStartWork.addEventListener('click', backToDashboardFromStartWorkPage);

    // Track Work Page
    backToDashboardFromTrackBtn.addEventListener('click', () => {
        showPage(mainDashboard);
        renderMainDashboard(); // Refresh dashboard totals when returning
    });
    filterRecordsBtn.addEventListener('click', () => renderTrackWorkPage(false)); // Filter on click
    loadMoreRecordsBtn.addEventListener('click', () => renderTrackWorkPage(true)); // Load more on click
    loadAllRecordsBtn.addEventListener('click', () => {
        loadAllRecordsBtn.classList.add('active'); // Mark "Load All" as active
        renderTrackWorkPage(true); // Load all on click
    });

    // Admin Panel
    // Dynamically add Admin Panel button if user is admin
    if (loggedInUser && loggedInUser.role === 'admin') {
        const dashboardOptionsDiv = document.querySelector('.dashboard-options');
        adminPanelButton = document.createElement('button');
        adminPanelButton.id = 'adminPanelOption';
        adminPanelButton.className = 'big-option-btn';
        adminPanelButton.setAttribute('data-key', 'adminPanelTitle');
        adminPanelButton.textContent = getTranslatedText('adminPanelTitle');
        dashboardOptionsDiv.appendChild(adminPanelButton);
        adminPanelButton.addEventListener('click', async () => {
            showPage(adminPanelPage);
            await renderAdminPanel();
        });
    }

    addUserBtn.addEventListener('click', handleAddUser);
    addAccountBtn.addEventListener('click', handleAddAccount);
    addTimingFieldBtn.addEventListener('click', handleAddTimingField);
    addTaskDefinitionBtn.addEventListener('click', handleAddTaskDefinition);
    logoutAdminBtn.addEventListener('click', logout);

    // Edit Record Modal
    closeEditRecordModalBtn.addEventListener('click', () => {
        editRecordModal.style.display = 'none';
        clearInputError(editAccountSelect, editAccountSelectError);
        clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
        clearInputError(editTotalTasksCount, editTotalTasksCountError);
        clearInputError(editTotalTime, editTotalTimeError);
        clearInputError(editRecordDate, editRecordDateError);
        clearInputError(editRecordTime, editRecordTimeError);
    });
    saveEditedRecordBtn.addEventListener('click', saveEditedRecord);

    // Edit Employee Rate Modal
    if (editEmployeeRateModal) {
        editEmployeeRateModal.querySelector('.close-button').addEventListener('click', () => {
            editEmployeeRateModal.style.display = 'none';
            clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
        });
    }
    saveCustomRateBtn.addEventListener('click', saveCustomRate);


    // Connection Status Events
    window.addEventListener('online', () => {
        showToastMessage(getTranslatedText('internetRestored'), 'success');
    });
    window.addEventListener('offline', () => {
        showToastMessage(getTranslatedText('internetLost'), 'error');
    });

    // Language and Dark Mode buttons
    if (langArBtn) {
        langArBtn.addEventListener('click', () => {
            setLanguage('ar');
            langArBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        });
    }
    if (langEnBtn) {
        langEnBtn.addEventListener('click', () => {
            setLanguage('en');
            langEnBtn.classList.add('active');
            langArBtn.classList.remove('active');
        });
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Initial load check for session
    await loadSession();
});

// Initial call to check connection status
checkConnectionStatus();
