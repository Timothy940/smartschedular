if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("service-worker.js");
      console.log("✅ Service Worker registered.");

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("🔔 Notification permission granted.");
        subscribeUser(registration);
      } else {
        console.warn("❌ Notification permission denied.");
      }
    } catch (err) {
      console.error("Service Worker registration failed:", err);
    }
  });
}

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
async function subscribeUser(registration) {
  try {
    const response = await fetch("http://localhost:4000/publicKey");
    const { publicKey } = await response.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log("✅ Push subscription created", subscription);

    const result = await fetch("http://localhost:4000/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: { "Content-Type": "application/json" }
    }).then(res => res.json());

    console.log("✅ Subscription stored:", result);
  } catch (err) {
    console.error("❌ Subscription failed:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("custom-splash");
  const app = document.getElementById("app");

  const menu = document.getElementById("mobile-menu");
  const toggleBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("close-menu");
// === Ensure hamburger matches sidebar state on load
if (menu.classList.contains("active")) {
  toggleBtn.style.display = "none";  // Sidebar open → hide hamburger
  //app.classList.add("shifted");      // Shift content
} else {
  toggleBtn.style.display = "block"; // Sidebar closed → show hamburger
  //app.classList.remove("shifted");
}

 setTimeout(() => {
  splash.style.opacity = 0;

  setTimeout(() => {
    splash.style.display = "none";
    app.style.display = "block";
    showSection("signup-section");

    if (menu.classList.contains("active")) {
      toggleBtn.style.display = "none";
    } else {
      toggleBtn.style.display = "block";
    }

    const sidebar = document.getElementById("mobile-menu");
    // if (sidebar.classList.contains("active")) {
    //   app.classList.add("shifted");
    // }
  }, 500); // ← closes the inner setTimeout only

}, 1000); // ← closes the outer setTimeout


  toggleBtn.addEventListener("click", () => {
  menu.classList.add("active");
  document.body.classList.add("menu-open");
  toggleBtn.style.display = "none";
});

closeBtn.addEventListener("click", () => {
  menu.classList.remove("active");
  document.body.classList.remove("menu-open");
  toggleBtn.style.display = "block";
});

  // Sound Unlock
  document.addEventListener("click", unlockSoundOnFirstTap, { once: true });

  // Signup logic
  const signupForm = document.getElementById("signup-form");
  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const interests = document.getElementById("interests").value
      .split(",").map(i => i.trim()).filter(i => i);

    localStorage.setItem("studentName", name);
    localStorage.setItem("studentInterests", JSON.stringify(interests));

    alert(`Welcome ${name}! Your interests are saved.`);
    goToTimetableAfterSignup();

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
  });

  // PWA browser warning
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const browserWarning = document.getElementById("browser-warning");
  const dismissBtn = document.getElementById("dismiss-warning");

  if (isStandalone && browserWarning && !sessionStorage.getItem("hideBrowserWarning")) {
    browserWarning.style.display = "block";
  }
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      browserWarning.style.display = "none";
      sessionStorage.setItem("hideBrowserWarning", "true");
    });
  }
});

// === SECTION TOGGLING ===
function showSection(sectionId) {
  const titles = {
    "signup-section": "Sign Up",
    "timetable-section": "Your Timetable",
    "dashboard-section": "Dashboard"
  };

  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.style.display = "none";
    section.classList.remove("visible", "fade-in"); // remove old animation
  });

  // Show the requested section with animation
  const target = document.getElementById(sectionId);
  if (target) {
    target.style.display = "block";
    setTimeout(() => {
      target.classList.add("visible", "fade-in"); // add fade-in effect
    }, 10);
  }

  // Update header title
  const headerTitle = document.getElementById("header-title");
  if (headerTitle) {
    headerTitle.textContent = titles[sectionId] || "SmartSchedular";
  }

  // Show/hide back button
  const backBtn = document.getElementById("back-button");
  if (backBtn) {
    backBtn.style.display = sectionId === "signup-section" ? "none" : "inline-block";
  }

  // Save current section
  document.body.dataset.currentSection = sectionId;
}



// === RENDER TIMETABLE ===
const timetableForm = document.getElementById("timetable-form");
const timetableList = document.getElementById("timetable-list");
let timetable = JSON.parse(localStorage.getItem("studentTimetable")) || [];

