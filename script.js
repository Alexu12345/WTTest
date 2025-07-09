import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit, Timestamp, serverTimestamp, addDoc, orderBy, onSnapshot, startAfter } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { documentId } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Import documentId

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
let allUsers = []; // Stores all user definitions from Firestore
let allTaskRecords = []; // Stores daily work records for the logged-in user
let allAdminRecords = []; // Stores all records for admin view
let workingOnAccountId = null;
let workingOnTaskId = null;
let workStartTime = null; // Timestamp when work started for the current task
let timerInterval = null; // Interval for updating timer display
let sessionTimerInterval = null; // Interval for updating session time popup
let currentPage = 1;
const recordsPerPage = 10;
let filteredAdminRecords = []; // To store filtered records for pagination
let lastVisibleRecord = null; // For pagination

// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainDashboard = document.getElementById('mainDashboard');
const startWorkPage = document.getElementById('startWorkPage');
const trackWorkPage = document.getElementById('trackWorkPage');
const adminPanelPage = document.getElementById('adminPanelPage');

// Login Page elements
const pinInputs = [
    document.getElementById('pinInput1'),
    document.getElementById('pinInput2'),
    document.getElementById('pinInput3'),
    document.getElementById('pinInput4'),
    document.getElementById('pinInput5'),
    document.getElementById('pinInput6'),
    document.getElementById('pinInput7'),
    document.getElementById('pinInput8')
];
const loginBtn = document.getElementById('loginBtn');
const forgotPinLink = document.getElementById('forgotPinLink');
const pinInputError = document.getElementById('pinInputError');

// Main Dashboard elements
const userNameDisplay = document.getElementById('userNameDisplay');
const totalHoursDisplay = document.getElementById('totalHoursDisplay');
const totalBalanceDisplay = document.getElementById('totalBalanceDisplay');
const startWorkOption = document.getElementById('startWorkOption');
const trackWorkOption = document.getElementById('trackWorkOption');
const logoutDashboardBtn = document.getElementById('logoutDashboardBtn');

// Start Work Page elements
const taskSelectionPopup = document.getElementById('taskSelectionPopup');
const accountSelect = document.getElementById('accountSelect');
const taskTypeSelect = document.getElementById('taskTypeSelect');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
const backToDashboardFromPopup = document.getElementById('backToDashboardFromPopup');
const taskDetailsContainer = document.getElementById('taskDetailsContainer');
const completedTasksCount = document.getElementById('completedTasksCount');
const recordedTotalTime = document.getElementById('recordedTotalTime');
const detailedSummaryContainer = document.getElementById('detailedSummaryContainer');
const taskTimingButtonsContainer = document.getElementById('taskTimingButtonsContainer');
const saveWorkBtn = document.getElementById('saveWorkBtn');
const backToDashboardFromStartWork = document.getElementById('backToDashboardFromStartWork');

// Session Time Popup elements (new)
const sessionTimePopup = document.getElementById('sessionTimePopup');
const sessionStartTimeDisplay = document.getElementById('sessionStartTime');
const popupTotalSessionTime = document.getElementById('popupTotalSessionTime');
const netSessionTimeDisplay = document.getElementById('netSessionTime');
const delayDurationDisplay = document.getElementById('delayDuration');
const dynamicTaskDetails = document.getElementById('dynamicTaskDetails');


// Track Work Page elements
const taskChart = document.getElementById('taskChart');
const backToDashboardFromTrack = document.getElementById('backToDashboardFromTrack');
const trackTasksTableBody = document.getElementById('trackTasksTableBody');
const trackTasksTableFoot = document.getElementById('trackTasksTableFoot');

// Admin Panel elements
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

// Manage Users
const newUserNameInput = document.getElementById('newUserNameInput');
const newUserNameInputError = document.getElementById('newUserNameInputError');
const newUserPINInput = document.getElementById('newUserPINInput');
const newUserPINInputError = document.getElementById('newUserPINInputError');
const addUserBtn = document.getElementById('addUserBtn');
const usersTableBody = document.getElementById('usersTableBody');

// Manage Accounts
const newAccountNameInput = document.getElementById('newAccountNameInput');
const newAccountNameInputError = document.getElementById('newAccountNameInputError');
const newAccountPriceInput = document.getElementById('newAccountPriceInput');
const newAccountPriceInputError = document.getElementById('newAccountPriceInputError');
const addAccountBtn = document.getElementById('addAccountBtn');
const accountsTableBody = document.getElementById('accountsTableBody');

// Manage Tasks
const newTaskNameInput = document.getElementById('newTaskNameInput');
const newTaskNameInputError = document = document.getElementById('newTaskNameInputError');
const newTimingsContainer = document.getElementById('newTimingsContainer');
const newTimingsInputError = document.getElementById('newTimingsInputError');
const addTimingFieldBtn = document.getElementById('addTimingFieldBtn');
const addTaskDefinitionBtn = document.getElementById('addTaskDefinitionBtn');
const tasksDefinitionTableBody = document.getElementById('tasksDefinitionTableBody');

// Manage Employee Rates and Totals
const employeeRatesTableBody = document.getElementById('employeeRatesTableBody');

// Manage Work Records
const recordFilterDate = document.getElementById('recordFilterDate');
const recordFilterUser = document.getElementById('recordFilterUser');
const recordFilterAccount = document.getElementById('recordFilterAccount');
const recordFilterTask = document.getElementById('recordFilterTask');
const filterRecordsBtn = document.getElementById('filterRecordsBtn');
const workRecordsTableBody = document.getElementById('workRecordsTableBody');
const loadMoreRecordsBtn = document.getElementById('loadMoreRecordsBtn');
const loadAllRecordsBtn = document.getElementById('loadAllRecordsBtn');

// Modals
const editRecordModal = document.getElementById('editRecordModal');
const closeEditRecordModalBtn = editRecordModal.querySelector('.close-button');
const editAccountSelect = document.getElementById('editAccountSelect');
const editAccountSelectError = document.getElementById('editAccountSelectError');
const editTaskTypeSelect = document.getElementById('editTaskTypeSelect');
const editTaskTypeSelectError = document.getElementById('editTaskTypeSelectError');
const editTotalTasksCount = document.getElementById('editTotalTasksCount');
const editTotalTasksCountError = document.getElementById('editTotalTasksCountError');
const editTotalTime = document.getElementById('editTotalTime');
const editTotalTimeError = document.getElementById('editTotalTimeError');
const editRecordDate = document.getElementById('editRecordDate');
const editRecordDateError = document.getElementById('editRecordDateError');
const editRecordTime = document.getElementById('editRecordTime');
const editRecordTimeError = document.getElementById('editRecordTimeError');
const saveEditedRecordBtn = document.getElementById('saveEditedRecordBtn');
let currentEditingRecordId = null;

const editEmployeeRateModal = document.getElementById('editEmployeeRateModal');
const modalEmployeeName = document.getElementById('modalEmployeeName');
const modalAccountName = document.getElementById('modalAccountName');
const modalDefaultPrice = document.getElementById('modalDefaultPrice');
const modalCustomPriceInput = document.getElementById('modalCustomPriceInput');
const modalCustomPriceInputError = document.getElementById('modalCustomPriceInputError');
const saveCustomRateBtn = document.getElementById('saveCustomRateBtn');
let currentEditingRate = { userId: null, accountId: null };

const loginErrorModal = document.getElementById('loginErrorModal');
const closeLoginErrorModal = document.getElementById('closeLoginErrorModal');
const loginErrorModalTitle = document.getElementById('loginErrorModalTitle');
const loginErrorModalMessage = document.getElementById('loginErrorModalMessage');
const loginErrorModalCloseBtn = document.getElementById('loginErrorModalCloseBtn');

