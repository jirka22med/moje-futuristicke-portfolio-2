 // --- Supabase Konstanty pro AUTENTIZACI ---
    const SUPABASE_URL = 'https://aknjpurxdbtsxillmqbd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbmpwdXJ4ZGJ0c3hpbGxtcWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTEzMzAsImV4cCI6MjA2Mzc2NzMzMH0.otk-74BBM-SwC_zA0WqqcwGVab5lBfrLiyeYOmh4Xio';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
     
    // --- Firebase Konfigurace pro FIRESTORE DATABÁZI ---
    const firebaseConfig = { 
        apiKey: "AIzaSyBBep6Nyn9jEp_Q1bryULEbfuWfngMT07Y",
        authDomain: "muj-osobni-web-pokus-10.firebaseapp.com",
        projectId: "muj-osobni-web-pokus-10",
        storageBucket: "muj-osobni-web-pokus-10.firebasestorage.app",
        messagingSenderId: "546998884348",
        appId: "1:546998884348:web:c5efd177dc1144b80cc479",
        measurementId: "G-1PCS4F72KJ"
    };

    // Inicializujeme Firebase App a Firestore
    let fbApp;
    let db;
    let currentUserId = null;

    try {
        fbApp = firebase.initializeApp(firebaseConfig);
        db = fbApp.firestore();
        console.log("Firebase Firestore úspěšně inicializován.");
    } catch (error) {
        console.error("Chyba při inicializaci Firebase Firestore:", error);
        document.getElementById('loading-indicator').textContent = 'Kritická chyba: Knihovna Firebase Firestore se nenačetla.';
        document.body.style.visibility = 'visible';
    }

    // Globální proměnná pro stav editačního módu
    let isEditMode = false;
    const EDIT_MODE_KEY = 'portfolio_edit_mode_active';

    // Identifikátor pro hlavní dokument s editovatelným obsahem stránky ve Firestore
    const DOC_ID = 'mainContent';

    document.addEventListener('DOMContentLoaded', function() {
        const loadingIndicatorElement = document.getElementById('loading-indicator');

        if (loadingIndicatorElement) {
            loadingIndicatorElement.textContent = "Načítání stránky a dat...";
            loadingIndicatorElement.classList.remove('hidden');
        } else {
            console.error("Loading indicator element not found!");
        }
        
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            console.error('Supabase library not loaded or createClient is not a function.');
            if (loadingIndicatorElement) {
                loadingIndicatorElement.textContent = 'Kritická chyba: Knihovna Supabase se nenačetla.';
            }
            document.body.style.visibility = 'visible';
            return;
        }
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
            console.error('Firebase library not loaded or initializeApp is not a function.');
            if (loadingIndicatorElement) {
                loadingIndicatorElement.textContent = 'Kritická chyba: Knihovna Firebase se nenačetla.';
            }
            document.body.style.visibility = 'visible';
            return;
        }

        // --- Supabase autentizace (pro správu přihlášení) ---
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Supabase Auth State Change:', event, session);
            if (session && session.user) {
                console.log('Uživatel je přihlášen přes Supabase:', session.user.email);
                currentUserId = session.user.id;
                document.getElementById('login-button').classList.add('hidden');
                document.getElementById('edit-mode-toggle-btn').classList.remove('hidden');
                
                const userIdDisplaySpan = document.getElementById('firebase-user-id');
                const userIdContainer = document.getElementById('user-id-display');
                if (currentUserId && userIdDisplaySpan && userIdContainer) {
                    userIdDisplaySpan.textContent = currentUserId;
                    userIdContainer.classList.remove('hidden');
                }
                
                if (localStorage.getItem(EDIT_MODE_KEY) === 'true') {
                    enableEditMode();
                    document.getElementById('edit-mode-toggle-btn').textContent = 'Zavřít'; // Upraveno
                } else {
                    disableEditMode();
                    document.getElementById('edit-mode-toggle-btn').textContent = 'Upravit'; // Upraveno
                }
            } else {
                console.log('Uživatel není přihlášen přes Supabase.');
                currentUserId = null;
                document.getElementById('login-button').classList.remove('hidden');
                document.getElementById('edit-mode-toggle-btn').classList.add('hidden');
                document.getElementById('user-id-display').classList.add('hidden');
                disableEditMode();
                localStorage.removeItem(EDIT_MODE_KEY);
            }
            initializeApp();
            if (loadingIndicatorElement) loadingIndicatorElement.classList.add('hidden');
            document.body.style.visibility = 'visible';
        });

        async function checkInitialAuthStateSupabase() {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.error("Chyba při získávání Supabase session:", error);
            } else if (session) {
                // Stav bude zpracován v onAuthStateChange listeneru
            }
        }
        checkInitialAuthStateSupabase();
    });

    // --- Pomocná funkce pro formátování časového otisku ---
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Neznámé datum';
        // Pokud je to objekt Firestore Timestamp (z již uložených dat)
        if (typeof timestamp.toDate === 'function') {
            return new Date(timestamp.toDate()).toLocaleString('cs-CZ');
        }
        // Pokud je to JavaScript timestamp (číslo z Date.now()) nebo Date objekt
        return new Date(timestamp).toLocaleString('cs-CZ');
    }

    // --- Funkce pro zobrazení/skrytí přihlašovacího modalu ---
    function showAuthModal() {
        showModal(document.getElementById('auth-modal'));
        document.getElementById('auth-email').focus();
        document.getElementById('auth-error-message').textContent = '';
    }

    function hideAuthModal() {
        hideModal(document.getElementById('auth-modal'));
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-error-message').textContent = '';
    }

    document.getElementById('cancel-auth-btn')?.addEventListener('click', hideAuthModal);

    // --- Funkce pro přihlášení (pouze Supabase) ---
    document.getElementById('login-auth-btn')?.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorMessageEl = document.getElementById('auth-error-message');
        errorMessageEl.textContent = '';

        showLoading("Přihlašování přes Supabase...");

        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Chyba při přihlašování:', error.message);
            errorMessageEl.textContent = `Chyba: ${error.message}`;
            hideLoading();
        } else {
            hideAuthModal();
            hideLoading();
        }
    });

    // --- Funkce pro registraci (pouze Supabase) ---
    document.getElementById('signup-auth-btn')?.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorMessageEl = document.getElementById('auth-error-message');
        errorMessageEl.textContent = '';

        showLoading("Registrace přes Supabase...");

        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            console.error('Chyba při registraci:', error.message);
            errorMessageEl.textContent = `Chyba: ${error.message}`;
            hideLoading();
        } else {
            if (data && data.user) {
                showAlertModal("Registrace úspěšná", "Registrace proběhla úspěšně! Nyní se můžete přihlásit.");
                hideAuthModal();
                hideLoading();
            } else {
                showAlertModal("Registrace vyžaduje potvrzení", "Zkontrolujte svůj email pro potvrzení registrace. Poté se můžete přihlásit.");
                hideAuthModal();
                hideLoading();
            }
        }
    });

    // --- Funkce pro odhlášení (pouze Supabase) ---
    window.signOut = async function() {
        const confirmed = await (window.showConfirmModal ?
            showConfirmModal("Odhlásit se?", "Opravdu se chcete odhlásit?", { okText: 'Ano, odhlásit', cancelText: 'Zůstat přihlášen' }) :
            confirm("Opravdu se chcete odhlásit?")
        );

        if (confirmed) {
            showLoading("Odhlašování přes Supabase...");
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('Chyba při odhlašování:', error.message);
                showAlertModal("Chyba odhlášení", `Nepodařilo se odhlásit: ${error.message}`);
                hideLoading();
            } else {
                showAlertModal("Odhlášení", "Byli jste úspěšně odhlášeni. Pro úpravy se opět přihlaste.");
                hideLoading();
            }
        }
    };

    // --- Globální proměnné a pomocné funkce ---
    let activeSection = 'about';
    let galleryImagesData = [];
    let savedCodesData = [];
    let externalLinksData = [];
    let currentModalImageIndex = 0;
    let editableContentData = {};

  
   
      //toto je přímo pro statické obrázky na strance ty neslouží k upravam a ani mazaní? 
    const initialImageUrls = [
     { id: 'initial-1', url: 'https://img.freepik.com/free-photo/futuristic-background-with-colorful-abstract-design_1340-39 futuristic-technology-background-with-neon-lights_76964-11458.jpg?w=826&t=st=1716545000~exp=1716545600~hmac=e6108f60104301f3b2886131029b0f10151707f3020142e9950b1e22704c654a', name: 'Technologie'},
        { id: 'initial-2', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_4k18.jpg?ver=0', name: 'Srdce'},
        { id: 'initial-3', url: 'https://img.freepik.com/free-photo/glowing-spaceship-orbits-planet-starry-galaxy-generated-by-ai_188544-9655.jpg?w=1060&t=st=1716545052~exp=1716545652~hmac=c6a7d107b56da6822f221372f4476a3793075997b820160f494a887688068b14', name: 'Vesmírná loď'},
        { id: 'initial-4', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_4k7.jpg?ver=0', name: 'Mlhovina'},
        { id: 'initial-5', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_4k8.jpg?ver=0', name: 'Kyberpunk město'},
        { id: 'initial-6', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_4k13.jpg?ver=0', name: 'Notebook v akci'},
        { id: 'initial-7', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_4k14.jpg?ver=0', name: 'Galaxie'},
        { id: 'initial-8', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_1920x10804.jpg?ver=0', name: 'Lidský mozek'},
        { id: 'initial-9', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_15360x86402.jpg?ver=0', name: 'Vědecké laboratoře'},
        { id: 'initial-10', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/misurina-sunset.jpg?ver=0', name: 'Neuronová síť'},
        { id: 'initial-11', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/snowy-landscape-with-mountains-lake-with-snow-ground.jpg?ver=0', name: 'Datová mřížka'},
        { id: 'initial-12', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/wet-sphere-reflective-water-abstract-beauty-generated-by-ai.jpg?ver=0', name: 'Futuristické město'},
        { id: 'initial-13', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/vnon-pozadi-od-admirala-chatbota..jpg?ver=0', name: 'Světelná geometrie'},
        { id: 'initial-14', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_1024x1792.jpg?ver=0', name: 'Digitální plameny'},
        { id: 'initial-15', url: 'https://img41.rajce.idnes.cz/d4102/19/19244/19244630_db82ad174937335b1a151341387b7af2/images/image_300x3001_2.jpg?ver=0', name: 'Exoplaneta'},
        { id: 'initial-16', url: 'https://img36.rajce.idnes.cz/d3603/10/10185/10185286_0147349ad505c43a2d9f6eb372624417/images/CIMG0039.jpg?ver=3', name: 'Kybernetická maska'},
                             ];
       

    let initialExternalLinksData = [ ];
          //tady začíná hlavní logika
    // --- Funkce pro ukládání dat do Firestore (používá currentUserId ze Supabase) ---
    async function saveDataToFirestore() {
        if (!currentUserId) {
            showAlertModal("Uložení selhalo", "Pro uložení dat se musíte přihlásit.");
            return false;
        }

        showLoading("Ukládám data do cloudu...");

        document.querySelectorAll('[data-editable]').forEach(el => {
            const id = el.dataset.editable;
            if (id) {
                if (el.tagName === 'A' && el.classList.contains('editable-link')) {
                    editableContentData[id] = { url: el.href, text: el.childNodes[0] ? el.childNodes[0].nodeValue.trim() : '' };
                } else {
                    editableContentData[id] = el.innerHTML;
                }
            }
        });

        // NOVÝ KÓD: Ukládání URL dat ze stávajících portfolio položek
        document.querySelectorAll('#cloude-projek-test .portfolio-item').forEach(portfolioItem => {
            const itemId = portfolioItem.dataset.itemId;
            if (itemId) {
                // Najdeme odkaz v této portfolio položce
                const linkElement = portfolioItem.querySelector('a.editable-link');
                if (linkElement) {
                    const linkTextSpan = linkElement.querySelector('[data-url-editable-text]');
                    const linkText = linkTextSpan ? linkTextSpan.textContent.trim() : '';
                    const linkUrl = linkElement.getAttribute('href') || '';
                    
                    // Uložíme do editableContentData
                    editableContentData[`${itemId}-link-text`] = linkText;
                    editableContentData[`${itemId}-link-url`] = linkUrl;
                    
                    console.log(`💾 Ukládám URL data pro ${itemId}:`, { linkText, linkUrl });
                }
            }
        });
        
        const dataToSave = {
            galleryImages: galleryImagesData,
            savedCodes: savedCodesData,
            externalLinks: externalLinksData,
            editableContent: editableContentData,
            // lastUpdated: firebase.firestore.FieldValue.serverTimestamp(), // Ponecháno pro dokument nejvyšší úrovně
            editorUserId: currentUserId
        };

        // Přidáme serverTimestamp pro samotný dokument nejvyšší úrovně, ne pro pole uvnitř
        dataToSave.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();

        try {
            await db.collection('publicContent').doc(DOC_ID).set(dataToSave, { merge: true });
            hideLoading();
            showAlertModal("Uloženo do cloudu", "Všechna data včetně URL adres byla úspěšně uložena do Cloud Firestore.");
            return true;
        } catch (error) {
            console.error('Chyba při ukládání do Firestore:', error);
            hideLoading();
            showAlertModal("Chyba ukládání", `Nepodařilo se uložit data do cloudu: ${error.message}`);
            return false;
        }
    }

    // --- Funkce pro načítání dat z Firestore (všichni vidí) ---
    async function loadDataFromFirestore() {
        showLoading("Načítám data z cloudu...");
        try {
            const docRef = db.collection('publicContent').doc(DOC_ID);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                galleryImagesData = data.galleryImages || [...initialImageUrls];
                savedCodesData = data.savedCodes || [];
                externalLinksData = data.externalLinks || [...initialExternalLinksData];
                editableContentData = data.editableContent || {};
                console.log("Data načtena z Firestore.");
            } else {
                console.log("Žádná data v Firestore, použiji výchozí lokální data.");
                galleryImagesData = [...initialImageUrls];
                savedCodesData = [];
                externalLinksData = [...initialExternalLinksData];
                editableContentData = {};
            }
            applyEditableContent();
            updateGalleryDisplay();
            renderSavedCodesDisplay();
            renderExternalLinks();
            hideLoading();
            return true;
        } catch (error) {
            console.error('Chyba při načítání z Firestore:', error);
            hideLoading();
            showAlertModal("Chyba načítání", `Nepodařilo se načíst data z cloudu: ${error.message}. Používám výchozí data.`);
            return false;
        }
    }

    // --- Listener pro aktualizace v reálném čase z Firestore ---
    function setupFirestoreRealtimeListener() {
        db.collection('publicContent').doc(DOC_ID)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log("Realtime aktualizace z Firestore:", data);
                    galleryImagesData = data.galleryImages || [...initialImageUrls];
                    savedCodesData = data.savedCodes || [];
                    externalLinksData = data.externalLinks || [...initialExternalLinksData];
                    editableContentData = data.editableContent || {};

                    applyEditableContent();
                    updateGalleryDisplay();
                    renderSavedCodesDisplay();
                    renderExternalLinks();
                    console.log("Firestore Aktualizace: Obsah stránky byl automaticky aktualizován z cloudu.");
                } else {
                    console.log("Hlavní dokument v Firestore neexistuje, nebo byl smazán.");
                    galleryImagesData = [...initialImageUrls];
                    savedCodesData = [];
                    externalLinksData = [...initialExternalLinksData];
                    editableContentData = {};
                    applyEditableContent();
                    updateGalleryDisplay();
                    renderSavedCodesDisplay();
                    renderExternalLinks();
                }
            }, (error) => {
                console.error("Chyba při poslouchání realtime aktualizací:", error);
                showAlertModal("Chyba synchronizace", `Nepodařilo se synchronizovat data v reálném čase: ${error.message}`);
            });
    }

    // --- Funkce pro aplikaci editovatelného obsahu ---
    function applyEditableContent() {
        for (const id in editableContentData) {
            const element = document.querySelector(`[data-editable="${id}"]`);
            if (element) {
                if (element.tagName === 'A' && element.classList.contains('editable-link')) {
                    element.href = editableContentData[id].url || '#';
                    element.innerHTML = `${editableContentData[id].text || ''}<i class="fas fa-edit edit-icon ${isEditMode ? '' : 'hidden'}"></i>`;
                } else {
                    element.innerHTML = editableContentData[id];
                }
            }
        }

        // NOVÝ KÓD: Aplikace URL dat na stávající portfolio položky
        document.querySelectorAll('#cloude-projek-test .portfolio-item').forEach(portfolioItem => {
            const itemId = portfolioItem.dataset.itemId;
            if (itemId) {
                // Načteme uložená URL data
                const savedLinkText = editableContentData[`${itemId}-link-text`];
                const savedLinkUrl = editableContentData[`${itemId}-link-url`];
                
                // Najdeme odkaz v této portfolio položce
                const linkElement = portfolioItem.querySelector('a.editable-link');
                if (linkElement && (savedLinkText || savedLinkUrl)) {
                    // Aktualizujeme URL
                    if (savedLinkUrl) {
                        linkElement.setAttribute('href', savedLinkUrl);
                    }
                    
                    // Aktualizujeme text odkazu
                    const linkTextSpan = linkElement.querySelector('[data-url-editable-text]');
                    if (linkTextSpan && savedLinkText) {
                        linkTextSpan.textContent = savedLinkText;
                    }
                    
                    console.log(`🔄 Aplikuji URL data pro ${itemId}:`, { 
                        text: savedLinkText, 
                        url: savedLinkUrl 
                    });
                }
            }
        });

        const portfolioContainer = document.querySelector('.portfolio-items');
        if (portfolioContainer) {
            portfolioContainer.innerHTML = '';
        }

        const portfolioItemIds = new Set();
        for (const key in editableContentData) {
            if (key.startsWith('portfolio-item-') && key.endsWith('-title')) {
                const itemId = key.replace('-title', '');
                portfolioItemIds.add(itemId);
            }
        }

       portfolioItemIds.forEach(itemId => {
    const title = editableContentData[`${itemId}-title`];
    const desc1 = editableContentData[`${itemId}-desc-1`];
    const desc2 = editableContentData[`${itemId}-desc-2`] || '';
    const linkText = editableContentData[`${itemId}-link-text`];
    const linkUrl = editableContentData[`${itemId}-link-url`];
    // --- NOVÝ KÓD ZDE: ZÍSKÁNÍ YOUTUBE URL A VYTVOŘENÍ EMBED KÓDU ---
    const youtubeUrl = editableContentData[`${itemId}-youtube-url`] || ''; // Předpokládáme, že takto uložíš URL z formuláře
    let videoEmbedHtml = ''; // Inicializace prázdného HTML pro video

    if (youtubeUrl) {
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (videoId) {
        const embedSrc = `https://www.youtube.com/embed/${videoId}`; 
        videoEmbedHtml = `
            <div class="portfolio-video-container">
                <iframe 
                    src="${embedSrc}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                ></iframe>
            </div>
        `;
    }
}
    // --- KONEC NOVÉHO KÓDU ---

    if (!title || !desc1) {
        console.warn(`Chybí data pro portfolio položku s ID: ${itemId}. Nebude vykreslena.`);
        return;
    }

    const newItemHtml = `
        <div class="portfolio-item" data-item-id="${itemId}" style="background-color: #f9f9f9; padding: 1rem; border-radius: 4px; border: 1px solid #ddd; position: relative; margin-bottom: 20px;">
            <h3 data-editable="${itemId}-title">${title}</h3>
            <p data-editable="${itemId}-desc-1">${desc1}</p>
            ${desc2 ? `<p data-editable="${itemId}-desc-2">${desc2}</p>` : ''}
            
            ${videoEmbedHtml}
            
            <a href="${linkUrl || '#'}" class="button editable-link" data-link-id="${itemId}-link" data-editable-link-text="${linkText || 'Zobrazit projekt →'}" target="_blank" rel="noopener noreferrer">
                ${linkText || 'Zobrazit projekt →'}<i class="fas fa-edit edit-icon ${isEditMode ? '' : 'hidden'}"></i>
            </a>
            <div class="edit-controls ${isEditMode ? '' : 'hidden'}">
                <button onclick="editPortfolioItem('${itemId}')">Editovat</button>
            </div>
        </div>
    `;
    portfolioContainer.insertAdjacentHTML('beforeend', newItemHtml);
});

document.querySelectorAll('[data-editable]').forEach(el => {
    if (isEditMode) {
        el.setAttribute('contenteditable', 'true');
    } else {
        el.removeAttribute('contenteditable');
    }
});
document.querySelectorAll('.editable-image-wrapper .edit-icon').forEach(icon => {
    if (isEditMode) icon.classList.remove('hidden'); else icon.classList.add('hidden');
});
document.querySelectorAll('.editable-link .edit-icon').forEach(icon => {
    if (isEditMode) icon.classList.remove('hidden'); else icon.classList.add('hidden');
});
document.querySelectorAll('.portfolio-item .edit-controls').forEach(controls => {
    if (isEditMode) controls.classList.remove('hidden'); else controls.classList.add('hidden');
});
    }

    // NOVÁ FUNKCE: Rychlé uložení URL dat
    async function saveUrlDataToFirestore(projectId, urlData) {
        if (!currentUserId) {
            console.warn("Nelze uložit URL data - uživatel není přihlášen");
            return false;
        }

        try {
            // Aktualizujeme lokální data
            editableContentData[`${projectId}-link-text`] = urlData.linkText;
            editableContentData[`${projectId}-link-url`] = urlData.linkUrl;
            
            // Uložíme do Firestore
            const dataToSave = {
                editableContent: editableContentData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('publicContent').doc(DOC_ID).set(dataToSave, { merge: true });
            console.log(`✅ URL data pro ${projectId} uložena do Firestore`);
            return true;
        } catch (error) {
            console.error('Chyba při ukládání URL dat:', error);
            return false;
        }
    }

    async function initializeApp() {
        setupNavigation();
        setupHtmlEditor();
        setupGallery();
        setupDataManagement();
        
        await loadDataFromFirestore();
        setupFirestoreRealtimeListener();

        const currentYearEl = document.getElementById('currentYear');
        if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();
        
        showSection(activeSection, true);
        console.log("Aplikace inicializována.");
    }

    // --- Funkce pro přepínání editačního módu ---
function toggleEditMode() {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro úpravy stránky se musíte přihlásit.");
        showAuthModal();
        return;
    }

    if (isEditMode) {
        disableEditMode();
        saveDataToFirestore();
        showAlertModal("Editace ukončena", "Režim úprav byl vypnut. Vaše změny byly uloženy do cloudu.");
    } else {
        enableEditMode();
        showAlertModal("Režim úprav", "Jste v režimu úprav. Klikněte na text pro úpravu, nebo použijte ikony pro obrázky/odkazy. Změny se ukládají automaticky, ale můžete také použít 'Uložit vše do cloudu'.");
    }
}
//tady končí celá logika pro ukládaní a vykreslování
function enableEditMode() {
    isEditMode = true;
    document.body.classList.add('edit-mode');
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('edit-mode-toggle-btn').textContent = 'Zavřít'; // Upraveno
    document.getElementById('edit-mode-toggle-btn').classList.remove('hidden');

    document.querySelectorAll('[data-editable]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
    });

    document.querySelectorAll('.editable-image-wrapper .edit-icon').forEach(icon => {
        icon.classList.remove('hidden');
    });
    document.querySelectorAll('.editable-link .edit-icon').forEach(icon => {
        icon.classList.remove('hidden');
    });

    document.querySelectorAll('.portfolio-item .edit-controls').forEach(controls => {
        controls.classList.remove('hidden');
    });
    document.getElementById('add-portfolio-item-btn').classList.remove('hidden');
    document.getElementById('add-link-btn').classList.remove('hidden');
    document.getElementById('data-management').classList.remove('hidden');

    // KLÍČOVÁ ZMĚNA ZDE: Zobrazí tlačítka "Upravit URL"
    document.querySelectorAll('.link-edit-controls').forEach(controls => {
        controls.classList.remove('hidden');
    });

    document.querySelectorAll('#links-table .edit-mode-only').forEach(el => {
        el.style.display = 'table-cell';
    });

    localStorage.setItem(EDIT_MODE_KEY, 'true');
}

function disableEditMode() {
    isEditMode = false;
    document.body.classList.remove('edit-mode');
    document.getElementById('edit-mode-toggle-btn').textContent = 'Upravit'; // Upraveno

    if (!currentUserId) {
        document.getElementById('login-button').classList.remove('hidden');
        document.getElementById('edit-mode-toggle-btn').classList.add('hidden');
    }

    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.removeAttribute('contenteditable');
        const id = el.dataset.editable;
        if (id) {
            if (el.tagName === 'A' && el.classList.contains('editable-link')) {
                editableContentData[id] = { url: el.href, text: el.childNodes[0] ? el.childNodes[0].nodeValue.trim() : '' };
            } else {
                editableContentData[id] = el.innerHTML;
            }
        }
    });

    document.querySelectorAll('.editable-image-wrapper .edit-icon').forEach(icon => {
        icon.classList.add('hidden');
    });
    document.querySelectorAll('.editable-link .edit-icon').forEach(icon => {
        icon.classList.add('hidden');
    });

    document.querySelectorAll('.portfolio-item .edit-controls').forEach(controls => {
        controls.classList.add('hidden');
    });
    document.getElementById('add-portfolio-item-btn').classList.add('hidden');
    document.getElementById('add-link-btn').classList.add('hidden');
    document.getElementById('data-management').classList.add('hidden');

    // KLÍČOVÁ ZMĚNA ZDE: Skryje tlačítka "Upravit URL"
    document.querySelectorAll('.link-edit-controls').forEach(controls => {
        controls.classList.add('hidden');
    });

    document.querySelectorAll('#links-table .edit-mode-only').forEach(el => {
        el.style.display = 'none';
    });

    localStorage.removeItem(EDIT_MODE_KEY);
}

    // --- Funkce pro načítání a skrývání indikátoru ---
    function showLoading(message = "Načítání...") {
        const loadingIndicatorElement = document.getElementById('loading-indicator');
        if (loadingIndicatorElement) {
            loadingIndicatorElement.textContent = message;
            loadingIndicatorElement.classList.remove('hidden');
        }
    }
    function hideLoading() {
        const loadingIndicatorElement = document.getElementById('loading-indicator');
        if (loadingIndicatorElement) {
            loadingIndicatorElement.classList.add('hidden');
        }
    }

    // --- Správa dat (nyní vše do/z Firestore) ---
    function setupDataManagement() {
        const dataManagementContainer = document.getElementById('data-management');
        if (dataManagementContainer) {
            // HTML pro tlačítka je nyní přímo v HTML struktuře a negeneruje se zde
            
            document.getElementById('save-all-data-btn')?.addEventListener('click', saveDataToFirestore);
            document.getElementById('clear-all-data-btn')?.addEventListener('click', handleClearAllData);
            document.getElementById('export-data-btn')?.addEventListener('click', exportData);
            document.getElementById('import-data-btn')?.addEventListener('click', () => {
                document.getElementById('import-file-input')?.click();
            });
            document.getElementById('import-file-input')?.addEventListener('change', handleImportData);
        }
    }

    async function handleClearAllData() {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro vymazání dat v cloudu se musíte přihlásit.");
            return;
        }
        const confirmed = await (window.showConfirmModal ?
            showConfirmModal("Vymazat všechna data v cloudu?", "Opravdu chcete vymazat všechna uložená data v cloudu? Tato akce je nevratná! Zahrnuje i texty upravené na stránce a smaže je PRO VŠECHNY!", { okText: 'Ano, vymazat', cancelText: 'Zrušit' }) :
            confirm("Opravdu chcete vymazat všechna uložená data v cloudu? Tato akce je nevratná!")
        );
        
        if (confirmed) {
            showLoading("Mažu data z cloudu...");
            try {
                await db.collection('publicContent').doc(DOC_ID).delete();
                galleryImagesData = [...initialImageUrls];
                savedCodesData = [];
                externalLinksData = [...initialExternalLinksData];
                editableContentData = {};
                applyEditableContent();
                updateGalleryDisplay();
                renderSavedCodesDisplay();
                renderExternalLinks();
                hideLoading();
                showAlertModal("Data vymazána", "Všechna data byla úspěšně vymazána z Cloud Firestore. Stránka se vrátila k výchozímu obsahu.");
            } catch (error) {
                console.error('Chyba při mazání z Firestore:', error);
                hideLoading();
                showAlertModal("Chyba mazání", `Nepodařilo se vymazat data z cloudu: ${error.message}`);
            }
        }
    }

    function exportData() {
        document.querySelectorAll('[data-editable]').forEach(el => {
            const id = el.dataset.editable;
            if (id) {
                if (el.tagName === 'A' && el.classList.contains('editable-link')) {
                    editableContentData[id] = { url: el.href, text: el.childNodes[0] ? el.childNodes[0].nodeValue.trim() : '' };
                } else {
                    editableContentData[id] = el.innerHTML;
                }
            }
        });

        const exportObject = {
            galleryImages: galleryImagesData,
            savedCodes: savedCodesData,
            externalLinks: externalLinksData,
            editableContent: editableContentData,
            exportDate: new Date().toISOString(),
            version: "1.2"
        };
        
        const dataStr = JSON.stringify(exportObject, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfolio-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlertModal("Export dokončen", "Data byla exportována do souboru JSON.");
    }

    function handleImportData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                const confirmed = await (window.showConfirmModal ?
                    showConfirmModal("Importovat data?", "Importování přepíše všechna současná data (včetně textů na stránce) LOKÁLNĚ! Chcete pokračovat?", { okText: 'Ano, importovat', cancelText: 'Zrušit' }) :
                    confirm("Importování přepíše data. Pokračovat?")
                );
                
                if (confirmed) {
                    if (importedData.galleryImages) galleryImagesData = importedData.galleryImages;
                    if (importedData.savedCodes) savedCodesData = importedData.savedCodes;
                    if (importedData.externalLinks) externalLinksData = importedData.externalLinks;
                    if (importedData.editableContent) editableContentData = importedData.editableContent;
                    
                    if (currentUserId) {
                        await saveDataToFirestore(); 
                    } else {
                        showAlertModal("Upozornění", "Data byla importována pouze lokálně, protože nejste přihlášeni. Pro trvalé uložení se přihlaste a uložte je do cloudu.");
                    }

                    applyEditableContent();
                    updateGalleryDisplay();
                    renderSavedCodesDisplay();
                    renderExternalLinks();
                    
                    showAlertModal("Import dokončen", "Data byla úspěšně naimportována a aplikována.");
                }
            } catch (error) {
                console.error('Chyba při importu:', error);
                showAlertModal("Chyba importu", "Nepodařilo se načíst data ze souboru. Zkontrolujte, zda je soubor platný JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // --- Navigace a sekce (beze změny) ---
  // CSS pro zakázání animací a problisků
const optimizedCSS = `
    /* Zakázání všech animací a přechodů pro sekce */
    main section {
        transition: none !important;
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
    }
    
    main section.active {
        transition: none !important;
        animation: none !important;
    }
    
    /* Zakázání přechodů pro navigační odkazy */
    .nav-container a.nav-link {
        transition: none !important;
    }
`;

// Přidání CSS do hlavy dokumentu
function injectOptimizedCSS() {
    const style = document.createElement('style');
    style.textContent = optimizedCSS;
    document.head.appendChild(style);
}

// --- Optimalizovaná navigace bez animací ---
function setupNavigation() {
    // Nejdřív přidáme CSS pro zakázání animací
    injectOptimizedCSS();
    
    const navLinks = document.querySelectorAll('.nav-container a.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            showSection(sectionId);
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    const initialActiveLink = document.querySelector(`.nav-container a.nav-link[data-section="${activeSection}"]`);
    if (initialActiveLink) initialActiveLink.classList.add('active');
}

function showSection(id, isInitial = false) {
    if (!id) id = 'about';
    activeSection = id;
    
    // Okamžité skrytí všech sekcí
    document.querySelectorAll('main section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Okamžité zobrazení cílové sekce BEZ setTimeout!
    const sectionElement = document.getElementById(id);
    if (sectionElement) {
        sectionElement.style.display = 'block';
        sectionElement.classList.add('active'); // Bez čekání!
    } else {
        console.warn(`Sekce s ID "${id}" nebyla nalezena. Zobrazuji 'about'.`);
        const aboutSection = document.getElementById('about');
        if(aboutSection) {
            aboutSection.style.display = 'block';
            aboutSection.classList.add('active'); // Bez čekání!
            activeSection = 'about';
            document.querySelectorAll('.nav-container a.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('.nav-container a.nav-link[data-section="about"]')?.classList.add('active');
        }
    }
}

    // --- HTML Editor (ukládá do Firestore) ---
    function setupHtmlEditor() {
        const editor = document.getElementById('html-editor');
        const preview = document.getElementById('html-preview');
        const saveBtn = document.getElementById('save-code-btn');
        
        if (!editor || !preview || !saveBtn) {
            console.error("HTML editor elementy nebyly nalezeny!");
            return;
        }

        editor.addEventListener('input', () => { preview.srcdoc = editor.value; });
        preview.srcdoc = editor.value;

        saveBtn.addEventListener('click', () => {
            if (!currentUserId) {
                showAlertModal("Přístup zamítnut", "Pro uložení kódu se musíte přihlásit.");
                return;
            }
            if (!editor.value.trim()) {
                showAlertModal("Prázdný kód", "Nelze uložit prázdný HTML kód.");
                return;
            }
            const saveModal = document.getElementById('save-code-modal');
            if(saveModal) showModal(saveModal);
            document.getElementById('code-title-input')?.focus();
        });
    }

    async function saveHtmlCodeToFirestore(title, code) {
        if (!currentUserId) {
            showAlertModal("Uložení selhalo", "Pro uložení kódu se musíte přihlásit.");
            return;
        }
        showLoading("Ukládám HTML kód...");
        const newCode = {
            id: `html-code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title,
            code,
            createdAt: Date.now(), // ZMĚNA ZDE: Používáme Date.now() pro časový otisk na straně klienta
            userId: currentUserId
        };
        try {
            savedCodesData.unshift(newCode);
            await saveDataToFirestore();
            showAlertModal("Kód uložen", `Kód "${title}" byl úspěšně uložen do cloudu.`);
            hideLoading();
        } catch (error) {
            console.error('Chyba při ukládání kódu do Firestore:', error);
            showAlertModal("Chyba ukládání", `Nepodařilo se uložit kód do cloudu: ${error.message}`);
            hideLoading();
        }
    }

    async function deleteHtmlCodeFromFirestore(idToDelete) {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro smazání kódu se musíte přihlásit.");
            return;
        }
        const codeToDelete = savedCodesData.find(code => code.id === idToDelete);
        if (!codeToDelete || codeToDelete.userId !== currentUserId) {
            showAlertModal("Přístup zamítnut", "Nemáte oprávnění smazat tento kód. Můžete smazat pouze své vlastní kódy.");
            return;
        }

        const confirmed = await (window.showConfirmModal ?
            showConfirmModal("Smazat kód?", `Opravdu chcete smazat kód "${codeToDelete.title}"? Tato akce je nevratná!`) :
            confirm(`Smazat kód "${codeToDelete.title}"?`)
        );
        if (confirmed) {
            showLoading("Mažu HTML kód...");
            try {
                savedCodesData = savedCodesData.filter(code => code.id !== idToDelete);
                await saveDataToFirestore();
                showAlertModal("Kód smazán", "Kód byl úspěšně smazán z cloudu.");
                hideLoading();
            } catch (error) {
                console.error('Chyba při mazání kódu z Firestore:', error);
                showAlertModal("Chyba mazání", `Nepodařilo se smazat kód: ${error.message}`);
                hideLoading();
            }
        }
    }

    function renderSavedCodesDisplay() {
        const listEl = document.getElementById('saved-codes-list');
        if(!listEl) return;
        listEl.innerHTML = savedCodesData.length === 0 ? '<p>Žádné kódy nejsou aktuálně uloženy.</p>' : '';
        
        savedCodesData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'saved-code-item';
            const isOwner = currentUserId && item.userId === currentUserId;

            div.innerHTML = `
                <div class="item-header">
                    <h3>${item.title}</h3>
                    <div class="actions">
                        <button class="button btn-secondary load-code">Načíst</button>
                        <button class="button btn-danger delete-code ${isEditMode && isOwner ? '' : 'hidden'}">Smazat</button>
                    </div>
                </div>
                <p>Uloženo: ${formatTimestamp(item.createdAt)}</p>
            `;
            div.querySelector('.load-code').addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('html-editor').value = item.code;
                document.getElementById('html-preview').srcdoc = item.code;
                showSection('editor');
                document.querySelector('.nav-container a.nav-link[data-section="editor"]')?.click();
            });
            div.querySelector('.delete-code')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                deleteHtmlCodeFromFirestore(item.id);
            });
            div.addEventListener('click', () => {
                document.getElementById('html-editor').value = item.code;
                document.getElementById('html-preview').srcdoc = item.code;
                showSection('editor');
                document.querySelector('.nav-container a.nav-link[data-section="editor"]')?.click();
            });
            listEl.appendChild(div);
        });
    }


 

       // --- Galerie (ukládá do Firestore) s podporou klávesových zkratek ---
// DŮLEŽITÉ: Definuj globální proměnnou na začátku skriptu
// GLOBÁLNÍ PROMĚNNÁ PRO AKTUÁLNÍ INDEX
 

// BEZPEČNÁ FUNKCE PRO ZÍSKÁNÍ PLATNÉHO INDEXU
function getSafeIndex(index) {
    if (galleryImagesData.length === 0) return -1;
    if (index < 0) return galleryImagesData.length - 1;
    if (index >= galleryImagesData.length) return 0;
    return index;
}

// HLAVNÍ FUNKCE PRO OTEVŘENÍ MODALU S OPRAVOU INDEXOVÁNÍ
function openImageModal(index) {
    console.log(`🚀 openImageModal voláno s indexem: ${index}, celkem obrázků: ${galleryImagesData.length}`);
    
    if (galleryImagesData.length === 0) {
        console.warn('⚠️ Galerie je prázdná!');
        return;
    }
    
    // OPRAVA: Bezpečná kontrola a korekce indexu
    const safeIndex = getSafeIndex(index);
    if (safeIndex === -1) {
        console.error('❌ Nelze zobrazit obrázek - prázdná galerie');
        return;
    }
    
    currentModalImageIndex = safeIndex;
    console.log(`✅ Nastavuji currentModalImageIndex na: ${currentModalImageIndex}`);
    
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    
    if (!modal || !modalImg) {
        console.error('❌ Modal nebo modalImg element nenalezen!');
        return;
    }
    
    const currentImage = galleryImagesData[currentModalImageIndex];
    console.log(`📸 Zobrazuji obrázek: "${currentImage.name}" na pozici ${currentModalImageIndex + 1}/${galleryImagesData.length}`);
    
    // Loading indikátor
    modalImg.style.opacity = '1';
    modalImg.onload = function() {
        console.log(`✅ Obrázek načten: ${currentImage.name}`);
        //modalImg.style.opacity = '1';
    };
    
    modalImg.onerror = function() {
        console.error(`❌ Chyba načítání: ${currentImage.name}`);
        modalImg.style.opacity = '1';
        modalImg.alt = `❌ Chyba načítání: ${currentImage.name}`;
    };
    
    // Nastavení URL s cache busterem
    const finalUrl = currentImage.url + (currentImage.url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
    modalImg.src = finalUrl;
    modalImg.alt = `${currentImage.name} (${currentModalImageIndex + 1}/${galleryImagesData.length})`;
    
    // OPRAVA: Aktualizace všech indikátorů
    updateAllIndicators();
    
    showModal(modal);
    
    // Debug info
    console.log(`🔍 Aktuální stav: index=${currentModalImageIndex}, obrázek="${currentImage.name}"`);
}

// NOVÁ FUNKCE: Aktualizuje všechny indikátory najednou
function updateAllIndicators() {
    updateImageIndicator(currentModalImageIndex, galleryImagesData.length);
    addPositionIndicator(currentModalImageIndex, galleryImagesData.length, galleryImagesData[currentModalImageIndex].name);
    updateNavigationButtons();
}

// OPRAVENÁ FUNKCE: Aktualizace číselných indikátorů
function updateImageIndicator(currentIndex, totalImages) {
    const currentNumberElement = document.getElementById('current-image-number');
    const totalCountElement = document.getElementById('total-images-count');
    
    if (currentNumberElement) {
        currentNumberElement.textContent = currentIndex + 1;
        console.log(`🔢 current-image-number aktualizován na: ${currentIndex + 1}`);
    }
    
    if (totalCountElement) {
        totalCountElement.textContent = totalImages;
        console.log(`🔢 total-images-count aktualizován na: ${totalImages}`);
    }
}

// NOVÁ FUNKCE: Aktualizace stavu navigačních tlačítek
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-image-btn');
    const nextBtn = document.getElementById('next-image-btn');
    
    if (galleryImagesData.length <= 1) {
        // Pokud je jen jeden nebo žádný obrázek, skryj tlačítka
        if (prevBtn) prevBtn.style.opacity = '0.3';
        if (nextBtn) nextBtn.style.opacity = '0.3';
    } else {
        // Jinak je zobraz normálně
        if (prevBtn) prevBtn.style.opacity = '1';
        if (nextBtn) nextBtn.style.opacity = '1';
    }
}

// VYLEPŠENÁ FUNKCE: Vizuální indikátor pozice
function addPositionIndicator(index, total, name) {
    const modal = document.getElementById('image-modal');
    if (!modal) return;
    
    let indicator = modal.querySelector('.position-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'position-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            /*background: rgba(0,0,0,0.8);*/
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            z-index: 1001;
            /*box-shadow: 0 2px 10px rgba(0,0,0,0.3);*/
        `;
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.appendChild(indicator);
        }
    }
    
    indicator.textContent = `${index + 1}/${total} - ${name}`;
    console.log(`📍 Indikátor aktualizován: ${indicator.textContent}`);
}

// HLAVNÍ OPRAVA: Kompletně přepsaná navigace
function navigateImageModal(direction) {
    console.log(`🧭 NAVIGACE: směr=${direction}, současný index=${currentModalImageIndex}`);
    console.log(`📊 Stav galerie: ${galleryImagesData.length} obrázků`);
    
    if (galleryImagesData.length === 0) {
        console.warn('⚠️ Nelze navigovat - prázdná galerie!');
        return;
    }
    
    if (galleryImagesData.length === 1) {
        console.log('ℹ️ Pouze jeden obrázek - zůstáváme na místě');
        updateAllIndicators(); // Aktualizuj indikátory pro jistotu
        return;
    }
    
    // Výpočet nového indexu s cyklickou navigací
    let newIndex = currentModalImageIndex + direction;
    newIndex = getSafeIndex(newIndex);
    
    console.log(`➡️ Změna indexu: ${currentModalImageIndex} → ${newIndex}`);
    console.log(`🖼️ Nový obrázek: "${galleryImagesData[newIndex]?.name || 'NEZNÁMÝ'}"`);
    
    // Plynulý přechod
    const modalImg = document.getElementById('modal-img');
    if (modalImg) {
       // modalImg.style.transition = 'opacity 0';
        //modalImg.style.opacity = '0';
        
         {
            openImageModal(newIndex);
        }  
    } else {
        openImageModal(newIndex);
    }
}

// FUNKCE PRO ZAVŘENÍ MODALU
function closeImageModal() {
    console.log('🚪 Zavírám modal');
    const modal = document.getElementById('image-modal');
    hideModal(modal);
    
    // Reset indexu není potřeba - zůstává pro příští otevření
    console.log(`💾 Index zůstává: ${currentModalImageIndex} pro příští otevření`);
}

// VYLEPŠENÉ KLÁVESOVÉ ZKRATKY
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        const imageModal = document.getElementById('image-modal');

        // Krok 1: Kontrola, zda je modal viditelný
        if (!imageModal || imageModal.style.display === 'none') {
            return; // Pokud modal není viditelný, nic neděláme
        }

        // Krok 2: Klíčové vylepšení - Zkontrolovat, zda je uživatel v editačním poli
        // activeElement vrací aktuálně fokusovaný element.
        // tagName vrací název tagu ve velkých písmenech (např. 'INPUT', 'TEXTAREA').
        const activeElement = document.activeElement;
        const isEditingText = (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.hasAttribute('contenteditable') // Pro případ, že edituješ DIV s contenteditable
        );

        // Pokud uživatel edituje text A stiskl šipku (nebo Esc), NECHÁME šipku fungovat pro textové pole
        // A NEBUDEME přepínat obrázek. Esc by ale měl fungovat vždy pro zavření modalu.
        if (isEditingText && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
            // Logiku pro přepínání obrázku v modalu ignorujeme, necháme šipku pro textové pole
            console.log(`⌨️ Uživatele edituje text. Klávesa ${event.key} bude ignorována pro modal.`);
            return; // Důležité: Ukončíme funkci, aby se dál nezpracovávala pro modal
        }
        
        // Zabráníme defaultnímu chování šipek (pokud nejsme v textovém poli)
        if (['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        console.log(`⌨️ Klávesa stisknuta: ${event.key}`);
        
        switch(event.key) {
            case 'ArrowLeft':
                console.log('⬅️ Předchozí obrázek (←)');
                navigateImageModal(-1);
                break;
            case 'ArrowRight':  
                console.log('➡️ Další obrázek (→)');
                navigateImageModal(1);
                break;
            case 'Escape':
                console.log('🚪 Zavírám modal (ESC)');
                closeImageModal();
                break;
        }
    });
}

// OPRAVENÁ FUNKCE SETUP S LEPŠÍMI EVENT LISTENERY
function setupGallery() {
    console.log('🚀 Inicializuji galerii s opraveným indexováním...');
    
    const addBtn = document.getElementById('addImageUrlBtn');
    const closeBtn = document.getElementById('close-modal-btn');
    const prevBtn = document.getElementById('prev-image-btn');
    const nextBtn = document.getElementById('next-image-btn');
    const saveEditImageBtn = document.getElementById('save-edit-image-btn');
    const cancelEditImageBtn = document.getElementById('cancel-edit-image-btn');
    
    // Event listenery s lepším error handlingem
    if (addBtn) {
        addBtn.addEventListener('click', handleAddImageUrl);
        console.log('✅ Add button listener nastaven');
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeImageModal);
        console.log('✅ Close button listener nastaven');
    }
    
    // OPRAVA: Robustní navigační tlačítka
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('⬅️ Klik na předchozí tlačítko');
            navigateImageModal(-1);
        });
        console.log('✅ Previous button listener nastaven');
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('➡️ Klik na další tlačítko');
            navigateImageModal(1);
        });
        console.log('✅ Next button listener nastaven');
    }
    
    // Ostatní listenery
    if (saveEditImageBtn) {
        saveEditImageBtn.addEventListener('click', saveEditedImage);
        console.log('✅ Save edit listener nastaven');
    }
    
    if (cancelEditImageBtn) {
        cancelEditImageBtn.addEventListener('click', () => {
            hideModal(document.getElementById('edit-image-modal'));
        });
        console.log('✅ Cancel edit listener nastaven');
    }
    
    // Nastavení klávesových zkratek
    setupKeyboardNavigation();
    //console.log('✅ Klávesové zkratky nastaveny');
    
    console.log('🎉 Galerie s opraveným indexováním je připravena!');
}

// OPRAVENÁ FUNKCE PRO AKTUALIZACI ZOBRAZENÍ GALERIE
function updateGalleryDisplay() {
    console.log('🔄 Aktualizuji zobrazení galerie...');
    
    const container = document.getElementById('gallery-container');
    if (!container) {
        console.error('❌ Gallery container nenalezen!');
        return;
    }
    
    // Prázdná galerie
    if (galleryImagesData.length === 0) {
        container.innerHTML = '<p>Galerie je prázdná.</p>';
        console.log('📭 Galerie je prázdná');
        return;
    }
    
    container.innerHTML = '';
    
    galleryImagesData.forEach((imgData, index) => {
        const div = document.createElement('div');
        div.className = 'gallery-image-wrapper';
        const isOwner = currentUserId && imgData.userId === currentUserId;

        div.innerHTML = `
            <img src="${imgData.url}" alt="${imgData.name || 'Obrázek z galerie'}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/250x200/cccccc/ffffff?text=Obrázek+nelze+načíst';this.alt='Obrázek nelze načíst';">
            <button class="delete-img-btn ${isEditMode && isOwner ? '' : 'hidden'}" title="Smazat obrázek">&times;</button>
            <i class="fas fa-edit edit-icon ${isEditMode && isOwner ? '' : 'hidden'}" data-image-id="${imgData.id}"></i>
        `;
        
        // OPRAVA: Správné předání indexu při kliku na obrázek
        const img = div.querySelector('img');
        img.addEventListener('click', () => {
            console.log(`🖱️ Klik na obrázek s indexem: ${index}`);
            openImageModal(index);
        });
        
        // Delete button
        const deleteBtn = div.querySelector('.delete-img-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`🗑️ Mazání obrázku: ${imgData.name}`);
                deleteGalleryImageFromFirestore(imgData.id);
            });
        }
        
        // Edit button
        const editIcon = div.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`✏️ Úprava obrázku: ${imgData.name}`);
                editImage(imgData.id);
            });
        }
        
        container.appendChild(div);
    });
    
    console.log(`✅ Zobrazení galerie aktualizováno (${galleryImagesData.length} obrázků)`);
    
    // OPRAVA: Po změně galerie resetujeme index pokud je neplatný
    if (currentModalImageIndex >= galleryImagesData.length) {
        currentModalImageIndex = Math.max(0, galleryImagesData.length - 1);
        console.log(`🔧 Index resetován na: ${currentModalImageIndex}`);
    }
}

