// === TUS CLAVES EMAILJS ===
const EMAILJS_SERVICE_ID  = "service_fdgeqz1";
const EMAILJS_TEMPLATE_ID = "template_y60zk9a";
const EMAILJS_PUBLIC_KEY  = "fzj5FvbnNDdda4Keq";

emailjs.init(EMAILJS_PUBLIC_KEY);

// Variables globales
let isAdmin = false;
let username = "";
let currentOS = "linux";
let currentPath = [];
let commandHistory = [];
let historyIndex = -1;
let fs = null;
let verificationCode = "";
let pendingUser = null;

const ADMIN_USER = "tnight";
const ADMIN_PASS_ENCODED = "QW5jb3IyODk=";

// Hash simple pero efectivo para frontend
function hashPassword(pass) {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// FS básico
function createInitialFS() {
  return {
    type: "dir",
    children: {
      home: {
        type: "dir",
        children: {
          [username || "guest"]: {
            type: "dir",
            children: { "welcome.txt": { type: "file", content: `Bienvenid@ ${username}! Escribe help.` }}
          }
        }
      }
    }
  };
}

function saveState() {
  localStorage.setItem("webcmd_state", JSON.stringify({ isAdmin, username, currentOS, currentPath, commandHistory, fs: JSON.stringify(fs) }));
}

function loadState() {
  const saved = localStorage.getItem("webcmd_state");
  if (saved) {
    const d = JSON.parse(saved);
    isAdmin = d.isAdmin || false;
    username = d.username || "";
    currentOS = d.currentOS || "linux";
    currentPath = d.currentPath || ["home", username || "guest"];
    commandHistory = d.commandHistory || [];
    fs = d.fs ? JSON.parse(d.fs) : createInitialFS();
  }
}

// Prompt y salida
function updatePrompt() {
  const p = document.getElementById("prompt");
  const input = document.getElementById("command-input");
  if (currentOS === "linux") {
    p.textContent = `${username}@webcmd:${currentPath.length ? "/" + currentPath.join("/") : "/"} $ `;
  } else {
    p.textContent = `C:\\Users\\${username}> `;
    input.classList.add("windows");
  }
  document.getElementById("terminal-title").textContent = `WebCMD • ${username}${isAdmin ? " (ADMIN)" : ""}`;
}

function append(text, cls = "") {
  const out = document.getElementById("output");
  const line = document.createElement("div");
  line.innerHTML = text.replace(/\n/g, "<br>");
  if (cls) line.className = cls;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

// ====================== COMANDOS COMPLETOS ======================
function executeCommand(cmd) {
  if (!cmd.trim()) return;
  commandHistory.push(cmd);
  saveState();

  const args = cmd.trim().split(/\s+/);
  const c = args[0].toLowerCase();
  let out = "";

  if (c === "clear" || c === "cls") { document.getElementById("output").innerHTML = ""; return; }
  if (c === "help") {
    out = currentOS === "linux" 
      ? "ls cd pwd cat mkdir touch rm echo history clear whoami date uptime fortune ifconfig tree reboot nano ping help"
      : "dir cd type mkdir del echo history cls whoami date ver ipconfig tree reboot systeminfo ping help";
  }
  else if (c === "echo") out = args.slice(1).join(" ");
  else if (c === "history") out = commandHistory.map((v,i) => `${i+1}. ${v}`).join("\n");
  else if (c === "whoami") out = username + (isAdmin ? " (ADMIN)" : "");
  else if (c === "date") out = new Date().toLocaleString();
  else if (c === "uptime") out = "Uptime: Siempre encendido desde 2026";
  else if (c === "fortune") out = ["La noche es joven", "Error 404: vida social no encontrada", "Hoy es un buen día para hackear"][Math.floor(Math.random()*3)];
  else if (c === "reboot") { append("Reiniciando sistema..."); setTimeout(() => location.reload(), 1200); return; }
  else if ((c === "ifconfig" && currentOS==="linux") || (c === "ipconfig" && currentOS==="windows")) out = "IP: 192.168.1.42\nMAC: AA-BB-CC-DD-EE-FF";
  else if (c === "ver" && currentOS==="windows") out = "WebCMD Windows Simulator v11.2026";
  else if (c === "systeminfo" && currentOS==="windows") out = "Host: WEBC MD-2026\nOS: WebCMD Simulator";
  else if (c === "tree") out = ".\n└── home\n    └── " + username + "\n        └── welcome.txt";
  else if (c === "ping") out = "PING 8.8.8.8: 42 bytes, tiempo <1ms, TTL=128";
  else if (c === "nano") out = args[1] ? `Abriendo ${args[1]}... (simulado)` : "nano: falta archivo";

  // Comandos del sistema de archivos
  else if (currentOS === "linux") {
    if (c === "ls") out = Object.keys(getCurrentDir().children || {}).join("  ");
    else if (c === "pwd") out = "/" + currentPath.join("/");
    else if (c === "cd") out = cd(args[1]);
    else if (c === "cat") out = cat(args[1]);
    else if (c === "mkdir") out = mkdir(args[1]);
    else if (c === "touch") out = touch(args[1]);
    else if (c === "rm") out = rm(args[1]);
    else out = `bash: ${c}: comando no encontrado`;
  } else {
    if (c === "dir") out = Object.keys(getCurrentDir().children || {}).join("\n");
    else if (c === "cd") out = cd(args[1]);
    else if (c === "type") out = cat(args[1]);
    else if (c === "mkdir") out = mkdir(args[1]);
    else if (c === "del") out = rm(args[1]);
    else out = `'${c}' no se reconoce como comando`;
  }

  append(`<span style="color:#0f0">${document.getElementById("prompt").textContent}</span>${cmd}`);
  append(out || "Comando ejecutado.", out.includes("no ") ? "error-line" : "");
}

// Funciones FS
function getCurrentDir() { let dir = fs; for (let p of currentPath) if (dir.children?.[p]) dir = dir.children[p]; return dir; }
function cd(target) {
  if (!target || target === "~" || target === "/") { currentPath = ["home", username]; return ""; }
  if (target === "..") { if (currentPath.length > 1) currentPath.pop(); return ""; }
  const dir = getCurrentDir();
  if (dir.children?.[target]?.type === "dir") { currentPath.push(target); return ""; }
  return "No existe";
}
function cat(file) { return getCurrentDir().children?.[file]?.content || "Archivo no encontrado"; }
function mkdir(name) { if (!name) return "Falta nombre"; const dir = getCurrentDir(); if (!dir.children[name]) dir.children[name] = {type:"dir", children:{}}; saveState(); return ""; }
function touch(name) { if (!name) return "Falta nombre"; const dir = getCurrentDir(); if (!dir.children[name]) dir.children[name] = {type:"file", content:""}; saveState(); return ""; }
function rm(name) { if (!name) return "Falta nombre"; const dir = getCurrentDir(); if (dir.children[name]) { delete dir.children[name]; saveState(); return ""; } return "No encontrado"; }

// ====================== TERMINAL ======================
function showTerminal() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("terminal-screen").classList.add("active");
  document.getElementById("output").innerHTML = "";
  append(`<span style="color:#0a0">WebCMD 2026 — Sesión: ${username}${isAdmin ? " (ADMIN)" : ""}</span><br>`);
  append("Escribe 'help' para ver todos los comandos");
  updatePrompt();

  const input = document.getElementById("command-input");
  input.focus();
  input.onkeydown = e => {
    if (e.key === "Enter") { executeCommand(input.value.trim()); input.value = ""; }
    if (e.key === "ArrowUp" && historyIndex > 0) input.value = commandHistory[--historyIndex];
    if (e.key === "ArrowDown") {
      if (historyIndex < commandHistory.length - 1) input.value = commandHistory[++historyIndex];
      else { historyIndex = commandHistory.length; input.value = ""; }
    }
  };
}

// ====================== REGISTRO Y VERIFICACIÓN ======================
function showRegister() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("register-screen").classList.add("active");
}