const confirmationModal = document.getElementById('confirmationModal');
const closeConfirmationModal = document.getElementById('closeConfirmationModal');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalMessage = document.getElementById('confirmationModalMessage');
const confirmModalBtn = document.getElementById('confirmModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
let confirmationCallback = null;

// Global UI elements
const loadingIndicator = document.getElementById('loadingIndicator');
const toastMessage = document.getElementById('toastMessage');
const langArBtn = document.getElementById('langArBtn');
const langEnBtn = document.getElementById('langEnBtn');
const darkModeToggle = document.getElementById('darkModeToggle');

// Language texts (Arabic and English)
const languageTexts = {
    ar: {
        loginTitle: "تسجيل الدخول",
        enterPinPlaceholder: "أدخل رقم التعريف الشخصي",
        loginButton: "تسجيل الدخول",
        forgotPin: "هل نسيت رقم التعريف الشخصي؟",
        hello: "مرحباً،",
        totalHoursTitle: "إجمالي ساعات العمل:",
        hoursUnit: "ساعة",
        totalBalanceTitle: "إجمالي الرصيد:",
        currencyUnit: "جنيه",
        startWorkOption: "بدء العمل",
        trackWorkOption: "متابعة العمل",
        logoutAdmin: "تسجيل الخروج",
        chooseTask: "اختر المهمة",
        accountName: "اسم الحساب:",
        taskType: "نوع المهمة:",
        confirmBtn: "تأكيد",
        backToDashboard: "رجوع للرئيسية",
        taskCount: "عدد المهام المنجزة:",
        totalTimeRecorded: "إجمالي الوقت المسجل:",
        saveWorkBtn: "حفظ العمل",
        trackWorkTitle: "متابعة العمل",
        serialColumn: "المسلسل",
        dateColumn: "التاريخ",
        accountNameColumn: "اسم الحساب",
        taskColumn: "المهمة",
        timingValueColumn: "التوقيت (دقيقة)",
        completedTasksColumn: "عدد المهام المنجزة",
        totalTimeMinutesColumn: "إجمالي الوقت (دقيقة)",
        totalForTaskColumn: "إجمالي المهمة",
        totalForAccountColumn: "إجمالي الحساب",
        dailyTotalTimeColumn: "إجمالي اليوم",
        adminPanelTitle: "لوحة تحكم المدير",
        manageUsers: "إدارة المستخدمين",
        newUserName: "اسم المستخدم الجديد",
        newUserPIN: "رمز PIN للمستخدم (8 أرقام)",
        addUserBtn: "إضافة مستخدم",
        currentUsers: "المستخدمون الحاليون:",
        nameColumn: "الاسم",
        pinColumn: "PIN",
        statusColumn: "الحالة",
        actionsColumn: "إجراءات",
        manageAccounts: "إدارة الحسابات",
        newAccountName: "اسم الحساب الجديد",
        defaultPricePlaceholder: "السعر الافتراضي للساعة (جنيه)",
        addAccountBtn: "إضافة حساب",
        currentAccounts: "الحسابات الحالية:",
        defaultPriceColumn: "السعر الافتراضي/ساعة",
        manageTasks: "إدارة المهام والتوقيتات",
        newTaskName: "اسم المهمة الجديدة",
        minutesPlaceholder: "دقائق",
        secondsPlaceholder: "ثواني",
        addTimingField: "إضافة حقل توقيت",
        addTaskBtn: "إضافة مهمة جديدة",
        currentTasks: "المهام الحالية:",
        timingsColumn: "التوقيتات (دقائق:ثواني)",
        manageEmployeeRates: "إدارة أسعار الموظفين والإجماليات",
        employeeNameColumn: "الموظف",
        customPriceColumn: "السعر المخصص/ساعة",
        accountTotalTimeColumnShort: "وقت الحساب",
        accountBalanceColumn: "رصيد الحساب",
        employeeTotalHoursColumn: "إجمالي الساعات",
        employeeTotalBalanceColumn: "إجمالي الرصيد المستحق",
        manageWorkRecords: "إدارة سجلات العمل",
        filterBtn: "تصفية",
        userColumn: "المستخدم",
        loadMoreBtn: "أعرض أكثر (50)",
        loadAllBtn: "عرض الكل",
        editRecord: "تعديل",
        taskCountEdit: "عدد المهام:",
        totalTimeEdit: "إجمالي الوقت (دقيقة):",
        timeColumn: "الوقت:",
        saveChangesBtn: "حفظ التعديلات",
        editCustomRateTitle: "تعديل السعر المخصص",
        employeeNameLabel: "الموظف:",
        customPriceInputLabel: "السعر المخصص (جنيه):",
        accountNameLabel: "الحساب:",
        defaultPriceLabel: "السعر الافتراضي:",
        error: "خطأ",
        close: "إغلاق",
        confirmAction: "تأكيد الإجراء",
        confirmBtn: "تأكيد",
        cancelBtn: "إلغاء",
        // Toast messages
        pinRequired: "رقم التعريف الشخصي مطلوب.",
        pinInvalid: "رقم التعريف الشخصي غير صحيح. يرجى المحاولة مرة أخرى.",
        adminLoginSuccess: "تم تسجيل الدخول كمسؤول بنجاح.",
        userLoginSuccess: "تم تسجيل الدخول كمستخدم بنجاح.",
        accountTaskRequired: "يرجى اختيار حساب ومهمة لبدء العمل.",
        workStarted: "تم بدء العمل.",
        workEnded: "تم إنهاء العمل وحفظه.",
        workReset: "تم إعادة ضبط العمل.",
        alreadyWorking: "أنت تعمل بالفعل على مهمة.",
        notWorking: "أنت لا تعمل على أي مهمة حاليًا.",
        logoutSuccess: "تم تسجيل الخروج بنجاح.",
        userAdded: "تم إضافة المستخدم بنجاح.",
        userUpdated: "تم تحديث المستخدم بنجاح.",
        userDeleted: "تم حذف المستخدم بنجاح.",
        accountAdded: "تم إضافة الحساب بنجاح.",
        accountUpdated: "تم تحديث الحساب بنجاح.",
        accountDeleted: "تم حذف الحساب بنجاح.",
        taskAdded: "تم إضافة المهمة بنجاح.",
        taskUpdated: "تم تحديث المهمة بنجاح.",
        taskDeleted: "تم حذف المهمة بنجاح.",
        recordUpdated: "تم تحديث السجل بنجاح.",
        recordDeleted: "تم حذف السجل بنجاح.",
        rateUpdated: "تم تحديث السعر المخصص بنجاح.",
        errorAddingUser: "خطأ في إضافة المستخدم.",
        errorUpdatingUser: "خطأ في تحديث المستخدم.",
        errorDeletingUser: "خطأ في حذف المستخدم.",
        errorAddingAccount: "خطأ في إضافة الحساب.",
        errorUpdatingAccount: "خطأ في تحديث الحساب.",
        errorDeletingAccount: "خطأ في حذف الحساب.",
        errorAddingTask: "خطأ في إضافة المهمة.",
        errorUpdatingTask: "خطأ في تحديث المهمة.",
        errorDeletingTask: "خطأ في حذف المهمة.",
        errorUpdatingRecord: "خطأ في تحديث السجل.",
        errorDeletingRecord: "خطأ في حذف السجل.",
        errorUpdatingRate: "خطأ في تحديث السعر.",
        errorFetchingData: "خطأ في جلب البيانات.",
        errorFetchingRecords: "خطأ في جلب السجلات.",
        operationFailed: "فشلت العملية.",
        confirmDeleteUser: "هل أنت متأكد أنك تريد حذف هذا المستخدم؟ سيتم حذف جميع سجلات عمله أيضًا.",
        confirmDeleteAccount: "هل أنت متأكد أنك تريد حذف هذا الحساب؟",
        confirmDeleteTask: "هل أنت متأكد أنك تريد حذف هذه المهمة؟",
        confirmDeleteRecord: "هل أنت متأكد أنك تريد حذف هذا السجل؟",
        confirmLogout: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        internetLost: "تم فقدان الاتصال بالإنترنت. قد لا يتم حفظ البيانات.",
        internetRestored: "تم استعادة الاتصال بالإنترنت. سيتم مزامنة البيانات تلقائيًا.",
        userNotFound: "المستخدم غير موجود.",
        accountNotFound: "الحساب غير موجود.",
        taskNotFound: "المهمة غير موجودة.",
        recordNotFound: "السجل غير موجود.",
        dataNotFound: "البيانات غير موجودة.",
        fillAllFields: "يرجى ملء جميع الحقول.",
        userNameRequired: "اسم المستخدم مطلوب.",
        pinInvalidFormat: "يجب أن يتكون رقم التعريف الشخصي من 8 أرقام.",
        pinAlreadyExists: "رقم التعريف الشخصي هذا موجود بالفعل. يرجى اختيار رقم آخر.",
        accountNameRequired: "اسم الحساب مطلوب.",
        invalidPrice: "السعر غير صالح. يرجى إدخال قيمة موجبة.",
        accountAlreadyExists: "اسم الحساب هذا موجود بالفعل. يرجى اختيار اسم آخر.",
        taskNameRequired: "اسم المهمة مطلوب.",
        taskAlreadyExists: "اسم المهمة هذا موجود بالفعل. يرجى اختيار اسم آخر.",
        dateRequired: "التاريخ مطلوب.",
        invalidDuration: "المدة غير صالحة. يرجى إدخال قيمة موجبة.",
        noRecordsToExport: "لا توجد سجلات لتصديرها.",
        exportSuccess: "تم تصدير السجلات بنجاح.",
        setCustomRate: "تحديد سعر مخصص",
        forgotPinMessage: "يرجى التواصل مع المسؤول لاستعادة رقم التعريف الشخصي الخاص بك.",
        accessDenied: "ليس لديك صلاحية الوصول إلى هذه الميزة.",
        invalidTiming: "التوقيت غير صالح. يرجى إدخال دقائق وثواني صحيحة (الثواني بين 0 و 59).",
        timingRequired: "يجب إضافة توقيت واحد على الأقل للمهمة.",
        workSaved: "تم حفظ العمل بنجاح.",
        undo: "تراجع",
        invalidCount: "العدد غير صالح.",
        timeRequired: "الوقت مطلوب.",
        // New session time popup translations
        sessionDetailsTitle: "تفاصيل الجلسة",
        sessionStartTimeLabel: "وقت بداية الجلسة:",
        totalSessionTimeDisplayLabel: "إجمالي وقت الجلسة:",
        netSessionTimeLabel: "صافي وقت الجلسة:",
        delayLabel: "التأخير:",
        tasksAt: "مهمات بـ",
        minutes: "دقائق",
        hours: "ساعات",
        seconds: "ثواني",
        unknownTask: "مهمة غير معروفة",
        totalDailyHoursLabel: "الإجمالي الكلي" // Reusing for grand total
    },
    en: {
        loginTitle: "Login",
        enterPinPlaceholder: "Enter PIN",
        loginButton: "Login",
        forgotPin: "Forgot PIN?",
        hello: "Hello,",
        totalHoursTitle: "Total Working Hours:",
        hoursUnit: "hours",
        totalBalanceTitle: "Total Balance:",
        currencyUnit: "EGP",
        startWorkOption: "Start Work",
        trackWorkOption: "Track Work",
        logoutAdmin: "Logout",
        chooseTask: "Choose Task",
        accountName: "Account Name:",
        taskType: "Task Type:",
        confirmBtn: "Confirm",
        backToDashboard: "Back to Dashboard",
        taskCount: "Tasks Completed:",
        totalTimeRecorded: "Total Time Recorded:",
        saveWorkBtn: "Save Work",
        trackWorkTitle: "Track Work",
        serialColumn: "Serial",
        dateColumn: "Date",
        accountNameColumn: "Account Name",
        taskColumn: "Task",
        timingValueColumn: "Timing (minutes)",
        completedTasksColumn: "Tasks Completed",
        totalTimeMinutesColumn: "Total Time (minutes)",
        totalForTaskColumn: "Total for Task",
        totalForAccountColumn: "Total for Account",
        dailyTotalTimeColumn: "Daily Total",
        adminPanelTitle: "Admin Control Panel",
        manageUsers: "Manage Users",
        newUserName: "New User Name",
        newUserPIN: "User PIN (8 digits)",
        addUserBtn: "Add User",
        currentUsers: "Current Users:",
        nameColumn: "Name",
        pinColumn: "PIN",
        statusColumn: "Status",
        actionsColumn: "Actions",
        manageAccounts: "Manage Accounts",
        newAccountName: "New Account Name",
        defaultPricePlaceholder: "Default Price per Hour (EGP)",
        addAccountBtn: "Add Account",
        currentAccounts: "Current Accounts:",
        defaultPriceColumn: "Default Price/Hour",
        manageTasks: "Manage Tasks & Timings",
        newTaskName: "New Task Name",
        minutesPlaceholder: "Minutes",
        secondsPlaceholder: "Seconds",
        addTimingField: "Add Timing Field",
        addTaskBtn: "Add New Task",
        currentTasks: "Current Tasks:",
        timingsColumn: "Timings (minutes:seconds)",
        manageEmployeeRates: "Manage Employee Rates & Totals",
        employeeNameColumn: "Employee",
        customPriceColumn: "Custom Price/Hour",
        accountTotalTimeColumnShort: "Account Time",
        accountBalanceColumn: "Account Balance",
        employeeTotalHoursColumn: "Total Hours",
        employeeTotalBalanceColumn: "Total Due Balance",
        manageWorkRecords: "Manage Work Records",
        filterBtn: "Filter",
        userColumn: "User",
        loadMoreBtn: "Load More (50)",
        loadAllBtn: "Load All",
        editRecord: "Edit Record",
        taskCountEdit: "Number of Tasks:",
        totalTimeEdit: "Total Time (minutes):",
        timeColumn: "Time:",
        saveChangesBtn: "Save Changes",
        editCustomRateTitle: "Edit Custom Rate",
        employeeNameLabel: "Employee:",
        customPriceInputLabel: "Custom Price (EGP):",
        accountNameLabel: "Account:",
        defaultPriceLabel: "Default Price:",
        error: "Error",
        close: "Close",
        confirmAction: "Confirm Action",
        confirmBtn: "Confirm",
        cancelBtn: "Cancel",
        // Toast messages
        pinRequired: "PIN is required.",
        pinInvalid: "Invalid PIN. Please try again.",
        adminLoginSuccess: "Admin login successful.",
        userLoginSuccess: "User login successful.",
        accountTaskRequired: "Please select an account and task to start work.",
        workStarted: "Work started.",
        workEnded: "Work ended and saved.",
        workReset: "Work reset.",
        alreadyWorking: "You are already working on a task.",
        notWorking: "You are not currently working on any task.",
        logoutSuccess: "Logged out successfully.",
        userAdded: "User added successfully.",
        userUpdated: "User updated successfully.",
        userDeleted: "User deleted successfully.",
        accountAdded: "Account added successfully.",
        accountUpdated: "Account updated successfully.",
        accountDeleted: "Account deleted successfully.",
        taskAdded: "Task added successfully.",
        taskUpdated: "Task updated successfully.",
        taskDeleted: "Task deleted successfully.",
        recordUpdated: "Record updated successfully.",
        recordDeleted: "Record deleted successfully.",
        rateUpdated: "Custom rate updated successfully.",
        errorAddingUser: "Error adding user.",
        errorUpdatingUser: "Error updating user.",
        errorDeletingUser: "Error deleting user.",
        errorAddingAccount: "Error adding account.",
        errorUpdatingAccount: "Error updating account.",
        errorDeletingAccount: "Error deleting account.",
        errorAddingTask: "Error adding task.",
        errorUpdatingTask: "Error updating task.",
        errorDeletingTask: "Error deleting task.",
        errorUpdatingRate: "Error updating custom rate.",
        errorFetchingData: "Error fetching data.",
        errorFetchingRecords: "Error fetching records.",
        operationFailed: "Operation failed.",
        confirmDeleteUser: "Are you sure you want to delete this user? All their work records will also be deleted.",
        confirmDeleteAccount: "Are you sure you want to delete this account?",
        confirmDeleteTask: "Are you sure you want to delete this task?",
        confirmDeleteRecord: "Are you sure you want to delete this record?",
        confirmLogout: "Are you sure you want to log out?",
        internetLost: "Internet connection lost. Data may not be saved.",
        internetRestored: "Internet connection restored. Data will be synced automatically.",
        userNotFound: "User not found.",
        accountNotFound: "Account not found.",
        taskNotFound: "Task not found.",
        recordNotFound: "Record not found.",
        dataNotFound: "Data not found.",
        fillAllFields: "Please fill in all fields.",
        userNameRequired: "User name is required.",
        pinInvalidFormat: "PIN must be 8 digits.",
        pinAlreadyExists: "This PIN already exists. Please choose another.",
        accountNameRequired: "Account name is required.",
        invalidPrice: "Invalid price. Please enter a positive value.",
        accountAlreadyExists: "This account name already exists. Please choose another name.",
        taskNameRequired: "Task name is required.",
        taskAlreadyExists: "This task name already exists. Please choose another name.",
        dateRequired: "Date is required.",
        invalidDuration: "Invalid duration. Please enter a positive value.",
        noRecordsToExport: "No records to export.",
        exportSuccess: "Records exported successfully.",
        setCustomRate: "Set Custom Rate",
        forgotPinMessage: "Please contact your administrator to recover your PIN.",
        accessDenied: "You do not have access to this feature.",
        invalidTiming: "Invalid timing. Please enter valid minutes and seconds (seconds between 0 and 59).",
        timingRequired: "At least one timing must be added for the task.",
        workSaved: "Work saved successfully.",
        undo: "Undo",
        invalidCount: "Invalid count.",
        timeRequired: "Time is required.",
        // New session time popup translations
        sessionDetailsTitle: "Session Details",
        sessionStartTimeLabel: "Session Start Time:",
        totalSessionTimeDisplayLabel: "Total Session Time:",
        netSessionTimeLabel: "Net Session Time:",
        delayLabel: "Delay:",
        tasksAt: "tasks at",
        minutes: "minutes",
        hours: "hours",
        seconds: "seconds",
        unknownTask: "Unknown Task",
        totalDailyHoursLabel: "Grand Total" // Reusing for grand total
    }
};

let currentLanguage = localStorage.getItem('lang') || 'ar'; // Default to Arabic

// --- Utility Functions ---

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('lang', lang);
    applyTranslations();
    // Re-render anything that needs language update, e.g., dashboard, tables
    if (loggedInUser) {
        renderMainDashboard();
        if (document.getElementById('startWorkPage').classList.contains('active')) {
            populateAccountSelect();
            populateTaskTypeSelect();
            updateWorkSummary(); // Re-render summary with new language
            updateSessionTimePopup(); // Update session time popup with new language
        }
        if (document.getElementById('trackWorkPage').classList.contains('active')) {
            renderTrackWorkTable();
        }
        if (document.getElementById('adminPanelPage').classList.contains('active')) {
            populateUsersTable();
            populateAccountsTable();
            populateTasksDefinitionTable();
            populateEmployeeRatesTable();
            populateRecordFilterDropdowns();
            renderWorkRecordsTable();
        }
    }
}