// VYLEPŠENÁ DEBUG FUNKCE
function debugGallery() {
    console.log('🔍 === DEBUG GALERIE ===');
    console.log(`📊 Celkem obrázků: ${galleryImagesData.length}`);
    console.log(`📍 Aktuální index: ${currentModalImageIndex}`);
    console.log(`🎯 Aktuální obrázek: ${galleryImagesData[currentModalImageIndex]?.name || 'ŽÁDNÝ/NEPLATNÝ'}`);
    console.log(`✅ Index je platný: ${currentModalImageIndex >= 0 && currentModalImageIndex < galleryImagesData.length}`);
    
    console.log('📋 Seznam všech obrázků:');
    galleryImagesData.forEach((img, index) => {
        const indicator = index === currentModalImageIndex ? '👉 AKTUÁLNÍ' : '  ';
        console.log(`${indicator} [${index}]: ${img.name} - ${img.url.substring(0, 50)}...`);
    });
    
    console.log('🧪 Simulace navigace:');
    if (galleryImagesData.length > 0) {
        const prevIndex = getSafeIndex(currentModalImageIndex - 1);
        const nextIndex = getSafeIndex(currentModalImageIndex + 1);
        console.log(`⬅️ Předchozí: index ${prevIndex} (${galleryImagesData[prevIndex]?.name || 'N/A'})`);
        console.log(`➡️ Další: index ${nextIndex} (${galleryImagesData[nextIndex]?.name || 'N/A'})`);
    }
    
    console.log('🔧 Stav DOM elementů:');
    console.log(`Modal existuje: ${!!document.getElementById('image-modal')}`);
    console.log(`Modal img existuje: ${!!document.getElementById('modal-img')}`);
    console.log(`Prev button existuje: ${!!document.getElementById('prev-image-btn')}`);
    console.log(`Next button existuje: ${!!document.getElementById('next-image-btn')}`);
    
    console.log('======================');
}

