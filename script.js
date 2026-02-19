let isAdmin = false;
let username = "";
let currentOS = "linux";
let currentPath = [];
let commandHistory = [];
let historyIndex = -1;
let fs = null;

const ADMIN_USER = "tnight";
const ADMIN_PASS = "Ancor289";

const fortunes = [
  "La noche es joven... y tú también lo eres en esta terminal.",
  "Recuerda: con gran poder viene gran responsabilidad... y muchos echo.",
  "Error 404: vida social no encontrada.",
  "Estás a solo un 'reboot' de empezar de nuevo.",
  "El mejor comando es el que aún no has descubierto.",
  "tnight te observa... (solo si eres admin)",
  "Hoy es un buen día para crear carpetas vacías."
];

function createInitialFS() {
  return {
    type: "dir",
    children: {
      home: {
        type: "dir",
        children: {
          [username || "guest"]: {
            type: "dir",
            children: {
              "welcome.txt": { type: "file", content: `Bienvenid@ ${username || "invitado"}!\nEscribe 'help' para ver todo.` }
            }
          }
        }
      }
    }
  };
}

function loadState() { /* igual que antes, pero más seguro */ 
  const saved = localStorage.getItem("webcmd_state");
  if (saved) {
    const d = JSON.parse(saved);
    isAdmin = d.isAdmin || false;
    username = d.username || "";
    currentOS = d.currentOS || "linux";
    currentPath = d.currentPath || ["home", username || "guest"];
    commandHistory = d.commandHistory || [];
    fs = d.fs ? JSON.parse(d.fs) : createInitialFS();
  } else {
    fs = createInitialFS();
  }
}

function saveState() {
  localStorage.setItem("webcmd_state", JSON.stringify({
    isAdmin, username, currentOS, currentPath, commandHistory,
    fs: JSON.stringify(fs)
  }));
}

/* === FUNCIONES FS y helpers === */
function getCurrentDir() {
  let dir = fs;
  for (let p of currentPath) if (dir.children?.[p]) dir = dir.children[p];
  return dir;
}

function updatePrompt() {
  const prompt = document.getElementById("prompt");
  const input = document.getElementById("command-input");
  const title = document.getElementById("terminal-title");

  if (currentOS === "linux") {
    prompt.textContent = `${username}@webcmd:${currentPath.length ? "/" + currentPath.join("/") : "/"} $ `;
  } else {
    prompt.textContent = `C:\\Users\\${username}${currentPath.length > 1 ? "\\" + currentPath.slice(2).join("\\") : ""}> `;
    input.classList.add("windows");
  }
  title.textContent = `WebCMD • ${username}${isAdmin ? " (ADMIN)" : ""}`;
}

