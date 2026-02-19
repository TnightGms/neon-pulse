const ADMIN_USER = "tnight";
const ADMIN_PASS_HASH = "e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4"; 

let isAdmin = false;
let username = "";
let currentOS = "linux";
let currentPath = [];
let commandHistory = [];
let historyIndex = -1;
let fs = null;

// ── Utilidades criptográficas ──
async function sha256(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Sistema de archivos virtual ──
function createInitialFS() {
  return {
    type: "dir",
    children: {
      home: {
        type: "dir",
        children: {
          [username]: {
            type: "dir",
            children: {
              "welcome.txt": {
                type: "file",
                content: `Bienvenid@ ${username}!\n\nEscribe 'help' para ver comandos disponibles.`
              }
            }
          }
        }
      }
    }
  };
}

function getCurrentDir() {
  let dir = fs;
  for (let segment of currentPath) {
    if (dir.children?.[segment]) dir = dir.children[segment];
    else return null;
  }
  return dir;
}

function saveState() {
  localStorage.setItem("webcmd_state", JSON.stringify({
    isAdmin,
    username,
    currentOS,
    currentPath,
    commandHistory,
    fs: JSON.stringify(fs)
  }));
}

function loadState() {
  const saved = localStorage.getItem("webcmd_state");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      isAdmin = data.isAdmin || false;
      username = data.username || "";
      currentOS = data.currentOS || "linux";
      currentPath = data.currentPath || ["home", username || "guest"];
      commandHistory = data.commandHistory || [];
      fs = data.fs ? JSON.parse(data.fs) : createInitialFS();
    } catch (e) {
      localStorage.removeItem("webcmd_state");
      location.reload();
    }
  }
}

// ── Interfaz de terminal ──
function updatePrompt() {
  const promptEl = document.getElementById("prompt");
  const input = document.getElementById("command-input");
  const title = document.getElementById("terminal-title");

  if (currentOS === "linux") {
    promptEl.textContent = `${username}@webcmd:${currentPath.length ? "/" + currentPath.join("/") : "/"} $ `;
    input.classList.remove("windows");
  } else {
    promptEl.textContent = `C:\\Users\\${username}${currentPath.length > 1 ? "\\" + currentPath.slice(2).join("\\") : ""}> `;
    input.classList.add("windows");
  }

  title.textContent = `WebCMD • ${username}${isAdmin ? " (ADMIN)" : ""}`;
}

function appendOutput(text, className = "") {
  const output = document.getElementById("output");
  const line = document.createElement("div");
  line.innerHTML = text.replace(/\n/g, "<br>");
  if (className) line.className = className;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// ── Comandos ──
function executeCommand(cmd) {
  if (!cmd.trim()) return;

  commandHistory.push(cmd);
  historyIndex = commandHistory.length;
  saveState();

  const args = cmd.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  let output = "";

  // Comandos universales
  if (["clear", "cls"].includes(command)) {
    document.getElementById("output").innerHTML = "";
    return;
  }

  if (command === "help") {
    output = currentOS === "linux"
      ? "ls  cd  pwd  cat  mkdir  touch  rm  echo  tree  history  whoami  date  uptime  fortune  ifconfig  ping  reboot  clear  help"
      : "dir  cd  type  mkdir  del  echo  tree  history  whoami  date  ver  ipconfig  systeminfo  ping  reboot  cls  help";
  }

  else if (command === "whoami") output = username + (isAdmin ? " (admin)" : "");
  else if (command === "date") output = new Date().toLocaleString();
  else if (command === "uptime") output = "Uptime: siempre encendido";
  else if (command === "fortune") output = ["La noche es joven...", "Error 404: vida social no encontrada.", "Hoy es un buen día para hackear"][Math.floor(Math.random()*3)];
  else if (command === "reboot") { appendOutput("Reiniciando..."); setTimeout(() => location.reload(), 1200); return; }
  else if (command === "echo") output = args.slice(1).join(" ");
  else if (command === "history") output = commandHistory.map((v,i) => `${i+1}. ${v}`).join("\n");
  else if (command === "ping") output = "PING 8.8.8.8: 64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=12 ms";
  else if (command === "tree") output = ".\n└── home\n    └── " + username + "\n        └── welcome.txt";

  // Comandos Linux
  else if (currentOS === "linux") {
    if (command === "ls") output = Object.keys(getCurrentDir().children || {}).join("  ");
    else if (command === "pwd") output = "/" + currentPath.join("/");
    else if (command === "cd") output = cd(args[1]);
    else if (command === "cat") output = cat(args[1]);
    else if (command === "mkdir") output = mkdir(args[1]);
    else if (command === "touch") output = touch(args[1]);
    else if (command === "rm") output = rm(args[1]);
    else if (command === "ifconfig") output = "inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255";
    else output = `bash: ${command}: comando no encontrado`;
  }

  // Comandos Windows
  else {
    if (command === "dir") {
      output = Object.entries(getCurrentDir().children || {}).map(([k,v]) =>
        v.type === "dir" ? `<span style="color:#44f">${k}</span>` : k
      ).join("\n");
    }
    else if (command === "cd") output = cd(args[1]);
    else if (command === "type") output = cat(args[1]);
    else if (command === "mkdir") output = mkdir(args[1]);
    else if (command === "del") output = rm(args[1]);
    else if (command === "ipconfig") output = "IPv4 Address. . . . . . . . . . . : 192.168.1.42";
    else if (command === "systeminfo") output = "Host Name:                 WEBC-MD-2026\nOS Name:                   WebCMD Simulator";
    else if (command === "ver") output = "Microsoft WebCMD Simulator [Versión 11.2026.01]";
    else output = `'${command}' no se reconoce como un comando interno o externo.`;
  }

  appendOutput(`<span style="color:#0f0">${document.getElementById("prompt").textContent}</span>${cmd}`);
  appendOutput(output || "Comando ejecutado.", output.includes("no ") || output.includes("no se") ? "error" : "");
}

// ── Funciones del sistema de archivos ──
function cd(target) {
  if (!target || target === "~" || target === "/") { currentPath = ["home", username]; return ""; }
  if (target === "..") { if (currentPath.length > 1) currentPath.pop(); return ""; }

  const dir = getCurrentDir();
  if (dir?.children?.[target]?.type === "dir") {
    currentPath.push(target);
    return "";
  }
  return currentOS === "linux" ? "cd: no such file or directory: " + target : "El sistema no puede encontrar la ruta especificada.";
}

function cat(file) {
  if (!file) return currentOS === "linux" ? "cat: falta operando" : "type: falta nombre de archivo";
  const content = getCurrentDir()?.children?.[file]?.content;
  return content !== undefined ? content : (currentOS === "linux" ? "cat: " + file + ": No such file or directory" : "El sistema no puede encontrar el archivo especificado.");
}

function mkdir(name) {
  if (!name) return "Falta nombre de directorio";
  const dir = getCurrentDir();
  if (dir.children?.[name]) return "Ya existe";
  dir.children[name] = { type: "dir", children: {} };
  saveState();
  return "";
}

function touch(name) {
  if (!name) return "Falta nombre de archivo";
  const dir = getCurrentDir();
  if (!dir.children[name]) dir.children[name] = { type: "file", content: "" };
  saveState();
  return "";
}

function rm(name) {
  if (!name) return "Falta nombre";
  const dir = getCurrentDir();
  if (dir.children?.[name]) {
    delete dir.children[name];
    saveState();
    return "";
  }
  return currentOS === "linux" ? "rm: cannot remove '" + name + "': No such file or directory" : "No se pudo encontrar";
}

// ── Autenticación ──
document.getElementById("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const user = document.getElementById("login-username").value.trim();
  const pass = document.getElementById("login-password").value;

  if (user === ADMIN_USER) {
    const inputHash = await sha256(pass);
    if (inputHash === ADMIN_PASS_HASH) {
      isAdmin = true;
      username = ADMIN_USER;
      currentPath = ["home", username];
      fs = createInitialFS();
      saveState();
      document.getElementById("auth-screen").classList.remove("active");
      document.getElementById("os-selector").classList.add("active");
      return;
    }
  }

  // Usuarios registrados
  const users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");
  const found = users.find(u => u.username === user);
  if (found) {
    const inputHash = await sha256(pass);
    if (inputHash === found.hashedPass) {
      username = found.username;
      isAdmin = false;
      currentPath = ["home", username];
      fs = createInitialFS();
      saveState();
      document.getElementById("auth-screen").classList.remove("active");
      document.getElementById("os-selector").classList.add("active");
      return;
    }
  }

  document.getElementById("login-error").textContent = "Usuario o contraseña incorrectos";
});