// POMOCNÉ FUNKCE (zůstávají stejné)
function isValidHttpUrl(string) {
    let url;
    try { 
        url = new URL(string); 
    }
    catch (_) { 
        return false; 
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

// Funkce pro přidání obrázku (bez změn v logice indexování)
async function handleAddImageUrl() {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro přidání obrázku se musíte přihlásit.");
        return;
    }
    
    const urlInput = document.getElementById('newImageUrl');
    if (!urlInput) {
        console.error("Element #newImageUrl not found for adding gallery image.");
        return;
    }
    
    const imageUrl = urlInput.value.trim();
    if (imageUrl && isValidHttpUrl(imageUrl)) {
        const imageNamePrompt = prompt(`Zadejte název pro obrázek (URL: ${imageUrl.substring(0,50)}...). Prázdné pro výchozí název.`, `Obrázek ${galleryImagesData.length + 1}`);
        let imageName = (imageNamePrompt && imageNamePrompt.trim() !== "") ? imageNamePrompt.trim() : `Obrázek ${galleryImagesData.length + 1}_${Math.floor(Math.random()*1000)}`;
        
        showLoading("Přidávám obrázek...");
        const newImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
            url: imageUrl,
            name: imageName,
            createdAt: Date.now(),
            userId: currentUserId
        };
        
        try {
            galleryImagesData.unshift(newImage); // Přidá na začátek
            await saveDataToFirestore();
            showAlertModal("Obrázek přidán", `Obrázek "${imageName}" byl uložen do cloudu.`);
            urlInput.value = '';
            
            // OPRAVA: Po přidání nového obrázku aktualizuj zobrazení
            updateGalleryDisplay();
            
            hideLoading();
            console.log(`✅ Přidán nový obrázek: ${imageName}, nová velikost galerie: ${galleryImagesData.length}`);
        } catch (error) {
            console.error('Chyba při přidávání obrázku do Firestore:', error);
            showAlertModal("Chyba přidání", `Nepodařilo se přidat obrázek: ${error.message}`);
            hideLoading();
        }
    } else {
        showAlertModal("Neplatná URL", "Zadejte platnou URL adresu obrázku (http:// nebo https://).");
    }
}

