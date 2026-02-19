let isAdmin = false;
let username = "guest";
let currentOS = "linux";
let currentPath = ["home", "guest"];
let commandHistory = [];
let historyIndex = -1;
let fs = null;

const ADMIN_USER = "tnight";
const ADMIN_PASS = "Ancor289";

const initialFS = {
  type: "dir",
  children: { home: { type: "dir", children: {} } }
};

function loadState() {
  const saved = localStorage.getItem("webcmd_state");
  if (saved) {
    const data = JSON.parse(saved);
    isAdmin = data.isAdmin || false;
    username = data.username || "guest";
    currentOS = data.currentOS || "linux";
    currentPath = data.currentPath || ["home", username];
    commandHistory = data.commandHistory || [];
    fs = data.fs ? JSON.parse(data.fs) : JSON.parse(JSON.stringify(initialFS));
  } else {
    resetFS();
  }
}

function resetFS() {
  fs = JSON.parse(JSON.stringify(initialFS));
  if (!fs.children.home.children[username]) {
    fs.children.home.children[username] = {
      type: "dir",
      children: {
        "welcome.txt": { type: "file", content: `¡Bienvenido ${username}!\nEscribe 'help' para ver los comandos.` }
      }
    };
  }
}

function saveState() {
  localStorage.setItem("webcmd_state", JSON.stringify({
    isAdmin, username, currentOS, currentPath, commandHistory,
    fs: JSON.stringify(fs)
  }));
}

function getCurrentDir() {
  let dir = fs;
  for (let p of currentPath) {
    if (dir.children && dir.children[p]) dir = dir.children[p];
  }
  return dir;
}

function getPathString() {
  return currentPath.length ? "/" + currentPath.join("/") : "/";
}

function getWinPath() {
  return `C:\\Users\\${username}` + (currentPath.length > 1 ? "\\" + currentPath.slice(2).join("\\") : "");
}

function updatePrompt() {
  const promptEl = document.getElementById("prompt");
  const input = document.getElementById("command-input");
  if (currentOS === "linux") {
    promptEl.textContent = `${username}@webcmd:${getPathString()}$ `;
    input.classList.remove("windows");
  } else {
    promptEl.textContent = `${getWinPath()}> `;
    input.classList.add("windows");
  }
  document.getElementById("terminal-title").textContent = `WebCMD • ${username}${isAdmin ? " (ADMIN)" : ""}`;
}

