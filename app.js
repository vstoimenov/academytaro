const STORAGE_KEY = "taroacademy-platform";
const ADMIN_EMAIL = "viktor.stoimenov12@gmail.com";
const ADMIN_PASSWORD = "TaroAcademy2026!";

const seedState = {
  clients: [
    {
      id: crypto.randomUUID(),
      name: "Демо клиент",
      email: "demo@taroacademy.online",
      status: "active",
      createdAt: new Date().toISOString()
    }
  ],
  lessons: [
    {
      id: crypto.randomUUID(),
      title: "Добре дошла в TaroAcademy",
      url: "",
      description: "Тук ще стои първото Vimeo видео. Добави линк от админ екрана."
    },
    {
      id: crypto.randomUUID(),
      title: "Как да подготвиш първото си четене",
      url: "",
      description: "Кратък стартов урок за първите практически стъпки."
    }
  ]
};

let state = loadState();
let currentStudent = null;
let currentLessonId = state.lessons[0]?.id || null;

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return structuredClone(seedState);
  }
  return JSON.parse(stored);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAdmin();
  renderLessons();
}

function statusLabel(status) {
  if (status === "active") return "Активен";
  if (status === "pending") return "Чака достъп";
  return "Пауза";
}

function vimeoToEmbed(url) {
  const match = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : "";
}

function showStudentCourse(client) {
  currentStudent = client;
  document.getElementById("studentLogin")?.classList.add("hidden");
  document.getElementById("studentCourse")?.classList.remove("hidden");
  const name = document.getElementById("studentName");
  if (name) name.textContent = client.name;
  renderLessons();
  selectLesson(currentLessonId);
}

function setupStudentPage() {
  const form = document.getElementById("studentLoginForm");
  if (!form) return;
  const emailInput = document.getElementById("studentEmail");
  const checkoutEmail = new URLSearchParams(window.location.search).get("email");

  if (checkoutEmail) {
    emailInput.value = checkoutEmail;
    const client = state.clients.find((item) => item.email.toLowerCase() === checkoutEmail.toLowerCase() && item.status === "active");
    if (client) showStudentCourse(client);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const client = state.clients.find((item) => item.email.toLowerCase() === email && item.status === "active");

    if (!client) {
      document.getElementById("studentError").textContent = "Не намирам активен достъп с този имейл.";
      return;
    }

    showStudentCourse(client);
  });

  document.getElementById("logoutStudent")?.addEventListener("click", () => {
    currentStudent = null;
    document.getElementById("studentCourse").classList.add("hidden");
    document.getElementById("studentLogin").classList.remove("hidden");
  });
}