function getTranslatedText(key) {
    return languageTexts[currentLanguage][key] || key; // Fallback to key if translation not found
}

function applyTranslations() {
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        element.textContent = getTranslatedText(key);
        // Handle placeholders specifically
        if (element.placeholder) {
            element.placeholder = getTranslatedText(key);
        }
        // Handle title attributes for tooltips
        if (element.hasAttribute('title')) {
            const originalTitle = element.getAttribute('title');
            // Only translate if the title is a data-key or a known translatable string
            if (languageTexts[currentLanguage][key + 'Tooltip']) { // Example: accountTotalTimeColumnShortTooltip
                element.title = getTranslatedText(key + 'Tooltip');
            } else if (languageTexts[currentLanguage][originalTitle]) {
                element.title = getTranslatedText(originalTitle);
            }
        }
    });

    // Manually update specific elements not covered by data-key
    if (newUserNameInput) newUserNameInput.placeholder = getTranslatedText('newUserName');
    if (newUserPINInput) newUserPINInput.placeholder = getTranslatedText('newUserPIN');
    if (newAccountNameInput) newAccountNameInput.placeholder = getTranslatedText('newAccountName');
    if (newAccountPriceInput) newAccountPriceInput.placeholder = getTranslatedText('defaultPricePlaceholder');
    if (newTaskNameInput) newTaskNameInput.placeholder = getTranslatedText('newTaskName');
    document.querySelectorAll('.new-task-timing-minutes').forEach(input => {
        input.placeholder = getTranslatedText('minutesPlaceholder');
    });
    document.querySelectorAll('.new-task-timing-seconds').forEach(input => {
        input.placeholder = getTranslatedText('secondsPlaceholder');
    });
}

// Dark Mode functionality
function applyDarkMode(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Change icon to sun
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Change icon to moon
    }
    localStorage.setItem('darkMode', isDarkMode);
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    applyDarkMode(!isDarkMode);
}

// Show/Hide Loading Indicator
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.opacity = '1';
    }
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.opacity = '0';
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 300); // Match CSS transition time
    }
}

// Show Toast Message
function showToastMessage(message, type = 'info') {
    if (toastMessage) {
        toastMessage.textContent = message;
        toastMessage.className = `toast-message show ${type}`; // Apply type class for styling
        setTimeout(() => {
            toastMessage.className = toastMessage.className.replace("show", "");
        }, 3000); // Hide after 3 seconds
    }
}

// Clear input error messages
function clearInputError(inputElement, errorElement) {
    if (inputElement) inputElement.classList.remove('is-invalid');
    if (errorElement) errorElement.classList.remove('show');
    if (errorElement) errorElement.textContent = '';
}

// Show input error messages
function showInputError(inputElement, errorElement, message) {
    if (inputElement) inputElement.classList.add('is-invalid');
    if (errorElement) errorElement.classList.add('show');
    if (errorElement) errorElement.textContent = message;
}

