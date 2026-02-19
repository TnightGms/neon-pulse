// script.js

// =============================================
// CONFIGURACIÓN EMAILJS (ya con tus claves)
const EMAILJS_SERVICE_ID  = "service_fdgeqz1";
const EMAILJS_TEMPLATE_ID = "template_y60zk9a";
const EMAILJS_PUBLIC_KEY  = "fzj5FvbnNDdda4Keq";

emailjs.init(EMAILJS_PUBLIC_KEY);
// =============================================

let isAdmin = false;
let username = "";
let currentOS = "linux";
let currentPath = [];
let commandHistory = [];
let historyIndex = -1;
let fs = null;
let verificationCode = "";
let pendingRegistration = null;

const ADMIN_USER = "tnight";
const ADMIN_PASS_ENCODED = "QW5jb3IyODk=";

const fortunes = [
  "La noche es joven... y tú también lo eres en esta terminal.",
  "Error 404: vida social no encontrada.",
  "Estás a solo un 'reboot' de empezar de nuevo."
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
              "welcome.txt": { type: "file", content: `Bienvenid@ ${username || "invitado"}!\nEscribe help para ver comandos.` }
            }
          }
        }
      }
    }
  };
}

function loadState() { /* ... mismo que antes ... */ }
function saveState() { /* ... mismo que antes ... */ }
function getCurrentDir() { /* ... mismo que antes ... */ }
function updatePrompt() { /* ... mismo que antes ... */ }
function append(text, cls = "") { /* ... mismo que antes ... */ }

// =============================================
// REGISTRO + VERIFICACIÓN REAL
// =============================================

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

  const regUsername = document.getElementById("reg-username").value.trim();
  const regEmail    = document.getElementById("reg-email").value.trim();
  const regPass     = document.getElementById("reg-password").value;

  if (regUsername.length < 3) return alert("El usuario debe tener al menos 3 caracteres");
  if (!regEmail.includes("@")) return alert("Correo inválido");

  pendingRegistration = { username: regUsername, email: regEmail, password: regPass };

  verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      username: regUsername,
      code: verificationCode,
      email: regEmail
    });

    document.getElementById("sent-email").textContent = regEmail;
    document.getElementById("email-username").textContent = regUsername;
    document.getElementById("shown-code").textContent = verificationCode; // para pruebas

    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("email-confirm-screen").classList.add("active");

  } catch (err) {
    console.error(err);
    alert("No se pudo enviar el correo. Revisa la consola o las claves de EmailJS.");
  }
});

function verifyCode() {
  const inputCode = document.getElementById("verify-code-input").value.trim();

  if (inputCode === verificationCode) {
    // Guardamos la cuenta como verificada
    let users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");
    users.push({
      username: pendingRegistration.username,
      password: pendingRegistration.password, // ¡En producción nunca guardes contraseña en claro!
      email: pendingRegistration.email,
      verified: true
    });
    localStorage.setItem("webcmd_users", JSON.stringify(users));

    alert("¡Cuenta verificada y activada! Ahora puedes iniciar sesión.");

    showLogin();
  } else {
    alert("Código incorrecto. Inténtalo de nuevo.");
  }
}

// =============================================
// LOGIN
// =============================================

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;

  // Admin especial
  if (user === ADMIN_USER && btoa(pass) === ADMIN_PASS_ENCODED) {
    username = ADMIN_USER;
    isAdmin = true;
    currentPath = ["home", username];
    fs = createInitialFS();
    saveState();
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("os-selector").classList.add("active");
    return;
  }

  // Usuarios registrados
  let users = JSON.parse(localStorage.getItem("webcmd_users") || "[]");
  const found = users.find(u => u.username === user && u.password === pass && u.verified);

  if (found) {
    username = found.username;
    isAdmin = false;
    currentPath = ["home", username];
    fs = createInitialFS();
    saveState();
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("os-selector").classList.add("active");
  } else {
    document.getElementById("login-error").textContent = "Usuario/contraseña incorrectos o cuenta no verificada";
  }
});

// =============================================
// Resto: selectOS, switchOS, logout, comandos...
// (copia aquí las funciones que ya tenías: showTerminal, executeCommand, cd, cat, mkdir, etc.)
// =============================================

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

// Iniciar
if (localStorage.getItem("webcmd_state")) {
  loadState();
  if (username) showTerminal();
} else {
  document.getElementById("login-screen").classList.add("active");
}
