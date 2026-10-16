// --- Google address suggestions (optional) ---
// Paste your Google Maps browser API key between the quotes to turn on address suggestions.
// Leave it empty and the address question works as a normal manual form.
const GOOGLE_MAPS_API_KEY = 'AIzaSyB_huoPCD9Jls7QigYuoJdW7ut9rOuQgwM';

function initDynamicForm() {
    const overlayBg = document.getElementById('form-overlay-bg');
    const formContainer = document.getElementById('form-container');
    const form = document.getElementById('conditional-form');
    const container = document.getElementById('form-steps-container');
    const btnStart = document.getElementById('btn-start-form');
    const btnClose = document.getElementById('close-form-btn');
    
    // --- DYNAMIC TEXT INJECTION ---
    const placeholder = document.getElementById('form-placeholder');
    if (placeholder) {
        const title = placeholder.getAttribute('data-form-title');
        const desc = placeholder.getAttribute('data-form-desc');
        const source = placeholder.getAttribute('data-form-source');
        
        if(title) document.getElementById('dynamic-form-title').textContent = title;
        if(desc) document.getElementById('dynamic-form-desc').textContent = desc;
        if(source) document.getElementById('dynamic-form-source').value = source;
    }

    let currentStepIndex = 0;
    let stepHistory = [];
    let slideDirection = 'forward'; 
    let savedScrollY = 0; 

    function val(id) {
        const q = questions.find(q => q.id === id);
        if (q && !q.cond()) return '';
        const els = document.getElementsByName(id);
        if(els.length === 0) return '';
        if(els[0].type === 'radio') {
            const checked = Array.from(els).find(el => el.checked);
            return checked ? checked.value : '';
        }
        return els[0].value;
    }

    // Full 66 Question Logic Engine
    const questions = [
        { id: 'q_name', type: 'name', title: 'What is your name?', cond: () => true },
        { id: 'q_phone', type: 'phone', title: 'What is the best phone number to reach you?', cond: () => true },
        { id: 'q_email', type: 'email', title: 'What is your email address?', cond: () => true },
        { id: 'q_sell_home', type: 'yesno', title: 'Do you have a home to sell?', cond: () => true },
        { id: 'q_sell_addr', type: 'address', title: 'What is the property address?', cond: () => val('q_sell_home') === 'Yes' },
        { id: 'q_sell_mort', type: 'curr', title: 'Outstanding Mortgage Balance', cond: () => val('q_sell_home') === 'Yes' },
        { id: 'q_sell_liens', type: 'yesno', title: 'Are there any other liens or loans on the property?', cond: () => val('q_sell_home') === 'Yes' },
        { id: 'q_sell_liens_bal', type: 'curr', title: 'Other Liens or Loans Balance', cond: () => val('q_sell_liens') === 'Yes' },
        { id: 'q_buy_new', type: 'yesno', title: 'Will you be buying a new home as well?', cond: () => val('q_sell_home') === 'Yes' },
        { id: 'q_breakdown', type: 'yesno', title: 'Do you want a buyer breakdown sheet for your purchase?', cond: () => val('q_buy_new') === 'Yes' || val('q_sell_home') === 'No' },
        { id: 'q_inc1_type', type: 'radio_inc', title: 'Primary Income Type', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_inc1_title', type: 'text', title: 'Job Title', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_inc1_desc', type: 'textarea', title: 'Quick Description of Income', cond: () => val('q_inc1_type') === 'Commission/1099' },
        { id: 'q_inc1_sal', type: 'curr', title: 'Weekly Salary Amount', cond: () => val('q_inc1_type') === 'Salary' },
        { id: 'q_inc1_hrly', type: 'curr_dec', title: 'Hourly Rate', cond: () => val('q_inc1_type') === 'Hourly' },
        { id: 'q_inc1_hrs', type: 'number', title: 'Average Hours Worked Per Week', cond: () => val('q_inc1_type') === 'Hourly' },
        { id: 'q_inc1_tips', type: 'yesno', title: 'Do you earn tips as well?', cond: () => val('q_inc1_type') === 'Salary' || val('q_inc1_type') === 'Hourly' },
        { id: 'q_inc1_tips_amt', type: 'curr', title: 'Average Weekly Tips Earned', cond: () => val('q_inc1_tips') === 'Yes' },
        { id: 'q_inc1_comm', type: 'yesno', title: 'Do you earn commissions as well?', cond: () => val('q_inc1_type') === 'Salary' || val('q_inc1_type') === 'Hourly' },
        { id: 'q_inc1_comm_freq', type: 'radio_freq', title: 'How often are your commissions earned?', cond: () => val('q_inc1_comm') === 'Yes' },
        { id: 'q_inc1_comm_amt', type: 'curr', title: 'Average Commission Amount', cond: () => val('q_inc1_comm') === 'Yes' },
        { id: 'q_inc1_bonus', type: 'yesno', title: 'Do you earn bonuses as well?', cond: () => val('q_inc1_type') === 'Salary' || val('q_inc1_type') === 'Hourly' },
        { id: 'q_inc1_bonus_freq', type: 'radio_freq', title: 'How often are your bonuses earned?', cond: () => val('q_inc1_bonus') === 'Yes' },
        { id: 'q_inc1_bonus_amt', type: 'curr', title: 'Average Bonus Amount', cond: () => val('q_inc1_bonus') === 'Yes' },
        { id: 'q_inc1_yearly', type: 'curr', title: 'Average Estimated Yearly Income', cond: () => val('q_inc1_type') === 'Commission/1099' },
        { id: 'q_inc2_has', type: 'yesno', title: 'Do you have any Secondary Income?', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_inc2_type', type: 'radio_inc', title: 'Secondary Income Type', cond: () => val('q_inc2_has') === 'Yes' },
        { id: 'q_inc2_title', type: 'text', title: 'Job Title (Secondary)', cond: () => val('q_inc2_has') === 'Yes' },
        { id: 'q_inc2_desc', type: 'textarea', title: 'Quick Description of Income (Secondary)', cond: () => val('q_inc2_type') === 'Commission/1099' },
        { id: 'q_inc2_sal', type: 'curr', title: 'Weekly Salary Amount (Secondary)', cond: () => val('q_inc2_type') === 'Salary' },
        { id: 'q_inc2_hrly', type: 'curr_dec', title: 'Hourly Rate (Secondary)', cond: () => val('q_inc2_type') === 'Hourly' },
        { id: 'q_inc2_hrs', type: 'number', title: 'Average Hours Worked Per Week (Secondary)', cond: () => val('q_inc2_type') === 'Hourly' },
        { id: 'q_inc2_tips', type: 'yesno', title: 'Do you earn tips as well? (Secondary)', cond: () => val('q_inc2_type') === 'Salary' || val('q_inc2_type') === 'Hourly' },
        { id: 'q_inc2_tips_amt', type: 'curr', title: 'Average Weekly Tips Earned (Secondary)', cond: () => val('q_inc2_tips') === 'Yes' },
        { id: 'q_inc2_comm', type: 'yesno', title: 'Do you earn commissions as well? (Secondary)', cond: () => val('q_inc2_type') === 'Salary' || val('q_inc2_type') === 'Hourly' },
        { id: 'q_inc2_comm_freq', type: 'radio_freq', title: 'How often are your commissions earned? (Secondary)', cond: () => val('q_inc2_comm') === 'Yes' },
        { id: 'q_inc2_comm_amt', type: 'curr', title: 'Average Commission Amount (Secondary)', cond: () => val('q_inc2_comm') === 'Yes' },
        { id: 'q_inc2_bonus', type: 'yesno', title: 'Do you earn bonuses as well? (Secondary)', cond: () => val('q_inc2_type') === 'Salary' || val('q_inc2_type') === 'Hourly' },
        { id: 'q_inc2_bonus_freq', type: 'radio_freq', title: 'How often are your bonuses earned? (Secondary)', cond: () => val('q_inc2_bonus') === 'Yes' },
        { id: 'q_inc2_bonus_amt', type: 'curr', title: 'Average Bonus Amount (Secondary)', cond: () => val('q_inc2_bonus') === 'Yes' },
        { id: 'q_inc2_yearly', type: 'curr', title: 'Average Estimated Yearly Income (Secondary)', cond: () => val('q_inc2_type') === 'Commission/1099' },
        { id: 'q_inc3_has', type: 'yesno', title: 'Do you have a 3rd Source of Income?', cond: () => val('q_inc2_has') === 'Yes' },
        { id: 'q_inc3_type', type: 'radio_inc', title: '3rd Source Income Type', cond: () => val('q_inc3_has') === 'Yes' },
        { id: 'q_inc3_title', type: 'text', title: 'Job Title (3rd Source)', cond: () => val('q_inc3_has') === 'Yes' },
        { id: 'q_inc3_desc', type: 'textarea', title: 'Quick Description of Income (3rd Source)', cond: () => val('q_inc3_type') === 'Commission/1099' },
        { id: 'q_inc3_sal', type: 'curr', title: 'Weekly Salary Amount (3rd Source)', cond: () => val('q_inc3_type') === 'Salary' },
        { id: 'q_inc3_hrly', type: 'curr_dec', title: 'Hourly Rate (3rd Source)', cond: () => val('q_inc3_type') === 'Hourly' },
        { id: 'q_inc3_hrs', type: 'number', title: 'Average Hours Worked Per Week (3rd Source)', cond: () => val('q_inc3_type') === 'Hourly' },
        { id: 'q_inc3_tips', type: 'yesno', title: 'Do you earn tips as well? (3rd Source)', cond: () => val('q_inc3_type') === 'Salary' || val('q_inc3_type') === 'Hourly' },
        { id: 'q_inc3_tips_amt', type: 'curr', title: 'Average Weekly Tips Earned (3rd Source)', cond: () => val('q_inc3_tips') === 'Yes' },
        { id: 'q_inc3_comm', type: 'yesno', title: 'Do you earn commissions as well? (3rd Source)', cond: () => val('q_inc3_type') === 'Salary' || val('q_inc3_type') === 'Hourly' },
        { id: 'q_inc3_comm_freq', type: 'radio_freq', title: 'How often are your commissions earned? (3rd Source)', cond: () => val('q_inc3_comm') === 'Yes' },
        { id: 'q_inc3_comm_amt', type: 'curr', title: 'Average Commission Amount (3rd Source)', cond: () => val('q_inc3_comm') === 'Yes' },
        { id: 'q_inc3_bonus', type: 'yesno', title: 'Do you earn bonuses as well? (3rd Source)', cond: () => val('q_inc3_type') === 'Salary' || val('q_inc3_type') === 'Hourly' },
        { id: 'q_inc3_bonus_freq', type: 'radio_freq', title: 'How often are your bonuses earned? (3rd Source)', cond: () => val('q_inc3_bonus') === 'Yes' },
        { id: 'q_inc3_bonus_amt', type: 'curr', title: 'Average Bonus Amount (3rd Source)', cond: () => val('q_inc3_bonus') === 'Yes' },
        { id: 'q_inc3_yearly', type: 'curr', title: 'Average Estimated Yearly Income (3rd Source)', cond: () => val('q_inc3_type') === 'Commission/1099' },
        { id: 'q_debt_car', type: 'yesno', title: 'Do you have any Car Payments?', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_debt_car_amt', type: 'curr', title: 'Your Monthly Car Payments', cond: () => val('q_debt_car') === 'Yes' },
        { id: 'q_debt_mort', type: 'yesno', title: 'Do you have any existing houses with Mortgages?', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_debt_mort_amt', type: 'curr', title: 'Your Existing Mortgage Payments', cond: () => val('q_debt_mort') === 'Yes' },
        { id: 'q_debt_cc', type: 'yesno', title: 'Do you have any Credit Cards with a balance?', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_debt_cc_amt', type: 'curr', title: 'Your Monthly Minimum Card Payments', cond: () => val('q_debt_cc') === 'Yes' },
        { id: 'q_debt_oth', type: 'yesno', title: 'Do you have any other Debt Obligations?', cond: () => val('q_breakdown') === 'Yes' },
        { id: 'q_debt_oth_amt', type: 'curr', title: 'Your Monthly Other Debt Payments', cond: () => val('q_debt_oth') === 'Yes' },
        { id: 'q_co_borrower', type: 'yesno', title: 'Will another person be a part of the purchase?', cond: () => val('q_buy_new') === 'Yes' || val('q_sell_home') === 'No' }
    ];

    // Line icons (match the rest of the site)
    const ICON_NEXT = `<svg class="btn-icon btn-icon-forward" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    const ICON_BACK = `<svg class="btn-icon btn-icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`;
    const ICON_SUBMIT = `<svg class="btn-icon btn-icon-forward" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

    const isMobile = () => window.innerWidth <= 768;
    const isTextField = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'hidden'));
    const isShown = el => !el.closest('[hidden]');

    // "4B" -> "123 Main St #4B"; "Apt 4" -> "123 Main St Apt 4"; skips it if the street already ends with it
    function appendUnit(street, unit) {
        const u = /^(#|(apt|apartment|unit|ste|suite|bldg|building|lot|spc|space|fl|floor|rm|room)\b)/i.test(unit) ? unit : `#${unit}`;
        if (street.toLowerCase().endsWith(u.toLowerCase())) return street;
        return `${street} ${u}`.trim();
    }

    questions.forEach((q, i) => {
        let inner = '';
        if(q.type === 'name') {
            inner = `<div class="name-row">
                        <div class="input-group"><label for="${q.id}_first">First Name</label><input type="text" id="${q.id}_first" name="${q.id}_first" placeholder="First" autocomplete="given-name" autocapitalize="words" enterkeyhint="next"></div>
                        <div class="input-group"><label for="${q.id}_last">Last Name</label><input type="text" id="${q.id}_last" name="${q.id}_last" placeholder="Last" autocomplete="family-name" autocapitalize="words" enterkeyhint="next"></div>
                     </div>`;
        } else if(q.type === 'address') {
            inner = `<div class="input-group"><label for="${q.id}_st">Street Address</label><input type="text" id="${q.id}_st" name="${q.id}_st" placeholder="123 Main St" autocomplete="address-line1" enterkeyhint="next"></div>
                     <div class="name-row addr-row">
                        <div class="input-group"><label for="${q.id}_city">City</label><input type="text" id="${q.id}_city" name="${q.id}_city" placeholder="City" autocomplete="address-level2" enterkeyhint="next"></div>
                        <div class="input-group"><label for="${q.id}_state">State</label><input type="text" id="${q.id}_state" name="${q.id}_state" placeholder="State" autocomplete="address-level1" enterkeyhint="next"></div>
                        <div class="input-group"><label for="${q.id}_zip">Zip</label><input type="text" id="${q.id}_zip" name="${q.id}_zip" placeholder="Zip" autocomplete="postal-code" inputmode="numeric" enterkeyhint="next"></div>
                     </div>
                     <div class="input-group addr-unit-group"><label for="${q.id}_unit">Unit # <span class="optional-tag">(optional)</span></label><input type="text" id="${q.id}_unit" class="addr-unit" placeholder="Apt, suite or unit" autocomplete="address-line2" enterkeyhint="next" data-optional="1" data-append-to="${q.id}_st"></div>`;
            // The unit field has no name of its own: at submission it's added to the end of the street line
        } else if(q.type === 'yesno') {
            inner = `<div class="radio-group">
                        <label class="radio-btn"><input type="radio" name="${q.id}" value="Yes"><span>Yes</span></label>
                        <label class="radio-btn"><input type="radio" name="${q.id}" value="No"><span>No</span></label>
                     </div>`;
        } else if(q.type === 'radio_inc' || q.type === 'radio_freq') {
            const opts = q.type === 'radio_inc' ? ['Salary', 'Hourly', 'Commission/1099'] : ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Bi-Annually (Twice Per Year)'];
            inner = `<div class="radio-group vertical">`;
            opts.forEach(opt => inner += `<label class="radio-btn"><input type="radio" name="${q.id}" value="${opt}"><span>${opt}</span></label>`);
            inner += `</div>`;
        } else if(q.type === 'textarea') {
            inner = `<div class="input-group"><textarea name="${q.id}" rows="4" placeholder="Briefly describe..." aria-label="${q.title}"></textarea></div>`;
        } else {
            // Mobile-friendly keyboards and autofill for each field type
            let cls = '', type = 'text', ph = '', extra = '';
            if(q.type==='email') { type='email'; ph='email@example.com'; extra='autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"'; }
            if(q.type==='phone') { type='tel'; cls='fmt-phone'; ph='(555) 555-5555'; extra='autocomplete="tel-national" inputmode="tel"'; }
            if(q.type==='number') { cls='fmt-num'; ph='Ex: 40'; extra='inputmode="numeric"'; }
            if(q.type==='curr') { cls='fmt-curr'; ph='$0'; extra='inputmode="numeric"'; }
            if(q.type==='curr_dec') { cls='fmt-curr-dec'; ph='$0.00'; extra='inputmode="decimal"'; }
            if(q.type==='text') { extra='autocapitalize="words"'; }
            inner = `<div class="input-group"><input type="${type}" name="${q.id}" class="${cls}" placeholder="${ph}" aria-label="${q.title}" enterkeyhint="next" ${extra}></div>`;
        }

        const stepDiv = document.createElement('div');
        stepDiv.className = 'form-step';
        stepDiv.id = `step-${i}`;
        stepDiv.innerHTML = `
            <div class="step-header">
                <span class="step-count"></span>
                <h3 class="step-title">${q.title}</h3>
            </div>
            <div class="step-inputs">${inner}</div>
            <div class="form-actions" id="actions-${i}"></div>
        `;
        container.appendChild(stepDiv);
    });

    // --- Google address suggestions for each address question ---
    let placesLibPromise = null;

    function loadPlacesLibrary() {
        if (placesLibPromise) return placesLibPromise;
        placesLibPromise = new Promise((resolve, reject) => {
            // Reuse Google Maps if the page already loaded it
            if (window.google && google.maps && google.maps.importLibrary) {
                google.maps.importLibrary('places').then(resolve, reject);
                return;
            }
            window.__amPlacesReady = () => google.maps.importLibrary('places').then(resolve, reject);
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&loading=async&v=weekly&callback=__amPlacesReady`;
            script.async = true;
            script.onerror = reject;
            document.head.appendChild(script);
        }).catch(err => {
            console.error('Google address suggestions unavailable:', err);
            placesLibPromise = null;
            throw err;
        });
        return placesLibPromise;
    }

    // Shows one search box for the address. The original street/city/state/zip inputs stay in the
    // step (hidden) and are filled from Google, so the submitted fields are exactly the same as before.
    function setupAddressAutocomplete(prefix) {
        const streetField = document.getElementsByName(`${prefix}_st`)[0];
        const city = document.getElementsByName(`${prefix}_city`)[0];
        const state = document.getElementsByName(`${prefix}_state`)[0];
        const zip = document.getElementsByName(`${prefix}_zip`)[0];
        if (!streetField) return;

        const stepInputs = streetField.closest('.step-inputs');
        const stepEl = stepInputs.closest('.form-step');
        stepEl.classList.add('addr-step');

        // Tuck the original fields away as the manual-entry fallback
        const manual = document.createElement('div');
        manual.className = 'addr-manual';
        manual.hidden = true;
        while (stepInputs.firstChild) manual.appendChild(stepInputs.firstChild);

        // The single search box (no name, so it is never submitted)
        const group = document.createElement('div');
        group.className = 'input-group has-suggestions';
        group.innerHTML = `<input type="text" class="addr-search" placeholder="Start typing your address" aria-label="Property address" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" role="combobox" aria-autocomplete="list" aria-expanded="false">
            <p class="addr-hint">Please choose your address from the suggestions.</p>
            <p class="addr-selected" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span></span></p>`;
        const street = group.querySelector('.addr-search');
        const selectedLine = group.querySelector('.addr-selected');

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'addr-toggle';
        toggle.textContent = "Can't find it? Enter address manually";

        // The optional unit field stays visible in both search and manual modes
        const unitGroup = manual.querySelector('.addr-unit-group');
        stepInputs.append(group, manual);
        if (unitGroup) stepInputs.append(unitGroup);
        stepInputs.append(toggle);

        const showManual = (on) => {
            manual.hidden = !on;
            group.hidden = on;
            toggle.textContent = on ? 'Search for my address instead' : "Can't find it? Enter address manually";
            const target = on ? streetField : street;
            if (!isMobile() || isTextField(document.activeElement)) target.focus({ preventScroll: true });
        };
        toggle.addEventListener('click', () => showManual(manual.hidden));

        // Start fresh whenever the form is reset (closed)
        form.addEventListener('reset', () => {
            street.dataset.selected = '';
            selectedLine.hidden = true;
            manual.hidden = true;
            group.hidden = false;
            toggle.textContent = "Can't find it? Enter address manually";
        });

        const list = document.createElement('div');
        list.className = 'addr-suggestions';
        list.id = `${prefix}_suggestions`;
        list.setAttribute('role', 'listbox');
        street.setAttribute('aria-controls', list.id);
        group.appendChild(list);

        let places = null;
        let sessionToken = null;
        let results = [];
        let highlighted = -1;
        let debounce = null;
        let requestId = 0;

        const close = () => {
            list.classList.remove('is-open');
            stepEl.classList.remove('addr-open');
            street.setAttribute('aria-expanded', 'false');
            highlighted = -1;
        };

        const render = () => {
            list.innerHTML = '';
            if (!results.length) { close(); return; }
            results.forEach((s, i) => {
                const p = s.placePrediction;
                const opt = document.createElement('div');
                opt.className = 'addr-option' + (i === highlighted ? ' is-active' : '');
                opt.id = `${prefix}_opt_${i}`;
                opt.setAttribute('role', 'option');
                opt.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span class="addr-option-text"><span class="addr-main"></span><span class="addr-secondary"></span></span>`;
                opt.querySelector('.addr-main').textContent = p.mainText ? p.mainText.text : p.text.text;
                opt.querySelector('.addr-secondary').textContent = p.secondaryText ? p.secondaryText.text : '';
                // Keep focus in the input while tapping a suggestion
                opt.addEventListener('pointerdown', e => e.preventDefault());
                opt.addEventListener('click', () => choose(i));
                list.appendChild(opt);
            });
            const credit = document.createElement('div');
            credit.className = 'addr-credit';
            credit.textContent = 'Google Maps';
            list.appendChild(credit);
            list.classList.add('is-open');
            stepEl.classList.add('addr-open');
            street.setAttribute('aria-expanded', 'true');
            street.setAttribute('aria-activedescendant', highlighted >= 0 ? `${prefix}_opt_${highlighted}` : '');
        };

        const fetchSuggestions = async (text) => {
            const id = ++requestId;
            try {
                places = places || await loadPlacesLibrary();
                sessionToken = sessionToken || new places.AutocompleteSessionToken();
                const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: text,
                    sessionToken,
                    includedRegionCodes: ['us'],
                    includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
                    locationBias: { center: { lat: 33.4484, lng: -112.074 }, radius: 50000 }
                });
                if (id !== requestId || document.activeElement !== street) return;
                results = (suggestions || []).filter(s => s.placePrediction).slice(0, 3);
                highlighted = -1;
                render();
            } catch (err) {
                close();
                // If Google can't load at all, fall back to the manual fields
                if (!places) showManual(true);
            }
        };

        const choose = async (i) => {
            const s = results[i];
            if (!s) return;
            close();
            const p = s.placePrediction;
            street.value = p.text ? p.text.text : p.mainText.text;
            streetField.value = p.mainText ? p.mainText.text : p.text.text;
            try {
                const place = p.toPlace();
                await place.fetchFields({ fields: ['addressComponents'] });
                const get = (type, short) => {
                    const c = (place.addressComponents || []).find(c => c.types.includes(type));
                    return c ? (short ? c.shortText : c.longText) : '';
                };
                const line1 = [get('street_number'), get('route', true)].filter(Boolean).join(' ');
                const unit = get('subpremise');
                if (line1) streetField.value = unit ? `${line1} #${unit}` : line1;
                city.value = get('locality') || get('postal_town') || get('sublocality') || get('administrative_area_level_3');
                state.value = get('administrative_area_level_1', true);
                zip.value = get('postal_code');
                // Street in the box, city/state/zip confirmed underneath (so nothing gets cut off on phones)
                street.value = streetField.value;
                selectedLine.querySelector('span').textContent = [city.value, `${state.value} ${zip.value}`.trim()].filter(Boolean).join(', ');
                selectedLine.hidden = false;
                street.dataset.selected = '1';
            } catch (err) {
                console.error('Could not load address details:', err);
            }
            sessionToken = null; // a selection ends the billing session
            [street, streetField, city, state, zip].forEach(f => f.classList.remove('error'));

            // Close the keyboard on phones so the chosen address and Next button are visible
            if (isMobile()) street.blur();
        };

        street.addEventListener('input', () => {
            clearTimeout(debounce);
            // Typing again means a new address has to be chosen
            if (street.dataset.selected) {
                street.dataset.selected = '';
                selectedLine.hidden = true;
                [streetField, city, state, zip].forEach(f => { f.value = ''; });
            }
            const text = street.value.trim();
            if (text.length < 3) { results = []; close(); return; }
            debounce = setTimeout(() => fetchSuggestions(text), 220);
        });

        street.addEventListener('keydown', e => {
            if (!list.classList.contains('is-open')) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const dir = e.key === 'ArrowDown' ? 1 : -1;
                highlighted = (highlighted + dir + results.length) % results.length;
                render();
            } else if (e.key === 'Enter') {
                // Enter picks the highlighted suggestion, or the top one
                e.preventDefault();
                e.stopPropagation();
                choose(highlighted >= 0 ? highlighted : 0);
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                close();
            }
        });

        street.addEventListener('blur', () => setTimeout(close, 120));

        // On phones, keep the search box near the top of the visible area once the keyboard opens
        street.addEventListener('focus', () => {
            if (isMobile()) setTimeout(() => { stepInputs.scrollTop = 0; }, 300);
        });
    }

    if (GOOGLE_MAPS_API_KEY || (window.google && google.maps && google.maps.importLibrary)) {
        questions.filter(q => q.type === 'address').forEach(q => setupAddressAutocomplete(q.id));
    }

    function adjustFullscreenHeight() {
        if (formContainer.classList.contains('is-open')) {
            if (window.visualViewport) {
                formContainer.style.height = window.visualViewport.height + 'px';
                formContainer.style.top = window.visualViewport.offsetTop + 'px';
            } else {
                formContainer.style.height = window.innerHeight + 'px';
                formContainer.style.top = '0px';
            }
        } else {
            formContainer.style.height = '';
            formContainer.style.top = '';
        }
    }

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', adjustFullscreenHeight);
        window.visualViewport.addEventListener('scroll', adjustFullscreenHeight);
    }

    container.addEventListener('focusin', (e) => {
        if (window.innerWidth <= 768 && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            formContainer.classList.add('keyboard-open');
            setTimeout(adjustFullscreenHeight, 50); 
        }
    });

    container.addEventListener('focusout', (e) => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                formContainer.classList.remove('keyboard-open');
                adjustFullscreenHeight();
            }
        }, 50);
    });

    // --- The Beautiful Native Pop-Out Trigger ---
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            savedScrollY = window.scrollY || document.documentElement.scrollTop;
            document.body.classList.add('form-open', 'no-scroll');
            
            // Calculate Origin relative to the button's exact position
            const rect = btnStart.getBoundingClientRect();
            const originX = rect.left + rect.width / 2;
            const originY = rect.top + rect.height / 2; 
            
            formContainer.style.transformOrigin = `${originX}px ${originY}px`;
            
            overlayBg.classList.add('is-open');
            formContainer.classList.add('is-open');
            
            adjustFullscreenHeight(); 
            renderFlow(); 
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    formContainer.classList.add('show');
                });
            });
        });
    }

    // Escape closes the form on desktop
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && formContainer.classList.contains('is-open') && btnClose) btnClose.click();
    });

    // Smooth Pop-In Animation Trigger
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (isTextField(document.activeElement)) document.activeElement.blur();
            if (btnStart) {
                const rect = btnStart.getBoundingClientRect();
                const originX = rect.left + rect.width / 2;
                const originY = rect.top + rect.height / 2; 
                formContainer.style.transformOrigin = `${originX}px ${originY}px`;
            }
            
            // Start the closing animation right away (pop back to the button / slide down on phones)
            formContainer.classList.remove('show', 'is-open');
            overlayBg.classList.remove('is-open');

            setTimeout(() => {
                formContainer.classList.remove('keyboard-open');
                formContainer.style.transformOrigin = ''; 
                formContainer.style.height = ''; 
                formContainer.style.top = ''; 
                form.reset(); 
                currentStepIndex = 0;
                stepHistory = [];
                slideDirection = 'forward';
                clearTimeout(leaveTimer);
                document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active', 'active-reverse', 'leaving', 'leaving-reverse'));
                document.querySelectorAll('.form-step .error').forEach(el => el.classList.remove('error'));
                document.body.classList.remove('form-open', 'no-scroll');
                window.scrollTo(0, savedScrollY);
                if (btnStart) btnStart.focus({ preventScroll: true });
            }, 460);
        });
    }

    function updateActions() {
        const currentEl = document.getElementById(`step-${currentStepIndex}`);
        const actionsEl = document.getElementById(`actions-${currentStepIndex}`);
        if (!actionsEl) return;
        
        actionsEl.innerHTML = '';
        
        let nextStepIndex = -1;
        for(let i = currentStepIndex + 1; i < questions.length; i++) {
            if(questions[i].cond()) { nextStepIndex = i; break; }
        }

        if(stepHistory.length > 0) {
            const btnBack = document.createElement('button');
            btnBack.type = 'button';
            btnBack.className = 'btn-secondary';
            btnBack.innerHTML = `${ICON_BACK} Back`;
            btnBack.onclick = () => {
                slideDirection = 'backward';
                currentStepIndex = stepHistory.pop();
                renderFlow();
            };
            actionsEl.appendChild(btnBack);
        }

        const btnForward = document.createElement('button');
        btnForward.className = 'btn-primary btn-forward';
        btnForward.type = 'submit'; 
        
        // A choice question's follow-ups depend on the answer, so only say "Submit" once it's answered
        const awaitingChoice = currentEl.querySelector('input[type="radio"]') && !currentEl.querySelector('input[type="radio"]:checked');

        if (nextStepIndex === -1 && !awaitingChoice) {
            btnForward.innerHTML = `Submit ${ICON_SUBMIT}`;
        } else {
            btnForward.innerHTML = `Next ${ICON_NEXT}`;
        }
        
        actionsEl.appendChild(btnForward);
    }

    container.addEventListener('input', e => {
        const el = e.target;
        if(el.classList.contains('fmt-phone')) {
            let x = el.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
            el.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        } else if(el.classList.contains('fmt-num')) {
            el.value = el.value.replace(/\D/g, '');
        } else if(el.classList.contains('fmt-curr')) {
            let val = el.value.replace(/\D/g, '');
            el.value = val ? '$' + parseInt(val, 10).toLocaleString() : '';
        } else if(el.classList.contains('fmt-curr-dec')) {
            let val = el.value.replace(/[^0-9.]/g, '');
            let p = val.split('.');
            if(p.length > 2) val = p[0] + '.' + p.slice(1).join('');
            if(val) {
                if(val.includes('.')) {
                    let p2 = val.split('.');
                    let whole = p2[0] ? parseInt(p2[0], 10).toLocaleString() : '0';
                    el.value = '$' + whole + '.' + p2[1].substring(0,2);
                } else {
                    el.value = '$' + parseInt(val, 10).toLocaleString();
                }
            } else {
                el.value = '';
            }
        }
        el.classList.remove('error'); 
    });

    container.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const currentEl = document.getElementById(`step-${currentStepIndex}`);

            // On steps with several fields (name, address), Enter moves to the next field first
            const fields = Array.from(currentEl.querySelectorAll('input:not([type="radio"]):not([type="hidden"])')).filter(isShown);
            const nextField = fields.slice(fields.indexOf(e.target) + 1).find(f => !f.value.trim());
            if (fields.includes(e.target) && nextField) {
                nextField.focus({ preventScroll: true });
                return;
            }

            const fwdBtn = currentEl.querySelector('.btn-forward');
            if (fwdBtn) fwdBtn.click();
        }
    });

    container.addEventListener('change', e => {
        if(e.target.type === 'radio') {
            e.target.closest('.radio-group').classList.remove('error');
            updateActions(); 
            const currentEl = document.getElementById(`step-${currentStepIndex}`);
            const fwdBtn = currentEl.querySelector('.btn-forward');
            if (fwdBtn && fwdBtn.textContent.includes('Next')) {
                setTimeout(() => {
                    if (currentEl.classList.contains('active') || currentEl.classList.contains('active-reverse')) {
                        fwdBtn.click();
                    }
                }, 350); 
            }
        }
    });

    let leaveTimer = null;
    const progressFill = document.getElementById('form-progress-fill');

    function renderFlow() {
        const isBack = slideDirection !== 'forward';
        const prevEl = document.querySelector('.form-step.active, .form-step.active-reverse');
        const currentEl = document.getElementById(`step-${currentStepIndex}`);
        const hadTextFocus = isTextField(document.activeElement);

        // Clear any step still mid-animation
        clearTimeout(leaveTimer);
        document.querySelectorAll('.form-step').forEach(s => {
            s.classList.remove('active', 'active-reverse', 'leaving', 'leaving-reverse');
        });

        // Let the previous question slide away underneath the new one
        if (prevEl && prevEl !== currentEl) {
            prevEl.classList.add(isBack ? 'leaving-reverse' : 'leaving');
            leaveTimer = setTimeout(() => prevEl.classList.remove('leaving', 'leaving-reverse'), 300);
        }

        currentEl.classList.add(isBack ? 'active-reverse' : 'active');
        currentEl.querySelector('.step-count').textContent = `Question ${stepHistory.length + 1}`;

        // Progress eases toward full as questions are answered (the total changes with each answer)
        if (progressFill) {
            const pct = 8 + 86 * (1 - Math.pow(0.8, stepHistory.length));
            progressFill.style.width = pct + '%';
        }

        updateActions();

        const firstInput = Array.from(currentEl.querySelectorAll('input:not([type="radio"]):not([type="hidden"]), textarea')).find(isShown);
        if (isMobile()) {
            // Keep the keyboard up between typed answers; close it for tap-to-choose questions
            if (firstInput && hadTextFocus) {
                firstInput.focus({ preventScroll: true });
            } else if (!firstInput && hadTextFocus) {
                document.activeElement.blur();
            }
        } else if (firstInput) {
            setTimeout(() => firstInput.focus({ preventScroll: true }), 60);
        }
    }

    // Briefly shake the answer area when something is missing
    function shake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    }

    function validateStep(stepEl) {
        let isValid = true;
        const inputs = stepEl.querySelectorAll('input, textarea');
        const radioNames = new Set();
        inputs.forEach(i => { if(i.type === 'radio') radioNames.add(i.name); });
        
        radioNames.forEach(name => {
            const group = stepEl.querySelector(`.radio-group:has(input[name="${name}"])`);
            if(!stepEl.querySelector(`input[name="${name}"]:checked`)) {
                isValid = false;
                group.classList.add('error');
            } else {
                group.classList.remove('error');
            }
        });

        inputs.forEach(i => {
            // Only check fields the visitor can see (e.g. the address search box OR the manual fields)
            if(i.type !== 'radio' && isShown(i) && !i.dataset.optional) {
                if(i.classList.contains('addr-search') && (!i.dataset.selected || !i.value.trim())) {
                    isValid = false; i.classList.add('error');
                } else if(!i.value.trim()) {
                    isValid = false; i.classList.add('error');
                } else if(i.type === 'email' && !i.value.includes('@')) {
                    isValid = false; i.classList.add('error');
                } else if(i.classList.contains('fmt-phone') && i.value.replace(/\D/g, '').length < 10) {
                    isValid = false; i.classList.add('error');
                }
            }
        });
        return isValid;
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const currentEl = document.getElementById(`step-${currentStepIndex}`);
        if(!validateStep(currentEl)) {
            shake(currentEl.querySelector('.step-inputs'));
            const firstError = currentEl.querySelector('input.error, textarea.error');
            if (firstError && (!isMobile() || isTextField(document.activeElement))) firstError.focus({ preventScroll: true });
            return;
        }

        let nextStepIndex = -1;
        for(let i = currentStepIndex + 1; i < questions.length; i++) {
            if(questions[i].cond()) { nextStepIndex = i; break; }
        }
        
        if (nextStepIndex !== -1) {
            slideDirection = 'forward';
            stepHistory.push(currentStepIndex);
            currentStepIndex = nextStepIndex;
            renderFlow();
            return;
        }

        const submitBtn = currentEl.querySelector('.btn-forward');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        const finalData = new FormData();
        const dynamicSource = document.getElementById('dynamic-form-source').value || 'General Web Form';
        finalData.append('form_source', dynamicSource);
        
        const azDate = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Phoenix"}));
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedDate = monthNames[azDate.getMonth()] + " " + String(azDate.getDate()).padStart(2, '0') + " " + azDate.getFullYear();
        finalData.append('submission_date', formattedDate);
        
        questions.forEach(q => {
            const isActive = q.cond();
            const stepEl = document.getElementById(`step-${questions.indexOf(q)}`);
            const inputs = Array.from(stepEl.querySelectorAll('input, textarea'));
            const uniqueNames = [...new Set(inputs.map(i => i.name).filter(Boolean))];
            
            uniqueNames.forEach(name => {
                if (!isActive) {
                    finalData.append(name, "");
                } else {
                    const els = inputs.filter(i => i.name === name);
                    if (els[0].type === 'radio') {
                        const checked = els.find(el => el.checked);
                        finalData.append(name, checked ? checked.value : "");
                    } else {
                        // Optional extras (e.g. unit #) are added onto the end of their field's value
                        let value = els[0].value;
                        const extra = stepEl.querySelector(`[data-append-to="${name}"]`);
                        if (extra && extra.value.trim()) value = appendUnit(value, extra.value.trim());
                        finalData.append(name, value);
                    }
                }
            });
        });

        // Retains the original Webhook endpoint provided in your snippet
        fetch('https://hooks.zapier.com/hooks/catch/17339400/42fpg7w/', {
            method: 'POST',
            body: finalData,
            mode: 'no-cors' 
        })
        .then(() => {
            window.location.href = 'https://andrewmarth.com/thank-you';
        })
        .catch(error => {
            console.error('Error:', error);
            submitBtn.textContent = 'Error. Try Again.';
            submitBtn.disabled = false;
        });
    });
}