// Funkce pro mazání s opravou indexování
async function deleteGalleryImageFromFirestore(idToDelete) {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro smazání obrázku se musíte přihlásit.");
        return;
    }
    
    const imageToDelete = galleryImagesData.find(img => img.id === idToDelete);
    if (!imageToDelete || imageToDelete.userId !== currentUserId) {
        showAlertModal("Přístup zamítnut", "Nemáte oprávnění smazat tento obrázek. Můžete smazat pouze své vlastní obrázky.");
        return;
    }

    const confirmed = await (window.showConfirmModal ?
        showConfirmModal("Smazat obrázek?", `Opravdu smazat "${imageToDelete.name || 'tento obrázek'}"? Tato akce je nevratná!`) :
        confirm(`Smazat obrázek "${imageToDelete.name || 'tento obrázek'}"?`)
    );
    
    if (confirmed) {
        showLoading("Mažu obrázek...");
        try {
            const deletedIndex = galleryImagesData.findIndex(img => img.id === idToDelete);
            galleryImagesData = galleryImagesData.filter(img => img.id !== idToDelete);
            
            // OPRAVA: Korekce indexu po smazání
            if (currentModalImageIndex >= galleryImagesData.length) {
                currentModalImageIndex = Math.max(0, galleryImagesData.length - 1);
                console.log(`🔧 Index po smazání korigován na: ${currentModalImageIndex}`);
            }
            
            await saveDataToFirestore();
            showAlertModal("Obrázek smazán", "Obrázek byl úspěšně smazán z cloudu.");
            
            // Aktualizuj zobrazení
            updateGalleryDisplay();
            
            hideLoading();
            console.log(`✅ Obrázek smazán, nová velikost galerie: ${galleryImagesData.length}`);
        } catch (error) {
            console.error('Chyba při mazání obrázku z Firestore:', error);
            showAlertModal("Chyba mazání", `Nepodařilo se smazat obrázek: ${error.message}`);
            hideLoading();
        }
    }
}

