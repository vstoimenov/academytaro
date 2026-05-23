const STORAGE_KEY = "taroacademy-platform";
const LOCAL_ADMIN_EMAIL = "viktor.stoimenov12@gmail.com";
const LOCAL_ADMIN_PASSWORD = "TaroAcademy2026!";

const seedState = {
  clients: [
    {
      id: crypto.randomUUID(),
      name: "Демо клиент",
      email: "demo@taroacademy.online",
      status: "active",
      created_at: new Date().toISOString()
    }
  ],
  lessons: [
    {
      id: crypto.randomUUID(),
      title: "Добре дошла в TaroAcademy",
      url: "",
      description: "Тук ще стои първото Vimeo видео. Добави линк от админ екрана.",
      sort_order: 1
    },
    {
      id: crypto.randomUUID(),
      title: "Как да подготвиш първото си четене",
      url: "",
      description: "Кратък стартов урок за първите практически стъпки.",
      sort_order: 2
    }
  ]
};

let state = loadLocalState();
let currentStudent = null;
let currentLessonId = state.lessons[0]?.id || null;
let supabaseClient = null;
let isRemoteMode = false;

function hasSupabaseConfig() {
  return Boolean(
    window.TAROACADEMY_SUPABASE?.url &&
    window.TAROACADEMY_SUPABASE?.anonKey &&
    !window.TAROACADEMY_SUPABASE.url.includes("PASTE_") &&
    !window.TAROACADEMY_SUPABASE.anonKey.includes("PASTE_") &&
    window.supabase?.createClient
  );
}

function initSupabase() {
  if (!hasSupabaseConfig()) return;
  supabaseClient = window.supabase.createClient(
    window.TAROACADEMY_SUPABASE.url,
    window.TAROACADEMY_SUPABASE.anonKey
  );
  isRemoteMode = true;
  document.body.classList.add("remote-mode");
}