function showLogin() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("login-screen").classList.add("active");
}

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-password").value;

  if (u.length < 3) return alert("Usuario muy corto");
  if (!email.includes("@")) return alert("Correo inválido");

  pendingUser = { username: u, email, hashedPass: hashPassword(pass) };

  verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { username: u, code: verificationCode, email: email });
    document.getElementById("sent-email").textContent = email;
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("email-confirm-screen").classList.add("active");
  } catch (err) {
    alert("Error enviando correo. Revisa consola (F12)");
    console.error(err);
  }
});

function verifyCode() {
  const input = document.getElementById("verify-code-input").value.trim();
  if (input === verificationCode) {
    let users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");
    users.push(pendingUser);
    localStorage.setItem("webcmd_users", JSON.stringify(users));
    alert("¡Cuenta verificada correctamente! Ya puedes iniciar sesión.");
    showLogin();
  } else {
    alert("Código incorrecto");
  }
}

// Login
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;

  if (user === ADMIN_USER && btoa(pass) === ADMIN_PASS_ENCODED) {
    username = ADMIN_USER; isAdmin = true;
  } else {
    let users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");
    const found = users.find(u => u.username === user && u.hashedPass === hashPassword(pass));
    if (!found) return document.getElementById("login-error").textContent = "Usuario o contraseña incorrectos";
    username = found.username; isAdmin = false;
  }

  currentPath = ["home", username];
  fs = createInitialFS();
  saveState();
  document.getElementById("login-screen").classList.remove("active");
  document.getElementById("os-selector").classList.add("active");
});

function selectOS(os) { currentOS = os; saveState(); showTerminal(); }
function switchOS() { currentOS = currentOS === "linux" ? "windows" : "linux"; saveState(); showTerminal(); }
function logout() { localStorage.removeItem("webcmd_state"); location.reload(); }

// Iniciar
loadState();
if (username) showTerminal();
else document.getElementById("login-screen").classList.add("active");