// Funkce pro úpravu obrázku (zůstává stejná)
let editingImageId = null;

async function editImage(imageId) {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro úpravu obrázku se musíte přihlásit.");
        return;
    }
    
    editingImageId = imageId;
    const image = galleryImagesData.find(img => img.id === imageId);
    if (!image || image.userId !== currentUserId) {
        showAlertModal("Přístup zamítnut", "Nemáte oprávnění upravit tento obrázek. Můžete upravit pouze své vlastní obrázky.");
        return;
    }

    if (image) {
        document.getElementById('edit-image-url').value = image.url;
        document.getElementById('edit-image-name').value = image.name;
        showModal(document.getElementById('edit-image-modal'));
    }
}

async function saveEditedImage() {
    if (!currentUserId) {
        showAlertModal("Uložení selhalo", "Pro úpravu obrázku se musíte přihlásit.");
        return;
    }
    
    const url = document.getElementById('edit-image-url').value.trim();
    const name = document.getElementById('edit-image-name').value.trim();

    if (!isValidHttpUrl(url)) {
        showAlertModal("Neplatná URL", "Zadejte platnou URL adresu obrázku (http:// nebo https://).");
        return;
    }

    showLoading("Ukládám upravený obrázek...");
    try {
        const index = galleryImagesData.findIndex(img => img.id === editingImageId);
        if (index !== -1 && galleryImagesData[index].userId === currentUserId) {
            galleryImagesData[index].url = url;
            galleryImagesData[index].name = name;
            await saveDataToFirestore();
            showAlertModal("Obrázek upraven", `Obrázek "${name}" byl úspěšně upraven v cloudu.`);
            
            // OPRAVA: Po úpravě aktualizuj zobrazení
            updateGalleryDisplay();
        } else {
            showAlertModal("Chyba", "Obrázek k úpravě nebyl nalezen nebo nemáte oprávnění.");
        }
        hideModal(document.getElementById('edit-image-modal'));
        hideLoading();
    } catch (error) {
        console.error('Chyba při ukládání upraveného obrázku do Firestore:', error);
        showAlertModal("Chyba ukládání", `Nepodařilo se uložit úpravy obrázku: ${error.message}`);
        hideLoading();
    }
}
//tady končí obrázek


    // --- Externí odkazy (ukládá do Firestore) ---
    function renderExternalLinks() {
        const tableBody = document.querySelector('#links-table tbody');
        if (!tableBody) {
            console.error("Table body for links not found!");
            return;
        }
        tableBody.innerHTML = '';

        if (externalLinksData.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = 'Žádné odkazy.';
            cell.style.textAlign = 'center';
            return;
        }

        externalLinksData.forEach((link, index) => {
            const row = tableBody.insertRow();
            const isOwner = currentUserId && link.userId === currentUserId;

            row.insertCell().innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
            
            const titleCell = row.insertCell();
            const anchor = document.createElement('a');
            anchor.href = link.url;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            anchor.textContent = link.title;
            titleCell.appendChild(anchor);
            
            row.insertCell().textContent = link.url;

            const actionsCell = row.insertCell();
            actionsCell.className = 'edit-mode-only';
            actionsCell.innerHTML = `
                <button class="button btn-secondary edit-link-btn ${isOwner ? '' : 'hidden'}" data-index="${index}">Editovat</button>
                <button class="button btn-danger delete-link-btn ${isOwner ? '' : 'hidden'}" data-index="${index}">Smazat</button>
            `;
            actionsCell.querySelector('.edit-link-btn')?.addEventListener('click', () => editLink(link.id));
            actionsCell.querySelector('.delete-link-btn')?.addEventListener('click', () => deleteLinkFromFirestore(link.id));
        });
    }

    document.getElementById('add-link-btn')?.addEventListener('click', addLink);

    function addLink() {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro přidání odkazu se musíte přihlásit.");
            return;
        }
        editingLinkFirebaseId = null;
        document.getElementById('edit-link-title').value = '';
        document.getElementById('edit-link-url').value = '';
        showModal(document.getElementById('edit-link-modal'));
    }

    let editingLinkFirebaseId = null;
    async function editLink(linkId) {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro úpravu odkazu se musíte přihlásit.");
            return;
        }
        editingLinkFirebaseId = linkId;
        const link = externalLinksData.find(l => l.id === linkId);
        if (!link || link.userId !== currentUserId) {
            showAlertModal("Přístup zamítnut", "Nemáte oprávnění upravit tento odkaz. Můžete upravit pouze své vlastní odkazy.");
            return;
        }
        if (link) {
            document.getElementById('edit-link-title').value = link.title;
            document.getElementById('edit-link-url').value = link.url;
            showModal(document.getElementById('edit-link-modal'));
        }
    }

    async function saveEditedLink() {
        if (!currentUserId) {
            showAlertModal("Uložení selhalo", "Pro úpravu odkazu se musíte přihlásit.");
            return;
        }
        const title = document.getElementById('edit-link-title').value.trim();
        const url = document.getElementById('edit-link-url').value.trim();

        if (!title || !url || !isValidHttpUrl(url)) {
            showAlertModal("Chybějící/neplatné údaje", "Zadejte platný název a URL (http:// nebo https://) pro odkaz.");
            return;
        }

        showLoading("Ukládám odkaz...");
        try {
            if (editingLinkFirebaseId === null) {
                const newLink = {
                    id: `link-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                    title, url,
                    createdAt: Date.now(), // ZMĚNA ZDE: Používáme Date.now() pro časový otisk na straně klienta
                    userId: currentUserId
                };
                externalLinksData.push(newLink);
                showAlertModal("Odkaz přidán", `Odkaz "${title}" byl přidán do cloudu.`);
            } else {
                const index = externalLinksData.findIndex(l => l.id === editingLinkFirebaseId);
                if (index !== -1 && externalLinksData[index].userId === currentUserId) {
                    externalLinksData[index].title = title;
                    externalLinksData[index].url = url;
                    showAlertModal("Odkaz upraven", `Odkaz "${title}" byl upraven v cloudu.`);
                } else {
                    showAlertModal("Chyba", "Odkaz k úpravě nebyl nalezen nebo nemáte oprávnění.");
                }
            }
            await saveDataToFirestore();
            hideModal(document.getElementById('edit-link-modal'));
            hideLoading();
        } catch (error) {
            console.error('Chyba při ukládání odkazu do Firestore:', error);
            showAlertModal("Chyba ukládání", `Nepodařilo se uložit odkaz: ${error.message}`);
            hideLoading();
        }
    }

    async function deleteLinkFromFirestore(idToDelete) {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro smazání odkazu se musíte přihlásit.");
            return;
        }
        const linkToDelete = externalLinksData.find(l => l.id === idToDelete);
        if (!linkToDelete || linkToDelete.userId !== currentUserId) {
            showAlertModal("Přístup zamítnut", "Nemáte oprávnění smazat tento odkaz. Můžete smazat pouze své vlastní odkazy.");
            return;
        }
        const confirmed = await (window.showConfirmModal ?
            showConfirmModal("Smazat odkaz?", `Opravdu smazat odkaz "${linkToDelete.title}"? Tato akce je nevratná!`) :
            confirm(`Smazat odkaz "${linkToDelete.title}"?`)
        );
        if (confirmed) {
            showLoading("Mažu odkaz...");
            try {
                externalLinksData = externalLinksData.filter(link => link.id !== idToDelete);
                await saveDataToFirestore();
                showAlertModal("Odkaz smazán", "Odkaz byl úspěšně smazán z cloudu.");
                hideLoading();
            } catch (error) {
                console.error('Chyba při mazání odkazu z Firestore:', error);
                showAlertModal("Chyba mazání", `Nepodařilo se smazat odkaz: ${error.message}`);
                hideLoading();
            }
        }
    }


    // --- Modální okna (beze změny, jen se teď volají s novou logikou) ---
    function showModal(modalElement) {
        if(modalElement) modalElement.classList.add('visible');
    }
    function hideModal(modalElement) {
        if(modalElement) modalElement.classList.remove('visible');
    }

    const saveCodeModalEl = document.getElementById('save-code-modal');
    const codeTitleInputEl = document.getElementById('code-title-input');
    const confirmSaveCodeBtnEl = document.getElementById('confirm-save-code-btn');
    const cancelSaveCodeBtnEl = document.getElementById('cancel-save-code-btn');

    if(confirmSaveCodeBtnEl && codeTitleInputEl) {
        confirmSaveCodeBtnEl.addEventListener('click', () => {
            const title = codeTitleInputEl.value.trim();
            const editor = document.getElementById('html-editor');
            const code = editor ? editor.value : '';
            if (title && code) {
                saveHtmlCodeToFirestore(title, code);
                if(saveCodeModalEl) hideModal(saveCodeModalEl);
                codeTitleInputEl.value = '';
            } else {
                showAlertModal("Chybějící údaje", "Zadejte název a ujistěte se, že kód není prázdný.");
            }
        });
    }
    if(cancelSaveCodeBtnEl) cancelSaveCodeBtnEl.addEventListener('click', () => {
        if(saveCodeModalEl) hideModal(saveCodeModalEl);
        if(codeTitleInputEl) codeTitleInputEl.value = '';
    });

    if (!window.showAlertModal) {
        window.showAlertModal = (title, message) => {
            console.warn("Custom showAlertModal not fully initialized, using native alert.");
            return new Promise((resolve) => {
                alert(`${title}\n\n${message}`);
                resolve(true);
            });
        };
    }
    if (!window.showConfirmModal) {
        window.showConfirmModal = (title, message, buttonTexts = {}) => {
            console.warn("Custom showConfirmModal not fully initialized, using native confirm.");
            return new Promise((resolve) => {
                resolve(confirm(`${title}\n\n${message}`));
            });
        };
    }

    const alertModalEl = document.getElementById('alert-modal');
    const alertModalTitleEl = document.getElementById('alert-modal-title');
    const alertModalMessageEl = document.getElementById('alert-modal-message');
    let alertModalOkBtnEl = document.getElementById('alert-modal-ok-btn');

    if(alertModalEl && alertModalTitleEl && alertModalMessageEl && alertModalOkBtnEl) {
        window.showAlertModal = (title, message) => {
            return new Promise((resolve) => {
                alertModalTitleEl.textContent = title;
                alertModalMessageEl.textContent = message;
                
                const newOkBtn = alertModalOkBtnEl.cloneNode(true);
                alertModalOkBtnEl.parentNode.replaceChild(newOkBtn, alertModalOkBtnEl);
                alertModalOkBtnEl = newOkBtn;
                
                alertModalOkBtnEl.onclick = () => {
                    hideModal(alertModalEl);
                    resolve(true);
                };
                showModal(alertModalEl);
            });
        };
    }


    const confirmModalEl = document.getElementById('confirm-modal');
    const confirmModalTitleEl = document.getElementById('confirm-modal-title');
    const confirmModalMessageEl = document.getElementById('confirm-modal-message');
    let confirmModalOkBtnEl = document.getElementById('confirm-modal-ok-btn');
    let confirmModalCancelBtnEl = document.getElementById('confirm-modal-cancel-btn');

    if(confirmModalEl && confirmModalTitleEl && confirmModalMessageEl && confirmModalOkBtnEl && confirmModalCancelBtnEl) {
        window.showConfirmModal = (title, message, buttonTexts = {}) => {
            return new Promise((resolve) => {
                confirmModalTitleEl.textContent = title;
                confirmModalMessageEl.textContent = message;

                const newOkBtn = confirmModalOkBtnEl.cloneNode(true);
                newOkBtn.textContent = buttonTexts.okText || 'Potvrdit';
                confirmModalOkBtnEl.parentNode.replaceChild(newOkBtn, confirmModalOkBtnEl);
                confirmModalOkBtnEl = newOkBtn;
                
                const newCancelBtn = confirmModalCancelBtnEl.cloneNode(true);
                newCancelBtn.textContent = buttonTexts.cancelText || 'Zrušit';
                confirmModalCancelBtnEl.parentNode.replaceChild(newCancelBtn, confirmModalCancelBtnEl);
                confirmModalCancelBtnEl = newCancelBtn;

                confirmModalOkBtnEl.onclick = () => {
                    hideModal(confirmModalEl);
                    resolve(true);
                };
                confirmModalCancelBtnEl.onclick = () => {
                    hideModal(confirmModalEl);
                    resolve(false);
                };
                showModal(confirmModalEl);
            });
        };
    }
    
    window.showSection = showSection;


    // --- Nové funkce pro editaci portfolia (ukládá do Firestore) ---
    let editingPortfolioItemId = null;

    async function editPortfolioItem(itemId) {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro úpravu položky se musíte přihlásit.");
        return;
    }
    editingPortfolioItemId = itemId;
    const item = {
        title: editableContentData[`${itemId}-title`] || '',
        desc1: editableContentData[`${itemId}-desc-1`] || '',
        desc2: editableContentData[`${itemId}-desc-2`] || '',
        linkText: editableContentData[`${itemId}-link-text`] || '',
        linkUrl: editableContentData[`${itemId}-link-url`] || '',
        // Přidáme i youtube_url do objektu item pro snazší práci
        youtubeUrl: editableContentData[`${itemId}-youtube-url`] || '', // Nový řádek
        userId: editableContentData[`${itemId}-userId`]
    };

    if (!item.title || item.userId !== currentUserId) {
        showAlertModal("Přístup zamítnut", "Nemáte oprávnění upravit tuto položku portfolia. Můžete upravit pouze své vlastní položky.");
        return;
    }

    document.getElementById('edit-portfolio-title').value = item.title;
    document.getElementById('edit-portfolio-desc-1').value = item.desc1;
    document.getElementById('edit-portfolio-desc-2').value = item.desc2;
    document.getElementById('edit-portfolio-link-text').value = item.linkText;
    document.getElementById('edit-portfolio-link-url').value = item.linkUrl;
    
    // --- NOVÝ KÓD ZDE: NAPLNĚNÍ YOUTUBE INPUTU A AKTIVACE NÁHLEDU ---
    const youtubeInput = document.getElementById('edit-portfolio-youtube');
    youtubeInput.value = item.youtubeUrl; // Načti URL z objektu item
    
    // Spusť input event, aby se zobrazil náhled (jako by uživatel napsal URL)
    const event = new Event('input');
    youtubeInput.dispatchEvent(event);
    // --- KONEC NOVÉHO KÓDU ---

    document.getElementById('delete-portfolio-btn').classList.remove('hidden');
    showModal(document.getElementById('edit-portfolio-modal'));
}

document.getElementById('save-edit-portfolio-btn')?.addEventListener('click', saveEditedPortfolioItem);
document.getElementById('cancel-edit-portfolio-btn')?.addEventListener('click', () => {
    hideModal(document.getElementById('edit-portfolio-modal'));
    // Zde je také potřeba vyčistit náhled YouTube, pokud se modal zavírá
    document.getElementById('youtube-preview-container').style.display = 'none';
    document.getElementById('youtube-preview').src = '';
    document.getElementById('edit-portfolio-youtube').value = '';
}); // Doplňuji zavírací závorku pro addEventListener

document.getElementById('delete-portfolio-btn')?.addEventListener('click', deletePortfolioItem);
document.getElementById('add-portfolio-item-btn')?.addEventListener('click', addPortfolioItem);

function addPortfolioItem() {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro přidání položky se musíte přihlásit.");
        return;
    }
    editingPortfolioItemId = null;
    document.getElementById('edit-portfolio-title').value = '';
    document.getElementById('edit-portfolio-desc-1').value = '';
    document.getElementById('edit-portfolio-desc-2').value = '';
    document.getElementById('edit-portfolio-link-text').value = '';
    document.getElementById('edit-portfolio-link-url').value = '';
    // --- NOVÝ KÓD ZDE: VYČIŠTĚNÍ YOUTUBE INPUTU PŘI PŘIDÁVÁNÍ NOVÉ POLOŽKY ---
    document.getElementById('edit-portfolio-youtube').value = '';
    document.getElementById('youtube-preview-container').style.display = 'none';
    document.getElementById('youtube-preview').src = '';
    // --- KONEC NOVÉHO KÓDU ---
    document.getElementById('delete-portfolio-btn').classList.add('hidden');
    showModal(document.getElementById('edit-portfolio-modal'));
}

    async function saveEditedPortfolioItem() {
        if (!currentUserId) {
            showAlertModal("Uložení selhalo", "Pro úpravu položky se musíte přihlásit.");
            return;
        }
        const title = document.getElementById('edit-portfolio-title').value.trim();
        const desc1 = document.getElementById('edit-portfolio-desc-1').value.trim();
        const desc2 = document.getElementById('edit-portfolio-desc-2').value.trim();
        const linkText = document.getElementById('edit-portfolio-link-text').value.trim();
        const linkUrl = document.getElementById('edit-portfolio-link-url').value.trim();

        if (!title || !desc1) {
            showAlertModal("Chybějící údaje", "Vyplňte prosím název a první popis položky portfolia.");
            return;
        }
        if (linkUrl && !isValidHttpUrl(linkUrl)) {
            showAlertModal("Neplatná URL", "Zadejte platnou URL adresu pro odkaz (http:// nebo https://).");
            return;
        }

        showLoading("Ukládám položku portfolia...");
        try {
            const newId = editingPortfolioItemId || `portfolio-item-${Date.now()}`;
            
            editableContentData[`${newId}-title`] = title;
            editableContentData[`${newId}-desc-1`] = desc1;
            editableContentData[`${newId}-desc-2`] = desc2;
            editableContentData[`${newId}-link-text`] = linkText;
             editableContentData[`${newId}-link-url`] = linkUrl;
            // --- NOVÝ KÓD ZDE: ULOŽENÍ YOUTUBE URL ---
            const youtubeUrl = document.getElementById('edit-portfolio-youtube').value.trim();
            editableContentData[`${newId}-youtube-url`] = youtubeUrl; // Uložíme YouTube URL
            // --- KONEC NOVÉHO KÓDU ---
            editableContentData[`${newId}-userId`] = currentUserId;
            editableContentData[`${newId}-createdAt`] = Date.now();

            await saveDataToFirestore(); 

            if (!editingPortfolioItemId) {
                showAlertModal("Položka přidána", `Nová položka portfolia "${title}" byla přidána do cloudu.`);
            } else {
                showAlertModal("Položka upravena", `Položka portfolia "${title}" byla upravena v cloudu.`);
            }
            hideModal(document.getElementById('edit-portfolio-modal'));
            hideLoading();
            editingPortfolioItemId = null;
        } catch (error) {
            console.error('Chyba při ukládání položky portfolia do Firestore:', error);
            showAlertModal("Chyba ukládání", `Nepodařilo se uložit položku portfolia: ${error.message}`);
            hideLoading();
        }
    }

    async function deletePortfolioItem() {
        if (!currentUserId) {
            showAlertModal("Přístup zamítnut", "Pro smazání položky se musíte přihlásit.");
            return;
        }
        if (!editingPortfolioItemId) return;

        if (editableContentData[`${editingPortfolioItemId}-userId`] !== currentUserId) {
            showAlertModal("Přístup zamítnut", "Nemáte oprávnění smazat tuto položku portfolia. Můžete smazat pouze své vlastní položky.");
            return;
        }

        const confirmed = await (window.showConfirmModal ?
            showConfirmModal("Smazat položku portfolia?", "Opravdu chcete smazat tuto položku z portfolia? Tato akce je nevratná! Smaže se i z cloudu pro všechny!", { okText: 'Ano, smazat', cancelText: 'Zrušit' }) :
            confirm("Opravdu chcete smazat tuto položku z portfolia? Tato akce je nevratná!")
        );

        if (confirmed) {
            showLoading("Mažu položku portfolia...");
            try {
                delete editableContentData[`${editingPortfolioItemId}-title`];
                delete editableContentData[`${editingPortfolioItemId}-desc-1`];
                delete editableContentData[`${editingPortfolioItemId}-desc-2`];
                delete editableContentData[`${editingPortfolioItemId}-link-text`];
                delete editableContentData[`${editingPortfolioItemId}-link-url`];
                delete editableContentData[`${editingPortfolioItemId}-userId`];
                delete editableContentData[`${editingPortfolioItemId}-createdAt`]; // ZMĚNA ZDE: Smažeme i createdAt

                await saveDataToFirestore();
                showAlertModal("Položka smazána", "Položka portfolia byla úspěšně smazána z cloudu.");
                hideLoading();
            } catch (error) {
                console.error('Chyba při mazání položky portfolia z Firestore:', error);
                showAlertModal("Chyba mazání", `Nepodařilo se smazat položku portfolia: ${error.message}`);
                hideLoading();
            }
            hideModal(document.getElementById('edit-portfolio-modal'));
            editingPortfolioItemId = null;
        }
    }

    // --- Pomocný script pro správu viditelnosti tlačítek (od Claude.AI) ---
    (function() {
        'use strict';
        
        // Funkce pro skrytí tlačítek správy dat
        function hideDataManagementButtons() {
            const container = document.querySelector('.function-setupDataManagement');
            if (container) {
                container.style.display = 'none';
            }
        }
        
        // Funkce pro zobrazení tlačítek správy dat
        function showDataManagementButtons() {
            const container = document.querySelector('.function-setupDataManagement');
            if (container) {
                container.style.display = 'flex'; // Změna na flex, pokud používáš flexbox pro layout
            }
        }
        
        // Sledování změn na body elementu
        function observeEditMode() {
            const body = document.body;
            
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (body.classList.contains('edit-mode')) {
                            showDataManagementButtons();
                        } else {
                            hideDataManagementButtons();
                        }
                    }
                });
            });
            
            observer.observe(body, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            // Kontrola současného stavu při načtení
            if (body.classList.contains('edit-mode')) {
                showDataManagementButtons();
            } else {
                hideDataManagementButtons();
            }
        }
        
        // Inicializace
        function initDataManagementVisibility() {
            hideDataManagementButtons();
            observeEditMode();
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDataManagementVisibility);
        } else {
            initDataManagementVisibility();
        }
        
        window.hideDataManagementButtons = hideDataManagementButtons;
        window.showDataManagementButtons = showDataManagementButtons;
        
    })();

    // --- Pomocní script pro heslo před přechodem k přihlášení a registrace (od Claude.AI) ---
    (function() {
        'use strict';

        const HARDCODED_ACCESS_PASSWORD_HASH = '256b5537a792c98a13c9b32bb6b6c90f0e63531fe77c3b4dee69ee1ca82c984b';

        const loginButton = document.getElementById('login-button');

        if (!loginButton) {
            console.warn("Gemini Helper: Tlačítko pro přihlášení (login-button) nebylo nalezeno. Pomocný script se nespustí.");
            return;
        }

        async function hashString(text) {
            const textEncoder = new TextEncoder();
            const data = textEncoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hexHash;
        }

        function showCustomPromptModal(modalId, inputId, errorId = null) {
            return new Promise(resolve => {
                const modal = document.getElementById(modalId);
                const input = document.getElementById(inputId);
                const okBtn = modal.querySelector('#' + modalId + ' #local-password-ok-btn');
                const cancelBtn = modal.querySelector('#' + modalId + ' #local-password-cancel-btn');
                const errorEl = errorId ? document.getElementById(errorId) : null;

                if (!modal || !input || !okBtn || !cancelBtn) {
                    console.error(`Chyba: Chybí HTML elementy pro vlastní prompt modal (${modalId}). Zkontrolujte ID.`);
                    resolve(null);
                    return;
                }

                input.value = '';
                if (errorEl) errorEl.textContent = '';

                const clearListeners = () => {
                    okBtn.onclick = null;
                    cancelBtn.onclick = null;
                    input.removeEventListener('keydown', handleEnterKey);
                };

                const handleEnterKey = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        okBtn.click();
                    }
                };
                input.addEventListener('keydown', handleEnterKey);

                okBtn.onclick = () => {
                    clearListeners();
                    window.hideModal(modal);
                    resolve(input.value);
                };
                cancelBtn.onclick = () => {
                    clearListeners();
                    window.hideModal(modal);
                    resolve(null);
                };

                window.showModal(modal);
                input.focus();
            });
        }

        async function handleLocalAccessPasswordHashedCustomModal() {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                console.log("Gemini Helper: Uživatel je již přihlášen přes Supabase. Lokální hardcoded heslo přeskočeno.");
                window.showAuthModal();
                return;
            }

            const enteredPassword = await showCustomPromptModal(
                'local-password-modal',
                'local-password-input',
                'local-password-error'
            );
            
            if (enteredPassword === null) {
                console.log("Gemini Helper: Zadání hesla zrušeno uživatelem.");
                const errorEl = document.getElementById('local-password-error');
                if (errorEl) errorEl.textContent = '';
                return;
            }

            const enteredPasswordHash = await hashString(enteredPassword);
            
            if (enteredPasswordHash === HARDCODED_ACCESS_PASSWORD_HASH) {
                console.log("Gemini Helper: Lokální heslo (hash) správně, přístup povolen.");
                window.showAuthModal();
            } else {
                const errorEl = document.getElementById('local-password-error');
                if (errorEl) {
                    errorEl.textContent = "Chybné heslo! Zkuste to znovu.";
                    window.showModal(document.getElementById('local-password-modal'));
                    document.getElementById('local-password-input').focus();
                } else {
                    alert("Chybné heslo. Přístup zamítnut.");
                }
                console.log("Gemini Helper: Lokální heslo (hash) chybné, přístup zamítnut.");
            }
        }

        loginButton.onclick = handleLocalAccessPasswordHashedCustomModal;

    })();
// logout_button_helper.js
// Specializovaný pomocný script pro správu viditelnosti tlačítka "Odhlásit se"

(function() {
    'use strict';

    // Získáme referenci na tlačítko "Odhlásit se"
    const logoutButton = document.getElementById('logout-button');

    // Pokud tlačítko neexistuje, script se nespustí, aby nedošlo k chybě.
    if (!logoutButton) {
        console.warn("Logout Button Helper: Tlačítko s ID 'logout-button' nebylo nalezeno. Script se nespustí.");
        return;
    }

    // Supabase klient by měl být globálně dostupný (jak je nastaveno v hlavním scriptu)
    if (typeof supabaseClient === 'undefined') {
        console.error("Logout Button Helper: supabaseClient není definován. Ujistěte se, že Supabase SDK je načteno a inicializováno před tímto scriptem.");
        logoutButton.classList.add('hidden'); // Skryjeme tlačítko pro jistotu
        return;
    }

    // Nasloucháme změnám stavu autentizace od Supabase
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // Uživatel je přihlášen, zobrazíme tlačítko "Odhlásit se"
            logoutButton.classList.remove('hidden');
            console.log("Logout Button Helper: Uživatel přihlášen, tlačítko 'Odhlásit se' zobrazeno.");
        } else {
            // Uživatel není přihlášen, skryjeme tlačítko "Odhlásit se"
            logoutButton.classList.add('hidden');
            console.log("Logout Button Helper: Uživatel odhlášen, tlačítko 'Odhlásit se' skryto.");
        }
    });

    // Počáteční kontrola stavu při načtení stránky, aby se tlačítko správně zobrazilo/skrylo
    // (tato kontrola se spustí i z onAuthStateChange, ale pro jistotu ji lze nechat i zde pro okamžitou reakci DOM)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            logoutButton.classList.remove('hidden');
        } else {
            logoutButton.classList.add('hidden');
        }
    });

})(); // Okamžitě spuštěná anonymní funkce


// --- OPRAVENÉ FUNKCE BEZ setupModalEventListeners ---

// Opravená addLink() - bez volání setupModalEventListeners
addLink = function() {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro přidání odkazu se musíte přihlásit.");
        return;
    }
    editingLinkFirebaseId = null; // null indikuje, že se přidává nový odkaz
    document.getElementById('edit-link-title').value = '';
    document.getElementById('edit-link-url').value = '';
    showModal(document.getElementById('edit-link-modal'));
    
    // ODSTRANĚNO: setupModalEventListeners(); - event listenery jsou už připojené v DOMContentLoaded
};

// Opravená editLink() - bez volání setupModalEventListeners
editLink = async function(linkId) {
    if (!currentUserId) {
        showAlertModal("Přístup zamítnut", "Pro úpravu odkazu se musíte přihlásit.");
        return;
    }
    
    editingLinkFirebaseId = linkId;
    const link = externalLinksData.find(l => l.id === linkId);

    if (!link) {
        showAlertModal("Chyba", "Odkaz k úpravě nebyl nalezen.");
        return;
    }
    
    // Kontrola vlastnictví
    if (link.userId !== currentUserId) {
        showAlertModal("Přístup zamítnut", "Nemáte oprávnění upravit tento odkaz. Můžete upravit pouze své vlastní odkazy.");
        return;
    }

    document.getElementById('edit-link-title').value = link.title;
    document.getElementById('edit-link-url').value = link.url;
    showModal(document.getElementById('edit-link-modal'));
    
    // ODSTRANĚNO: setupModalEventListeners(); - event listenery jsou už připojené v DOMContentLoaded
};

// --- ROBUSTNÍ EVENT LISTENERY S POJISTKOU ---
// Funkce pro bezpečné připojení event listenerů
function attachEventListenerSafely(elementId, eventType, handler, description) {
    const element = document.getElementById(elementId);
    if (element) {
        // Odebereme všechny existující listenery
        element.onclick = null;
        element.removeEventListener(eventType, handler);
        
        // Připojíme nový listener
        element.addEventListener(eventType, handler);
        console.log(`✅ Event listener pro ${description} byl úspěšně připojen`);
        return true;
    } else {
        console.warn(`⚠️ Element s ID "${elementId}" pro ${description} nebyl nalezen`);
        return false;
    }
}

// Funkce pro inicializaci všech event listenerů
function initializeAllEventListeners() {
    console.log('🔧 Inicializuji event listenery pro externí odkazy...');
    
    // Tlačítko "Přidat odkaz"
    attachEventListenerSafely('add-link-btn', 'click', addLink, 'tlačítko Přidat odkaz');
    
    // Tlačítko "Uložit" v modálu
    attachEventListenerSafely('save-edited-link-btn', 'click', saveEditedLink, 'tlačítko Uložit');
    
    // Tlačítko "Zrušit" v modálu
    attachEventListenerSafely('cancel-edit-link-btn', 'click', function() {
        hideModal(document.getElementById('edit-link-modal'));
    }, 'tlačítko Zrušit');
    
    console.log('✨ Všechny event listenery byly inicializovány');
}

// Zbytek funkcí zůstává stejný...
// Připojení event listenerů při načtení stránky + další pojistky
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM je načten, inicializuji event listenery...');
    initializeAllEventListeners();
});

// Další pojistka - pokud by se stránka načetla dříve než DOMContentLoaded
if (document.readyState === 'loading') {
    console.log('📋 Čekám na dokončení načítání DOM...');
    document.addEventListener('DOMContentLoaded', initializeAllEventListeners);
} else {
    console.log('📋 DOM už je načten, inicializuji okamžitě...');
    initializeAllEventListeners();
}

// Poslední pojistka - inicializace po načtení celé stránky
window.addEventListener('load', function() {
    console.log('🔄 Stránka kompletně načtena, kontroluji event listenery...');
    // Zkontrolujeme, jestli jsou tlačítka funkční
    setTimeout(() => {
        const addBtn = document.getElementById('add-link-btn');
        const saveBtn = document.getElementById('save-edited-link-btn');
        const cancelBtn = document.getElementById('cancel-edit-link-btn');
        
        if (!addBtn?.onclick && !addBtn?.addEventListener) {
            console.warn('🚨 Znovu inicializuji event listenery jako pojistku...');
            initializeAllEventListeners();
        }
    }, 100);
});

    //TADY JE POMOCNÍ SCRIPT PO YOUTUBE VIDEO HTTPS 

   // JavaScript pro YouTube video náhled
function getYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Event listener pro YouTube input pole
document.getElementById('edit-portfolio-youtube').addEventListener('input', function() {
    const url = this.value;
    const previewContainer = document.getElementById('youtube-preview-container');
    const previewIframe = document.getElementById('youtube-preview');
    
    if (url.trim() === '') {
        previewContainer.style.display = 'none';
        return;
    }
    
    const videoId = getYouTubeVideoId(url);
    
    if (videoId) {
        // Vytvoření embed URL
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        previewIframe.src = embedUrl;
        previewContainer.style.display = 'block';
    } else {
        previewContainer.style.display = 'none';
    }
});

// Vyčištění náhledu při zavření modalu
document.getElementById('cancel-edit-portfolio-btn').addEventListener('click', function() {
    document.getElementById('youtube-preview-container').style.display = 'none';
    document.getElementById('youtube-preview').src = '';
    document.getElementById('edit-portfolio-youtube').value = '';
});
    
    // Přidej tohle do konzole a pak zkus navigaci
let originalNavigate = navigateImageModal;
navigateImageModal = function(direction) {
    //console.log(`🎭 APRÍLOVÁ NAVIGACE START: direction=${direction}`);
    //console.log(`📍 Před: currentModalImageIndex=${currentModalImageIndex}`);
    
    let result = originalNavigate.call(this, direction);
    
    //console.log(`📍 Po: currentModalImageIndex=${currentModalImageIndex}`);
    //console.log(`🎭 APRÍLOVÁ NAVIGACE END`);
    
    return result;
};


document.addEventListener('DOMContentLoaded', (event) => {
    console.log('🚀 Nový modal system - inicializace s PLÁN B CSS...');

    // === PLÁN B: VLOŽENÍ CSS PŘÍMO DO JAVASCRIPTU ===
    function injectModalCSS() {
        console.log('💉 Vkládám CSS styly přímo do stránky (PLÁN B)...');
        
        // Zkontrolujeme, zda už CSS není vloženo
        if (document.getElementById('modal-emergency-css')) {
            console.log('⚠️ CSS už je vloženo, přeskakujem...');
            return;
        }

        const cssStyles = `
            /* VYČIŠTĚNÝ CSS PRO MODAL - MÉNĚ AGRESIVNÍ VERZE */

/* Základní styl pro celý modal overlay */
div#url-edit-modal.url-edit-modal.modal,
#url-edit-modal.url-edit-modal.modal {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(8px) !important;
    
    opacity: 0 !important;
    visibility: hidden !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 2000 !important;
    
    transition: all 0.3s ease !important;
}

/* Aktivní stav modalu */
div#url-edit-modal.url-edit-modal.modal.active,
#url-edit-modal.url-edit-modal.modal.active {
    opacity: 1 !important;
    visibility: visible !important;
}

/* Obsahová krabice modalu */
div#url-edit-modal .url-modal-content,
#url-edit-modal .url-modal-content {
    background: #2a2a2a !important;
    border: 1px solid #555 !important;
    border-radius: 12px !important;
    padding: 30px !important;
    max-width: 500px !important;
    width: 90% !important;
    color: #ffffff !important;
    text-align: center !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

/* Nadpis */
div#url-edit-modal .url-modal-content h3,
#url-edit-modal .url-modal-content h3 {
    color: #ffffff !important;
    margin-bottom: 25px !important;
    font-size: 1.4rem !important;
    font-weight: 600 !important;
}

/* Input pole */
div#url-edit-modal .url-modal-content input[type="text"],
div#url-edit-modal .url-modal-content input[type="url"],
div#url-edit-modal .url-modal-content #url-edit-title-input,
div#url-edit-modal .url-modal-content #url-edit-url-input,
#url-edit-modal .url-modal-content input[type="text"],
#url-edit-modal .url-modal-content input[type="url"],
#url-edit-modal .url-modal-content #url-edit-title-input,
#url-edit-modal .url-modal-content #url-edit-url-input {
    width: 100% !important;
    padding: 12px 16px !important;
    margin: 10px 0 !important;
    border: 1px solid #555 !important;
    border-radius: 8px !important;
    background: #3a3a3a !important;
    color: #ffffff !important;
    font-size: 1rem !important;
    transition: all 0.2s ease !important;
    box-sizing: border-box !important;
}

