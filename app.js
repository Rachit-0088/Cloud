console.log("🔥 app.js loaded");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDw-p2CTxnmj0AYLVgXLqs9YsbNA63mbds",
  authDomain: "clou-b6073.firebaseapp.com",
  projectId: "clou-b6073",
  storageBucket: "clou-b6073.firebasestorage.app",
  messagingSenderId: "394946045746",
  appId: "1:394946045746:web:b857468297dcb51021d92b",
  measurementId: "G-WSE57K4TYV"
};

// Initialize Firebase once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- Глобальные элементы ---
const messageForm = document.getElementById("messageForm");
const tbody = document.getElementById("messageTableBody");
const emptyState = document.getElementById("emptyState"); // ❗️ Добавлено

/**
 * Функция для добавления строки в таблицу.
 * @param {object} data - Данные сообщения (to, text, scheduledAt, sent)
 * @param {string} docId - ID документа из Firestore
 */
function addRowToTable(data, docId) {
  const scheduledDate = new Date(
    data.scheduledAt?.seconds
      ? data.scheduledAt.seconds * 1000
      : data.scheduledAt.toDate() // ❗️ Используйте .toDate() для Timestamp
  );

  const row = document.createElement("tr");
  row.setAttribute("data-id", docId); // Сохраняем ID для удаления

  // Определяем статус
  const now = new Date();
  let statusText = "Upcoming";
  let statusClass = "badge-upcoming";

  if (data.sent) {
    statusText = "Sent";
    statusClass = "badge-sent";
  } else if (scheduledDate < now) {
    statusText = "Processing"; // Если время прошло, но 'sent' еще false
    statusClass = "badge-processing"; // (Добавьте этот класс в CSS, если хотите)
  }

  // ❗️ ИСПРАВЛЕНО: Добавлено 5 ячеек (<td>), включая статус
  row.innerHTML = `
    <td>${data.to}</td>
    <td>${data.text}</td>
    <td>${scheduledDate.toLocaleString()}</td>
    <td><span class="badge ${statusClass}">${statusText}</span></td>
    <td>
      <button class="btn btn-sm btn-danger action-btn" onclick="deleteMessage('${docId}')">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
  checkEmptyState(); // ❗️ Проверяем, пуста ли таблица
}

/**
 * ❗️ НОВАЯ ФУНКЦИЯ: Показывает/скрывает "empty state"
 */
function checkEmptyState() {
  if (tbody.rows.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }
}

/**
 * ❗️ НОВАЯ ФУНКЦИЯ: Удаляет сообщение из Firestore и из таблицы
 * @param {string} docId - ID документа для удаления
 */
window.deleteMessage = function (docId) {
  // Используем Bootstrap Modal для подтверждения
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  const confirmButton = document.getElementById('confirmAction');
  
  // Показываем модальное окно
  confirmModal.show();

  // ❗️ Важно: Назначаем обработчик один раз и удаляем его
  confirmButton.onclick = () => {
    db.collection("scheduledMessages").doc(docId).delete()
      .then(() => {
        console.log("✅ Message deleted from Firestore");
        // Удаляем строку из HTML
        const row = document.querySelector(`tr[data-id="${docId}"]`);
        if (row) {
          row.remove();
        }
        checkEmptyState(); // ❗️ Проверяем, пуста ли таблица
        confirmModal.hide(); // Скрываем модальное окно
      })
      .catch((error) => {
        console.error("❌ Error deleting message:", error);
        confirmModal.hide();
      });
  };
};

// --- Обработчики событий ---
document.addEventListener("DOMContentLoaded", () => {
  // Загружаем существующие сообщения при загрузке страницы
  // ❗️ Используем onSnapshot для обновлений в реальном времени
  db.collection("scheduledMessages")
    .orderBy("scheduledAt", "desc") // Сортируем (по желанию)
    .onSnapshot((querySnapshot) => {
      // Очищаем таблицу перед обновлением
      tbody.innerHTML = ""; 
      querySnapshot.forEach((doc) => {
        addRowToTable(doc.data(), doc.id); // Передаем данные и ID
      });
      checkEmptyState(); // ❗️ Проверяем при загрузке
    }, (error) => {
      console.error("❌ Error fetching scheduled messages:", error);
    });

  // Обработчик отправки формы
  messageForm.addEventListener("submit", function (e) {
    e.preventDefault();
    console.log("✅ Form submitted");

    const recipient = document.getElementById("recipient").value.trim();
    const message = document.getElementById("message").value.trim();
    const schedule = document.getElementById("schedule").value;

    console.log("📩 Data:", { recipient, message, schedule });

    if (!recipient || !message || !schedule) {
      alert("Please fill out all fields.");
      return;
    }

    const dataToSave = {
      to: recipient,
      text: message,
      scheduledAt: firebase.firestore.Timestamp.fromDate(new Date(schedule)), // ❗️ Сохраняем как Timestamp
      subject: "Scheduled Message",
      sent: false
    };

    db.collection("scheduledMessages").add(dataToSave)
      .then((docRef) => { // ❗️ ИСПРАВЛЕНО: Получаем docRef
        console.log("📦 Message saved to Firestore with ID:", docRef.id);
        // Нам больше не нужно вручную добавлять строку, onSnapshot сделает это!
        // addRowToTable(dataToSave, docRef.id); 
        this.reset();
      })
      .catch((error) => {
        console.error("❌ Firestore Error:", error);
      });
  });


  checkEmptyState();
});