// Function to format milliseconds to MM:SS
function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Function to format milliseconds to HH:MM:SS
function formatMillisecondsToHMS(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Function to convert minutes and seconds to milliseconds
function convertToMilliseconds(minutes, seconds) {
    return (minutes * 60 + seconds) * 1000;
}

// --- Firebase Data Fetching ---

// Fetch all users from Firestore
async function fetchUsers() {
    showLoadingIndicator();
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('adminPanelPage').classList.contains('active')) {
            populateUsersTable();
            populateRecordFilterDropdowns(); // Update filter dropdowns
            populateEmployeeRatesTable(); // Update employee rates table
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Fetch all accounts from Firestore
async function fetchAccounts() {
    showLoadingIndicator();
    try {
        const accountsCol = collection(db, 'accounts');
        const accountSnapshot = await getDocs(accountsCol);
        allAccounts = accountSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('startWorkPage').classList.contains('active')) {
            populateAccountSelect();
        }
        if (document.getElementById('adminPanelPage').classList.contains('active')) {
            populateAccountsTable();
            populateRecordFilterDropdowns(); // Update filter dropdowns
            populateEmployeeRatesTable(); // Update employee rates table
        }
        if (editRecordModal.style.display === 'flex') { // If edit modal is open
            populateEditModalAccountSelect();
        }
    } catch (error) {
        console.error("Error fetching accounts:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Fetch all task definitions from Firestore
async function fetchTaskDefinitions() {
    showLoadingIndicator();
    try {
        const tasksCol = collection(db, 'taskDefinitions');
        const taskSnapshot = await getDocs(tasksCol);
        allTaskDefinitions = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('startWorkPage').classList.contains('active')) {
            populateTaskTypeSelect();
        }
        if (document.getElementById('adminPanelPage').classList.contains('active')) {
            populateTasksDefinitionTable();
            populateRecordFilterDropdowns(); // Update filter dropdowns
        }
        if (editRecordModal.style.display === 'flex') { // If edit modal is open
            populateEditModalTaskTypeSelect();
        }
    }
    catch (error) {
        console.error("Error fetching tasks:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Fetch work records for the logged-in user (for Track Work Page)
async function fetchUserWorkRecords() {
    if (!loggedInUser || !loggedInUser.id) {
        console.warn('No logged in user to fetch work records.');
        return;
    }

    showLoadingIndicator();
    try {
        const recordsRef = collection(db, 'workRecords');
        const q = query(
            recordsRef,
            where('userId', '==', loggedInUser.id),
            orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        allTaskRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTrackWorkTable();
        renderTaskChart();
    } catch (error) {
        console.error("Error fetching user work records:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// Fetch all work records for admin view
async function fetchAllWorkRecords(loadAll = false) {
    showLoadingIndicator();
    try {
        const recordsCol = collection(db, 'workRecords');
        let q = query(recordsCol, orderBy('timestamp', 'desc'));

        if (!loadAll) {
            q = query(q, limit(recordsPerPage));
            if (lastVisibleRecord) {
                q = query(q, startAfter(lastVisibleRecord));
            }
        }

        const recordSnapshot = await getDocs(q);
        const newRecords = recordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (loadAll || !lastVisibleRecord) {
            allAdminRecords = newRecords;
        } else {
            allAdminRecords = [...allAdminRecords, ...newRecords];
        }

        lastVisibleRecord = recordSnapshot.docs[recordSnapshot.docs.length - 1];

        // Apply filters to allAdminRecords to get filteredAdminRecords
        filterAdminRecords();
        renderWorkRecordsTable();

        // Show/hide load more button
        if (recordSnapshot.docs.length < recordsPerPage) {
            loadMoreRecordsBtn.style.display = 'none';
            loadAllRecordsBtn.style.display = 'none';
        } else {
            loadMoreRecordsBtn.style.display = 'inline-block';
            loadAllRecordsBtn.style.display = 'inline-block';
        }

    } catch (error) {
        console.error("Error fetching all records:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}


// --- Data Population and Rendering ---

function renderMainDashboard() {
    if (userNameDisplay) userNameDisplay.textContent = loggedInUser.name;
    // Calculate and display total hours and balance for the logged-in user
    let totalHours = 0;
    let totalBalance = 0;

    // Filter allAdminRecords for the loggedInUser for this calculation
    const userRecords = allAdminRecords.filter(record => record.userId === loggedInUser.id);

    userRecords.forEach(record => {
        const durationHours = record.duration / (1000 * 60 * 60); // Convert ms to hours
        totalHours += durationHours;

        const account = allAccounts.find(acc => acc.id === record.accountId);
        let rate = account ? account.defaultPrice : 0;
        // Check for custom rate for this user and account
        if (loggedInUser.customRates && loggedInUser.customRates[record.accountId] !== undefined) {
            rate = loggedInUser.customRates[record.accountId];
        }
        totalBalance += durationHours * rate;
    });

    if (totalHoursDisplay) totalHoursDisplay.textContent = totalHours.toFixed(2);
    if (totalBalanceDisplay) totalBalanceDisplay.textContent = totalBalance.toFixed(2);

    // Dynamically add Admin Panel button if user is admin
    const adminPanelOption = document.getElementById('adminPanelOption');
    if (loggedInUser && loggedInUser.role === 'admin' && !adminPanelOption) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'adminPanelOption';
        adminBtn.className = 'big-option-btn';
        adminBtn.setAttribute('data-key', 'adminPanelTitle');
        adminBtn.textContent = getTranslatedText('adminPanelTitle');
        adminBtn.addEventListener('click', () => {
            switchPage('adminPanelPage');
            fetchAllWorkRecords();
            fetchUsers();
            fetchAccounts();
            fetchTaskDefinitions();
        });
        document.querySelector('.dashboard-options').appendChild(adminBtn);
    } else if ((!loggedInUser || loggedInUser.role !== 'admin') && adminPanelOption) {
        adminPanelOption.remove(); // Remove if user is no longer admin or logged out
    }
}


function populateAccountSelect() {
    if (!accountSelect) return;
    accountSelect.innerHTML = '<option value="">' + getTranslatedText('accountName') + '</option>';
    allAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        accountSelect.appendChild(option);
    });
}

function populateTaskTypeSelect() {
    if (!taskTypeSelect) return;
    taskTypeSelect.innerHTML = '<option value="">' + getTranslatedText('taskType') + '</option>';
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        taskTypeSelect.appendChild(option);
    });
}

let currentChart = null; // Variable to hold the Chart.js instance

function renderTaskChart() {
    if (!taskChart) return;

    // Destroy existing chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }

    const ctx = taskChart.getContext('2d');

    // Aggregate data for the chart
    const taskData = {};
    allTaskRecords.forEach(record => {
        const task = allTaskDefinitions.find(t => t.id === record.taskId);
        const taskName = task ? task.name : getTranslatedText('unknownTask');
        if (!taskData[taskName]) {
            taskData[taskName] = 0;
        }
        taskData[taskName] += record.duration; // Sum durations in milliseconds
    });

    const labels = Object.keys(taskData);
    const data = Object.values(taskData).map(ms => Math.round(ms / (1000 * 60))); // Convert to minutes

    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#F8F9FA' : '#333' // Adapt legend color
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.raw + ' ' + getTranslatedText('minutes');
                            return label;
                        }
                    }
                }
            }
        }
    });
}


function renderTrackWorkTable() {
    if (!trackTasksTableBody || !trackTasksTableFoot) return;

    trackTasksTableBody.innerHTML = '';
    trackTasksTableFoot.innerHTML = '';

    let grandTotalMinutes = 0;
    let grandTotalWage = 0;

    // Group records by date
    const recordsByDate = allTaskRecords.reduce((acc, record) => {
        const date = record.date; // Assuming record.date is already ISO-MM-DD
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(record);
        return acc;
    }, {});

    const sortedDates = Object.keys(recordsByDate).sort().reverse(); // Sort dates descending

    sortedDates.forEach(date => {
        const dailyRecords = recordsByDate[date];
        let dailyTotalMinutes = 0;
        let dailyTotalWage = 0;

        // Add a row for the date header
        const dateRow = trackTasksTableBody.insertRow();
        dateRow.classList.add('daily-record-row'); // Add class for styling
        const dateCell = dateRow.insertCell(0);
        dateCell.colSpan = 10; // Span all columns
        dateCell.textContent = new Date(date).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        dateCell.style.fontWeight = 'bold';
        dateCell.style.textAlign = 'center';
        dateCell.style.backgroundColor = 'var(--summary-item-bg-color)'; // Use CSS variable
        dateCell.style.color = 'var(--text-color)'; // Use CSS variable


        dailyRecords.forEach((record, index) => {
            const account = allAccounts.find(acc => acc.id === record.accountId);
            const task = allTaskDefinitions.find(t => t.id === record.taskId);

            const timingValue = task && task.timings && task.timings.length > 0 ?
                `${Math.floor(task.timings[0] / 60000)}:${(task.timings[0] % 60000 / 1000).toFixed(0).padStart(2, '0')}` : 'N/A';

            const totalTimeMinutes = Math.round(record.duration / (1000 * 60)); // Duration in minutes

            let rate = account ? account.defaultPrice : 0;
            if (loggedInUser.customRates && loggedInUser.customRates[record.accountId] !== undefined) {
                rate = loggedInUser.customRates[record.accountId];
            }
            const wage = (totalTimeMinutes / 60) * rate; // Wage based on duration in hours

            dailyTotalMinutes += totalTimeMinutes;
            dailyTotalWage += wage;

            const row = trackTasksTableBody.insertRow();
            row.insertCell(0).textContent = index + 1; // Serial
            row.insertCell(1).textContent = new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Time
            row.insertCell(2).textContent = account ? account.name : 'N/A';
            row.insertCell(3).textContent = task ? task.name : 'N/A';
            row.insertCell(4).textContent = timingValue;
            row.insertCell(5).textContent = record.tasksCompleted || 1; // Assuming 1 if not explicitly recorded
            row.insertCell(6).textContent = totalTimeMinutes;
            row.insertCell(7).textContent = wage.toFixed(2); // Total for Task (wage)
            row.insertCell(8).textContent = ''; // Total for Account - leave empty for individual records
            row.insertCell(9).textContent = ''; // Daily Total Time - leave empty for individual records
        });

        // Add daily totals row
        const dailyTotalRow = trackTasksTableBody.insertRow();
        dailyTotalRow.classList.add('total-cell');
        const dailyTotalLabelCell = dailyTotalRow.insertCell(0);
        dailyTotalLabelCell.colSpan = 6;
        dailyTotalLabelCell.textContent = getTranslatedText('dailyTotalTimeColumn');
        dailyTotalLabelCell.style.textAlign = 'right';
        dailyTotalRow.insertCell(1).textContent = dailyTotalMinutes; // Daily Total Time (minutes)
        dailyTotalRow.insertCell(2).textContent = dailyTotalWage.toFixed(2); // Daily Total Wage
        dailyTotalRow.insertCell(3).textContent = ''; // Empty cell
        dailyTotalRow.insertCell(4).textContent = ''; // Empty cell

        grandTotalMinutes += dailyTotalMinutes;
        grandTotalWage += dailyTotalWage;
    });

    // Add grand totals to the footer
    const footerRow = trackTasksTableFoot.insertRow();
    footerRow.classList.add('grand-total-footer-cell'); // Add class for styling
    const grandTotalLabelCell = footerRow.insertCell(0);
    grandTotalLabelCell.colSpan = 6;
    grandTotalLabelCell.textContent = getTranslatedText('totalDailyHoursLabel'); // Reusing translation key for "Total Daily Hours" as "Grand Total"
    grandTotalLabelCell.classList.add('grand-total-label');

    const grandTotalMinutesCell = footerRow.insertCell(1);
    grandTotalMinutesCell.textContent = grandTotalMinutes;
    grandTotalMinutesCell.classList.add('grand-total-value');

    const grandTotalWageCell = footerRow.insertCell(2);
    grandTotalWageCell.textContent = grandTotalWage.toFixed(2);
    grandTotalWageCell.classList.add('grand-total-value');

    footerRow.insertCell(3).textContent = ''; // Empty cell
    footerRow.insertCell(4).textContent = ''; // Empty cell
}


function populateUsersTable() {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';
    allUsers.forEach(user => {
        const row = usersTableBody.insertRow();
        row.insertCell(0).textContent = user.name;
        row.insertCell(1).textContent = user.pin;
        row.insertCell(2).textContent = user.status || 'Active'; // Assuming a default status if not present
        const actionsCell = row.insertCell(3);

        const editBtn = document.createElement('button');
        editBtn.textContent = getTranslatedText('edit');
        editBtn.classList.add('admin-action-btntp', 'primary');
        editBtn.onclick = () => editUser(user.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('admin-action-btntp', 'delete');
        deleteBtn.onclick = () => confirmDelete('user', user.id);
        actionsCell.appendChild(deleteBtn);
    });
}

function populateAccountsTable() {
    if (!accountsTableBody) return;
    accountsTableBody.innerHTML = '';
    allAccounts.forEach(account => {
        const row = accountsTableBody.insertRow();
        row.insertCell(0).textContent = account.name;
        row.insertCell(1).textContent = `${account.defaultPrice || '0.00'} ${getTranslatedText('currencyUnit')}`;
        const actionsCell = row.insertCell(2);

        const editBtn = document.createElement('button');
        editBtn.textContent = getTranslatedText('edit');
        editBtn.classList.add('admin-action-btntp', 'primary');
        editBtn.onclick = () => editAccount(account.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('admin-action-btntp', 'delete');
        deleteBtn.onclick = () => confirmDelete('account', account.id);
        actionsCell.appendChild(deleteBtn);
    });
}

function populateTasksDefinitionTable() {
    if (!tasksDefinitionTableBody) return;
    tasksDefinitionTableBody.innerHTML = '';
    allTaskDefinitions.forEach(task => {
        const row = tasksDefinitionTableBody.insertRow();
        row.insertCell(0).textContent = task.name;
        const timingsCell = row.insertCell(1);
        if (task.timings && Array.isArray(task.timings)) {
            timingsCell.textContent = task.timings.map(ms => formatDuration(ms)).join(', ');
        } else {
            timingsCell.textContent = 'N/A';
        }
        const actionsCell = row.insertCell(2);

        const editBtn = document.createElement('button');
        editBtn.textContent = getTranslatedText('edit');
        editBtn.classList.add('admin-action-btntp', 'primary');
        editBtn.onclick = () => editTask(task.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('admin-action-btntp', 'delete');
        deleteBtn.onclick = () => confirmDelete('task', task.id);
        actionsCell.appendChild(deleteBtn);
    });
}

async function populateEmployeeRatesTable() {
    if (!employeeRatesTableBody) return;
    employeeRatesTableBody.innerHTML = '';

    // Fetch latest user data to ensure custom rates are up-to-date
    await fetchUsers(); // This will update allUsers global variable

    // Calculate totals for each employee across all accounts
    const employeeTotals = {}; // { userId: { totalHours: 0, totalBalance: 0 } }

    // First, calculate totals for each user based on all records
    allAdminRecords.forEach(record => {
        const user = allUsers.find(u => u.id === record.userId);
        const account = allAccounts.find(acc => acc.id === record.accountId);

        if (user && account) {
            if (!employeeTotals[user.id]) {
                employeeTotals[user.id] = { totalHours: 0, totalBalance: 0 };
            }

            const durationHours = record.duration / (1000 * 60 * 60);
            employeeTotals[user.id].totalHours += durationHours;

            let rate = account.defaultPrice;
            if (user.customRates && user.customRates[account.id] !== undefined) {
                rate = user.customRates[account.id];
            }
            employeeTotals[user.id].totalBalance += durationHours * rate;
        }
    });

    allUsers.forEach(user => {
        allAccounts.forEach(account => {
            const row = employeeRatesTableBody.insertRow();

            // Edit custom rate icon/button
            const editRateCell = row.insertCell(0);
            const editRateIcon = document.createElement('i');
            editRateIcon.className = 'fas fa-edit edit-icon-circle'; // Using Font Awesome icon
            editRateIcon.title = getTranslatedText('setCustomRate');
            editRateIcon.onclick = () => openEditEmployeeRateModal(user.id, account.id);
            editRateCell.appendChild(editRateIcon);


            row.insertCell(1).textContent = user.name;
            row.insertCell(2).textContent = account.name;
            row.insertCell(3).textContent = `${account.defaultPrice.toFixed(2)} ${getTranslatedText('currencyUnit')}`;

            const customRate = user.customRates && user.customRates[account.id] !== undefined ? user.customRates[account.id] : getTranslatedText('notSet');
            row.insertCell(4).textContent = typeof customRate === 'number' ? `${customRate.toFixed(2)} ${getTranslatedText('currencyUnit')}` : customRate;

            // Calculate total time and balance for this specific user-account pair
            let accountTotalTimeMs = 0;
            let accountBalance = 0;
            allAdminRecords.filter(record => record.userId === user.id && record.accountId === account.id)
                .forEach(record => {
                    accountTotalTimeMs += record.duration;
                });

            const accountTotalHours = accountTotalTimeMs / (1000 * 60 * 60);
            let effectiveRate = user.customRates && user.customRates[account.id] !== undefined ? user.customRates[account.id] : account.defaultPrice;
            accountBalance = accountTotalHours * effectiveRate;

            const accountTotalTimeCell = row.insertCell(5);
            accountTotalTimeCell.textContent = formatMillisecondsToHMS(accountTotalTimeMs);
            accountTotalTimeCell.title = getTranslatedText('accountTotalTimeColumnShort') + ': ' + formatMillisecondsToHMS(accountTotalTimeMs); // Full tooltip

            row.insertCell(6).textContent = `${accountBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}`;

            // Employee total hours and balance (only for the first account row of each employee)
            if (account === allAccounts[0]) { // Only add to the first row for each employee
                const employeeTotalHoursCell = row.insertCell(7);
                employeeTotalHoursCell.rowSpan = allAccounts.length; // Span across all accounts for this employee
                employeeTotalHoursCell.textContent = employeeTotals[user.id] ? `${employeeTotals[user.id].totalHours.toFixed(2)} ${getTranslatedText('hoursUnit')}` : `0.00 ${getTranslatedText('hoursUnit')}`;
                employeeTotalHoursCell.classList.add('total-cell'); // Apply total cell styling

                const employeeTotalBalanceCell = row.insertCell(8);
                employeeTotalBalanceCell.rowSpan = allAccounts.length; // Span across all accounts for this employee
                employeeTotalBalanceCell.textContent = employeeTotals[user.id] ? `${employeeTotals[user.id].totalBalance.toFixed(2)} ${getTranslatedText('currencyUnit')}` : `0.00 ${getTranslatedText('currencyUnit')}`;
                employeeTotalBalanceCell.classList.add('total-cell'); // Apply total cell styling
            } else {
                row.insertCell(7); // Empty cell for spanned columns
                row.insertCell(8); // Empty cell for spanned columns
            }
        });
    });
}


function populateRecordFilterDropdowns() {
    // Populate User filter
    if (recordFilterUser) {
        recordFilterUser.innerHTML = `<option value="">${getTranslatedText('userColumn')}</option>`;
        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            recordFilterUser.appendChild(option);
        });
    }

    // Populate Account filter
    if (recordFilterAccount) {
        recordFilterAccount.innerHTML = `<option value="">${getTranslatedText('accountNameColumn')}</option>`;
        allAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            recordFilterAccount.appendChild(option);
        });
    }

    // Populate Task filter
    if (recordFilterTask) {
        recordFilterTask.innerHTML = `<option value="">${getTranslatedText('taskColumn')}</option>`;
        allTaskDefinitions.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.name;
            recordFilterTask.appendChild(option);
        });
    }
}