/* Placeholder */
div#url-edit-modal .url-modal-content input::placeholder,
#url-edit-modal .url-modal-content input::placeholder {
    color: #999 !important;
}

/* Fokus na input */
div#url-edit-modal .url-modal-content input:focus,
#url-edit-modal .url-modal-content input:focus {
    outline: none !important;
    border-color: #6b9bd1 !important;
    background: #444 !important;
    box-shadow: 0 0 0 2px rgba(107, 155, 209, 0.3) !important;
}

/* Hover na input */
div#url-edit-modal .url-modal-content input:hover,
#url-edit-modal .url-modal-content input:hover {
    border-color: #777 !important;
}

/* Popisky */
div#url-edit-modal .url-modal-content label,
#url-edit-modal .url-modal-content label {
    display: block !important;
    text-align: left !important;
    color: #ddd !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
    margin-top: 15px !important;
    margin-bottom: 5px !important;
}

/* Kontejner pro tlačítka */
div#url-edit-modal .url-modal-buttons,
#url-edit-modal .url-modal-buttons {
    display: flex !important;
    gap: 15px !important;
    justify-content: center !important;
    margin-top: 25px !important;
}

/* Základní styl tlačítek */
div#url-edit-modal .url-modal-buttons button,
#url-edit-modal .url-modal-buttons button {
    padding: 10px 20px !important;
    border: none !important;
    border-radius: 6px !important;
    font-size: 0.95rem !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    min-width: 100px !important;
}