document.getElementById("register-form").addEventListener("submit", async e => {
  e.preventDefault();

  const user = document.getElementById("reg-username").value.trim();
  const pass = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-password-confirm").value;

  if (user.length < 3) return document.getElementById("register-error").textContent = "El usuario debe tener al menos 3 caracteres";
  if (pass.length < 6) return document.getElementById("register-error").textContent = "La contraseña debe tener al menos 6 caracteres";
  if (pass !== confirm) return document.getElementById("register-error").textContent = "Las contraseñas no coinciden";

  const users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");

  if (users.some(u => u.username === user)) {
    return document.getElementById("register-error").textContent = "El usuario ya existe";
  }

  const hashed = await sha256(pass);
  users.push({ username: user, hashedPass: hashed });
  localStorage.setItem("webcmd_users", JSON.stringify(users));

  alert("¡Cuenta creada correctamente!\nAhora inicia sesión.");
  document.querySelector('.tab[data-tab="login"]').click();
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".form").forEach(f => f.classList.remove("active"));
    document.getElementById(tab.dataset.tab + "-form").classList.add("active");

    document.querySelectorAll(".error").forEach(e => e.textContent = "");
  });
});

// ── Selector OS y terminal ──
function selectOS(os) {
  currentOS = os;
  saveState();
  showTerminal();
}

function switchOS() {
  currentOS = currentOS === "linux" ? "windows" : "linux";
  saveState();
  showTerminal();
}

function logout() {
  localStorage.removeItem("webcmd_state");
  location.reload();
}

function showTerminal() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("terminal-screen").classList.add("active");

  document.getElementById("output").innerHTML = "";
  appendOutput(`<span style="color:#0a0">WebCMD v2026 — Sesión iniciada como ${username}${isAdmin ? " (ADMIN)" : ""}</span><br>`);
  appendOutput("Escribe 'help' para ver comandos disponibles.", "success");

  updatePrompt();

  const input = document.getElementById("command-input");
  input.focus();

  input.onkeydown = e => {
    if (e.key === "Enter") {
      const cmd = input.value.trim();
      if (cmd) {
        appendOutput(`<span style="color:#0f0">${document.getElementById("prompt").textContent}</span>${cmd}`);
        executeCommand(cmd);
      }
      input.value = "";
      historyIndex = commandHistory.length;
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) input.value = commandHistory[--historyIndex];
    }
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) input.value = commandHistory[++historyIndex];
      else { historyIndex = commandHistory.length; input.value = ""; }
    }
  };
}

// ── Inicio ──
loadState();
if (username) {
  showTerminal();
} else {
  document.getElementById("auth-screen").classList.add("active");
}
