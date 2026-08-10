// תמונת דוגמה ברירת מחדל במידה ולא הועלתה תמונה
const sampleImage = 'https://placehold.co/300x200/264653/ffffff?text=%D7%9E%D7%95%D7%93%D7%A2%D7%AA+%D7%93%D7%95%D7%92%D7%9E%D7%94';

// תרגום ז'אנר לעברית
function getGenreLabel(genre) {
  const genres = {
    'fantasy': 'פנטזיה ומד"ב',
    'history': 'היסטוריה ועיון',
    'children': 'ילדים ונוער',
    'romance': 'רומנטיקה',
    'romantasy': 'רומנטזי',
    'other': 'אחר'
  };
  return genres[genre] || 'כללי';
}

// יצירת כרטיס HTML
function createBookCardHTML(title, desc, price, imageUrl, genre, contact, location, docId) {
  const finalImage = imageUrl || sampleImage;

  return `
    <div class="book-card" data-title="${title}">
      <button class="delete-btn" title="מחק מודעה" onclick="deleteBook('${docId}', event)">🗑️</button>
      
      <div class="card-img-container">
        <span class="genre-tag">${getGenreLabel(genre)}</span>
        <img src="${finalImage}" alt="${title}" onerror="this.src='${sampleImage}'">
      </div>

      <div class="book-info">
        <h3>${title}</h3>
        <p class="description">מצב: ${desc}</p>
        <p class="location">📍 ${location}</p>
        <p class="contact">📞 ${contact}</p>
        
        <div class="card-footer">
          <span class="price">${price} ₪</span>
        </div>
      </div>
    </div>
  `;
}

// ניהול פתיחה וסגירה של חלונית המודאל
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('book-modal');
  const openBtn = document.getElementById('open-modal-btn');
  const closeBtn = document.querySelector('.close-modal');
  const fileInput = document.getElementById('form-image-file');
  const fileChosen = document.getElementById('file-chosen-text');

  // פתיחת המודאל
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }

  // סגירת המודאל בריבוע ה-X
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // סגירת המודאל בלחיצה מחוץ לטופס
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // הצגת שם הקובץ שנבחר
  if (fileInput && fileChosen) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        fileChosen.textContent = 'קובץ נבחר: ' + this.files[0].name;
      } else {
        fileChosen.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';
      }
    });
  }

  // טעינה והאזנה לשינויים בזמן אמת מ-Firebase
  const bookContainer = document.querySelector('.book-container');
  const checkFirebase = setInterval(() => {
    if (window.db && window.dbFunctions) {
      clearInterval(checkFirebase);
      
      const booksRef = window.dbFunctions.collection(window.db, 'books');
      
      window.dbFunctions.onSnapshot(booksRef, (snapshot) => {
        if (!bookContainer) return;
        bookContainer.innerHTML = '';
        
        if (snapshot.empty) {
          bookContainer.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">עדיין אין מודעות. הי הראשון להוסיף ספר!</p>';
          return;
        }

        snapshot.forEach((docSnap) => {
          const book = docSnap.data();
          const id = docSnap.id;
          const bookHTML = createBookCardHTML(
            book.title,
            book.desc,
            book.price,
            book.imageUrl,
            book.genre,
            book.contact,
            book.location,
            id
          );
          bookContainer.insertAdjacentHTML('beforeend', bookHTML);
        });
      });
    }
  }, 100);
});

// טיפול בטופס הוספת ספר
const bookForm = document.getElementById('add-book-form');
if (bookForm) {
  bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('form-title').value;
    const desc = document.getElementById('form-desc').value;
    const price = document.getElementById('form-price').value;
    const genre = document.getElementById('form-genre').value;
    const contact = document.getElementById('form-contact').value;
    const location = document.getElementById('form-location').value;

    try {
      const booksRef = window.dbFunctions.collection(window.db, 'books');
      await window.dbFunctions.addDoc(booksRef, {
        title,
        desc,
        price,
        imageUrl: '', // כרגע ללא תמונה עד שנוסיף מנגנון העלאת תמונות מלא
        genre,
        contact,
        location,
        createdAt: new Date()
      });

      bookForm.reset();
      const fileChosenText = document.getElementById('file-chosen-text');
      if (fileChosenText) fileChosenText.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';

      const modal = document.getElementById('book-modal');
      if (modal) modal.style.display = 'none';

      alert('המודעה נוספה בהצלחה בענן!');
    } catch (error) {
      console.error('שגיאה בהוספת המודעה:', error);
      alert('ייתה שגיאה בהוספת המודעה, נסי שוב.');
    }
  });
}

// פונקציית מחיקה מ-Firebase
async function deleteBook(docId, event) {
  event.stopPropagation();
  if (confirm('האם את בטוחה שברצונך למחוק מודעה זו?')) {
    try {
      const docRef = window.dbFunctions.doc(window.db, 'books', docId);
      await window.dbFunctions.deleteDoc(docRef);
    } catch (error) {
      console.error('שגיאה במחיקה:', error);
      alert('לא ניתן היה למחוק את המודעה.');
    }
  }
}