function setupAdminPage() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("adminEmail").value.trim().toLowerCase();
    const password = document.getElementById("adminPassword").value;
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      document.getElementById("adminError").textContent = "Админ данните не са правилни.";
      return;
    }
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("adminDashboard").classList.remove("hidden");
    renderAdmin();
  });

  document.getElementById("clientForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("clientEmail").value.trim().toLowerCase();
    const existing = state.clients.find((client) => client.email.toLowerCase() === email);

    if (existing) {
      existing.name = document.getElementById("clientName").value.trim();
      existing.status = document.getElementById("clientStatus").value;
    } else {
      state.clients.unshift({
        id: crypto.randomUUID(),
        name: document.getElementById("clientName").value.trim(),
        email,
        status: document.getElementById("clientStatus").value,
        createdAt: new Date().toISOString()
      });
    }

    event.target.reset();
    saveState();
  });

  document.getElementById("lessonForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const lesson = {
      id: crypto.randomUUID(),
      title: document.getElementById("lessonTitle").value.trim(),
      url: document.getElementById("lessonUrl").value.trim(),
      description: document.getElementById("lessonDescription").value.trim()
    };
    state.lessons.push(lesson);
    currentLessonId = lesson.id;
    event.target.reset();
    saveState();
  });

  document.getElementById("exportClients")?.addEventListener("click", () => {
    const rows = [["Име", "Имейл", "Статус"]];
    state.clients.forEach((client) => rows.push([client.name, client.email, statusLabel(client.status)]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "taroacademy-clients.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function renderAdmin() {
  const statClients = document.getElementById("statClients");
  if (!statClients) return;

  statClients.textContent = state.clients.length;
  document.getElementById("statActive").textContent = state.clients.filter((client) => client.status === "active").length;
  document.getElementById("statLessons").textContent = state.lessons.length;

  document.getElementById("clientList").innerHTML = state.clients.map((client) => `
    <article class="client-row">
      <div class="client-main">
        <div>
          <h3>${client.name}</h3>
          <p class="muted">${client.email}</p>
        </div>
        <span class="badge ${client.status}">${statusLabel(client.status)}</span>
      </div>
      <div class="actions" style="margin-top:14px;">
        <button class="btn secondary small" type="button" onclick="copyEmail('${client.email}')">Копирай имейл</button>
        <button class="btn secondary small" type="button" onclick="editClient('${client.id}')">Редактирай</button>
        <button class="btn danger small" type="button" onclick="deleteClient('${client.id}')">Изтрий</button>
      </div>
    </article>
  `).join("");

  document.getElementById("adminLessonList").innerHTML = state.lessons.map((lesson, index) => `
    <article class="lesson">
      <div class="lesson-title">
        <span>${index + 1}. ${lesson.title}</span>
        <span class="actions">
          <button class="btn secondary small" type="button" onclick="editLesson('${lesson.id}')">Редактирай</button>
          <button class="btn danger small" type="button" onclick="deleteLesson('${lesson.id}')">Изтрий</button>
        </span>
      </div>
      <p class="muted">${lesson.description || "Без описание"}</p>
      <p class="code">${lesson.url || "Няма добавен Vimeo линк"}</p>
    </article>
  `).join("");
}

function renderLessons() {
  const list = document.getElementById("lessonList");
  if (!list) return;

  list.innerHTML = state.lessons.map((lesson, index) => `
    <article class="lesson ${lesson.id === currentLessonId ? "active" : ""}">
      <button type="button" onclick="selectLesson('${lesson.id}')">
        <div class="lesson-title">
          <span>${index + 1}. ${lesson.title}</span>
          <span>${lesson.url ? "Видео" : "Скоро"}</span>
        </div>
        <p class="muted">${lesson.description || ""}</p>
      </button>
    </article>
  `).join("");
}

function selectLesson(id) {
  currentLessonId = id;
  const lesson = state.lessons.find((item) => item.id === id) || state.lessons[0];
  if (!lesson || !document.getElementById("currentLessonTitle")) return;

  document.getElementById("currentLessonTitle").textContent = lesson.title;
  document.getElementById("currentLessonDescription").textContent = lesson.description || "";

  const embed = vimeoToEmbed(lesson.url);
  const frame = document.getElementById("videoFrame");
  const placeholder = document.getElementById("videoPlaceholder");
  if (embed) {
    frame.src = embed;
    frame.classList.remove("hidden");
    placeholder.classList.add("hidden");
  } else {
    frame.src = "";
    frame.classList.add("hidden");
    placeholder.classList.remove("hidden");
  }
  renderLessons();
}

function copyEmail(email) {
  navigator.clipboard.writeText(email);
}

function editClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const name = prompt("Име на клиента", client.name);
  if (name === null) return;
  const email = prompt("Имейл от покупката", client.email);
  if (email === null) return;
  const status = prompt("Статус: active, pending или paused", client.status);
  if (status === null) return;
  client.name = name.trim() || client.name;
  client.email = email.trim().toLowerCase() || client.email;
  client.status = ["active", "pending", "paused"].includes(status.trim()) ? status.trim() : client.status;
  saveState();
}

function editLesson(id) {
  const lesson = state.lessons.find((item) => item.id === id);
  if (!lesson) return;
  const title = prompt("Заглавие на урока", lesson.title);
  if (title === null) return;
  const url = prompt("Vimeo линк", lesson.url);
  if (url === null) return;
  const description = prompt("Кратко описание", lesson.description || "");
  if (description === null) return;
  lesson.title = title.trim() || lesson.title;
  lesson.url = url.trim();
  lesson.description = description.trim();
  saveState();
}

function deleteClient(id) {
  state.clients = state.clients.filter((client) => client.id !== id);
  saveState();
}

function deleteLesson(id) {
  state.lessons = state.lessons.filter((lesson) => lesson.id !== id);
  currentLessonId = state.lessons[0]?.id || null;
  saveState();
}

setupStudentPage();
setupAdminPage();
renderAdmin();
renderLessons();