function renderTimetable() {
  timetableList.innerHTML = "";
  timetable.forEach((entry, index) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${entry.course} - ${entry.day}<br>
      Start: ${entry.start} | End: ${entry.end}</span>
      <i class="fas fa-trash-alt delete-icon" onclick="deleteClass(${index})"></i>

    `;
    timetableList.appendChild(item);
  });
}

function deleteClass(index) {
  if (confirm("Are you sure you want to delete this class?")) {
    timetable.splice(index, 1);
    localStorage.setItem("studentTimetable", JSON.stringify(timetable));
    renderTimetable();
  }
}

timetableForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const course = document.getElementById("course").value;
  const day = document.getElementById("day").value;
  const start = document.getElementById("start-time").value;
  const end = document.getElementById("end-time").value;

  timetable.push({ course, day, start, end });
  localStorage.setItem("studentTimetable", JSON.stringify(timetable));
  renderTimetable();
  timetableForm.reset();
});

// === SIGNUP LOGIC ===
function goToTimetableAfterSignup() {
  showSection("timetable-section");
  renderTimetable();
}


// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}


  
  // 4. Sound unlock function
  function unlockSoundOnFirstTap() {
    const reminderSound = document.getElementById("reminder-sound");

    if (reminderSound) {
      reminderSound.muted = true;
      reminderSound.play().then(() => {
        reminderSound.pause();
        reminderSound.currentTime = 0;
        reminderSound.muted = false;

        showToast("🔊 Sound alerts are now active.");
        console.log("✅ Sound unlocked silently");
      }).catch(err => {
        console.log("🔇 Sound unlock failed:", err.message);
      });
    }

    // no need to manually remove listener because { once: true } handles that
  }



// === TASK MANAGER LOGIC ===
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");

let tasks = JSON.parse(localStorage.getItem("studentTasks")) || [];
let celebrationShown = false;

function renderTasks() {
  taskList.innerHTML = "";

  tasks = tasks.map(task => {
    if (typeof task === "string") {
      return { text: task, completed: false };
    }
    return task;
  });

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
  <input type="checkbox" onchange="toggleTask(${index})" ${task.completed ? 'checked' : ''} />
  <span style="${task.completed ? 'text-decoration: line-through; color: #888;' : ''}">${task.text}</span>
  <i class="fas fa-trash-alt delete-icon" onclick="deleteTask(${index})"></i>
`;

    taskList.appendChild(li);
  });

  updateProgressBar();
}

taskForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const taskText = taskInput.value.trim();
  if (taskText !== "") {
    tasks.push({ text: taskText, completed: false });
    localStorage.setItem("studentTasks", JSON.stringify(tasks));
    taskInput.value = "";
    renderTasks();
  }
});

function deleteTask(index) {
  tasks.splice(index, 1);
  localStorage.setItem("studentTasks", JSON.stringify(tasks));
  renderTasks();
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  localStorage.setItem("studentTasks", JSON.stringify(tasks));
  renderTasks();
}

// === FINISH TIMETABLE AND GO TO DASHBOARD ===
function finishSetup() {
  alert("Your timetable is saved. Opening your dashboard...");
  showSection("dashboard-section");
  showDashboard();
}