function appendOutput(text, className = "") {
  const output = document.getElementById("output");
  const line = document.createElement("div");
  line.innerHTML = text.replace(/\n/g, "<br>");
  if (className) line.className = className;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function executeCommand(cmd) {
  if (!cmd.trim()) return;
  commandHistory.push(cmd);
  historyIndex = commandHistory.length;
  saveState();

  const args = cmd.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  let output = "";

  if (command === "clear" || command === "cls") {
    document.getElementById("output").innerHTML = "";
    return;
  }
  if (command === "help") {
    output = currentOS === "linux" 
      ? "ls, cd, pwd, cat, mkdir, touch, rm, echo, neofetch, whoami, date, help, clear"
      : "dir, cd, type, mkdir, del, echo, systeminfo, whoami, date, help, cls";
  } else if (command === "whoami") {
    output = username + (isAdmin ? " (admin)" : "");
  } else if (command === "date") {
    output = new Date().toString();
  } else if (command === "exit") {
    logout();
    return;
  } else if (currentOS === "linux") {
    if (command === "ls") output = Object.keys(getCurrentDir().children || {}).join("  ");
    else if (command === "pwd") output = getPathString();
    else if (command === "cd") output = changeDir(args[1] || "");
    else if (command === "cat") output = readFile(args[1]);
    else if (command === "mkdir") output = makeDir(args[1]);
    else if (command === "touch") output = touchFile(args[1]);
    else if (command === "rm") output = removeItem(args[1]);
    else if (command === "neofetch") output = `tnight@webcmd\nOS: WebCMD Linux\nShell: bash\n`;
    else output = `bash: ${command}: comando no encontrado`;
  } else { // windows
    if (command === "dir") {
      output = Object.keys(getCurrentDir().children || {}).map(k => 
        getCurrentDir().children[k].type === "dir" ? `<span style="color:#00f">${k}</span>` : k
      ).join("\n");
    } else if (command === "cd") output = changeDir(args[1] || "");
    else if (command === "type") output = readFile(args[1]);
    else if (command === "mkdir") output = makeDir(args[1]);
    else if (command === "del") output = removeItem(args[1]);
    else if (command === "systeminfo") output = "Host: WEBC MD-2026\nOS: WebCMD Windows Simulator";
    else output = `'${command}' no se reconoce como comando interno o externo.`;
  }

  appendOutput(output || "Comando ejecutado.", output.includes("no ") || output.includes("no se") ? "error-line" : "success-line");
}

function changeDir(target) {
  if (!target || target === "~") { currentPath = ["home", username]; return ""; }
  if (target === "..") { if (currentPath.length > 1) currentPath.pop(); return ""; }
  if (target === "/") { currentPath = ["home", username]; return ""; }

  const dir = getCurrentDir();
  if (dir.children && dir.children[target] && dir.children[target].type === "dir") {
    currentPath.push(target);
    return "";
  }
  return currentOS === "linux" ? "cd: no such file or directory" : "El sistema no puede encontrar la ruta especificada.";
}

function readFile(name) {
  const dir = getCurrentDir();
  if (dir.children && dir.children[name] && dir.children[name].type === "file") {
    return dir.children[name].content || "(archivo vacío)";
  }
  return currentOS === "linux" ? `cat: ${name}: No such file or directory` : "El sistema no puede encontrar el archivo especificado.";
}

function makeDir(name) {
  if (!name) return "Falta nombre de carpeta";
  const dir = getCurrentDir();
  if (!dir.children) dir.children = {};
  if (dir.children[name]) return "Ya existe";
  dir.children[name] = { type: "dir", children: {} };
  saveState();
  return "";
}

function touchFile(name) {
  if (!name) return "Falta nombre de archivo";
  const dir = getCurrentDir();
  if (!dir.children) dir.children = {};
  if (!dir.children[name]) dir.children[name] = { type: "file", content: "" };
  saveState();
  return "";
}

function removeItem(name) {
  if (!name) return "Falta nombre";
  const dir = getCurrentDir();
  if (dir.children && dir.children[name]) {
    delete dir.children[name];
    saveState();
    return "";
  }
  return currentOS === "linux" ? "rm: cannot remove" : "No se pudo encontrar";
}

function showTerminal() {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("terminal-screen").classList.add("active");
  updatePrompt();

  const output = document.getElementById("output");
  output.innerHTML = `<span style="color:#0a0">WebCMD v2026 — Sesión como ${username}${isAdmin ? " (ADMIN)" : ""}</span><br><br>`;
  appendOutput("Escribe 'help' para ver comandos.", "success-line");

  const input = document.getElementById("command-input");
  input.focus();

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.trim();
      if (cmd) {
        appendOutput(`<span style="color:#0f0">${document.getElementById("prompt").textContent}</span>${cmd}`);
        executeCommand(cmd);
      }
      input.value = "";
      historyIndex = commandHistory.length;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) input.value = commandHistory[--historyIndex];
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) input.value = commandHistory[++historyIndex];
      else { historyIndex = commandHistory.length; input.value = ""; }
    }
  };
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    isAdmin = true;
    username = ADMIN_USER;
    saveState();
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("os-selector").classList.add("active");
  } else {
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("username-picker").classList.add("active");
  }
});

function setCustomUsername() {
  let custom = document.getElementById("custom-username").value.trim();
  if (!custom) custom = "guest-" + Math.floor(Math.random()*999);
  username = custom.replace(/[^a-zA-Z0-9_-]/g, '');
  isAdmin = false;
  resetFS();
  saveState();
  document.getElementById("username-picker").classList.remove("active");
  document.getElementById("os-selector").classList.add("active");
}

function selectOS(os) {
  currentOS = os;
  saveState();
  showTerminal();
}

function switchOS() {
  currentOS = currentOS === "linux" ? "windows" : "linux";
  saveState();
  document.getElementById("output").innerHTML = "";
  appendOutput(`Cambiado a ${currentOS.toUpperCase()} mode`, "success-line");
  updatePrompt();
}

function logout() {
  localStorage.removeItem("webcmd_state");
  location.reload();
}

// Iniciar
loadState();
if (username === "guest" && !isAdmin) {
  document.getElementById("login-screen").classList.add("active");
} else if (username !== "guest") {
  showTerminal();
}