/* Primární tlačítko (Uložit) */
div#url-edit-modal .url-modal-buttons #url-edit-save-btn,
#url-edit-modal .url-modal-buttons #url-edit-save-btn {
    background: #6b9bd1 !important;
    color: #ffffff !important;
}

div#url-edit-modal .url-modal-buttons #url-edit-save-btn:hover,
#url-edit-modal .url-modal-buttons #url-edit-save-btn:hover {
    background: #5a8bc2 !important;
    transform: translateY(-1px) !important;
}

/* Sekundární tlačítko (Zrušit) */
div#url-edit-modal .url-modal-buttons #url-edit-cancel-btn,
#url-edit-modal .url-modal-buttons #url-edit-cancel-btn {
    background: #666 !important;
    color: #ffffff !important;
}

div#url-edit-modal .url-modal-buttons #url-edit-cancel-btn:hover,
#url-edit-modal .url-modal-buttons #url-edit-cancel-btn:hover {
    background: #555 !important;
    transform: translateY(-1px) !important;
}

/* === RESPONZIVNÍ STYLY PRO RŮZNÁ ZAŘÍZENÍ === */
/* ... (zde by pokračovaly responzivní styly, zkráceno pro přehlednost) ... */
        `;

        // Vytvoříme style element a vložíme CSS
        const styleElement = document.createElement('style');
        styleElement.id = 'modal-emergency-css';
        styleElement.type = 'text/css';
        styleElement.innerHTML = cssStyles;
        
        // Vložíme do head s nejvyšší prioritou
        document.head.appendChild(styleElement);
        
        console.log('✅ PLÁN B CSS úspěšně vložen do stránky!');
    }

    // OKAMŽITĚ vložíme CSS
    injectModalCSS();

    // === TVŮJ PŮVODNÍ JAVASCRIPT (BEZE ZMĚN) ===
    
    // NOVÉ NÁZVY ELEMENTŮ
    const urlEditModal = document.getElementById('url-edit-modal');
    const urlEditTitleInput = document.getElementById('url-edit-title-input');
    const urlEditUrlInput = document.getElementById('url-edit-url-input');
    const urlEditCancelBtn = document.getElementById('url-edit-cancel-btn');
    const urlEditSaveBtn = document.getElementById('url-edit-save-btn');

    // Debug: Kontrola existence elementů
    console.log('📋 Kontrola nových elementů:');
    console.log('URL Modal:', urlEditModal ? '✅' : '❌');
    console.log('Title input:', urlEditTitleInput ? '✅' : '❌');
    console.log('URL input:', urlEditUrlInput ? '✅' : '❌');
    console.log('Cancel btn:', urlEditCancelBtn ? '✅' : '❌');
    console.log('Save btn:', urlEditSaveBtn ? '✅' : '❌');

    if (!urlEditModal || !urlEditTitleInput || !urlEditUrlInput || !urlEditCancelBtn || !urlEditSaveBtn) {
        console.error("❌ Chyba: Některé elementy nového modalu nebyly nalezeny!");
        alert("Chyba při načítání nového URL editoru. Zkontrolujte konzoli.");
        return;
    }

    let currentLinkBeingEdited = null;

    // === PLÁN B: FUNKCE S INLINE STYLY PRO EXTRA JISTOTU ===
    function forceModalStyles(element, show = false) {
        if (!element) return;
        
        if (show) {
            // Zobrazit modal - INLINE styly s nejvyšší prioritou
            element.style.cssText = `
                display: flex !important;
                position: fixed !important;
                z-index: 999999 !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.6) !important;
                backdrop-filter: blur(3px) !important;
                align-items: center !important;
                justify-content: center !important;
            `;
            console.log('🔧 PLÁN B: Modal zobrazen pomocí inline stylů');
        } else {
            // Skrýt modal
            element.style.cssText = `
                display: none !important;
            `;
            console.log('🔧 PLÁN B: Modal skryt pomocí inline stylů');
        }
    }

    // Funkce pro otevření nového modalu
    function openUrlEditModal(linkElement) {
        console.log('🔓 Otevírám nový URL modal pro element:', linkElement);
        currentLinkBeingEdited = linkElement;

        // Získání aktuálních hodnot
        const linkTextSpan = linkElement.querySelector('[data-url-editable-text]');
        const linkUrl = linkElement.getAttribute('href');

        const currentTitle = linkTextSpan ? linkTextSpan.textContent.trim() : '';
        const currentUrl = linkUrl || '';

        console.log('📝 Aktuální hodnoty:');
        console.log(' Název:', currentTitle);
        console.log(' URL:', currentUrl);

        // Vyplnění formuláře
        urlEditTitleInput.value = currentTitle;
        urlEditUrlInput.value = currentUrl;

        // PLÁN A: Přidání třídy 'active' k modalu pro zobrazení
        urlEditModal.classList.add('active'); 

        // PLÁN B: FORCE inline styly pro extra jistotu
        setTimeout(() => {
            forceModalStyles(urlEditModal, true);
        }, 50);

        // Focus na první input
        setTimeout(() => {
            urlEditTitleInput.focus();
            urlEditTitleInput.select();
        }, 100);

        console.log('✅ Nový modal otevřen (PLÁN A + PLÁN B)');
    }

    // Funkce pro zavření nového modalu
    function closeUrlEditModal() {
        console.log('🔒 Zavírám nový URL modal');
        
        // PLÁN A: Odebrání třídy 'active' z modalu pro skrytí
        urlEditModal.classList.remove('active');
        
        // PLÁN B: FORCE inline styly pro skrytí
        forceModalStyles(urlEditModal, false);
        
        currentLinkBeingEdited = null;
    }

    // Event listenery pro tlačítka v novém modalu (zůstávají stejné)
    urlEditCancelBtn.addEventListener('click', () => {
        console.log('❌ Zrušeno uživatelem (nový modal)');
        closeUrlEditModal();
    });

    // NAHRAĎTE ČÁST S urlEditSaveBtn.addEventListener V VAŠEM MODAL SOUBORU
    urlEditSaveBtn.addEventListener('click', async () => {
        console.log('💾 Ukládám změny (nový modal)...');

        if (currentLinkBeingEdited) {
            const newLinkTitle = urlEditTitleInput.value.trim();
            const newLinkUrl = urlEditUrlInput.value.trim();

            // Validace
            if (!newLinkTitle) {
                alert('Název odkazu nesmí být prázdný!');
                urlEditTitleInput.focus();
                return;
            }

            if (!newLinkUrl) {
                alert('URL adresa nesmí být prázdná!');
                urlEditUrlInput.focus();
                return;
            }

            console.log('📝 Nové hodnoty:');
            console.log(' Název:', newLinkTitle);
            console.log(' URL:', newLinkUrl);

            // Aktualizace HTML elementů
            const linkTextSpan = currentLinkBeingEdited.querySelector('[data-url-editable-text]');
            if (linkTextSpan) {
                linkTextSpan.textContent = newLinkTitle;
            }
            currentLinkBeingEdited.setAttribute('href', newLinkUrl);

            // Získání project ID
            const parentPortfolioItem = currentLinkBeingEdited.closest('.portfolio-item');
            const projectId = parentPortfolioItem ? parentPortfolioItem.dataset.itemId : 'unknown-id';

            console.log('🔥 Ukládám data do Firebase:');
            console.log(' Project ID:', projectId);
            console.log(' Link Title:', newLinkTitle);
            console.log(' Link URL:', newLinkUrl);

            // KLÍČOVÁ ZMĚNA: Skutečné uložení do Firestore
            try {
                // Zobrazíme loading (pokud máte funkci showLoading)
                if (typeof showLoading === 'function') {
                    showLoading("Ukládám změny URL...");
                }
                
                // Zavoláme funkci pro uložení URL dat
                const success = await saveUrlDataToFirestore(projectId, { 
                    linkText: newLinkTitle, 
                    linkUrl: newLinkUrl 
                });
                
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                
                if (success) {
                    if (typeof showAlertModal === 'function') {
                        showAlertModal("Úspěch", `URL odkaz byl úspěšně uložen!\nNázev: ${newLinkTitle}\nURL: ${newLinkUrl}`);
                    } else {
                        alert(`URL odkaz byl úspěšně uložen!\nNázev: ${newLinkTitle}\nURL: ${newLinkUrl}`);
                    }
                    console.log('✅ URL změny uloženy do Firestore');
                } else {
                    if (typeof showAlertModal === 'function') {
                        showAlertModal("Chyba", "Nepodařilo se uložit změny URL do cloudu.");
                    } else {
                        alert("Nepodařilo se uložit změny URL do cloudu.");
                    }
                }
            } catch (error) {
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                console.error('❌ Chyba při ukládání URL:', error);
                if (typeof showAlertModal === 'function') {
                    showAlertModal("Chyba", `Chyba při ukládání: ${error.message}`);
                } else {
                    alert(`Chyba při ukládání: ${error.message}`);
                }
            }
        }

        closeUrlEditModal();
    });

    // Zavření modalu kliknutím mimo něj (zůstává stejné)
    window.addEventListener('click', (event) => {
        if (event.target === urlEditModal) {
            console.log('🖱️ Zavírám nový URL modal (klik mimo)');
            closeUrlEditModal();
        }
    });

    // EVENT LISTENER pro nová tlačítka "Upravit URL" (zůstává stejné)
    console.log('🔍 Hledám URL edit tlačítek v #cloude-projek-test...');

    const urlEditButtons = document.querySelectorAll('#cloude-projek-test .url-edit-button');

    console.log('📊 Nalezeno URL edit tlačítek:', urlEditButtons.length);

    urlEditButtons.forEach((urlEditButton, index) => {
        console.log(`🔧 Přidávám listener pro URL tlačítko ${index + 1}`);

        urlEditButton.addEventListener('click', (event) => {
            console.log('🖱️ Kliknuto na URL edit tlačítko:', event.currentTarget);

            event.stopPropagation();
            event.preventDefault();

            // Najdeme rodičovský portfolio-item
            const portfolioItem = event.currentTarget.closest('.portfolio-item');
            if (!portfolioItem) {
                console.error('❌ Nenalezen .portfolio-item');
                return;
            }

            // Najdeme odkaz v tomto portfolio-item
            const linkToEdit = portfolioItem.querySelector('a.editable-link');

            if (linkToEdit) {
                console.log('✅ Nalezen odkaz pro URL editaci:', linkToEdit);
                openUrlEditModal(linkToEdit);
            } else {
                console.error('❌ Nenalezen odkaz pro URL editaci');
                alert('Chyba: Nepodařilo se najít odkaz pro editaci URL.');
            }
        });
    });

    // Klávesové zkratky pro nový modal (zůstávají stejné)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && (urlEditModal.classList.contains('active') || urlEditModal.style.display === 'flex')) {
            console.log('⌨️ Zavírám nový URL modal (Escape)');
            closeUrlEditModal();
        }

        // Ctrl+Enter pro rychlé uložení
        if (event.ctrlKey && event.key === 'Enter' && (urlEditModal.classList.contains('active') || urlEditModal.style.display === 'flex')) {
            console.log('⌨️ Rychlé uložení (Ctrl+Enter)');
            urlEditSaveBtn.click();
        }
    });

    console.log('🎉 Nový URL modal systém inicializován s PLÁN B podporou!');
    console.log('📋 PLÁN A: CSS třídy (.active)');
    console.log('📋 PLÁN B: Inline CSS styly s !important');
    console.log('📋 PLÁN C: Injected CSS do <head> s maximální prioritou');
});  
    //tady je dynamicky vkladač pro obrázky?
    
    document.addEventListener('DOMContentLoaded', function() {
    const projectImagesData = {
        'zly-obrazek-1': {
            src: 'https://img40.rajce.idnes.cz/d4003/19/19517/19517492_984d6887838eae80a8eb677199393188/images/Moderni-foto-editor.jpg?ver=1',
            desktop: { 
                width: '450px', 
                height: '250px', 
                objectFit: 'cover', 
                borderRadius: '12px',
                border: '5px solid black' // Příklad: 2px tlustý, plný, světle šedý rámeček
            },
            mobile: { 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain', 
                borderRadius: '6px',
                border: '1px solid black' // Může být tenčí na mobilu
            }
        },
        'zly-obrazek-2': {
            src: 'https://img40.rajce.idnes.cz/d4003/19/19517/19517492_984d6887838eae80a8eb677199393188/images/Star-Trek-Hudebni-Prehravac.jpg?ver=2',
            desktop: { 
                width: '450px', 
                height: '250px', 
                objectFit: 'cover', 
                borderRadius: '12px',
                border: '5px solid #00ffff' // Příklad: světle modrý rámeček
            },
            mobile: { 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain', 
                borderRadius: '6px',
                border: '1px solid #00ffff'
            }
        },
        'zly-obrazek-3': {
            src: 'https://img40.rajce.idnes.cz/d4003/19/19517/19517492_984d6887838eae80a8eb677199393188/images/pokrocili-vahovy-tracker.jpg?ver=3',
            desktop: { 
                width: '450px', 
                height: '250px', 
                objectFit: 'cover', 
                borderRadius: '12px',
                border: '5px solid #a0a0a0' // Příklad: tmavší šedý rámeček
            },
            mobile: { 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain', 
                borderRadius: '6px',
                border: '1px solid #a0a0a0'
            }
        },
        'zly-obrazek-4': {
            src: 'https://img40.rajce.idnes.cz/d4003/19/19517/19517492_984d6887838eae80a8eb677199393188/images/mapy-html-kodu.jpg?ver=0',
            desktop: { 
                width: '450px', 
                height: '250px', 
                objectFit: 'cover', 
                borderRadius: '12px',
                border: '5px solid #5cb85c' // Příklad: zelený rámeček
            },
            mobile: { 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain', 
                borderRadius: '6px',
                border: '1px solid #5cb85c'
            }
        }
    };

    const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

    function applyImageStyles(imgElement, imgData) {
        let stylesToApply;
        if (mobileMediaQuery.matches) {
            stylesToApply = imgData.mobile;
        } else {
            stylesToApply = imgData.desktop;
        }

        imgElement.style.width = stylesToApply.width;
        imgElement.style.height = stylesToApply.height;
        imgElement.style.objectFit = stylesToApply.objectFit;
        imgElement.style.borderRadius = stylesToApply.borderRadius;
        // NOVÝ ŘÁDEK: Aplikace rámečku
        imgElement.style.border = stylesToApply.border;
    }

    // Funkce pro načtení obrázků a aplikování počátečních stylů (zde zůstává stejná)
    function loadAndStyleProjectImages() {
        for (const id in projectImagesData) {
            const imgElement = document.getElementById(id);
            if (imgElement) {
                const imgData = projectImagesData[id];
                imgElement.src = imgData.src;
                applyImageStyles(imgElement, imgData);
            }
        }
    }

    loadAndStyleProjectImages(); // Volání funkce, která načítá a styly aplikuje

    mobileMediaQuery.addEventListener('change', function() {
        console.log("Změna velikosti okna, aktualizuji styly obrázků.");
        for (const id in projectImagesData) {
            const imgElement = document.getElementById(id);
            if (imgElement) {
                applyImageStyles(imgElement, projectImagesData[id]);
            }
        }
    });
});

//TADY JE JS PRO CELOOBRAZOVÝ REŽIM?

document.addEventListener('DOMContentLoaded', () => {
    const fullscreenButton = document.getElementById('fullscreenButton');

    fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            // Pokud nejsme v celoobrazovkovém režimu, přepneme se
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Chyba při pokusu o přechod na celou obrazovku: ${err.message} (${err.name})`);
            });
        } else {
            // Pokud už jsme v celoobrazovkovém režimu, opustíme ho
            document.exitFullscreen();
        }
    });
});
