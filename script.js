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
        
        <div class="card-footer">
          <span class="price">${price} ₪</span>
          <a href="book-details.html?title=${encodeURIComponent(title)}" class="details-btn">צפה בפרטים</a>
        </div>
      </div>
    </div>
  `;
}

// טעינה והאזנה לשינויים בזמן אמת מ-Firebase
window.addEventListener('DOMContentLoaded', () => {
  const bookContainer = document.querySelector('.book-container');

  // בדיקה שהתחברנו ל-Firebase בהצלחה
  const checkFirebase = setInterval(() => {
    if (window.db && window.dbFunctions) {
      clearInterval(checkFirebase);
      
      const booksRef = window.dbFunctions.collection(window.db, 'books');
      
      // האזנה בזמן אמת להוספה/מחיקה של ספרים
      window.dbFunctions.onSnapshot(booksRef, (snapshot) => {
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

    const title = document.getElementById('book-title').value;
    const desc = document.getElementById('book-desc').value;
    const price = document.getElementById('book-price').value;
    const imageUrl = document.getElementById('book-image').value;
    const genre = document.getElementById('book-genre').value;
    const contact = document.getElementById('book-contact').value;
    const location = document.getElementById('book-location').value;

    try {
      const booksRef = window.dbFunctions.collection(window.db, 'books');
      await window.dbFunctions.addDoc(booksRef, {
        title,
        desc,
        price,
        imageUrl,
        genre,
        contact,
        location,
        createdAt: new Date()
      });

      bookForm.reset();
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