function filterAdminRecords() {
    let recordsToFilter = [...allAdminRecords];

    const filterDate = recordFilterDate.value;
    const filterUser = recordFilterUser.value;
    const filterAccount = recordFilterAccount.value;
    const filterTask = recordFilterTask.value;

    if (filterDate) {
        recordsToFilter = recordsToFilter.filter(record => record.date === filterDate);
    }
    if (filterUser) {
        recordsToFilter = recordsToFilter.filter(record => record.userId === filterUser);
    }
    if (filterAccount) {
        recordsToFilter = recordsToFilter.filter(record => record.accountId === filterAccount);
    }
    if (filterTask) {
        recordsToFilter = recordsToFilter.filter(record => record.taskId === filterTask);
    }

    filteredAdminRecords = recordsToFilter;
    renderWorkRecordsTable();
}

function renderWorkRecordsTable() {
    if (!workRecordsTableBody) return;
    workRecordsTableBody.innerHTML = '';

    filteredAdminRecords.forEach(record => {
        const user = allUsers.find(u => u.id === record.userId);
        const account = allAccounts.find(acc => acc.id === record.accountId);
        const task = allTaskDefinitions.find(t => t.id === record.taskId);

        const row = workRecordsTableBody.insertRow();
        row.insertCell(0).textContent = user ? user.name : 'N/A';
        row.insertCell(1).textContent = account ? account.name : 'N/A';
        row.insertCell(2).textContent = task ? task.name : 'N/A';
        row.insertCell(3).textContent = Math.round(record.duration / (1000 * 60)); // Minutes
        row.insertCell(4).textContent = record.date;

        const actionsCell = row.insertCell(5);
        const editBtn = document.createElement('button');
        editBtn.textContent = getTranslatedText('edit');
        editBtn.classList.add('admin-action-btntp', 'primary');
        editBtn.onclick = () => openEditRecordModal(record.id);
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = getTranslatedText('delete');
        deleteBtn.classList.add('admin-action-btntp', 'delete');
        deleteBtn.onclick = () => confirmDelete('record', record.id);
        actionsCell.appendChild(deleteBtn);
    });
}

// --- Firebase Operations ---

async function login() {
    const pin = pinInputs.map(input => input.value).join('');
    clearInputError(pinInputs[0], pinInputError); // Clear error for first input as representative

    if (pin.length !== 8 || isNaN(pin)) {
        showInputError(pinInputs[0], pinInputError, getTranslatedText('pinInvalid'));
        showLoginErrorModal(getTranslatedText('error'), getTranslatedText('pinInvalid'));
        return;
    }

    showLoadingIndicator();
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('pin', '==', pin), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showInputError(pinInputs[0], pinInputError, getTranslatedText('pinInvalid'));
            showLoginErrorModal(getTranslatedText('error'), getTranslatedText('pinInvalid'));
        } else {
            loggedInUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            showToastMessage(loggedInUser.role === 'admin' ? getTranslatedText('adminLoginSuccess') : getTranslatedText('userLoginSuccess'), 'success');
            pinInputs.forEach(input => input.value = ''); // Clear PIN input fields
            switchPage('mainDashboard');
            await Promise.all([
                fetchUsers(),
                fetchAccounts(),
                fetchTaskDefinitions(),
                fetchAllWorkRecords(true) // Fetch all records for admin calculations on dashboard
            ]);
            renderMainDashboard(); // Render dashboard after all data is fetched
        }
    } catch (error) {
        console.error("Login error:", error);
        showToastMessage(getTranslatedText('operationFailed'), 'error');
        showLoginErrorModal(getTranslatedText('error'), getTranslatedText('operationFailed'));
    } finally {
        hideLoadingIndicator();
    }
}

async function logout() {
    showConfirmation(getTranslatedText('confirmLogout'), () => {
        loggedInUser = null;
        workingOnAccountId = null;
        workingOnTaskId = null;
        workStartTime = null;
        clearInterval(timerInterval);
        clearInterval(sessionTimerInterval); // Clear session timer
        timerInterval = null;
        sessionTimerInterval = null;
        // Clear dashboard displays
        if (userNameDisplay) userNameDisplay.textContent = '';
        if (totalHoursDisplay) totalHoursDisplay.textContent = '0.00';
        if (totalBalanceDisplay) totalBalanceDisplay.textContent = '0.00';
        // Clear start work page displays
        if (completedTasksCount) completedTasksCount.textContent = '0';
        if (recordedTotalTime) recordedTotalTime.textContent = '00:00';
        if (detailedSummaryContainer) detailedSummaryContainer.innerHTML = '';
        if (taskTimingButtonsContainer) taskTimingButtonsContainer.innerHTML = '';
        // Hide session time popup
        if (sessionTimePopup) sessionTimePopup.classList.remove('show');

        // Clear track work page displays
        if (trackTasksTableBody) trackTasksTableBody.innerHTML = '';
        if (trackTasksTableFoot) trackTasksTableFoot.innerHTML = '';
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        // Clear admin panel displays
        if (usersTableBody) usersTableBody.innerHTML = '';
        if (accountsTableBody) accountsTableBody.innerHTML = '';
        if (tasksDefinitionTableBody) tasksDefinitionTableBody.innerHTML = '';
        if (employeeRatesTableBody) employeeRatesTableBody.innerHTML = '';
        if (workRecordsTableBody) workRecordsTableBody.innerHTML = '';
        // Reset admin filters
        if (recordFilterDate) recordFilterDate.value = '';
        if (recordFilterUser) recordFilterUser.value = '';
        if (recordFilterAccount) recordFilterAccount.value = '';
        if (recordFilterTask) recordFilterTask.value = '';
        lastVisibleRecord = null; // Reset pagination for admin records

        showToastMessage(getTranslatedText('logoutSuccess'), 'success');
        switchPage('loginPage');
    });
}

async function startWork() {
    if (!loggedInUser) {
        showToastMessage(getTranslatedText('notLoggedIn'), 'error');
        return;
    }

    const selectedAccount = accountSelect.value;
    const selectedTask = taskTypeSelect.value;
    if (!selectedAccount || !selectedTask) {
        showToastMessage(getTranslatedText('accountTaskRequired'), 'error');
        return;
    }

    workingOnAccountId = selectedAccount;
    workingOnTaskId = selectedTask;
    workStartTime = Date.now(); // Record the start time of the current work session
    showToastMessage(getTranslatedText('workStarted'), 'success');

    // Hide task selection popup and show task details
    taskSelectionPopup.style.display = 'none';
    taskDetailsContainer.style.display = 'block';

    // Start updating session time popup
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(updateSessionTimePopup, 1000); // Update every second

    // Render task timing buttons
    renderTaskTimingButtons();
    updateWorkSummary(); // Initial update
}

