// conzol-log-beta-1.js - Vylepšená verze s komplexním logováním a filtrováním pro Jiříka
// Nyní s novým, automaticky vytvářeným tlačítkem pro spolehlivé otevírání modalu.
// DŮLEŽITÉ: Tento soubor NYNÍ VKLÁDÁ HTML a CSS modalu přímo do stránky s !important pro vysokou prioritu.
// Všechny ID a třídy modalu byly přejmenovány na 'jirik-' prefix, aby se zabránilo konfliktům.
// Opravena logika zobrazení modalu s použitím opacity a visibility pro plynulé přechody.

// Použijeme Immediately Invoked Function Expression (IIFE) pro vytvoření vlastního rozsahu
// Tím se vyřeší chyba "Illegal return statement" a zajistí jednorázová inicializace.
(function() {
    // Globální flag pro zajištění jednorázové inicializace celého skriptu
    if (window.conzolLogBeta1Initialized) {
        return; // Tento return je nyní legální uvnitř IIFE
    }
    window.conzolLogBeta1Initialized = true;


    document.addEventListener('DOMContentLoaded', () => {
        // Záloha původních konzolových metod - musí být uvnitř DOMContentLoaded nebo IIFE, pokud se používá `return`
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug,
        };

        // Pravidlo 27: Upozornění na rizika - informujeme o přepisu konzolových metod.
        // Tímto přepisujeme standardní konzolové metody, abychom mohli zachytávat a filtrovat logy.
        // Ujistěte se, že tato úprava vyhovuje vašim potřebám pro debugování a sledování, Jiříku.
        if (typeof console !== 'undefined' && originalConsole.warn) { // Použijeme originalConsole.warn
            originalConsole.warn('🚀 Conzol-log-beta-1.js: Inicializace vylepšeného systému pro záznam konzolových logů. Přepisuji standardní konzolové metody (log, warn, error, info, debug) pro komplexní zachycení a filtrování zpráv. Toto je navrženo pro hlubší vhled do běhu aplikace, ale mějte na paměti, že to ovlivňuje globální objekt `console`.');
        }

        // Pole pro ukládání záznamů konzole
        const logEntries = [];
        const maxLogEntries = 1000; // Maximální počet záznamů pro udržení výkonu

        // Keywords, které mají být filtrovány (pokud nejsou v allowedPhrases)
        const filterKeywords = [
            'Supabase Auth State Change:', // Generické zprávy Supabase
            'Supabase library not loaded',
            'Firebase Firestore úspěšně inicializován.',
            'Chyba při inicializaci Firebase Firestore:',
            'Kritická chyba: Knihovna Firebase Firestore se nenačetla.',
            'Kritická chyba: Knihovna Supabase se nenačetla.',
            'Změna velikosti okna, aktualizuji styly obrázků.',
            'Realtime aktualizace z Firestore:',
            'Data načtena z Firestore.',
            'Žádná data v Firestore, použiji výchozí lokální data.',
            'Hlavní dokument v Firestore neexistuje, nebo byl smazán.',
            'Chyba při poslouchání realtime aktualizací:',
            'Aplikace inicializována.',
            'Nelze uložit URL data - uživatel není přihlášen',
            'URL data pro',
            'Aplikuji URL data pro',
            'Načítám data z cloudu...',
            'Ukládám data do cloudu...',
            'Mažu data z cloudu...',
            'Chybí data pro portfolio položku s ID:',
            'Inicializace vylepšeného systému pro záznam konzolových logů.',
            '🚀 Conzol-log.js: Inicializace vylepšeného systému pro záznam konzolových logů.',
            'console.error("Loading indicator element not found!");',
            'console.error("Chyba při získávání Supabase session:", error);',
            'Chyba při ukládání URL dat:',
            'Chyba při ukládání do Firestore:',
            'Chyba při načítání z Firestore:',
            'Nepodařilo se synchronizovat data v reálném čase:',
            'Nepodařilo se uložit data do cloudu:',
            'Nepodařilo se načíst data z cloudu:',
            'Nepodařilo se vymazat data z cloudu:',
            'Chyba při odhlašování:',
            'Chyba při registraci:',
            'Chyba při přihlašování:',
            'Inicializace editoru HTML',
            ' 📊 Celkem obrázků',
            ' 📍 Aktuální index',
            '🎯 Aktuální obrázek ',
            ' ✅ Index je platný',

            ' currentModalImageIndex',
            ' 📋 Seznam všech obrázků',
            '🎭 APRÍLOVÁ NAVIGACE START: direction=1',

'📍 Před: currentModalImageIndex=0',

'📍 Po: currentModalImageIndex=0',

'🎭 APRÍLÁ NAVIGACE END',
        ];

        // Fráze, které mají vždy projít, i když obsahují filtrovaná slova
        const allowedPhrases = [
            'Uživatel je přihlášen přes Supabase:',
            'Uživatel není přihlášen přes Supabase.',
            'Registrace proběhla úspěšně!',
            'Zkontrolujte svůj email pro potvrzení registrace.',
            'Byli jste úspěšně odhlášeni.',
            
        ];

        /**
         * Kontroluje, zda má být zpráva filtrována.
         * @param {string} message - Zpráva konzole.
         * @returns {boolean} True, pokud má být zpráva filtrována (skryta).
         */
        function shouldFilter(message) {
            const lowerCaseMessage = message.toLowerCase();

            // 1. Vždy povolit explicitně povolené fráze
            for (const phrase of allowedPhrases) {
                if (lowerCaseMessage.includes(phrase.toLowerCase())) {
                    return false; // NEFILTROVAT, protože je to povolená fráze
                }
            }

            // 2. Filtrovat generické zprávy podle klíčových slov
            for (const keyword of filterKeywords) {
                if (lowerCaseMessage.includes(keyword.toLowerCase())) {
                    return true; // FILTROVAT, protože obsahuje filtrované slovo a není povolená
                }
            }

            return false; // Pokud není v žádné kategorii, nefiltrujeme
        }

        /**
         * Přidá záznam do pole logEntries a aktualizuje zobrazení.
         * @param {string} type - Typ zprávy (log, warn, error, info, debug).
         * @param {string} message - Zpráva.
         * @param {Array} args - Další argumenty logu.
         */
        function addLogEntry(type, message, args) {
            // Kontrola, zda zprávu filtrovat
            if (shouldFilter(message)) {
                return;
            }

            const timestamp = new Date();
            const fullMessage = message + (args.length > 0 ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '');

            logEntries.push({
                timestamp: timestamp,
                type: type,
                message: fullMessage,
            });

            // Omezení počtu záznamů
            if (logEntries.length > maxLogEntries) {
                logEntries.shift(); // Odebere nejstarší záznam
            }

            // Upravil jsem tuto část, aby nebyla tak ukecaná, pokud to není nutné
            // originalConsole.log(`Log added: ${message.substring(0, 50)}...`); // Menší logování pro přidání
            updateLogDisplay();
        }

        // Přepíšeme standardní konzolové metody
        console.log = function(...args) {
            originalConsole.log.apply(console, args);
            addLogEntry('LOG', String(args[0]), args.slice(1));
        };
        console.warn = function(...args) {
            originalConsole.warn.apply(console, args);
            addLogEntry('WARN', String(args[0]), args.slice(1));
        };
        console.error = function(...args) {
            originalConsole.error.apply(console, args);
            addLogEntry('ERROR', String(args[0]), args.slice(1));
        };
        console.info = function(...args) {
            originalConsole.info.apply(console, args);
            addLogEntry('INFO', String(args[0]), args.slice(1));
        };
        console.debug = function(...args) {
            originalConsole.debug.apply(console, args);
            addLogEntry('DEBUG', String(args[0]), args.slice(1));
        };

        // 1. HTML struktura pro modalní okno s tabulkou logů (vložená přímo v JS)
        const jirikModalHTML = `
            <div id="jirik-modal" class="jirik-modal-overlay">
                <div class="jirik-modal-content">
                    <span class="jirik-close-button" id="jirik-close-button">&times;</span>
                    <h5>Výpis Konzole (Jiřík)</h5>
                    <div class="jirik-log-controls">
                        <button id="jirik-clear-button" class="jirik-button jirik-btn-danger">Vyčistit log</button>
                        <button id="jirik-export-button" class="jirik-button jirik-btn-secondary">Extrahovat log (HTML)</button>
                        <div class="jirik-log-stats">
                            <span id="jirik-log-count">Záznamy: 0</span>
                        </div>
                    </div>
                    <div class="jirik-log-table-container">
                        <table id="jirik-log-table">
                            <thead>
                                <tr>
                                    <th>Čas</th>
                                    <th>Typ</th>
                                    <th>Zpráva</th>
                                    <th>Akce</th>
                                </tr>
                            </thead>
                            <tbody id="jirik-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // 2. CSS styly pro modal (vložené přímo v JS s !important a upraveným z-indexem)
        const jirikModalCSS = `
            /* Základní styly pro modal (Přejmenováno na jirik-modal-overlay) */
            .jirik-modal-overlay {
                position: fixed !important; /* Zůstává na místě, i když se stránka scrolluje */
                z-index: 999999 !important; /* Zvýšeno na extrémně vysokou hodnotu */
                left: 0 !important;
                top: 0 !important;
                width: 100% !important; /* Plná šířka */
                height: 100% !important; /* Plná výška */
                overflow: auto !important; /* Povolit scrollování, pokud je obsah příliš velký */
                background-color: rgba(0,0,0,0.7) !important; /* Ztmaví pozadí */
                justify-content: center !important; /* Centrování obsahu */
                align-items: center !important; /* Centrování obsahu */
                padding-top: 50px !important; /* Mezera odshora */

                /* Klíčové pro zobrazení/skrytí s přechodem */
                display: flex !important; /* Vždy flex, pro zarovnání obsahu */
                opacity: 0 !important; /* Skryté ve výchozím nastavení */
                visibility: hidden !important; /* Skryté ve výchozím nastavení */
                transition: opacity 0.3s ease, visibility 0.3s ease !important;
                backdrop-filter: blur(5px) !important; /* Přidáno z tvého funkčního kódu */
            }

            .jirik-modal-overlay.jirik-visible {
                opacity: 1 !important;
                visibility: visible !important;
            }

            .jirik-modal-content {
                background-color: #2a2a2a !important;
                margin: auto !important; /* Vycentrovat horizontálně */
                padding: 25px !important;
                border: 1px solid #555 !important;
                width: 90% !important; /* Šířka obsahu */
                max-width: 1200px !important; /* Maximální šířka */
                border-radius: 8px !important;
                box-shadow: 0 5px 15px rgba(0,0,0,0.5) !important;
                position: relative !important;
                color: #e0e0e0 !important;
                display: flex !important;
                flex-direction: column !important;
                max-height: 90vh !important; /* Omezení výšky modalu */
            }

            .jirik-close-button {
                color: #aaa !important;
                float: right !important;
                font-size: 28px !important;
                font-weight: bold !important;
                position: absolute !important;
                right: 20px !important;
                top: 10px !important;
                cursor: pointer !important;
            }

            .jirik-close-button:hover,
            .jirik-close-button:focus {
                color: #fefefe !important;
                text-decoration: none !important;
                cursor: pointer !important;
            }

            h5 {
                color: #00ffff !important;
                text-align: center !important;
                margin-top: 0 !important;
                margin-bottom: 20px !important;
                font-size: 1.8em !important;
            }

            .jirik-log-controls {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                gap: 15px !important;
                margin-bottom: 20px !important;
                padding-bottom: 15px !important;
                border-bottom: 1px solid #444 !important;
            }

            .jirik-log-controls .jirik-button {
                padding: 10px 20px !important;
                border: none !important;
                border-radius: 5px !important;
                cursor: pointer !important;
                font-size: 1em !important;
                transition: background-color 0.3s ease !important;
            }

            .jirik-log-controls .jirik-btn-danger {
                background-color: #dc3545 !important;
                color: white !important;
            }
            .jirik-log-controls .jirik-btn-danger:hover {
                background-color: #c82333 !important;
            }

            .jirik-log-controls .jirik-btn-secondary {
                background-color: #6c757d !important;
                color: white !important;
            }
            .jirik-log-controls .jirik-btn-secondary:hover {
                background-color: #5a6268 !important;
            }

            .jirik-log-stats {
                display: flex !important;
                align-items: center !important;
                font-size: 1em !important;
                color: #bbb !important;
            }

            .jirik-log-table-container {
                flex-grow: 1 !important; /* Povolí tabulce zabírat dostupné místo */
                overflow-y: auto !important; /* Umožní scrollování tabulky */
                background-color: #1a1a1a !important;
                border-radius: 5px !important;
                padding: 10px !important;
            }

            #jirik-log-table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 0.9em !important;
                color: #f0f0f0 !important;
            }

            #jirik-log-table th,
            #jirik-log-table td {
                border: 1px solid #333 !important;
                padding: 10px !important;
                text-align: left !important;
                vertical-align: top !important;
            }

            #jirik-log-table th {
                background-color: #3a3a3a !important;
                color: #00ffff !important;
                position: sticky !important; /* Sticky hlavička */
                top: 0 !important;
                z-index: 1 !important;
            }

            #jirik-log-table tbody tr:nth-child(even) {
                background-color: #222 !important;
            }
            #jirik-log-table tbody tr:hover {
                background-color: #333 !important;
            }

            .log-type-log-text { color: #87ceeb !important; } /* SkyBlue */
            .log-type-warn-text { color: #ffcc00 !important; } /* Amber */
            .log-type-error-text { color: #ff6347 !important; } /* Tomato */
            .log-type-info-text { color: #98fb98 !important; } /* PaleGreen */
            .log-type-debug-text { color: #dda0dd !important; } /* Plum */

            .jirik-log-time-cell {
                white-space: nowrap !important; /* Zabraňuje zalomení času */
                min-width: 150px !important;
            }

            .jirik-log-type-cell {
                text-transform: uppercase !important;
                font-weight: bold !important;
                min-width: 80px !important;
                text-align: center !important;
            }

            .jirik-log-message-cell {
             
            }

            .jirik-copy-log-btn {
                background: #555 !important;
                color: white !important;
                border: none !important;
                padding: 5px 10px !important;
                border-radius: 3px !important;
                cursor: pointer !important;
                font-size: 0.8em !important;
                margin-left: 10px !important;
                transition: background-color 0.3s ease !important;
            }
            .jirik-copy-log-btn:hover {
                background: #777 !important;
            }

            /* Šířky sloupců */
            #jirik-log-table th:nth-child(1),
            #jirik-log-table td:nth-child(1) {
                width: 50% !important; /* Čas */
                min-width: 150px !important; /* Minimální šířka pro čas */
                white-space: nowrap !important;
            }
            #jirik-log-table th:nth-child(2),
            #jirik-log-table td:nth-child(2) {
                width: 25% !important; /* Typ */
                min-width: 150px !important; /* Minimální šířka pro typ */
                white-space: nowrap !important;
            }
            #jirik-log-table th:nth-child(3),
            #jirik-log-table td:nth-child(3) {
                width: 120% !important; /* Zpráva */
                min-width: 150px !important; /* Minimální šířka pro typ */
                white-space: nowrap !important;
            }
             #jirik-log-table th:nth-child(4),
            #jirik-log-table td:nth-child(4) {
                width: 25% !important; /* Akce */
                min-width: 150px !important;
                white-space: nowrap !important;
            }

        `;
        
        originalConsole.log('🔍 Pokouším se vložit HTML modalu do dokumentu...');
        // Vložení HTML modalu do těla dokumentu
        document.body.insertAdjacentHTML('beforeend', jirikModalHTML);
        originalConsole.log('✅ HTML modalu (jirik-modal) by mělo být vloženo.');

        originalConsole.log('🔍 Pokouším se vložit CSS styly modalu do hlavičky dokumentu...');
        // Vložení CSS stylů do hlavičky dokumentu
        const styleElement = document.createElement('style');
        styleElement.textContent = jirikModalCSS;
        document.head.appendChild(styleElement);
        originalConsole.log('✅ CSS styly modalu (jirik-modal) by měly být vloženy do <head>.');


        originalConsole.log('🔍 Pokouším se získat reference na elementy modalu...');
        // Získání DOM elementů modalu - nyní by měly být v DOMu
        const jirikModal = document.getElementById('jirik-modal');
        const closeJirikModalBtn = document.getElementById('jirik-close-button');
        const clearJirikLogBtn = document.getElementById('jirik-clear-button');
        const exportJirikLogBtn = document.getElementById('jirik-export-button');
        // Kontrola, zda jirikModal skutečně existuje
        const jirikLogTableBody = jirikModal ? jirikModal.querySelector('#jirik-log-table tbody') : null;
        const jirikLogCountSpan = document.getElementById('jirik-log-count');

        // Detailní logování nalezených elementů
        originalConsole.log(`- jirikModal (ID 'jirik-modal'): ${jirikModal ? 'Nalezen' : 'NENALEZEN'}`);
        originalConsole.log(`- closeJirikModalBtn (ID 'jirik-close-button'): ${closeJirikModalBtn ? 'Nalezen' : 'NENALEZEN'}`);
        originalConsole.log(`- clearJirikLogBtn (ID 'jirik-clear-button'): ${clearJirikLogBtn ? 'Nalezen' : 'NENALEZEN'}`);
        originalConsole.log(`- exportJirikLogBtn (ID 'jirik-export-button'): ${exportJirikLogBtn ? 'Nalezen' : 'NENALEZEN'}`);
        originalConsole.log(`- jirikLogTableBody (tbody uvnitř jirik-log-table): ${jirikLogTableBody ? 'Nalezen' : 'NENALEZEN'}`);
        originalConsole.log(`- jirikLogCountSpan (ID 'jirik-log-count'): ${jirikLogCountSpan ? 'Nalezen' : 'NENALEZEN'}`);


        // ČÁST: Vytvoření a vložení hlavního tlačítka do určeného kontejneru
        originalConsole.log('🔍 Pokouším se najít kontejner pro hlavní tlačítko...');
        const dataManagementContainer = document.querySelector('.function-setupDataManagement .data-management-container');

        if (dataManagementContainer) {
            originalConsole.log('✅ Kontejner pro hlavní tlačítko nalezen.');
            let openJirikModalBtn = document.getElementById('jirik-open-modal-btn');

            // Vytvoříme tlačítko, pouze pokud ještě neexistuje v DOMu
            if (!openJirikModalBtn) {
                originalConsole.log('🔍 Tlačítko pro hlavní konzoli neexistuje, vytvářím ho...');
                openJirikModalBtn = document.createElement('button');
                openJirikModalBtn.id = 'jirik-open-modal-btn';
                openJirikModalBtn.className = 'button custom-button'; // Přidáme tvé třídy
                openJirikModalBtn.textContent = 'Zobrazit konzoli (Jiřík)';
                
                dataManagementContainer.appendChild(openJirikModalBtn);
                originalConsole.log('✅ Tlačítko pro otevření konzole (Jiřík) bylo úspěšně vytvořeno a navázáno do .function-setupDataManagement .data-management-container!');
            } else {
                originalConsole.log('ℹ️ Tlačítko pro hlavní konzoli již existuje, přeskočuji vytváření.');
            }
            
            // Přidáme event listener POUZE JEDNOU
            if (openJirikModalBtn && !openJirikModalBtn.hasAttribute('data-console-listener-bound')) {
                originalConsole.log('🔍 Připojuji event listener k hlavnímu tlačítku konzole...');
                openJirikModalBtn.addEventListener('click', (e) => {
                    e.preventDefault(); 
                    e.stopPropagation();
                    originalConsole.log('🟢 Hlavní tlačítko konzole bylo kliknuto!');
                    if (jirikModal) { // Kontrola, zda modal existuje
                        originalConsole.log(`🟢 Přidávám třídu 'jirik-visible' modalu (ID: ${jirikModal.id}). Aktuální třídy: ${jirikModal.className}`);
                        jirikModal.classList.add('jirik-visible'); // Zobrazit modal pomocí třídy
                        originalConsole.log(`✅ Třída 'jirik-visible' přidána. Aktuální třídy: ${jirikModal.className}`);
                        updateLogDisplay(); // Aktualizovat zobrazení při otevření
                        originalConsole.log('🔄 updateLogDisplay volán po kliknutí na hlavní tlačítko.');
                    } else {
                        originalConsole.error('❌ Conzol-log-beta-1.js: Modal s ID "jirik-modal" nebyl nalezen v DOMu při pokusu o zobrazení! Ujistěte se, že HTML modalu je vloženo.');
                    }
                });
                openJirikModalBtn.setAttribute('data-console-listener-bound', 'true'); // Označíme, že listener je navázán
                originalConsole.log('🔗 Event listener pro hlavní tlačítko konzole (Jiřík) byl úspěšně připojen.');
            } else {
                originalConsole.log('ℹ️ Event listener pro hlavní tlačítko konzole již byl připojen, přeskočuji.');
            }

        } else {
            // Fallback pro případ, že cílový kontejner pro hlavní tlačítko neexistuje
            originalConsole.error('Conzol-log-beta-1.js: Cílový div pro hlavní tlačítko (.function-setupDataManagement .data-management-container) nebyl nalezen. Tlačítko nebude vytvořeno na specifickém místě.');
        }

        // NOVÁ ČÁST: Navázání listeneru na záložní tlačítko (jirik-manual-opener-btn)
        originalConsole.log('🔍 Pokouším se najít záložní tlačítko "jirik-manual-opener-btn"...');
        const jirikManualOpenerBtn = document.getElementById('jirik-manual-opener-btn');
        if (jirikManualOpenerBtn) {
            originalConsole.log('✅ Záložní tlačítko "jirik-manual-opener-btn" nalezeno.');
            if (!jirikManualOpenerBtn.hasAttribute('data-console-listener-bound-manual')) {
                originalConsole.log('🔍 Připojuji event listener k záložnímu tlačítku konzole...');
                jirikManualOpenerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    originalConsole.log('🟢 Záložní tlačítko konzole bylo kliknuto! Volám window.openJirikModal().');
                    // Voláme globální funkci pro otevření modalu
                    window.openJirikModal(); // Voláme přejmenovanou globální funkci
                });
                jirikManualOpenerBtn.setAttribute('data-console-listener-bound-manual', 'true');
                originalConsole.log('🔗 Event listener pro záložní tlačítko "jirik-manual-opener-btn" byl úspěšně připojen.');
            } else {
                originalConsole.log('ℹ️ Event listener pro záložní tlačítko již byl připojen, přeskočuji.');
            }
        } else {
            originalConsole.warn('Conzol-log-beta-1.js: Záložní tlačítko s ID "jirik-manual-opener-btn" nebylo nalezeno. Pokud ho očekáváte, zkontrolujte HTML.');
        }

        
        // Funkce pro aktualizaci zobrazení logů v tabulce
        function updateLogDisplay() {
            // originalConsole.log('🔄 Spouštím updateLogDisplay...'); // Opakované logy, které mohou zahlcovat
            // KLÍČOVÁ KONTROLA: Zajištění, že element existuje, než se s ním pracuje
            if (!jirikLogTableBody) {
                 originalConsole.error('❌ Chyba: Element pro tělo tabulky logů (jirik-table-body) nebyl nalezen. Ujistěte se, že HTML modalu je v DOMu.');
                 return;
            }
            // originalConsole.log('✅ Element jirik-table-body nalezen, vyčišťuji jeho obsah.'); // Opakované logy
            jirikLogTableBody.innerHTML = ''; // Vyčistit stávající záznamy
            
            // originalConsole.log(`📊 Zpracovávám ${logEntries.length} log záznamů.`); // Opakované logy
            logEntries.forEach((entry, index) => {
                const row = jirikLogTableBody.insertRow();
                row.classList.add(`log-type-${entry.type.toLowerCase()}`); // Přidá třídu pro styling
                row.title = entry.message; // Titulek pro zobrazení celé zprávy při najetí myší

                // Čas - ZJEDNODUŠENÝ FORMÁT BEZ MILISEKUND
                const timeCell = row.insertCell();
                timeCell.classList.add('jirik-log-time-cell');
                timeCell.textContent = entry.timestamp.toLocaleString('cs-CZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Typ
                const typeCell = row.insertCell();
                typeCell.classList.add('jirik-log-type-cell', `log-type-${entry.type.toLowerCase()}-text`);
                typeCell.textContent = entry.type;

                // Zpráva
                const messageCell = row.insertCell();
                messageCell.classList.add('jirik-log-message-cell');
                messageCell.textContent = entry.message;

                // Akce (kopírování)
                const actionCell = row.insertCell();
                const copyBtn = document.createElement('button');
                copyBtn.textContent = 'Kopírovat';
                copyBtn.classList.add('jirik-copy-log-btn');
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(entry.message).then(() => {
                        originalConsole.info('Zpráva z logu zkopírována!');
                    }).catch(err => {
                        originalConsole.error('Nepodařilo se zkopírovat zprávu:', err);
                    });
                };
                actionCell.appendChild(copyBtn); // Důležité: Tady se tlačítko skutečně přidává!
            });
            // KLÍČOVÁ KONTROLA: Zajištění, že jirikLogCountSpan existuje
            if (jirikLogCountSpan) {
                // originalConsole.log(`📊 Aktualizuji počet záznamů: ${logEntries.length}`); // Opakované logy
                jirikLogCountSpan.textContent = `Záznamy: ${logEntries.length}`;
            } else {
                originalConsole.warn('🤔 Element pro počítání logů (jirik-log-count) nebyl nalezen.');
            }
            
            // Rolování na konec logu
            const tableContainer = jirikLogTableBody.parentElement;
            if (tableContainer) {
                // originalConsole.log('⬇️ Roluji tabulku logů na konec.'); // Opakované logy
                tableContainer.scrollTop = tableContainer.scrollHeight;
            }
        }

        originalConsole.log('🔍 Připojuji event listenery pro tlačítka modalu...');

        // Event listener pro tlačítko zavřít
        if (closeJirikModalBtn) { // Kontrola null
            closeJirikModalBtn.addEventListener('click', () => {
                originalConsole.log('🔵 Tlačítko pro zavření modalu kliknuto.');
                jirikModal.classList.remove('jirik-visible'); // Skrýt modal pomocí třídy
                originalConsole.log('✅ Modal (Jiřík) skryt.');
            });
        } else {
            originalConsole.error('❌ Tlačítko pro zavření modalu (jirik-close-button) nebylo nalezeno!');
        }

        // Event listener pro zavření modalu kliknutím mimo obsah
        if (jirikModal) { // Kontrola null
            window.addEventListener('click', (event) => {
                if (event.target === jirikModal) {
                    originalConsole.log('🔵 Kliknuto mimo obsah modalu (jirik-modal-overlay), zavírám modal.');
                    jirikModal.classList.remove('jirik-visible'); // Skrýt modal pomocí třídy
                    originalConsole.log('✅ Modal (Jiřík) skryt po kliknutí mimo.');
                }
            });
        } else {
            originalConsole.error('❌ Overlay modalu (jirik-modal) nebylo nalezeno pro event listener mimo kliknutí!');
        }

        // Event listener pro vyčištění logů
        if (clearJirikLogBtn) { // Kontrola null
            clearJirikLogBtn.addEventListener('click', () => {
                originalConsole.log('🔵 Tlačítko pro vyčištění logů kliknuto. Potvrzuji akci...');
                const confirmed = confirm("Opravdu chcete vyčistit všechny záznamy z konzole?"); // Používáme standardní confirm
                if (confirmed) {
                    logEntries.length = 0; // Vymaže pole
                    updateLogDisplay();
                    originalConsole.log('✅ Konzolový log byl vyčištěn Jiříku!');
                } else {
                    originalConsole.log('ℹ️ Vyčištění logů zrušeno.');
                }
            });
        } else {
            originalConsole.error('❌ Tlačítko pro vyčištění logů (jirik-clear-button) nebylo nalezeno!');
        }

        // Event listener pro export logů do HTML souboru
        if (exportJirikLogBtn) { // Kontrola null
            exportJirikLogBtn.addEventListener('click', () => {
                originalConsole.log('🔵 Tlačítko pro export logů kliknuto.');
                const timestamp = new Date().toLocaleString('cs-CZ').replace(/[,: ]/g, '-');
                const filename = `jirik-console-log-${timestamp}.html`;

                const htmlContent = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Výpis Konzole - ${new Date().toLocaleString('cs-CZ')}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: #f0f0f0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #444; padding: 10px; text-align: left; }
        th { background-color: #3a3a3a; color: #00ffff; }
        tr:nth-child(even) { background-color: #222; }
    </style>
</head>
<body>
    <h1>Výpis Konzole</h1>
    <p>Exportováno: ${new Date().toLocaleString('cs-CZ')}</p>
    <table>
        <thead><tr><th>Čas</th><th>Typ</th><th>Zpráva</th></tr></thead>
        <tbody>
        ${logEntries.map(entry => `
            <tr>
                <td>${entry.timestamp.toLocaleString('cs-CZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}</td>
                <td>${entry.type}</td>
                <td>${entry.message}</td>
            </tr>
        `).join('')}
        </tbody>
    </table>
</body>
</html>`;

                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Uvolní URL objekt
                originalConsole.log('✅ Log byl exportován do souboru:', filename);
            });
        } else {
            originalConsole.error('❌ Tlačítko pro export logů (jirik-export-button) nebylo nalezeno!');
        }

        // Aktualizace zobrazení při inicializaci (zajišťuje zobrazení již existujících logů)
        originalConsole.log('🔄 Spouštím úvodní updateLogDisplay pro zobrazení existujících logů.');
        updateLogDisplay();

        originalConsole.log('🔥 Modal pro konzolový log (Jiřík) byl úspěšně inicializován!');

        // Globální funkce pro ruční otevření modalu (můžeš volat z konzole pro debug)
        // Definována ZDE, aby měla přístup k updateLogDisplay a dalším proměnným z DOMContentLoaded
        window.openJirikModal = function() { // Přejmenováno na openJirikModal
            originalConsole.log('🔵 Globální funkce window.openJirikModal() byla volána.');
            const modal = document.getElementById('jirik-modal'); // Přejmenováno na jirik-modal
            if (modal) {
                originalConsole.log(`🟢 Zobrazuji modal (ID: ${modal.id}) přidáním třídy 'jirik-visible'. Aktuální třídy: ${modal.className}`);
                modal.classList.add('jirik-visible');
                originalConsole.log(`✅ Třída 'jirik-visible' přidána. Aktuální třídy: ${modal.className}`);
                updateLogDisplay(); // Nyní je updateLogDisplay v dosahu
                originalConsole.log('🔄 updateLogDisplay volán z globální funkce.');
                originalConsole.log('Modal (Jiřík) otevřen ručně!');
            } else {
                originalConsole.error('❌ Modal (Jiřík) nebyl nalezen při pokusu o ruční otevření z globální funkce!');
            }
        };
    });
})(); // Konec IIFE