function loadLocalState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return structuredClone(seedState);
  }
  return JSON.parse(stored);
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function statusLabel(status) {
  if (status === "active") return "Активен";
  if (status === "pending") return "Чака достъп";
  return "Пауза";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function vimeoToEmbed(url) {
  const match = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : "";
}

function setMessage(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || "";
}

async function loadRemoteLessons() {
  const { data, error } = await supabaseClient
    .from("lessons")
    .select("id,title,url,description,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  state.lessons = data || [];
  currentLessonId = state.lessons[0]?.id || null;
}

async function loadRemoteAdminData() {
  const [clientsResponse, lessonsResponse] = await Promise.all([
    supabaseClient
      .from("clients")
      .select("id,name,email,status,created_at")
      .order("created_at", { ascending: false }),
    supabaseClient
      .from("lessons")
      .select("id,title,url,description,sort_order")
      .order("sort_order", { ascending: true })
  ]);

  if (clientsResponse.error) throw clientsResponse.error;
  if (lessonsResponse.error) throw lessonsResponse.error;

  state.clients = clientsResponse.data || [];
  state.lessons = lessonsResponse.data || [];
  currentLessonId = state.lessons[0]?.id || null;
}

async function saveAndRender() {
  if (!isRemoteMode) saveLocalState();
  renderAdmin();
  renderLessons();
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

async function handleStudentLogin(email) {
  if (isRemoteMode) {
    const { data, error } = await supabaseClient.rpc("check_client_access", {
      lookup_email: email
    });

    if (error) throw error;
    const access = Array.isArray(data) ? data[0] : data;
    if (!access?.has_access) return null;

    await loadRemoteLessons();
    return {
      id: access.client_id,
      name: access.client_name,
      email,
      status: "active"
    };
  }

  return state.clients.find((item) => normalizeEmail(item.email) === email && item.status === "active") || null;
}

function setupStudentPage() {
  const form = document.getElementById("studentLoginForm");
  if (!form) return;

  const emailInput = document.getElementById("studentEmail");
  const checkoutEmail = new URLSearchParams(window.location.search).get("email");

  if (checkoutEmail) {
    emailInput.value = checkoutEmail;
    handleStudentLogin(normalizeEmail(checkoutEmail))
      .then((client) => {
        if (client) showStudentCourse(client);
      })
      .catch(() => setMessage("studentError", "Има временен проблем с достъпа. Опитай пак след малко."));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("studentError", "");
    const email = normalizeEmail(emailInput.value);

    try {
      const client = await handleStudentLogin(email);
      if (!client) {
        setMessage("studentError", "Не намирам активен достъп с този имейл.");
        return;
      }
      showStudentCourse(client);
    } catch (error) {
      setMessage("studentError", "Има временен проблем с достъпа. Провери настройките или опитай пак.");
      console.error(error);
    }
  });

  document.getElementById("logoutStudent")?.addEventListener("click", async () => {
    currentStudent = null;
    document.getElementById("studentCourse").classList.add("hidden");
    document.getElementById("studentLogin").classList.remove("hidden");
  });
}

function showAdminDashboard() {
  document.getElementById("adminLogin")?.classList.add("hidden");
  document.getElementById("adminDashboard")?.classList.remove("hidden");
  renderAdmin();
}

async function setupAdminPage() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("adminError", "");
    const email = normalizeEmail(document.getElementById("adminEmail").value);
    const password = document.getElementById("adminPassword").value;

    try {
      if (isRemoteMode) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadRemoteAdminData();
        showAdminDashboard();
        return;
      }

      if (email !== LOCAL_ADMIN_EMAIL || password !== LOCAL_ADMIN_PASSWORD) {
        setMessage("adminError", "Админ данните не са правилни.");
        return;
      }
      showAdminDashboard();
    } catch (error) {
      setMessage("adminError", "Админ входът не е успешен. Провери имейла, паролата и Supabase настройките.");
      console.error(error);
    }
  });

  document.getElementById("clientForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const client = {
      name: document.getElementById("clientName").value.trim(),
      email: normalizeEmail(document.getElementById("clientEmail").value),
      status: document.getElementById("clientStatus").value
    };

    try {
      if (isRemoteMode) {
        const { error } = await supabaseClient
          .from("clients")
          .upsert(client, { onConflict: "email" });
        if (error) throw error;
        await loadRemoteAdminData();
      } else {
        const existing = state.clients.find((item) => normalizeEmail(item.email) === client.email);
        if (existing) {
          existing.name = client.name;
          existing.status = client.status;
        } else {
          state.clients.unshift({
            ...client,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          });
        }
      }

      event.target.reset();
      await saveAndRender();
    } catch (error) {
      alert("Клиентът не беше запазен. Провери настройките.");
      console.error(error);
    }
  });

  document.getElementById("lessonForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lesson = {
      title: document.getElementById("lessonTitle").value.trim(),
      url: document.getElementById("lessonUrl").value.trim(),
      description: document.getElementById("lessonDescription").value.trim(),
      sort_order: state.lessons.length + 1
    };

    try {
      if (isRemoteMode) {
        const { error } = await supabaseClient.from("lessons").insert(lesson);
        if (error) throw error;
        await loadRemoteAdminData();
      } else {
        state.lessons.push({ ...lesson, id: crypto.randomUUID() });
        currentLessonId = state.lessons.at(-1).id;
      }

      event.target.reset();
      await saveAndRender();
    } catch (error) {
      alert("Урокът не беше запазен. Провери Vimeo линка и настройките.");
      console.error(error);
    }
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
          <h3>${escapeHtml(client.name)}</h3>
          <p class="muted">${escapeHtml(client.email)}</p>
        </div>
        <span class="badge ${escapeHtml(client.status)}">${statusLabel(client.status)}</span>
      </div>
      <div class="actions" style="margin-top:14px;">
        <button class="btn secondary small" type="button" onclick="copyEmail('${escapeHtml(client.email)}')">Копирай имейл</button>
        <button class="btn secondary small" type="button" onclick="editClient('${escapeHtml(client.id)}')">Редактирай</button>
        <button class="btn danger small" type="button" onclick="deleteClient('${escapeHtml(client.id)}')">Изтрий</button>
      </div>
    </article>
  `).join("");

  document.getElementById("adminLessonList").innerHTML = state.lessons.map((lesson, index) => `
    <article class="lesson">
      <div class="lesson-title">
        <span>${index + 1}. ${escapeHtml(lesson.title)}</span>
        <span class="actions">
          <button class="btn secondary small" type="button" onclick="editLesson('${escapeHtml(lesson.id)}')">Редактирай</button>
          <button class="btn danger small" type="button" onclick="deleteLesson('${escapeHtml(lesson.id)}')">Изтрий</button>
        </span>
      </div>
      <p class="muted">${escapeHtml(lesson.description || "Без описание")}</p>
      <p class="code">${escapeHtml(lesson.url || "Няма добавен Vimeo линк")}</p>
    </article>
  `).join("");
}

function renderLessons() {
  const list = document.getElementById("lessonList");
  if (!list) return;

  list.innerHTML = state.lessons.map((lesson, index) => `
    <article class="lesson ${lesson.id === currentLessonId ? "active" : ""}">
      <button type="button" onclick="selectLesson('${escapeHtml(lesson.id)}')">
        <div class="lesson-title">
          <span>${index + 1}. ${escapeHtml(lesson.title)}</span>
          <span>${lesson.url ? "Видео" : "Скоро"}</span>
        </div>
        <p class="muted">${escapeHtml(lesson.description || "")}</p>
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