function append(text, cls = "") {
  const out = document.getElementById("output");
  const line = document.createElement("div");
  line.innerHTML = text.replace(/\n/g, "<br>");
  if (cls) line.className = cls;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

/* === EJECUTAR COMANDOS (¡MUCHOS MÁS!) === */
function executeCommand(cmd) {
  if (!cmd.trim()) return;
  commandHistory.push(cmd);
  saveState();

  const args = cmd.trim().split(/\s+/);
  const c = args[0].toLowerCase();

  let output = "";

  if (c === "clear" || c === "cls") {
    document.getElementById("output").innerHTML = "";
    return;
  }
  if (c === "help") {
    output = currentOS === "linux" 
      ? "ls  cd  pwd  cat  mkdir  touch  rm  echo  tree  nano  history  reboot  fortune  uptime  ifconfig  whoami  date  help"
      : "dir  cd  type  mkdir  del  echo  tree  history  reboot  fortune  ver  ipconfig  whoami  date  help";
  }
  else if (c === "echo") output = args.slice(1).join(" ");
  else if (c === "history") output = commandHistory.map((v,i) => `${i+1}. ${v}`).join("\n");
  else if (c === "reboot") { append("Reiniciando..."); setTimeout(() => location.reload(), 800); return; }
  else if (c === "fortune") output = fortunes[Math.floor(Math.random()*fortunes.length)];
  else if (c === "whoami") output = username + (isAdmin ? " (ADMIN)" : "");
  else if (c === "date") output = new Date().toLocaleString();
  else if (c === "uptime") output = "Uptime: 24/7 desde que naciste en esta terminal";
  else if ((c === "ifconfig" && currentOS==="linux") || (c === "ipconfig" && currentOS==="windows")) {
    output = "IP: 192.168.1.42\nMAC: AA:BB:CC:DD:EE:FF\nEstado: Conectado al vacío existencial";
  }
  else if (c === "ver" && currentOS==="windows") output = "WebCMD Windows Simulator v11.2026";
  else if (c === "tree") {
    output = ".\n└── home\n    └── " + username + "\n        ├── welcome.txt\n        └── (tus archivos)";
  }
  else if (c === "nano") {
    output = args[1] ? `Abriendo ${args[1]}... (simulado)\nEscribe lo que quieras y pulsa Enter para guardar.` : "nano: falta archivo";
  }

  // Comandos del sistema de archivos (iguales que antes pero mejorados)
  else if (currentOS === "linux") {
    if (c === "ls") output = Object.keys(getCurrentDir().children || {}).join("  ");
    else if (c === "pwd") output = "/" + currentPath.join("/");
    else if (c === "cd") output = cd(args[1]);
    else if (c === "cat" || c === "type") output = cat(args[1]);
    else if (c === "mkdir") output = mkdir(args[1]);
    else if (c === "touch") output = touch(args[1]);
    else if (c === "rm" || c === "del") output = rm(args[1]);
    else output = `bash: ${c}: comando no encontrado`;
  } else {
    if (c === "dir") output = Object.keys(getCurrentDir().children || {}).join("\n");
    else if (c === "cd") output = cd(args[1]);
    else if (c === "type") output = cat(args[1]);
    else if (c === "mkdir") output = mkdir(args[1]);
    else if (c === "del") output = rm(args[1]);
    else output = `'${c}' no se reconoce como comando interno.`;
  }

  // Mostrar comando + resultado
  append(`<span style="color:#0f0">${document.getElementById("prompt").textContent}</span>${cmd}`);
  append(output, output.includes("no ") || output.includes("no se") ? "error-line" : "success-line");
}

// Funciones FS (cd, cat, mkdir, etc.) — iguales que la versión anterior pero más estables
function cd(target) {
  if (!target || target === "~" || target === "/") { currentPath = ["home", username]; return ""; }
  if (target === "..") { if (currentPath.length > 1) currentPath.pop(); return ""; }
  const dir = getCurrentDir();
  if (dir.children?.[target]?.type === "dir") { currentPath.push(target); return ""; }
  return "No existe";
}
function cat(file) {
  return getCurrentDir().children?.[file]?.content || "Archivo no encontrado";
}
function mkdir(name) { 
  if (!name) return "Falta nombre";
  const dir = getCurrentDir();
  if (!dir.children[name]) dir.children[name] = {type:"dir", children:{}};
  saveState(); return "";
}
function touch(name) {
  if (!name) return "Falta nombre";
  const dir = getCurrentDir();
  if (!dir.children[name]) dir.children[name] = {type:"file", content:""};
  saveState(); return "";
}
function rm(name) {
  if (!name) return "Falta nombre";
  const dir = getCurrentDir();
  if (dir.children[name]) { delete dir.children[name]; saveState(); return ""; }
  return "No encontrado";
}

/* === INTERFAZ === */
function showTerminal() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("terminal-screen").classList.add("active");

  document.getElementById("output").innerHTML = "";
  append(`<span style="color:#0a0">WebCMD 2026 — Sesión iniciada como ${username}${isAdmin ? " (ADMIN)" : ""}</span><br>`);
  append("Escribe 'help' para ver todos los comandos.");

  updatePrompt();

  const input = document.getElementById("command-input");
  input.focus();
  input.onkeydown = e => {
    if (e.key === "Enter") {
      executeCommand(input.value.trim());
      input.value = "";
    }
    if (e.key === "ArrowUp" && historyIndex > 0) input.value = commandHistory[--historyIndex];
    if (e.key === "ArrowDown") {
      if (historyIndex < commandHistory.length - 1) input.value = commandHistory[++historyIndex];
      else { historyIndex = commandHistory.length; input.value = ""; }
    }
  };
}

// Login y flujos (igual que la versión anterior, ya probada)
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    isAdmin = true; username = ADMIN_USER;
  } else {
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("username-picker").classList.add("active");
    return;
  }
  currentPath = ["home", username];
  fs = createInitialFS();
  saveState();
  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("os-selector").classList.add("active");
});

window.setCustomUsername = () => {
  let name = document.getElementById("custom-username").value.trim() || "guest" + Math.floor(Math.random()*999);
  username = name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0,20);
  isAdmin = false;
  currentPath = ["home", username];
  fs = createInitialFS();
  saveState();
  document.getElementById("username-picker").classList.remove("active");
  document.getElementById("os-selector").classList.add("active");
};

window.selectOS = (os) => { currentOS = os; saveState(); showTerminal(); };
window.switchOS = () => { currentOS = currentOS === "linux" ? "windows" : "linux"; saveState(); showTerminal(); };
window.logout = () => { localStorage.removeItem("webcmd_state"); location.reload(); };

// Inicio
loadState();
if (username) showTerminal();
else document.getElementById("login-screen").classList.add("active");