async function saveWork() {
    if (!loggedInUser || !workingOnAccountId || !workingOnTaskId) {
        showToastMessage(getTranslatedText('notWorking'), 'error');
        return;
    }

    showLoadingIndicator();
    try {
        const workRecordRef = collection(db, 'workRecords');
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // ISO-MM-DD

        // Get the current task definition to find its timings
        const currentTaskDef = allTaskDefinitions.find(task => task.id === workingOnTaskId);
        const timingValueMs = currentTaskDef && currentTaskDef.timings && currentTaskDef.timings.length > 0 ? currentTaskDef.timings[0] : 0; // Use the first timing value

        await addDoc(workRecordRef, {
            userId: loggedInUser.id,
            accountId: workingOnAccountId,
            taskId: workingOnTaskId,
            duration: timingValueMs, // Save the timing value as duration in milliseconds
            tasksCompleted: 1, // Always 1 task completed per button click
            timestamp: Date.now(),
            date: dateString
        });

        showToastMessage(getTranslatedText('workEnded'), 'success'); // Add 'workSaved' to languageTexts
        // Reset current work session variables
        workingOnAccountId = null;
        workingOnTaskId = null;
        workStartTime = null;
        clearInterval(sessionTimerInterval); // Stop session timer
        sessionTimerInterval = null;

        // Hide task details and show task selection popup
        taskDetailsContainer.style.display = 'none';
        taskSelectionPopup.style.display = 'flex'; // Use flex to center
        sessionTimePopup.classList.remove('show'); // Hide popup

        // Refresh data for dashboard and track work page
        await fetchAllWorkRecords(true); // Fetch all records to update dashboard totals
        await fetchUserWorkRecords(); // Fetch user-specific records for track work page
        renderMainDashboard(); // Update dashboard totals
        updateWorkSummary(); // Reset work summary display
    } catch (error) {
        console.error("Error saving work:", error);
        showToastMessage(getTranslatedText('operationFailed'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

let taskTimers = {}; // Stores { taskId: { lastClickTime: timestamp, totalClicks: 0, intervals: [] } }
let currentTaskTimers = {}; // Stores { taskId: { intervalId: interval, element: spanElement } }

function renderTaskTimingButtons() {
    if (!taskTimingButtonsContainer) return;
    taskTimingButtonsContainer.innerHTML = '';
    taskTimers = {}; // Reset timers when rendering new buttons

    const currentTaskDef = allTaskDefinitions.find(task => task.id === workingOnTaskId);

    if (currentTaskDef && currentTaskDef.timings && Array.isArray(currentTaskDef.timings) && currentTaskDef.timings.length > 0) {
        currentTaskDef.timings.forEach((timingMs, index) => {
            const timingMinutes = Math.floor(timingMs / 60000);
            const timingSeconds = Math.floor((timingMs % 60000) / 1000);
            const timingDisplay = `${timingMinutes}:${timingSeconds.toString().padStart(2, '0')}`;

            const wrapper = document.createElement('div');
            wrapper.className = 'timing-button-wrapper';

            const button = document.createElement('button');
            button.className = 'task-timing-btn';
            button.textContent = timingDisplay;
            button.dataset.timingMs = timingMs;
            button.dataset.taskId = currentTaskDef.id;
            button.dataset.timingIndex = index; // Store index for unique identification

            const undoBtn = document.createElement('button');
            undoBtn.className = 'undo-btn';
            undoBtn.textContent = getTranslatedText('undo'); // Add to languageTexts
            undoBtn.style.display = 'none'; // Hidden by default

            const timeSinceLastClickSpan = document.createElement('span');
            timeSinceLastClickSpan.className = 'time-since-last-click';
            timeSinceLastClickSpan.style.display = 'none';

            wrapper.appendChild(timeSinceLastClickSpan);
            wrapper.appendChild(button);
            wrapper.appendChild(undoBtn);
            taskTimingButtonsContainer.appendChild(wrapper);

            let lastClickTime = 0;
            let currentInterval = null;

            button.addEventListener('click', async () => {
                const now = Date.now();
                const duration = timingMs; // Use the timing value from task definition

                showLoadingIndicator();
                try {
                    const workRecordRef = collection(db, 'workRecords');
                    const today = new Date();
                    const dateString = today.toISOString().split('T')[0]; // ISO-MM-DD

                    await addDoc(workRecordRef, {
                        userId: loggedInUser.id,
                        accountId: workingOnAccountId,
                        taskId: currentTaskDef.id,
                        duration: duration, // Use the pre-defined timing duration
                        tasksCompleted: 1,
                        timestamp: now,
                        date: dateString
                    });

                    showToastMessage(getTranslatedText('workSaved'), 'success'); // Add 'workSaved' to languageTexts
                    updateWorkSummary(); // Update summary immediately

                    // Update timer for this specific button
                    lastClickTime = now;
                    timeSinceLastClickSpan.style.display = 'block';
                    timeSinceLastClickSpan.classList.add('show');
                    undoBtn.style.display = 'block';
                    undoBtn.classList.add('show');

                    // Clear any existing interval for this button
                    if (currentInterval) {
                        clearInterval(currentInterval);
                    }

                    currentInterval = setInterval(() => {
                        const elapsed = Date.now() - lastClickTime;
                        timeSinceLastClickSpan.textContent = formatMillisecondsToHMS(elapsed);
                    }, 1000);

                    // Store interval ID to clear later
                    taskTimers[`${currentTaskDef.id}-${index}`] = { intervalId: currentInterval, lastClickTime: lastClickTime, undoBtn: undoBtn, timeDisplay: timeSinceLastClickSpan };

                } catch (error) {
                    console.error("Error saving work record:", error);
                    showToastMessage(getTranslatedText('operationFailed'), 'error');
                } finally {
                    hideLoadingIndicator();
                }
            });

            undoBtn.addEventListener('click', async () => {
                showConfirmation(getTranslatedText('confirmDeleteRecord'), async () => { // Reusing confirmation text
                    showLoadingIndicator();
                    try {
                        // Find the last record for this user, account, task, and timing
                        const recordsRef = collection(db, 'workRecords');
                        const q = query(
                            recordsRef,
                            where('userId', '==', loggedInUser.id),
                            where('accountId', '==', workingOnAccountId),
                            where('taskId', '==', currentTaskDef.id),
                            where('duration', '==', timingMs), // Match the specific timing
                            orderBy('timestamp', 'desc'),
                            limit(1)
                        );
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const recordToDeleteId = querySnapshot.docs[0].id;
                            await deleteDoc(doc(db, 'workRecords', recordToDeleteId));
                            showToastMessage(getTranslatedText('recordDeleted'), 'success'); // Reusing translation
                            updateWorkSummary();

                            // Clear interval and hide timer/undo button
                            if (taskTimers[`${currentTaskDef.id}-${index}`] && taskTimers[`${currentTaskDef.id}-${index}`].intervalId) {
                                clearInterval(taskTimers[`${currentTaskDef.id}-${index}`].intervalId);
                            }
                            timeSinceLastClickSpan.style.display = 'none';
                            timeSinceLastClickSpan.classList.remove('show');
                            undoBtn.style.display = 'none';
                            undoBtn.classList.remove('show');
                            timeSinceLastClickSpan.textContent = ''; // Clear text
                        } else {
                            showToastMessage(getTranslatedText('recordNotFound'), 'error');
                        }
                    } catch (error) {
                        console.error("Error undoing work record:", error);
                        showToastMessage(getTranslatedText('operationFailed'), 'error');
                    } finally {
                        hideLoadingIndicator();
                    }
                });
            });
        });
    }
}

let currentDetailedSummary = {}; // To store the detailed summary for the session popup

async function updateWorkSummary() {
    if (!loggedInUser) return;

    let totalCompletedTasks = 0;
    let totalRecordedTime = 0; // in milliseconds
    const detailedSummary = {}; // { taskName: { count: 0, totalDuration: 0 } }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    showLoadingIndicator(); // Show loading only for the fetch part
    try {
        const recordsRef = collection(db, 'workRecords');
        const q = query(
            recordsRef,
            where('userId', '==', loggedInUser.id),
            where('date', '==', today.toISOString().split('T')[0]),
            // Filter by current session's account and task if actively working
            ...(workingOnAccountId && workingOnTaskId ? [where('accountId', '==', workingOnAccountId), where('taskId', '==', workingOnTaskId)] : [])
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach(doc => {
            const record = doc.data();
            totalCompletedTasks += record.tasksCompleted || 1;
            totalRecordedTime += record.duration;

            const taskDef = allTaskDefinitions.find(t => t.id === record.taskId);
            const taskName = taskDef ? taskDef.name : getTranslatedText('unknownTask'); // Handle unknown tasks

            if (!detailedSummary[taskName]) {
                detailedSummary[taskName] = { count: 0, totalDuration: 0 };
            }
            detailedSummary[taskName].count += record.tasksCompleted || 1;
            detailedSummary[taskName].totalDuration += record.duration;
        });

        if (completedTasksCount) completedTasksCount.textContent = totalCompletedTasks;
        if (recordedTotalTime) recordedTotalTime.textContent = formatDuration(totalRecordedTime);

        // Store for session popup
        currentDetailedSummary = detailedSummary;

        // Render detailed summary in the main container (if needed, otherwise remove this block)
        if (detailedSummaryContainer) {
            detailedSummaryContainer.innerHTML = '';
            for (const taskName in detailedSummary) {
                const p = document.createElement('p');
                p.textContent = `${taskName}: ${detailedSummary[taskName].count} ${getTranslatedText('tasksCompleted')} - ${formatDuration(detailedSummary[taskName].totalDuration)}`;
                detailedSummaryContainer.appendChild(p);
            }
        }

    } catch (error) {
        console.error("Error updating work summary:", error);
        showToastMessage(getTranslatedText('errorFetchingData'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

// New function to update the session time popup
function updateSessionTimePopup() {
    if (!loggedInUser || !workStartTime || !sessionTimePopup) {
        // If no user, no session start time, or popup element not found, do nothing.
        return;
    }

    const now = Date.now();
    const totalSessionTimeMs = now - workStartTime;
    const netSessionTimeMs = Object.values(currentDetailedSummary).reduce((sum, task) => sum + task.totalDuration, 0);
    const delayMs = Math.max(0, totalSessionTimeMs - netSessionTimeMs);

    // Update basic session details
    if (sessionStartTimeDisplay) sessionStartTimeDisplay.textContent = new Date(workStartTime).toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (popupTotalSessionTime) popupTotalSessionTime.textContent = formatMillisecondsToHMS(totalSessionTimeMs);
    if (netSessionTimeDisplay) netSessionTimeDisplay.textContent = formatMillisecondsToHMS(netSessionTimeMs);
    
    if (delayDurationDisplay) {
        delayDurationDisplay.textContent = formatMillisecondsToHMS(delayMs);
        // Set title attribute for detailed delay tooltip
        delayDurationDisplay.title = `${Math.floor(delayMs / (1000 * 60 * 60))} ${getTranslatedText('hours')}, ${Math.floor((delayMs % (1000 * 60 * 60)) / (1000 * 60))} ${getTranslatedText('minutes')}, ${Math.floor((delayMs % (1000 * 60)) / 1000)} ${getTranslatedText('seconds')}`;
    }

    // Update dynamic task details in popup
    if (dynamicTaskDetails) {
        dynamicTaskDetails.innerHTML = '';
        for (const taskName in currentDetailedSummary) {
            const p = document.createElement('p');
            p.textContent = `${currentDetailedSummary[taskName].count} ${getTranslatedText('tasksAt')} ${formatDuration(currentDetailedSummary[taskName].totalDuration)}`;
            dynamicTaskDetails.appendChild(p);
        }
    }
}


async function addUser() {
    clearInputError(newUserNameInput, newUserNameInputError);
    clearInputError(newUserPINInput, newUserPINInputError);

    const name = newUserNameInput.value.trim();
    const pin = newUserPINInput.value.trim();

    if (!name) {
        showInputError(newUserNameInput, newUserNameInputError, getTranslatedText('userNameRequired'));
        return;
    }
    if (pin.length !== 8 || isNaN(pin)) {
        showInputError(newUserPINInput, newUserPINInputError, getTranslatedText('pinInvalidFormat'));
        return;
    }

    showLoadingIndicator();
    try {
        const usersCol = collection(db, 'users');
        // Check if user with same PIN already exists
        const q = query(usersCol, where('pin', '==', pin));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showInputError(newUserPINInput, newUserPINInputError, getTranslatedText('pinAlreadyExists'));
            return;
        }

        await addDoc(usersCol, { name, pin, role: 'user', status: 'Active', customRates: {}, createdAt: serverTimestamp() });
        showToastMessage(getTranslatedText('userAdded'), 'success');
        newUserNameInput.value = '';
        newUserPINInput.value = '';
        await fetchUsers();
    } catch (error) {
        console.error("Error adding user:", error);
        showToastMessage(getTranslatedText('errorAddingUser'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function editUser(userId) {
    const userToEdit = allUsers.find(user => user.id === userId);
    if (!userToEdit) {
        showToastMessage(getTranslatedText('userNotFound'), 'error');
        return;
    }

    // Populate the form with user data for editing
    newUserNameInput.value = userToEdit.name;
    newUserPINInput.value = userToEdit.pin;

    // Change button to update mode
    addUserBtn.textContent = getTranslatedText('saveChangesBtn');
    addUserBtn.onclick = async () => {
        clearInputError(newUserNameInput, newUserNameInputError);
        clearInputError(newUserPINInput, newUserPINInputError);

        const name = newUserNameInput.value.trim();
        const pin = newUserPINInput.value.trim();

        if (!name) {
            showInputError(newUserNameInput, newUserNameInputError, getTranslatedText('userNameRequired'));
            return;
        }
        if (pin.length !== 8 || isNaN(pin)) {
            showInputError(newUserPINInput, newUserPINInputError, getTranslatedText('pinInvalidFormat'));
            return;
        }

        showLoadingIndicator();
        try {
            const userDocRef = doc(db, 'users', userId);
            // Check if another user with the same PIN already exists (excluding the current user)
            const usersCol = collection(db, 'users');
            const q = query(usersCol, where('pin', '==', pin), where(documentId(), '!=', userId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showInputError(newUserPINInput, newUserPINInputError, getTranslatedText('pinAlreadyExists'));
                return;
            }

            await updateDoc(userDocRef, { name, pin });
            showToastMessage(getTranslatedText('userUpdated'), 'success');
            newUserNameInput.value = '';
            newUserPINInput.value = '';
            addUserBtn.textContent = getTranslatedText('addUserBtn'); // Reset button
            addUserBtn.onclick = addUser; // Reset onclick
            await fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            showToastMessage(getTranslatedText('errorUpdatingUser'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    };
}

async function deleteUser(userId) {
    showConfirmation(getTranslatedText('confirmDeleteUser'), async () => {
        showLoadingIndicator();
        try {
            // Delete user's custom rates first
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { customRates: {} }); // Clear custom rates

            // Delete all work records associated with this user
            const recordsRef = collection(db, 'workRecords');
            const q = query(recordsRef, where('userId', '==', userId));
            const querySnapshot = await getDocs(q);
            const batch = db.batch();
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Finally, delete the user document
            await deleteDoc(userDocRef);

            showToastMessage(getTranslatedText('userDeleted'), 'success');
            await fetchUsers();
            await fetchAllWorkRecords(true); // Refresh all records in admin panel
        } catch (error) {
            console.error("Error deleting user:", error);
            showToastMessage(getTranslatedText('errorDeletingUser'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    });
}

async function addAccount() {
    clearInputError(newAccountNameInput, newAccountNameInputError);
    clearInputError(newAccountPriceInput, newAccountPriceInputError);

    const name = newAccountNameInput.value.trim();
    const defaultPrice = parseFloat(newAccountPriceInput.value);

    if (!name) {
        showInputError(newAccountNameInput, newAccountNameInputError, getTranslatedText('accountNameRequired'));
        return;
    }
    if (isNaN(defaultPrice) || defaultPrice < 0) {
        showInputError(newAccountPriceInput, newAccountPriceInputError, getTranslatedText('invalidPrice'));
        return;
    }

    showLoadingIndicator();
    try {
        const accountsCol = collection(db, 'accounts');
        // Check if account with same name already exists
        const q = query(accountsCol, where('name', '==', name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showInputError(newAccountNameInput, newAccountNameInputError, getTranslatedText('accountAlreadyExists'));
            return;
        }

        await addDoc(accountsCol, { name, defaultPrice, createdAt: serverTimestamp() });
        showToastMessage(getTranslatedText('accountAdded'), 'success');
        newAccountNameInput.value = '';
        newAccountPriceInput.value = '';
        await fetchAccounts();
    } catch (error) {
        console.error("Error adding account:", error);
        showToastMessage(getTranslatedText('errorAddingAccount'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function editAccount(accountId) {
    const accountToEdit = allAccounts.find(account => account.id === accountId);
    if (!accountToEdit) {
        showToastMessage(getTranslatedText('accountNotFound'), 'error');
        return;
    }

    // Populate the form with account data for editing
    newAccountNameInput.value = accountToEdit.name;
    newAccountPriceInput.value = accountToEdit.defaultPrice;

    // Change button to update mode
    addAccountBtn.textContent = getTranslatedText('saveChangesBtn');
    addAccountBtn.onclick = async () => {
        clearInputError(newAccountNameInput, newAccountNameInputError);
        clearInputError(newAccountPriceInput, newAccountPriceInputError);

        const name = newAccountNameInput.value.trim();
        const defaultPrice = parseFloat(newAccountPriceInput.value);

        if (!name) {
            showInputError(newAccountNameInput, newAccountNameInputError, getTranslatedText('accountNameRequired'));
            return;
        }
        if (isNaN(defaultPrice) || defaultPrice < 0) {
            showInputError(newAccountPriceInput, newAccountPriceInputError, getTranslatedText('invalidPrice'));
            return;
        }

        showLoadingIndicator();
        try {
            const accountDocRef = doc(db, 'accounts', accountId);
            // Check if another account with the same name already exists (excluding the current account)
            const accountsCol = collection(db, 'accounts');
            const q = query(accountsCol, where('name', '==', name), where(documentId(), '!=', accountId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showInputError(newAccountNameInput, newAccountNameInputError, getTranslatedText('accountAlreadyExists'));
                return;
            }

            await updateDoc(accountDocRef, { name, defaultPrice });
            showToastMessage(getTranslatedText('accountUpdated'), 'success');
            newAccountNameInput.value = '';
            newAccountPriceInput.value = '';
            addAccountBtn.textContent = getTranslatedText('addAccountBtn'); // Reset button
            addAccountBtn.onclick = addAccount; // Reset onclick
            await fetchAccounts();
        } catch (error) {
            console.error("Error updating account:", error);
            showToastMessage(getTranslatedText('errorUpdatingAccount'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    };
}

async function deleteAccount(accountId) {
    showConfirmation(getTranslatedText('confirmDeleteAccount'), async () => {
        showLoadingIndicator();
        try {
            // Remove this account from all users' customRates
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const batch = db.batch();

            usersSnapshot.docs.forEach(userDoc => {
                const userData = userDoc.data();
                if (userData.customRates && userData.customRates[accountId] !== undefined) {
                    const updatedCustomRates = { ...userData.customRates };
                    delete updatedCustomRates[accountId];
                    batch.update(userDoc.ref, { customRates: updatedCustomRates });
                }
            });
            await batch.commit();

            // Delete the account document
            await deleteDoc(doc(db, 'accounts', accountId));
            showToastMessage(getTranslatedText('accountDeleted'), 'success');
            await fetchAccounts();
            await fetchAllWorkRecords(true); // Refresh all records in admin panel
        } catch (error) {
            console.error("Error deleting account:", error);
            showToastMessage(getTranslatedText('errorDeletingAccount'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    });
}

function addTimingField() {
    const timingInputGroup = document.createElement('div');
    timingInputGroup.className = 'timing-input-group';
    timingInputGroup.innerHTML = `
        <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0">
        <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59">
        <button type="button" class="admin-action-btntp delete remove-timing-field"><i class="fas fa-times"></i></button>
    `;
    newTimingsContainer.appendChild(timingInputGroup);

    // Add event listener for the new remove button
    timingInputGroup.querySelector('.remove-timing-field').addEventListener('click', (e) => {
        e.target.closest('.timing-input-group').remove();
    });
}

async function addTaskDefinition() {
    clearInputError(newTaskNameInput, newTaskNameInputError);
    clearInputError(newTimingsContainer.querySelector('input'), newTimingsInputError); // Clear for first input in timings

    const name = newTaskNameInput.value.trim();
    const timingInputsMinutes = Array.from(document.querySelectorAll('.new-task-timing-minutes'));
    const timingInputsSeconds = Array.from(document.querySelectorAll('.new-task-timing-seconds'));

    if (!name) {
        showInputError(newTaskNameInput, newTaskNameInputError, getTranslatedText('taskNameRequired'));
        return;
    }

    const timings = [];
    let hasInvalidTiming = false;
    for (let i = 0; i < timingInputsMinutes.length; i++) {
        const minutes = parseInt(timingInputsMinutes[i].value);
        const seconds = parseInt(timingInputsSeconds[i].value);

        if (isNaN(minutes) || minutes < 0 || isNaN(seconds) || seconds < 0 || seconds > 59) {
            showInputError(timingInputsMinutes[i], newTimingsInputError, getTranslatedText('invalidTiming')); // Add invalidTiming to languageTexts
            hasInvalidTiming = true;
            break;
        }
        timings.push(convertToMilliseconds(minutes, seconds));
    }

    if (hasInvalidTiming) return;
    if (timings.length === 0) {
        showInputError(newTaskNameInput, newTimingsInputError, getTranslatedText('timingRequired')); // Add timingRequired to languageTexts
        return;
    }

    showLoadingIndicator();
    try {
        const tasksCol = collection(db, 'taskDefinitions');
        // Check if task with same name already exists
        const q = query(tasksCol, where('name', '==', name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showInputError(newTaskNameInput, newTaskNameInputError, getTranslatedText('taskAlreadyExists'));
            return;
        }

        await addDoc(tasksCol, { name, timings, createdAt: serverTimestamp() });
        showToastMessage(getTranslatedText('taskAdded'), 'success');
        newTaskNameInput.value = '';
        newTimingsContainer.innerHTML = `
            <div class="timing-input-group">
                <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0">
                <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59">
            </div>
        `; // Reset timings
        await fetchTaskDefinitions();
    } catch (error) {
        console.error("Error adding task:", error);
        showToastMessage(getTranslatedText('errorAddingTask'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function editTask(taskId) {
    const taskToEdit = allTaskDefinitions.find(task => task.id === taskId);
    if (!taskToEdit) {
        showToastMessage(getTranslatedText('taskNotFound'), 'error');
        return;
    }

    // Populate the form with task data for editing
    newTaskNameInput.value = taskToEdit.name;
    newTimingsContainer.innerHTML = ''; // Clear existing timing fields

    if (taskToEdit.timings && Array.isArray(taskToEdit.timings)) {
        taskToEdit.timings.forEach(timingMs => {
            const minutes = Math.floor(timingMs / 60000);
            const seconds = Math.floor((timingMs % 60000) / 1000);
            const timingInputGroup = document.createElement('div');
            timingInputGroup.className = 'timing-input-group';
            timingInputGroup.innerHTML = `
                <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0" value="${minutes}">
                <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59" value="${seconds}">
                <button type="button" class="admin-action-btntp delete remove-timing-field"><i class="fas fa-times"></i></button>
            `;
            newTimingsContainer.appendChild(timingInputGroup);
            timingInputGroup.querySelector('.remove-timing-field').addEventListener('click', (e) => {
                e.target.closest('.timing-input-group').remove();
            });
        });
    } else {
        addTimingField(); // Add an empty field if no timings exist
    }


    // Change button to update mode
    addTaskDefinitionBtn.textContent = getTranslatedText('saveChangesBtn');
    addTaskDefinitionBtn.onclick = async () => {
        clearInputError(newTaskNameInput, newTaskNameInputError);
        clearInputError(newTimingsContainer.querySelector('input'), newTimingsInputError);

        const name = newTaskNameInput.value.trim();
        const timingInputsMinutes = Array.from(document.querySelectorAll('.new-task-timing-minutes'));
        const timingInputsSeconds = Array.from(document.querySelectorAll('.new-task-timing-seconds'));

        if (!name) {
            showInputError(newTaskNameInput, newTaskNameInputError, getTranslatedText('taskNameRequired'));
            return;
        }

        const timings = [];
        let hasInvalidTiming = false;
        for (let i = 0; i < timingInputsMinutes.length; i++) {
            const minutes = parseInt(timingInputsMinutes[i].value);
            const seconds = parseInt(timingInputsSeconds[i].value);

            if (isNaN(minutes) || minutes < 0 || isNaN(seconds) || seconds < 0 || seconds > 59) {
                showInputError(timingInputsMinutes[i], newTimingsInputError, getTranslatedText('invalidTiming'));
                hasInvalidTiming = true;
                break;
            }
            timings.push(convertToMilliseconds(minutes, seconds));
        }

        if (hasInvalidTiming) return;
        if (timings.length === 0) {
            showInputError(newTaskNameInput, newTimingsInputError, getTranslatedText('timingRequired'));
            return;
        }

        showLoadingIndicator();
        try {
            const taskDocRef = doc(db, 'taskDefinitions', taskId);
            // Check if another task with the same name already exists (excluding the current task)
            const tasksCol = collection(db, 'taskDefinitions');
            const q = query(tasksCol, where('name', '==', name), where(documentId(), '!=', taskId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showInputError(newTaskNameInput, newTaskNameInputError, getTranslatedText('taskAlreadyExists'));
                return;
            }

            await updateDoc(taskDocRef, { name, timings });
            showToastMessage(getTranslatedText('taskUpdated'), 'success');
            newTaskNameInput.value = '';
            newTimingsContainer.innerHTML = `
                <div class="timing-input-group">
                    <input type="number" class="new-task-timing-minutes" placeholder="${getTranslatedText('minutesPlaceholder')}" min="0">
                    <input type="number" class="new-task-timing-seconds" placeholder="${getTranslatedText('secondsPlaceholder')}" min="0" max="59">
                </div>
            `; // Reset timings
            addTaskDefinitionBtn.textContent = getTranslatedText('addTaskBtn'); // Reset button
            addTaskDefinitionBtn.onclick = addTaskDefinition; // Reset onclick
            await fetchTaskDefinitions();
        } catch (error) {
            console.error("Error updating task:", error);
            showToastMessage(getTranslatedText('errorUpdatingTask'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    };
}

async function deleteTask(taskId) {
    showConfirmation(getTranslatedText('confirmDeleteTask'), async () => {
        showLoadingIndicator();
        try {
            await deleteDoc(doc(db, 'taskDefinitions', taskId));
            showToastMessage(getTranslatedText('taskDeleted'), 'success');
            await fetchTaskDefinitions();
        } catch (error) {
            console.error("Error deleting task:", error);
            showToastMessage(getTranslatedText('errorDeletingTask'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    });
}

async function openEditRecordModal(recordId) {
    currentEditingRecordId = recordId;
    const recordToEdit = allAdminRecords.find(record => record.id === recordId);

    if (!recordToEdit) {
        showToastMessage(getTranslatedText('recordNotFound'), 'error');
        return;
    }

    // Populate selects
    populateEditModalAccountSelect();
    populateEditModalTaskTypeSelect();

    editAccountSelect.value = recordToEdit.accountId;
    editTaskTypeSelect.value = recordToEdit.taskId;
    editTotalTasksCount.value = recordToEdit.tasksCompleted || 1;
    editTotalTime.value = (recordToEdit.duration / (1000 * 60)).toFixed(2); // Convert ms to minutes
    editRecordDate.value = recordToEdit.date; // ISO-MM-DD
    editRecordTime.value = new Date(recordToEdit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); // HH:MM

    editRecordModal.style.display = 'flex';
}

function populateEditModalAccountSelect() {
    if (!editAccountSelect) return;
    editAccountSelect.innerHTML = '<option value="">' + getTranslatedText('accountName') + '</option>';
    allAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        editAccountSelect.appendChild(option);
    });
}

function populateEditModalTaskTypeSelect() {
    if (!editTaskTypeSelect) return;
    editTaskTypeSelect.innerHTML = '<option value="">' + getTranslatedText('taskType') + '</option>';
    allTaskDefinitions.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.name;
        editTaskTypeSelect.appendChild(option);
    });
}

async function saveEditedRecord() {
    clearInputError(editAccountSelect, editAccountSelectError);
    clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
    clearInputError(editTotalTasksCount, editTotalTasksCountError);
    clearInputError(editTotalTime, editTotalTimeError);
    clearInputError(editRecordDate, editRecordDateError);
    clearInputError(editRecordTime, editRecordTimeError);

    const newAccountId = editAccountSelect.value;
    const newTaskId = editTaskTypeSelect.value;
    const newTasksCompleted = parseInt(editTotalTasksCount.value);
    const newDurationMinutes = parseFloat(editTotalTime.value);
    const newDate = editRecordDate.value;
    const newTime = editRecordTime.value;

    if (!newAccountId) { showInputError(editAccountSelect, editAccountSelectError, getTranslatedText('accountNameRequired')); return; }
    if (!newTaskId) { showInputError(editTaskTypeSelect, editTaskTypeSelectError, getTranslatedText('taskNameRequired')); return; }
    if (isNaN(newTasksCompleted) || newTasksCompleted < 0) { showInputError(editTotalTasksCount, editTotalTasksCountError, getTranslatedText('invalidCount')); return; } // Add invalidCount
    if (isNaN(newDurationMinutes) || newDurationMinutes < 0) { showInputError(editTotalTime, editTotalTimeError, getTranslatedText('invalidDuration')); return; }
    if (!newDate) { showInputError(editRecordDate, editRecordDateError, getTranslatedText('dateRequired')); return; }
    if (!newTime) { showInputError(editRecordTime, editRecordTimeError, getTranslatedText('timeRequired')); return; } // Add timeRequired

    showLoadingIndicator();
    try {
        const recordDocRef = doc(db, 'workRecords', currentEditingRecordId);

        // Combine date and time to create a new timestamp
        const dateTimeString = `${newDate}T${newTime}:00`; // Assuming time is HH:MM
        const newTimestamp = new Date(dateTimeString).getTime();

        await updateDoc(recordDocRef, {
            accountId: newAccountId,
            taskId: newTaskId,
            tasksCompleted: newTasksCompleted,
            duration: newDurationMinutes * 60 * 1000, // Convert minutes to milliseconds
            date: newDate,
            timestamp: newTimestamp
        });
        showToastMessage(getTranslatedText('recordUpdated'), 'success');
        editRecordModal.style.display = 'none';
        await fetchAllWorkRecords(true); // Refresh all records
        await fetchUserWorkRecords(); // Refresh user records
        renderMainDashboard(); // Update dashboard totals
    } catch (error) {
        console.error("Error updating record:", error);
        showToastMessage(getTranslatedText('errorUpdatingRecord'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function deleteRecord(recordId) {
    showConfirmation(getTranslatedText('confirmDeleteRecord'), async () => {
        showLoadingIndicator();
        try {
            await deleteDoc(doc(db, 'workRecords', recordId));
            showToastMessage(getTranslatedText('recordDeleted'), 'success');
            await fetchAllWorkRecords(true); // Refresh all records
            await fetchUserWorkRecords(); // Refresh user records
            renderMainDashboard(); // Update dashboard totals
        } catch (error) {
            console.error("Error deleting record:", error);
            showToastMessage(getTranslatedText('errorDeletingRecord'), 'error');
        } finally {
            hideLoadingIndicator();
        }
    });
}

function openEditEmployeeRateModal(userId, accountId) {
    currentEditingRate = { userId, accountId };
    const user = allUsers.find(u => u.id === userId);
    const account = allAccounts.find(acc => acc.id === accountId);

    if (!user || !account) {
        showToastMessage(getTranslatedText('dataNotFound'), 'error');
        return;
    }

    modalEmployeeName.textContent = user.name;
    modalAccountName.textContent = account.name;
    modalDefaultPrice.textContent = `${account.defaultPrice.toFixed(2)} ${getTranslatedText('currencyUnit')}`;
    modalCustomPriceInput.value = user.customRates && user.customRates[accountId] !== undefined ? user.customRates[accountId] : account.defaultPrice;

    editEmployeeRateModal.style.display = 'flex';
}

async function saveCustomRate() {
    clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
    const customPrice = parseFloat(modalCustomPriceInput.value);

    if (isNaN(customPrice) || customPrice < 0) {
        showInputError(modalCustomPriceInput, modalCustomPriceInputError, getTranslatedText('invalidPrice'));
        return;
    }

    showLoadingIndicator();
    try {
        const userDocRef = doc(db, 'users', currentEditingRate.userId);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            showToastMessage(getTranslatedText('userNotFound'), 'error');
            return;
        }

        const userData = userDoc.data();
        const customRates = userData.customRates || {};
        customRates[currentEditingRate.accountId] = customPrice;

        await updateDoc(userDocRef, { customRates: customRates });
        showToastMessage(getTranslatedText('rateUpdated'), 'success');
        editEmployeeRateModal.style.display = 'none';
        await fetchUsers(); // Refresh users to get updated custom rates
        await fetchAllWorkRecords(true); // Re-render admin records with new rates
        renderMainDashboard(); // Update dashboard totals in case current user's rate changed
    } catch (error) {
        console.error("Error saving custom rate:", error);
        showToastMessage(getTranslatedText('errorUpdatingRate'), 'error');
    } finally {
        hideLoadingIndicator();
    }
}

function showLoginErrorModal(title, message) {
    if (loginErrorModalTitle) loginErrorModalTitle.textContent = title;
    if (loginErrorModalMessage) loginErrorModalMessage.textContent = message;
    if (loginErrorModal) loginErrorModal.style.display = 'flex';
}

function hideLoginErrorModal() {
    if (loginErrorModal) loginErrorModal.style.display = 'none';
}

function showConfirmation(message, callback) {
    confirmationModalMessage.textContent = message;
    confirmationCallback = callback;
    confirmationModal.style.display = 'flex';
}

function hideConfirmationModal() {
    confirmationModal.style.display = 'none';
    confirmationCallback = null; // Clear the callback
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    // Apply language and dark mode settings
    setLanguage(localStorage.getItem('lang') || 'ar'); // Set initial language
    applyDarkMode(localStorage.getItem('darkMode') === 'true');

    // Initial page load - always start at login
    switchPage('loginPage');

    // Attach event listeners for PIN inputs
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            clearInputError(input, pinInputError);
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });
});

if (loginBtn) loginBtn.addEventListener('click', login);
// Listen for Enter key on the last PIN input field
if (pinInputs[pinInputs.length - 1]) {
    pinInputs[pinInputs.length - 1].addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
}

if (forgotPinLink) forgotPinLink.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default link behavior
    showLoginErrorModal(getTranslatedText('error'), getTranslatedText('forgotPinMessage'));
});

if (startWorkOption) startWorkOption.addEventListener('click', () => {
    switchPage('startWorkPage');
    taskSelectionPopup.style.display = 'flex'; // Show task selection popup
    taskDetailsContainer.style.display = 'none'; // Hide task details initially
    updateWorkSummary(); // Load initial work summary
    populateAccountSelect();
    populateTaskTypeSelect();
});
if (trackWorkOption) trackWorkOption.addEventListener('click', () => {
    switchPage('trackWorkPage');
    fetchUserWorkRecords(); // Fetch and render user's work records
});
if (logoutDashboardBtn) logoutDashboardBtn.addEventListener('click', logout);

if (confirmSelectionBtn) confirmSelectionBtn.addEventListener('click', startWork);
if (backToDashboardFromPopup) backToDashboardFromPopup.addEventListener('click', () => {
    switchPage('mainDashboard');
    renderMainDashboard();
});

if (saveWorkBtn) saveWorkBtn.addEventListener('click', saveWork);
if (backToDashboardFromStartWork) backToDashboardFromStartWork.addEventListener('click', () => {
    switchPage('mainDashboard');
    renderMainDashboard();
    // Clear any active timers for task timing buttons
    for (const key in taskTimers) {
        if (taskTimers[key].intervalId) {
            clearInterval(taskTimers[key].intervalId);
        }
        taskTimers[key].timeDisplay.classList.remove('show');
        taskTimers[key].undoBtn.classList.remove('show');
    }
    taskTimers = {}; // Reset
    clearInterval(sessionTimerInterval); // Stop session timer
    sessionTimerInterval = null;
    sessionTimePopup.classList.remove('show'); // Hide popup
});

if (backToDashboardFromTrack) backToDashboardFromTrack.addEventListener('click', () => {
    switchPage('mainDashboard');
    renderMainDashboard();
});

if (logoutAdminBtn) logoutAdminBtn.addEventListener('click', logout);

// Admin panel buttons
if (addUserBtn) addUserBtn.addEventListener('click', addUser);
if (addAccountBtn) addAccountBtn.addEventListener('click', addAccount);
if (addTimingFieldBtn) addTimingFieldBtn.addEventListener('click', addTimingField);
if (addTaskDefinitionBtn) addTaskDefinitionBtn.addEventListener('click', addTaskDefinition);
if (filterRecordsBtn) filterRecordsBtn.addEventListener('click', filterAdminRecords);
if (loadMoreRecordsBtn) loadMoreRecordsBtn.addEventListener('click', () => fetchAllWorkRecords(false));
if (loadAllRecordsBtn) loadAllRecordsBtn.addEventListener('click', () => fetchAllWorkRecords(true));

// Admin filter change events (re-filter on selection change)
if (recordFilterDate) recordFilterDate.addEventListener('change', filterAdminRecords);
if (recordFilterUser) recordFilterUser.addEventListener('change', filterAdminRecords);
if (recordFilterAccount) recordFilterAccount.addEventListener('change', filterAdminRecords);
if (recordFilterTask) recordFilterTask.addEventListener('change', filterAdminRecords);

// Modal close buttons
if (closeLoginErrorModal) closeLoginErrorModal.addEventListener('click', hideLoginErrorModal);
if (loginErrorModalCloseBtn) loginErrorModalCloseBtn.addEventListener('click', hideLoginErrorModal);

document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
            // Clear errors when modal closes
            if (modal.id === 'editRecordModal') {
                clearInputError(editAccountSelect, editAccountSelectError);
                clearInputError(editTaskTypeSelect, editTaskTypeSelectError);
                clearInputError(editTotalTasksCount, editTotalTasksCountError);
                clearInputError(editTotalTime, editTotalTimeError);
                clearInputError(editRecordDate, editRecordDateError);
                clearInputError(editRecordTime, editRecordTimeError);
            } else if (modal.id === 'editEmployeeRateModal') {
                clearInputError(modalCustomPriceInput, modalCustomPriceInputError);
            }
        }
    });
});


if (saveEditedRecordBtn) saveEditedRecordBtn.addEventListener('click', saveEditedRecord);
if (saveCustomRateBtn) saveCustomRateBtn.addEventListener('click', saveCustomRate);

if (closeConfirmationModal) closeConfirmationModal.addEventListener('click', hideConfirmationModal);
if (confirmModalBtn) confirmModalBtn.addEventListener('click', () => {
    if (confirmationCallback) {
        confirmationCallback();
    }
    hideConfirmationModal();
});
if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideConfirmationModal);


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

// Session Time Popup hover events
if (recordedTotalTime) {
    recordedTotalTime.addEventListener('mouseover', () => {
        if (workStartTime) { // Only show if a session is active
            sessionTimePopup.classList.add('show');
        }
    });
    recordedTotalTime.addEventListener('mouseout', () => {
        sessionTimePopup.classList.remove('show');
    });
}

// Function to switch between pages
function switchPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none'; // Hide all pages
        page.classList.remove('active');
    });
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.style.display = 'flex'; // Show active page (using flex for centering)
        activePage.classList.add('active');
    }
}

// Confirmation handler
function confirmDelete(type, id) {
    let message = '';
    let callback = null;
    switch (type) {
        case 'user':
            message = getTranslatedText('confirmDeleteUser');
            callback = () => deleteUser(id);
            break;
        case 'account':
            message = getTranslatedText('confirmDeleteAccount');
            callback = () => deleteAccount(id);
            break;
        case 'task':
            message = getTranslatedText('confirmDeleteTask');
            callback = () => deleteTask(id);
            break;
        case 'record':
            message = getTranslatedText('confirmDeleteRecord');
            callback = () => deleteRecord(id);
            break;
        default:
            return;
    }
    showConfirmation(message, callback);
}