async function editClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const name = prompt("Име на клиента", client.name);
  if (name === null) return;
  const email = prompt("Имейл от покупката", client.email);
  if (email === null) return;
  const status = prompt("Статус: active, pending или paused", client.status);
  if (status === null) return;

  const updates = {
    name: name.trim() || client.name,
    email: normalizeEmail(email) || client.email,
    status: ["active", "pending", "paused"].includes(status.trim()) ? status.trim() : client.status
  };

  try {
    if (isRemoteMode) {
      const { error } = await supabaseClient.from("clients").update(updates).eq("id", id);
      if (error) throw error;
      await loadRemoteAdminData();
    } else {
      Object.assign(client, updates);
    }
    await saveAndRender();
  } catch (error) {
    alert("Клиентът не беше редактиран.");
    console.error(error);
  }
}

async function editLesson(id) {
  const lesson = state.lessons.find((item) => item.id === id);
  if (!lesson) return;
  const title = prompt("Заглавие на урока", lesson.title);
  if (title === null) return;
  const url = prompt("Vimeo линк", lesson.url);
  if (url === null) return;
  const description = prompt("Кратко описание", lesson.description || "");
  if (description === null) return;

  const updates = {
    title: title.trim() || lesson.title,
    url: url.trim(),
    description: description.trim()
  };

  try {
    if (isRemoteMode) {
      const { error } = await supabaseClient.from("lessons").update(updates).eq("id", id);
      if (error) throw error;
      await loadRemoteAdminData();
    } else {
      Object.assign(lesson, updates);
    }
    await saveAndRender();
  } catch (error) {
    alert("Урокът не беше редактиран.");
    console.error(error);
  }
}

async function deleteClient(id) {
  if (!confirm("Да изтрия ли този клиент?")) return;
  try {
    if (isRemoteMode) {
      const { error } = await supabaseClient.from("clients").delete().eq("id", id);
      if (error) throw error;
      await loadRemoteAdminData();
    } else {
      state.clients = state.clients.filter((client) => client.id !== id);
    }
    await saveAndRender();
  } catch (error) {
    alert("Клиентът не беше изтрит.");
    console.error(error);
  }
}

async function deleteLesson(id) {
  if (!confirm("Да изтрия ли този урок?")) return;
  try {
    if (isRemoteMode) {
      const { error } = await supabaseClient.from("lessons").delete().eq("id", id);
      if (error) throw error;
      await loadRemoteAdminData();
    } else {
      state.lessons = state.lessons.filter((lesson) => lesson.id !== id);
      currentLessonId = state.lessons[0]?.id || null;
    }
    await saveAndRender();
  } catch (error) {
    alert("Урокът не беше изтрит.");
    console.error(error);
  }
}

initSupabase();
setupStudentPage();
setupAdminPage();
renderAdmin();
renderLessons();
