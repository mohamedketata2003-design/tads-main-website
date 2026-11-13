// script.js — Admin panel (Firebase v11)
// Original file, fixed only for syntax errors

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, onSnapshot, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ----------- Firebase config -----------
const firebaseConfig = {
  apiKey: "AIzaSyCogv-v2t8OoiFKKNF30dfwMVKNJhAvjSw",
  authDomain: "tads-d14eb.firebaseapp.com",
  projectId: "tads-d14eb",
  storageBucket: "tads-d14eb.firebasestorage.app",
  messagingSenderId: "396988261378",
  appId: "1:396988261378:web:4f195d2821e142af24731b",
  measurementId: "G-SSKPX7D6W4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// debug helper
const dbg = (...args) => console.log('[admin.js]', ...args);

// ---------- UTIL: Cloudinary upload ----------
async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/difk7ovvp/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', 'TADS.tn');
  const res = await fetch(url, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  return data.secure_url;
}

// ---------- AUTH: login button ----------
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (!email || !password) return alert('Veuillez saisir email et mot de passe.');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      document.getElementById('errorMsg') && (document.getElementById('errorMsg').innerText = 'Email ou mot de passe incorrect.');
      dbg('login error', err);
    }
  });
}

// ---------- AUTH STATE + ADMIN CHECK ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    dbg('No user');
    if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('admin-')) {
      window.location.href = 'admin-login.html';
    }
    return;
  }
  dbg('Signed in as', user.uid, user.email);

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (!adminDoc.exists()) {
      alert('Compte non autorisé. Contactez un super-admin.');
      await signOut(auth);
      window.location.href = 'admin-login.html';
      return;
    }
  } catch (err) {
    dbg('admin check error', err);
    await signOut(auth);
    window.location.href = 'admin-login.html';
    return;
  }

  const adminEmailEl = document.getElementById('admin-email');
  if (adminEmailEl) adminEmailEl.textContent = user.email || user.uid;

  startAdminListeners();
});

// logout
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) btnLogout.addEventListener('click', async () => { await signOut(auth); window.location.href = 'admin-login.html'; });

// ---------- ADMIN LISTENERS ----------
function startAdminListeners() {
  dbg('Starting admin listeners');

  const participantsList = document.getElementById('participants-list');
  if (participantsList) {
    const q = query(collection(db, 'participants'), orderBy('createdAt'));
    onSnapshot(q, (snap) => {
      participantsList.innerHTML = '';
      snap.forEach(d => {
        const data = d.data();
        const li = document.createElement('li');
        li.className = 'participant-item';
        li.innerHTML = `
          <div class="p-item">
            <b>${data.name || '—'}</b><br>
            <span>${data.email || '—'}</span><br>
            ${data.image ? `<img src="${data.image}" class="p-img">` : ''}
            <button class="btnDelete" data-id="${d.id}">Delete</button>
          </div>
        `;
        participantsList.appendChild(li);
      });
      participantsList.querySelectorAll('.btnDelete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Supprimer ce participant ?')) return;
          try { await deleteDoc(doc(db, 'participants', id)); }
          catch (err) { dbg('delete participant error', err); alert('Erreur'); }
        });
      });
    }, (err) => dbg('participants snapshot error', err));
  }

  const adminEventsContainer = document.getElementById('admin-events-list');
  if (adminEventsContainer) {
    const q = query(collection(db, 'events'), orderBy('date'));
    onSnapshot(q, (snap) => {
      adminEventsContainer.innerHTML = '';
      snap.forEach(d => {
        const ev = { id: d.id, ...d.data() };
        const div = document.createElement('div');
        div.className = 'admin-event';
        div.innerHTML = `
          <h4>${ev.title || '—'}</h4>
          <p>${ev.date || '—'} — ${ev.location || ''}</p>
          <div class="admin-event-actions">
            <button data-id="${ev.id}" class="btnDeleteEvent">Delete</button>
          </div>
        `;
        adminEventsContainer.appendChild(div);
      });
      adminEventsContainer.querySelectorAll('.btnDeleteEvent').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Supprimer cet événement ?')) return;
          try { await deleteDoc(doc(db, 'events', id)); }
          catch (err) { dbg('delete event error', err); alert('Erreur'); }
        });
      });
    }, (err) => dbg('admin events snapshot error', err));
  }
}

// ---------- ADMIN: Add Event (with Cloudinary) ----------
const addEventBtn = document.getElementById('addEventBtn');
if (addEventBtn) {
  addEventBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const title = document.getElementById('evTitle')?.value || '';
    const description = document.getElementById('evDesc')?.value || '';
    const date = document.getElementById('evDate')?.value || '';
    const location = document.getElementById('evLocation')?.value || '';
    const link = document.getElementById('evLink')?.value || '';
    const file = document.getElementById('evImage')?.files?.[0];

    if (!title || !description || !date) return alert('Veuillez remplir les champs obligatoires.');
    if (!file) return alert('Choisissez une image.');

    try {
      addEventBtn.disabled = true;
      addEventBtn.innerText = 'Uploading...';

      const imageURL = await uploadToCloudinary(file);
      await addDoc(collection(db, 'events'), {
        title, description, date, location, link,
        imageURL, createdAt: Date.now()
      });

      alert('Événement ajouté !');
      document.getElementById('evTitle') && (document.getElementById('evTitle').value = '');
      document.getElementById('evDesc') && (document.getElementById('evDesc').value = '');
      document.getElementById('evDate') && (document.getElementById('evDate').value = '');
      document.getElementById('evImage') && (document.getElementById('evImage').value = '');
    } catch (err) {
      dbg('add event error', err);
      alert('Erreur lors de l\'ajout de l\'événement.');
    } finally {
      addEventBtn.disabled = false;
      addEventBtn.innerText = 'Ajouter';
    }
  });
}
const fadeElements = document.querySelectorAll('.fade');

function revealOnScroll() {
  fadeElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      el.classList.add('show');
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);



document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('.nav-wrap');
  // NOTE: Change this value to the measured height of your header (e.g., 60)
  const headerHeight = 60; 
  
  let lastScrollY = window.scrollY; // Tracks previous scroll position

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // 1. Check if the user is scrolling DOWN
    // We also check that they have scrolled past the header initially to avoid hiding it immediately
    if (currentScrollY > lastScrollY && currentScrollY > headerHeight) {
      header.classList.add('hidden');
    } 
    
    // 2. Check if the user is scrolling UP
    else if (currentScrollY < lastScrollY) {
      header.classList.remove('hidden');
    }

    // Update the last scroll position for the next check
    lastScrollY = currentScrollY;
  });
});