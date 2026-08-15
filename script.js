// הגדרות התחברות ל-Supabase
const SUPABASE_URL = 'https://ygaknuqnbmbxofbxcyap.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWtudXFuYm1ieG9mYnhjeWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE2OTgsImV4cCI6MjEwMTk0NzY5OH0.LwYf4Zx8tqmKRmTqjbKS9TeMRjJufji4AiSeKBpVSqU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sampleImage = 'https://placehold.co/300x200/264653/ffffff?text=Book+Cover';

function getGenreLabel(genre) {
  const genres = {
    'sci-fi-fantasy': 'מדע בדיוני ופנטזיה',
    'romance': 'רומנטיקה',
    'romantasy': 'רומנטזי',
    'history': 'היסטוריה',
    'non-fiction': 'עיון',
    'novel': 'רומן',
    'horror': 'אימה',
    'thriller': 'מתח',
    'children': 'ילדים ונוער',
    'other': 'אחר'
  };
  return genres[genre] || 'כללי';
}

// כיווץ תמונות בלייב בדפדפן
function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('כיווץ התמונה נכשל'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function createBookCardHTML(title, desc, price, imageUrl, genre, location, docId) {
  const finalImage = imageUrl || sampleImage;

  return `
    <div class="book-card" data-title="${title}" data-genre="${genre}">
      <button class="delete-btn" title="מחק מודעה" onclick="deleteBook('${docId}', '${finalImage}')">🗑️</button>
      
      <div class="card-img-container">
        <span class="genre-tag">${getGenreLabel(genre)}</span>
        <img src="${finalImage}" alt="${title}" loading="lazy" onerror="this.src='${sampleImage}'">
      </div>

      <div class="book-info">
        <h3>${title}</h3>
        <p class="description">מצב: ${desc}</p>
        <p class="location">📍 ${location}</p>
        
        <div class="card-footer">
          <span class="price">${price} ₪</span>
          <a href="book-details.html?id=${docId}" class="view-details-btn">לפרטים נוספים 📖</a>
        </div>
      </div>
    </div>
  `;
}

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
      book.imageUrl || book.imageurl,
      book.genre,
      book.location,
      book.id
    );
    bookContainer.insertAdjacentHTML('beforeend', bookHTML);
  });
}

async function deleteBook(bookId, imageUrl) {
  const confirmDelete = confirm('האם את בטוחה שברצונך למחוק מודעה זו?');
  if (!confirmDelete) return;

  try {
    if (imageUrl && !imageUrl.includes('placehold.co')) {
      const fileName = imageUrl.split('/').pop();
      
      if (fileName) {
        const { error: storageError } = await supabaseClient
          .storage
          .from('book-covers')
          .remove([fileName]);

        if (storageError) {
          console.warn('שגיאה במחיקת התמונה מ-Storage:', storageError.message);
        }
      }
    }

    const { error: dbError } = await supabaseClient
      .from('books')
      .delete()
      .eq('id', bookId);

    if (dbError) throw dbError;

    alert('המודעה נמחקה בהצלחה!');
    loadBooks();

  } catch (error) {
    console.error('שגיאה במחיקת המודעה:', error.message);
    alert('אירעה שגיאה בעת המחיקה: ' + error.message);
  }
}

function filterBooks() {
  const searchInput = document.querySelector('.search-input');
  const filterSelect = document.querySelector('.filter-select');
  
  if (!searchInput || !filterSelect) return;

  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedGenre = filterSelect.value;
  const cards = document.querySelectorAll('.book-card');

  cards.forEach(card => {
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const desc = (card.querySelector('.description')?.textContent || '').toLowerCase();
    const location = (card.querySelector('.location')?.textContent || '').toLowerCase();
    const cardGenre = card.getAttribute('data-genre') || '';

    const matchesSearch = title.includes(searchTerm) || 
                          desc.includes(searchTerm) || 
                          location.includes(searchTerm);

    const matchesGenre = selectedGenre === 'all' || cardGenre === selectedGenre;

    if (matchesSearch && matchesGenre) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadBooks();

  const modal = document.getElementById('book-modal');
  const openBtn = document.getElementById('open-modal-btn');
  const closeBtn = document.querySelector('.close-modal');
  const fileInput = document.getElementById('form-image-file');
  const fileChosen = document.getElementById('file-chosen-text');
  const bookForm = document.getElementById('add-book-form');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.style.display = 'flex');
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  if (fileInput && fileChosen) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        fileChosen.textContent = 'קובץ נבחר: ' + this.files[0].name;
      } else {
        fileChosen.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';
      }
    });
  }

  if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = bookForm.querySelector('.submit-btn');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'מכווץ תמונה ומפרסם...';
      submitBtn.disabled = true;

      const title = document.getElementById('form-title').value;
      const desc = document.getElementById('form-desc').value;
      const price = document.getElementById('form-price').value;
      const genre = document.getElementById('form-genre').value;
      const contact = document.getElementById('form-contact').value;
      const location = document.getElementById('form-location').value;

      let imageurl = '';

      try {
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          const originalFile = fileInput.files[0];
          
          // כיווץ התמונה
          const compressedFile = await compressImage(originalFile);
          
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.webp`;

          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('book-covers')
            .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

          if (uploadError) {
            console.error("Storage Error Details:", uploadError);
            throw new Error(`שגיאה בהעלאת תמונה: ${uploadError.message}`);
          }

          const { data: urlData } = supabaseClient.storage
            .from('book-covers')
            .getPublicUrl(fileName);

          imageurl = urlData.publicUrl;
        }

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
              imageUrl: imageurl
            }
          ]);

        if (insertError) {
          console.error("Database Error Details:", insertError);
          throw new Error(`שגיאה בשמירת נתונים: ${insertError.message}`);
        }

        bookForm.reset();
        if (fileChosen) fileChosen.textContent = 'לא נבחר קובץ (תוצג תמונת ברירת מחדל)';
        if (modal) modal.style.display = 'none';

        alert('המודעה נוספה בהצלחה!');
        loadBooks();
      } catch (error) {
        console.error('שגיאה מלאה:', error);
        alert(error.message || 'הייתה שגיאה בהוספת המודעה.');
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  const searchInput = document.querySelector('.search-input');
  const filterSelect = document.querySelector('.filter-select');

  if (searchInput) {
    searchInput.addEventListener('keyup', filterBooks);
    searchInput.addEventListener('input', filterBooks);
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', filterBooks);
  }
});