// === DASHBOARD LOGIC ===
function showDashboard() {
  const name = localStorage.getItem("studentName");
  const interests = JSON.parse(localStorage.getItem("studentInterests")) || [];
  const timetable = JSON.parse(localStorage.getItem("studentTimetable")) || [];

  document.getElementById("student-name").textContent = name;

  // Daily overview
  const today = new Date();
  const currentDay = today.toLocaleDateString("en-US", { weekday: "long" });
  document.getElementById("today-day").textContent = currentDay;

  const todaysClasses = timetable.filter(cls => cls.day === currentDay);
  const todayClassesText = todaysClasses.length > 0
    ? `You have ${todaysClasses.length} class(es): ${todaysClasses.map(cls => `${cls.course} (${cls.start}–${cls.end})`).join(', ')}.`
    : "You have no classes today. 🎉";

  document.getElementById("today-classes").textContent = todayClassesText;

  // Timetable preview
  const classList = document.getElementById("upcoming-classes");
  classList.innerHTML = "";

  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  timetable.sort((a, b) => {
    if (a.day === b.day) {
      return a.start.localeCompare(b.start);
    }
    return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
  });

  timetable.forEach((cls) => {
    const li = document.createElement("li");
    li.textContent = `${cls.day}: ${cls.course} (${cls.start}–${cls.end})`;
    classList.appendChild(li);
  });

  // Smart suggestions (based on gaps)
  // Smart suggestions (based on gaps)
  const suggestionsList = document.getElementById("smart-suggestions");
  suggestionsList.innerHTML = "";

  const classesByDay = {};
  timetable.forEach(cls => {
  if (!classesByDay[cls.day]) classesByDay[cls.day] = [];
  classesByDay[cls.day].push(cls);
  });

  daysOrder.forEach(day => {
  const dayClasses = classesByDay[day] || [];

  // ✅ CASE 1: Entirely Free or Only 1 Class
  if (dayClasses.length < 2) {
    const activity = interests[Math.floor(Math.random() * interests.length)];
    if (activity) {
      const suggestion = document.createElement("li");
      suggestion.textContent = `${day}: You have free time! Consider doing some ${activity}.`;
      suggestionsList.appendChild(suggestion);
    }
    return; // Skip gap-checking
  }

  // ✅ CASE 2: Multiple classes → check gaps
  dayClasses.sort((a, b) => a.start.localeCompare(b.start));

  for (let i = 0; i < dayClasses.length - 1; i++) {
    const endTime = dayClasses[i].end;
    const nextStart = dayClasses[i + 1].start;

    const [endH, endM] = endTime.split(":").map(Number);
    const [startH, startM] = nextStart.split(":").map(Number);

    const endDate = new Date(0, 0, 0, endH, endM);
    const nextStartDate = new Date(0, 0, 0, startH, startM);
    const gapMinutes = Math.floor((nextStartDate - endDate) / 60000);

    if (gapMinutes >= 60) {
      const activity = interests[Math.floor(Math.random() * interests.length)];
      const suggestion = document.createElement("li");
      suggestion.textContent = `${day} ${endTime}–${nextStart}: Try some ${activity}`;
      suggestionsList.appendChild(suggestion);
    }
  }
});
// Push-style personal task reminders every 4 minutes
setInterval(() => {
  const tasks = JSON.parse(localStorage.getItem("studentTasks")) || [];
  const pending = tasks.filter(t => !t.completed);

  if (pending.length > 0) {
    const task = pending[Math.floor(Math.random() * pending.length)];
    const taskText = typeof task === "string" ? task : task.text;
    
    sendLocalNotification("Task Reminder", `Don't forget: "${taskText}" is still pending.`);
  }
}, 900000); // every 15 minutes


  // Render tasks
  renderTasks();

  // Toast task reminders every 3 minutes
  setInterval(() => {
    const tasks = JSON.parse(localStorage.getItem("studentTasks")) || [];
    if (tasks.length > 0) {
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      showToast(`📌 Task Reminder: "${task.text}" is still pending`);
    }
  }, 180000); // every 3 mins
}

// === CLASS ALERT SOUND CHECK ===
setInterval(() => {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });

  timetable.forEach((cls) => {
    if (cls.day === currentDay) {
      const [classHour, classMinute] = cls.start.split(":");
      const classTime = new Date();
      classTime.setHours(classHour, classMinute, 0, 0);

      const diffMs = classTime - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      const reminderSound = document.getElementById("reminder-sound");
      if ([60, 30, 10].includes(diffMinutes)) {
  reminderSound.play();
  alert(`Reminder: Your ${cls.course} class starts in ${diffMinutes} minutes!`);
  sendLocalNotification("Class Reminder", `${cls.course} starts in ${diffMinutes} mins`);
}

    }
  });
}, 60000);

// === TOAST FUNCTION ===
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => container.removeChild(toast), 4000);
}

// === TASK PROGRESS BAR ===
function updateProgressBar() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById("task-progress-fill").style.width = `${percent}%`;
  document.getElementById("task-progress-percent").textContent = `${percent}% complete`;

  if (percent === 100 && total > 0 && !celebrationShown) {
    showToast("🎉 Congrats! You’ve completed all your personal tasks for today!");
    celebrationShown = true;
  }

  if (percent < 100) celebrationShown = false;
}
function handleBack() {
  const current = document.body.dataset.currentSection;

  if (current === "dashboard-section") {
    showSection("timetable-section");
  } else if (current === "timetable-section") {
    showSection("signup-section");
  }
}

function sendLocalNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "icon-192.png"
    });
  }
}

