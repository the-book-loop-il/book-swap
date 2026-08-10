// הגדרות ההתחברות ל-Supabase (שינינו את שם המשתנה ל-supabaseClient)
const SUPABASE_URL = 'https://ygaknuqnbmbxofbxcyap.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWtudXFuYm1ieG9mYnhjeWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2OTgsImV4cCI6MjEwMTk0NzY5OH0.LwYf4Zx8tqmKRmTqjbKS9TeMRjJufji4AiSeKBpVSqU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// תמונת ברירת מחדל
const sampleImage = 'https://placehold.co/300x200/264653/ffffff?text=Book+Cover';

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

// טעינת מודעות מ-Supabase
async function loadBooks() {
  const bookContainer = document.querySelector('.book-container');
  if (!bookContainer) return;

  const { data: books, error } = await supabaseClient
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('שגיאה בטעינת המודעות:', error);
    return;
  }

  bookContainer.innerHTML = '';

  if (!books || books.length === 0) {
    bookContainer.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">עדיין אין מודעות. הי הראשונה להוסיף ספר!</p>';
    return;
  }

  books.forEach((book) => {
    const bookHTML = createBookCardHTML(
      book.title,
      book.desc,
      book.price,
      book.imageUrl,
      book.genre,
      book.contact,
      book.location,
      book.id
    );
    bookContainer.insertAdjacentHTML('beforeend', bookHTML);
  });
}

// ניהול אירועים לאחר טעינת ה-DOM
document.addEventListener('DOMContentLoaded', () => {
  loadBooks();

  const modal = document.getElementById('book-modal');
  const openBtn = document.getElementById('open-modal-btn');
  const closeBtn = document.querySelector('.close-modal');
  const fileInput = document.getElementById('form-image-file');
  const fileChosen = document.getElementById('file-chosen-text');
  const bookForm = document.getElementById('add-book-form');

  // פתיחה וסגירה של המודאל
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.style.display = 'flex');
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // הצגת שם קובץ שנבחר
  if (fileInput && fileChosen) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        fileChosen.textContent = 'קובץ נבחר: ' + this.files[0].name;
      } else {
        fileChosen.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';
      }
    });
  }

  // טיפול בטופס הוספת ספר
  if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = bookForm.querySelector('.submit-btn');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'מעלה תמונה ומפרסם...';
      submitBtn.disabled = true;

      const title = document.getElementById('form-title').value;
      const desc = document.getElementById('form-desc').value;
      const price = document.getElementById('form-price').value;
      const genre = document.getElementById('form-genre').value;
      const contact = document.getElementById('form-contact').value;
      const location = document.getElementById('form-location').value;

      let imageUrl = '';

      try {
        // העלאת תמונה ל-Storage
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('book-covers')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabaseClient.storage
            .from('book-covers')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
        }

        // שמירת המודעה בטבלת books
        const { error: insertError } = await supabaseClient
          .from('books')
          .insert([
            {
              title,
              desc,
              price,
              genre,
              contact,
              location,
              imageUrl
            }
          ]);

        if (insertError) throw insertError;

        bookForm.reset();
        if (fileChosen) fileChosen.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';
        if (modal) modal.style.display = 'none';

        alert('המודעה נוספה בהצלחה!');
        loadBooks();
      } catch (error) {
        console.error('שגיאה בהוספת המודעה:', error);
        alert('ייתה שגיאה בהוספת המודעה, נסי שוב.');
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
});

// פונקציית מחיקה
async function deleteBook(docId, event) {
  event.stopPropagation();
  if (confirm('האם את בטוחה שברצונך למחוק מודעה זו?')) {
    try {
      const { error } = await supabaseClient
        .from('books')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      loadBooks();
    } catch (error) {
      console.error('שגיאה במחיקה:', error);
      alert('לא ניתן היה למחוק את המודעה.');
    }
  }
}
