// --- Website sign-up form ---
// Asks the same questions as signing up in the portal (portal.andrewmarth.com/signup) and sets the account up the
// same way: the phone number is confirmed with a texted code, then the portal API adds the client's account
// (plus a Seller Net page when they're selling). It ends by pointing them to the My Homes app.

// Google Maps browser key for the address suggestions (leave empty for a plain address form)
const GOOGLE_MAPS_API_KEY = 'AIzaSyB_huoPCD9Jls7QigYuoJdW7ut9rOuQgwM';

// Same Firebase project and portal API as the portal (its firebase-config.js)
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDdwjGBP5ZwdtZhlq8wsLHbgn2UwfYKDrQ',
    authDomain: 'andrew-marth-portal.firebaseapp.com',
    projectId: 'andrew-marth-portal',
    appId: '1:1067689166695:web:d315fcf943f7b8430991c2',
};
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const PORTAL_API_URL = 'https://script.google.com/macros/s/AKfycbw7_6-r-ShjTBpqlkKeYTuTjdIH8-njHdEgEHuXFszDHWPg1L5AP5yaCawutnSEx3Z6/exec';
const PORTAL_URL = 'https://portal.andrewmarth.com/';

// options.trigger: id of the button that opens the form (default "btn-start-form")
// options.goals: "What brings you here?" choices ticked from the start, e.g. ['buy'] (or data-form-goals="buy" on #form-placeholder)
function initDynamicForm(options = {}) {
    const overlayBg = document.getElementById('form-overlay-bg');
    const formContainer = document.getElementById('form-container');
    const form = document.getElementById('conditional-form');
    const container = document.getElementById('form-steps-container');
    const btnStart = document.getElementById(options.trigger || 'btn-start-form');
    const btnClose = document.getElementById('close-form-btn');
    const progressFill = document.getElementById('form-progress-fill');

    // --- DYNAMIC TEXT INJECTION ---
    const placeholder = document.getElementById('form-placeholder');
    let presetGoals = options.goals || [];
    if (placeholder) {
        const title = placeholder.getAttribute('data-form-title');
        const desc = placeholder.getAttribute('data-form-desc');
        if (title) document.getElementById('dynamic-form-title').textContent = title;
        if (desc) document.getElementById('dynamic-form-desc').textContent = desc;
        if (placeholder.dataset.formGoals) presetGoals = placeholder.dataset.formGoals.split(',').map(g => g.trim());
    }

    addFormStyles();

    // Line icons (match the rest of the site)
    const ICON_NEXT = `<svg class="btn-icon btn-icon-forward" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    const ICON_BACK = `<svg class="btn-icon btn-icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`;
    const ICON_SUBMIT = `<svg class="btn-icon btn-icon-forward" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
    const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

    const isMobile = () => window.innerWidth <= 768;
    const isTextField = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['radio', 'checkbox', 'hidden'].includes(el.type)));
    const isShown = el => !el.closest('[hidden]');
    const digitsOnly = s => s.replace(/\D/g, '');
    const formatUS = d => !d ? '' : d.length < 4 ? `(${d}` : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    const checked = name => Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
    const field = name => form.querySelector(`[name="${name}"]`);

    // "4B" -> "123 Main St #4B"; "Apt 4" -> "123 Main St Apt 4"; skips it if the street already ends with it
    function appendUnit(street, unit) {
        const u = /^(#|(apt|apartment|unit|ste|suite|bldg|building|lot|spc|space|fl|floor|rm|room)\b)/i.test(unit) ? unit : `#${unit}`;
        if (street.toLowerCase().endsWith(u.toLowerCase())) return street;
        return `${street} ${u}`.trim();
    }

    const choice = (name, value, label, paths) => `<label class="check-btn"><input type="checkbox" name="${name}" value="${value}"${name === 'goal' && presetGoals.includes(value) ? ' checked' : ''}><span><span class="check-icon">${icon(paths)}</span>${label}</span></label>`;
    const DOTS = '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>';

    // The same questions as the portal's sign-up page
    const STEPS = {
        name: {
            title: 'What is your name?',
            help: 'Enter your legal name as it would appear on contracts.',
            html: `<div class="name-row">
                        <div class="input-group"><label for="su_first">First Name</label><input type="text" id="su_first" name="su_first" placeholder="First" autocomplete="given-name" autocapitalize="words" maxlength="50" enterkeyhint="next"></div>
                        <div class="input-group"><label for="su_last">Last Name</label><input type="text" id="su_last" name="su_last" placeholder="Last" autocomplete="family-name" autocapitalize="words" maxlength="50" enterkeyhint="next"></div>
                   </div>`,
        },
        phone: {
            title: 'What is your mobile number?',
            help: 'Your primary phone number. This will be used to log in and must be able to receive texts. Message and data rates may apply.',
            button: 'Text Me a Code',
            html: `<div class="input-group"><input type="tel" name="su_phone" class="fmt-phone" placeholder="(480) 555-0123" aria-label="Mobile number" autocomplete="tel-national" inputmode="tel" enterkeyhint="send"></div>`,
        },
        code: {
            title: 'Enter the code we texted you',
            lead: 'We texted a 6-digit code to your phone.',
            button: 'Verify',
            html: `<div class="input-group"><input type="text" name="su_code" class="code-input" placeholder="••••••" aria-label="6-digit code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" enterkeyhint="done"></div>
                   <div class="code-links">
                        <button type="button" class="link-btn" data-change-number>Use a different number</button>
                        <button type="button" class="link-btn" data-resend disabled>Resend code</button>
                   </div>`,
        },
        email: {
            title: 'What is your email address?',
            help: 'This is just to have on file. I hate email just as much as you do, so do not expect me to email you much.',
            html: `<div class="input-group"><input type="email" name="su_email" placeholder="email@example.com" aria-label="Email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" maxlength="120" enterkeyhint="next"></div>`,
        },
        goals: {
            title: 'What brings you here?',
            lead: 'Choose all that apply.',
            html: `<div class="check-group" role="group" aria-label="What brings you here">
                        ${choice('goal', 'buy', 'Thinking Of Buying A Home', '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>')}
                        ${choice('goal', 'sell', 'Thinking Of Selling A Home', '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>')}
                        ${choice('goal', 'invest', 'Investing In Real Estate', '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>')}
                        ${choice('goal', 'other', 'Other', DOTS)}
                   </div>`,
        },
        roles: {
            title: 'Which of these roles are you?',
            lead: 'Choose all that apply.',
            html: `<div class="check-group" role="group" aria-label="Your roles">
                        ${choice('role', 'mortgage', 'Mortgage Lender', '<path d="m3 10 9-6 9 6"/><path d="M5 10v9"/><path d="M19 10v9"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M3 21h18"/>')}
                        ${choice('role', 'hardmoney', 'Hard Money Lender', '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3-1.6"/><path d="M12 6v2"/><path d="M12 16v2"/>')}
                        ${choice('role', 'wholesaler', 'Wholesaler', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>')}
                        ${choice('role', 'other', 'Other', DOTS)}
                   </div>`,
        },
        address: {
            title: 'What is your home\'s address?',
            lead: 'The home you\'re thinking of selling.',
            html: `<div class="input-group"><label for="su_addr_st">Street Address</label><input type="text" id="su_addr_st" name="su_addr_st" placeholder="123 Main St" autocomplete="address-line1" enterkeyhint="next"></div>
                   <div class="name-row addr-row">
                        <div class="input-group"><label for="su_addr_city">City</label><input type="text" id="su_addr_city" name="su_addr_city" placeholder="City" autocomplete="address-level2" enterkeyhint="next"></div>
                        <div class="input-group"><label for="su_addr_state">State</label><input type="text" id="su_addr_state" name="su_addr_state" placeholder="State" autocomplete="address-level1" maxlength="20" enterkeyhint="next"></div>
                        <div class="input-group"><label for="su_addr_zip">Zip</label><input type="text" id="su_addr_zip" name="su_addr_zip" placeholder="Zip" autocomplete="postal-code" inputmode="numeric" maxlength="10" enterkeyhint="next"></div>
                   </div>
                   <div class="input-group addr-unit-group"><label for="su_addr_unit">Unit # <span class="optional-tag">(optional)</span></label><input type="text" id="su_addr_unit" name="su_addr_unit" class="addr-unit" placeholder="Apt, suite or unit" autocomplete="address-line2" enterkeyhint="next" data-optional="1"></div>`,
        },
    };

    const steps = {};
    Object.entries(STEPS).forEach(([key, s]) => {
        const el = document.createElement('div');
        el.className = 'form-step';
        el.id = `step-${key}`;
        el.innerHTML = `
            <div class="step-header">
                <span class="step-count"></span>
                <h3 class="step-title">${s.title}</h3>${s.lead ? `<p class="step-lead">${s.lead}</p>` : ''}
            </div>
            <div class="step-inputs">${s.html}${s.help ? `<p class="step-help">${s.help}</p>` : ''}<p class="step-message" role="alert"></p></div>
            <div class="form-actions"></div>`;
        container.appendChild(el);
        steps[key] = el;
    });

    // The finish screen: account made (or already there), then on to the app
    const done = document.createElement('div');
    done.className = 'form-step';
    done.id = 'step-done';
    done.setAttribute('role', 'status');
    done.innerHTML = `
        <div class="step-inputs done-body">
            <div class="done-icon">${icon('<path d="M20 6 9 17l-5-5"/>')}</div>
            <h3 class="step-title"></h3>
            <p class="done-text"></p>
            <a class="btn-primary done-btn" href="${PORTAL_URL}">Get the My Homes App ${ICON_NEXT}</a>
        </div>`;
    container.appendChild(done);
    steps.done = done;

    // --- Which steps apply (phone and code drop out once the number is confirmed) ---
    let phoneVerified = false;
    let finished = false;
    function flow() {
        const goals = checked('goal');
        return ['name']
            .concat(phoneVerified ? [] : ['phone', 'code'])
            .concat(['email', 'goals'])
            .concat(goals.includes('other') ? ['roles'] : [])
            .concat(goals.includes('sell') ? ['address'] : []);
    }
    let current = 'name';
    let busy = false;
    let savedScrollY = 0;
    let leaveTimer = null;

    function setMessage(text) {
        const el = steps[current].querySelector('.step-message');
        if (el) el.textContent = text || '';
    }

    function updateActions() {
        const el = steps[current];
        const actions = el.querySelector('.form-actions');
        if (!actions) return;
        actions.innerHTML = '';
        const list = flow();
        const i = list.indexOf(current);

        if (i > 0) {
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'btn-secondary';
            back.innerHTML = `${ICON_BACK} Back`;
            back.onclick = () => { if (!busy) go(list[i - 1], true); };
            actions.appendChild(back);
        }

        const forward = document.createElement('button');
        forward.type = 'submit';
        forward.className = 'btn-primary btn-forward';
        const last = i === list.length - 1;
        forward.innerHTML = STEPS[current].button ? `${STEPS[current].button} ${ICON_NEXT}` : last ? `Create Account ${ICON_SUBMIT}` : `Next ${ICON_NEXT}`;
        actions.appendChild(forward);

        el.querySelector('.step-count').textContent = i >= 0 ? `Step ${i + 1} of ${list.length}` : '';
        if (progressFill) progressFill.style.width = (8 + 86 * (i / Math.max(list.length - 1, 1))) + '%';
    }

    function go(name, back = false) {
        const prevEl = document.querySelector('.form-step.active, .form-step.active-reverse');
        const currentEl = steps[name];
        const hadTextFocus = isTextField(document.activeElement);
        current = name;

        // Clear any step still mid-animation, and let the previous one slide away underneath the new one
        clearTimeout(leaveTimer);
        Object.values(steps).forEach(s => s.classList.remove('active', 'active-reverse', 'leaving', 'leaving-reverse'));
        if (prevEl && prevEl !== currentEl) {
            prevEl.classList.add(back ? 'leaving-reverse' : 'leaving');
            leaveTimer = setTimeout(() => prevEl.classList.remove('leaving', 'leaving-reverse'), 300);
        }
        currentEl.classList.add(back ? 'active-reverse' : 'active');

        if (name === 'done') {
            if (progressFill) progressFill.style.width = '100%';
            if (hadTextFocus) document.activeElement.blur();
            return;
        }
        setMessage('');
        updateActions();

        const firstInput = Array.from(currentEl.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"])')).find(isShown);
        if (isMobile()) {
            // Keep the keyboard up between typed answers; close it for tap-to-choose questions
            if (firstInput && hadTextFocus) firstInput.focus({ preventScroll: true });
            else if (!firstInput && hadTextFocus) document.activeElement.blur();
        } else if (firstInput) {
            setTimeout(() => firstInput.focus({ preventScroll: true }), 60);
        }
    }

    function next() {
        const list = flow();
        const i = list.indexOf(current);
        if (i === list.length - 1) return createAccount();
        go(list[i + 1]);
    }

    // Briefly shake the answer area when something is missing
    function shake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    }

    function problem(text, el) {
        const stepEl = steps[current];
        if (el) el.classList.add('error');
        setMessage(text);
        shake(stepEl.querySelector('.step-inputs'));
        if (el && isTextField(el) && (!isMobile() || isTextField(document.activeElement))) el.focus({ preventScroll: true });
    }

    function setBusy(on, text) {
        busy = on;
        const button = steps[current].querySelector('.btn-forward');
        if (!button) return;
        button.disabled = on;
        if (on) button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${text}`;
        else updateActions();
    }

    // --- Address: Google suggestions, or typed in by hand ---
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

    // Shows one search box for the address. The street/city/state/zip inputs stay in the step (hidden)
    // and are filled from Google; "Enter address manually" shows them instead.
    function setupAddressAutocomplete(prefix) {
        const streetField = field(`${prefix}_st`);
        const city = field(`${prefix}_city`);
        const state = field(`${prefix}_state`);
        const zip = field(`${prefix}_zip`);
        const stepInputs = streetField.closest('.step-inputs');
        const stepEl = stepInputs.closest('.form-step');
        const help = stepInputs.querySelector('.step-message');
        stepEl.classList.add('addr-step');

        // Tuck the original fields away as the manual-entry fallback
        const manual = document.createElement('div');
        manual.className = 'addr-manual';
        manual.hidden = true;
        Array.from(stepInputs.children).filter(c => !c.matches('.step-help, .step-message, .addr-unit-group')).forEach(c => manual.appendChild(c));

        // The single search box (no name, so it is never sent)
        const group = document.createElement('div');
        group.className = 'input-group has-suggestions';
        group.innerHTML = `<input type="text" class="addr-search" placeholder="Start typing your address" aria-label="Home address" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" role="combobox" aria-autocomplete="list" aria-expanded="false">
            <p class="addr-selected" hidden>${icon('<path d="M20 6 9 17l-5-5"/>')}<span></span></p>`;
        const street = group.querySelector('.addr-search');
        const selectedLine = group.querySelector('.addr-selected');

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'addr-toggle';
        toggle.textContent = "Can't find it? Enter address manually";

        const unitGroup = stepInputs.querySelector('.addr-unit-group');
        stepInputs.insertBefore(group, help);
        stepInputs.insertBefore(manual, help);
        if (unitGroup) stepInputs.insertBefore(unitGroup, help);
        stepInputs.insertBefore(toggle, help);

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
                opt.innerHTML = `${icon('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>')}
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
                // Google couldn't load or refused: type it in instead
                showManual(true);
                streetField.value = streetField.value || street.value.trim();
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
            setMessage('');

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

    if (GOOGLE_MAPS_API_KEY || (window.google && google.maps && google.maps.importLibrary)) setupAddressAutocomplete('su_addr');

    function address() {
        const unit = field('su_addr_unit').value.trim();
        const street = field('su_addr_st').value.trim();
        return {
            street: unit ? appendUnit(street, unit) : street,
            city: field('su_addr_city').value.trim(),
            state: field('su_addr_state').value.trim(),
            zip: field('su_addr_zip').value.trim(),
        };
    }

    // --- Checks for each step (returns true, or shows what's wrong) ---
    function validate() {
        const stepEl = steps[current];
        if (current === 'name') {
            const first = field('su_first'), last = field('su_last');
            if (!first.value.trim()) return problem('Please enter your first name.', first);
            if (!last.value.trim()) return problem('Please enter your last name.', last);
        } else if (current === 'phone') {
            const phone = field('su_phone');
            if (digitsOnly(phone.value).length !== 10) return problem('Please enter your 10-digit mobile number.', phone);
        } else if (current === 'code') {
            const code = field('su_code');
            if (code.value.length !== 6) return problem('Please enter the 6-digit code from the text.', code);
        } else if (current === 'email') {
            const email = field('su_email');
            if (!email.value.trim()) return problem('Please enter your email.', email);
            if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.value.trim())) return problem('That email doesn\'t look right. Please check it.', email);
        } else if (current === 'goals' || current === 'roles') {
            if (!checked(current === 'goals' ? 'goal' : 'role').length) {
                stepEl.querySelector('.check-group').classList.add('error');
                return problem('Please choose at least one.');
            }
        } else if (current === 'address') {
            const search = stepEl.querySelector('.addr-search');
            if (search && isShown(search)) {
                if (stepEl.querySelector('.addr-suggestions.is-open')) return false;
                if (!search.dataset.selected) return problem('Please choose your address from the suggestions, or enter it manually.', search);
            }
            const missing = ['st', 'city', 'state', 'zip'].find(k => !field(`su_addr_${k}`).value.trim());
            if (missing) return problem('Please fill in the full address (street, city, state and zip).', search && isShown(search) ? search : field(`su_addr_${missing}`));
        }
        return true;
    }

    // --- Phone check by text (Firebase, the same way the portal does it) ---
    // Sign-in is kept in memory only: the website never stays signed in
    let firebase = null;
    function loadFirebase() {
        if (!firebase) {
            firebase = Promise.all([import(`${FIREBASE_SDK}/firebase-app.js`), import(`${FIREBASE_SDK}/firebase-auth.js`)])
                .then(([app, authLib]) => {
                    const auth = authLib.initializeAuth(app.initializeApp(FIREBASE_CONFIG), { persistence: authLib.inMemoryPersistence });
                    auth.useDeviceLanguage();
                    const holder = document.createElement('div');
                    holder.id = 'signup-recaptcha';
                    document.body.appendChild(holder);
                    const verifier = new authLib.RecaptchaVerifier(auth, holder, { size: 'invisible' });
                    return { auth, verifier, signInWithPhoneNumber: authLib.signInWithPhoneNumber };
                })
                .catch(err => { firebase = null; throw err; });
        }
        return firebase;
    }

    function friendlyError(err) {
        const map = {
            'auth/invalid-phone-number': 'That phone number doesn\'t look right. Please check it and try again.',
            'auth/missing-phone-number': 'Please enter your mobile number.',
            'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
            'auth/quota-exceeded': 'We can\'t send texts right now. Please try again later.',
            'auth/invalid-verification-code': 'That code isn\'t right. Please check the text and try again.',
            'auth/code-expired': 'That code has expired. Tap "Resend code" for a new one.',
            'auth/captcha-check-failed': 'We couldn\'t verify this browser. Please refresh and try again.',
            'auth/invalid-app-credential': 'We couldn\'t verify this browser. Please refresh and try again.',
            'auth/network-request-failed': 'No connection. Please check your internet and try again.',
        };
        return map[(err && err.code) || ''] || 'Something went wrong. Please try again.';
    }

    let confirmation = null;
    let currentUser = null;
    let lastNumber = '';
    let resendTimer = null;
    const resendBtn = steps.code.querySelector('[data-resend]');

    async function resetVerifier() {
        try {
            const { verifier } = await loadFirebase();
            const widgetId = await verifier.render();
            window.grecaptcha.reset(widgetId);
        } catch (e) { console.error(e); }
    }
    function startResendCountdown() {
        let s = 30;
        resendBtn.disabled = true;
        resendBtn.textContent = `Resend code (${s}s)`;
        clearInterval(resendTimer);
        resendTimer = setInterval(() => {
            s -= 1;
            if (s <= 0) { clearInterval(resendTimer); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
            else resendBtn.textContent = `Resend code (${s}s)`;
        }, 1000);
    }
    async function sendCode(number) {
        const { auth, verifier, signInWithPhoneNumber } = await loadFirebase();
        confirmation = await signInWithPhoneNumber(auth, `+1${number}`, verifier);
        lastNumber = number;
        steps.code.querySelector('.step-lead').textContent = `We texted a 6-digit code to ${formatUS(number)}.`;
        startResendCountdown();
    }

    resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        try {
            await resetVerifier();
            await sendCode(lastNumber);
            setMessage('A new code is on its way.');
        } catch (err) {
            console.error(err);
            setMessage(friendlyError(err));
            resendBtn.disabled = false;
        }
    });
    steps.code.querySelector('[data-change-number]').addEventListener('click', () => {
        if (busy) return;
        clearInterval(resendTimer);
        confirmation = null;
        resetVerifier();
        go('phone', true);
    });

    // --- The portal API (the same calls the portal's sign-up page makes) ---
    async function api(payload) {
        const idToken = await currentUser.getIdToken();
        return fetch(PORTAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ idToken, ...payload }),
        }).then(r => r.json());
    }
    // Whether this phone number already has an account (if we can't tell, assume not and let sign-up decide)
    async function hasAccount() {
        try {
            const json = await api({});
            return !(json && json.ok === false && json.error === 'not_found');
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    const API_ERRORS = {
        invalid_name: 'Please check your name and try again.',
        invalid_email: 'Please check your email and try again.',
        invalid_goals: 'Please choose what brings you here.',
        invalid_roles: 'Please choose your role.',
        missing_address: 'Please fill in your full home address.',
    };
    async function createAccount() {
        setBusy(true, 'Creating...');
        try {
            const goals = checked('goal');
            const json = await api({
                action: 'signup',
                firstName: field('su_first').value.trim(),
                lastName: field('su_last').value.trim(),
                email: field('su_email').value.trim(),
                goals,
                roles: goals.includes('other') ? checked('role') : [],
                address: goals.includes('sell') ? address() : null,
            });
            if (!json.ok && json.error !== 'exists') throw new Error(json.error || 'Request failed');
            busy = false;
            finish(json.ok ? 'created' : 'exists');
        } catch (err) {
            console.error(err);
            setBusy(false);
            setMessage(API_ERRORS[err.message] || 'We couldn\'t create your account. Please try again.');
        }
    }

    function finish(kind) {
        finished = true;
        done.querySelector('.step-title').textContent = kind === 'created' ? 'You\'re all set!' : 'You already have an account';
        done.querySelector('.done-text').textContent = kind === 'created'
            ? 'Your account is ready. Get the My Homes app and sign in with the phone number you just confirmed.'
            : 'This phone number already has an account. Get the My Homes app and sign in with it.';
        go('done');
    }

    // --- Typing helpers ---
    container.addEventListener('input', e => {
        const el = e.target;
        if (el.name === 'su_phone') {
            let d = digitsOnly(el.value);
            if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
            el.value = formatUS(d.slice(0, 10));
        } else if (el.name === 'su_code') {
            el.value = digitsOnly(el.value).slice(0, 6);
            if (el.value.length === 6 && !busy) setTimeout(() => form.requestSubmit(steps.code.querySelector('.btn-forward')), 0);
        }
        el.classList.remove('error');
        if (current !== 'code' || el.name !== 'su_code' || el.value.length) setMessage('');
    });

    container.addEventListener('change', e => {
        if (e.target.type !== 'checkbox') return;
        e.target.closest('.check-group').classList.remove('error');
        setMessage('');
        // The step count changes as choices change the questions that follow
        updateActions();
    });

    container.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            const currentEl = steps[current];
            // On steps with several fields (name, address), Enter moves to the next field first
            const fields = Array.from(currentEl.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"])')).filter(isShown);
            const nextField = fields.slice(fields.indexOf(e.target) + 1).find(f => !f.value.trim());
            if (fields.includes(e.target) && nextField) {
                nextField.focus({ preventScroll: true });
                return;
            }
            const fwdBtn = currentEl.querySelector('.btn-forward');
            if (fwdBtn) fwdBtn.click();
        }
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (busy || current === 'done' || validate() !== true) return;

        if (current === 'phone') {
            setBusy(true, 'Sending...');
            try {
                await sendCode(digitsOnly(field('su_phone').value));
                field('su_code').value = '';
                setBusy(false);
                go('code');
            } catch (err) {
                console.error(err);
                setBusy(false);
                problem(friendlyError(err));
                resetVerifier();
            }
        } else if (current === 'code') {
            setBusy(true, 'Checking...');
            try {
                const result = await confirmation.confirm(field('su_code').value);
                currentUser = result.user;
                clearInterval(resendTimer);
                // This number already has an account: nothing more to ask
                if (await hasAccount()) { busy = false; finish('exists'); return; }
                phoneVerified = true;
                setBusy(false);
                go('email');
            } catch (err) {
                console.error(err);
                setBusy(false);
                problem(friendlyError(err), field('su_code'));
                field('su_code').select();
            }
        } else {
            next();
        }
    });

    // --- Opening and closing the pop-up ---
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
        if (window.innerWidth <= 768 && isTextField(e.target)) {
            formContainer.classList.add('keyboard-open');
            setTimeout(adjustFullscreenHeight, 50);
        }
    });

    container.addEventListener('focusout', () => {
        setTimeout(() => {
            if (!isTextField(document.activeElement)) {
                formContainer.classList.remove('keyboard-open');
                adjustFullscreenHeight();
            }
        }, 50);
    });

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            savedScrollY = window.scrollY || document.documentElement.scrollTop;
            document.body.classList.add('form-open', 'no-scroll');

            // Pop out of the button's exact position
            const rect = btnStart.getBoundingClientRect();
            formContainer.style.transformOrigin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;

            overlayBg.classList.add('is-open');
            formContainer.classList.add('is-open');

            adjustFullscreenHeight();
            go(finished ? 'done' : current);
            // Get the text-message check ready while they type their name
            loadFirebase().catch(err => console.error('Phone check unavailable:', err));

            requestAnimationFrame(() => requestAnimationFrame(() => formContainer.classList.add('show')));
        });
    }

    // Escape closes the form on desktop
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && formContainer.classList.contains('is-open') && btnClose) btnClose.click();
    });

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (isTextField(document.activeElement)) document.activeElement.blur();
            if (btnStart) {
                const rect = btnStart.getBoundingClientRect();
                formContainer.style.transformOrigin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
            }

            // Start the closing animation right away (pop back to the button / slide down on phones)
            formContainer.classList.remove('show', 'is-open');
            overlayBg.classList.remove('is-open');

            setTimeout(() => {
                formContainer.classList.remove('keyboard-open');
                formContainer.style.transformOrigin = '';
                formContainer.style.height = '';
                formContainer.style.top = '';
                // Closing part-way starts over (a confirmed phone number stays confirmed)
                if (!finished && !busy) {
                    form.reset();
                    clearInterval(resendTimer);
                    confirmation = null;
                    current = 'name';
                }
                clearTimeout(leaveTimer);
                Object.values(steps).forEach(s => s.classList.remove('active', 'active-reverse', 'leaving', 'leaving-reverse'));
                container.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                document.body.classList.remove('form-open', 'no-scroll');
                window.scrollTo(0, savedScrollY);
                btnStart.focus({ preventScroll: true });
            }, 460);
        });
    }
}

// Styles for the sign-up steps (the pop-up itself is styled by each page / form-component.html)
function addFormStyles() {
    if (document.getElementById('signup-form-styles')) return;
    const style = document.createElement('style');
    style.id = 'signup-form-styles';
    style.textContent = `
        .form-step [hidden] { display: none !important; }
        .step-lead { margin: -12px 0 18px; font-size: 1.02rem; line-height: 1.45; color: #4f2d2c; opacity: 0.8; }
        .step-help { margin: 14px 6px 0; font-size: 0.92rem; line-height: 1.45; color: #4f2d2c; opacity: 0.75; text-align: left; }
        .step-message { min-height: 1.4em; margin: 10px 6px 0; font-size: 0.92rem; font-weight: bold; color: #c0392b; text-align: left; }
        .step-message:empty { min-height: 0; margin: 0; }

        .check-group { display: flex; flex-direction: column; gap: 10px; }
        .check-btn { display: block; position: relative; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .check-btn input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
        .check-btn > span { display: flex; align-items: center; gap: 14px; min-height: 58px; padding: 10px 18px 10px 12px; background-color: #f7f4f0; border: 2px solid #0E2A3B; border-radius: 18px; font-size: 1.05rem; font-weight: bold; color: #4f2d2c; text-align: left; transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .check-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; background: #ffffff; color: #99724b; transition: background-color 0.2s ease, color 0.2s ease; }
        .check-icon svg { width: 21px; height: 21px; }
        .check-btn > span::after { content: ''; width: 22px; height: 22px; margin-left: auto; flex-shrink: 0; border-radius: 7px; border: 2px solid rgba(14, 42, 59, 0.35); background: #ffffff center / 15px no-repeat; transition: background-color 0.2s ease, border-color 0.2s ease; }
        .check-btn input:checked + span { background-color: #99724b; color: #ffffff; box-shadow: 0 6px 15px rgba(153, 114, 75, 0.25); }
        .check-btn input:checked + span .check-icon { background: rgba(255, 255, 255, 0.18); color: #ffffff; }
        .check-btn input:checked + span::after { border-color: #ffffff; background-color: #ffffff; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2399724b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E"); }
        .check-btn input:focus-visible + span { box-shadow: 0 0 0 4px rgba(192, 144, 80, 0.35); }
        .check-btn:active > span { transform: scale(0.98); }
        .check-group.error .check-btn > span { border-color: #c0392b; }

        .input-group input.code-input { text-align: center; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.8rem; font-weight: 700; letter-spacing: 0.45em; padding-left: calc(24px + 0.45em); border-radius: 18px; }
        .code-links { display: flex; justify-content: space-between; gap: 10px; margin-top: 12px; }
        .link-btn { min-height: 44px; padding: 0 6px; background: none; border: none; font-family: inherit; font-size: 0.95rem; font-weight: bold; color: #99724b; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .link-btn:disabled { color: #4f2d2c; opacity: 0.5; text-decoration: none; cursor: default; }
        .link-btn:focus-visible { outline: 3px solid #c09050; outline-offset: 2px; border-radius: 8px; }

        .btn-spinner { width: 18px; height: 18px; border-radius: 50%; border: 3px solid rgba(233, 226, 216, 0.35); border-top-color: #e9e2d8; animation: signup-spin 0.8s linear infinite; }
        @keyframes signup-spin { to { transform: rotate(360deg); } }

        #step-done .done-body { align-items: center; justify-content: center; text-align: center; }
        .done-icon { display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; margin: 0 auto 20px; border-radius: 50%; background: #4e513e; color: #ffffff; box-shadow: 0 8px 20px rgba(78, 81, 62, 0.3); }
        .done-icon svg { width: 36px; height: 36px; }
        .done-body .step-title { margin-bottom: 10px; }
        .done-text { max-width: 420px; margin: 0 auto 26px; font-size: 1.08rem; line-height: 1.5; color: #4f2d2c; }
        a.done-btn { text-decoration: none; }

        /* Address search (same look as before) */
        .input-group.has-suggestions { position: relative; z-index: 5; }
        .addr-suggestions { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #ffffff; border: 2px solid #0E2A3B; border-radius: 20px; box-shadow: 6px 6px 0px #0E2A3B; padding: 6px; text-align: left; opacity: 0; visibility: hidden; transform: translateY(-6px); transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease; }
        .addr-suggestions.is-open { opacity: 1; visibility: visible; transform: none; }
        .addr-option { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 10px 14px; border-radius: 14px; cursor: pointer; color: #4f2d2c; -webkit-tap-highlight-color: transparent; }
        .addr-option svg { width: 20px; height: 20px; flex-shrink: 0; color: #c09050; }
        .addr-option-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
        .addr-main { font-weight: bold; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .addr-secondary { font-size: 0.85rem; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .addr-option.is-active, .addr-option:active { background-color: #f4efe8; }
        @media (hover: hover) { .addr-option:hover { background-color: #f4efe8; } }
        .addr-credit { padding: 6px 14px 4px 14px; font-size: 0.7rem; color: #4f2d2c; opacity: 0.55; text-align: right; }
        .addr-selected { display: flex; align-items: center; gap: 8px; margin: 10px 0 0 8px; font-size: 1rem; font-weight: bold; color: #4e513e; }
        .addr-selected svg { width: 18px; height: 18px; flex-shrink: 0; color: #99724b; }
        .addr-manual { width: 100%; }
        .addr-unit-group { margin-top: 18px; }
        .optional-tag { font-weight: normal; opacity: 0.65; }
        .addr-toggle { align-self: center; margin-top: 16px; min-height: 44px; padding: 8px 12px; background: none; border: none; font-family: inherit; font-size: 0.95rem; font-weight: bold; color: #99724b; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
        .addr-toggle:focus-visible { outline: 3px solid #c09050; outline-offset: 2px; border-radius: 8px; }

        @media (max-width: 768px) {
            .addr-row { flex-wrap: wrap; row-gap: 18px; }
            .addr-row .input-group:first-child { flex-basis: 100%; }
            .addr-suggestions { position: static; display: none; margin-top: 8px; padding: 4px; box-shadow: 4px 4px 0px #0E2A3B; opacity: 1; visibility: visible; transform: none; }
            .addr-suggestions.is-open { display: block; }
            .addr-option { min-height: 46px; padding: 7px 12px; gap: 10px; }
            .form-step.addr-open .form-actions,
            .form-step.addr-open .addr-unit-group,
            .form-step.addr-open .addr-toggle { display: none; }
            .addr-toggle { align-self: flex-start; padding-left: 6px; }
            .form-container-card.keyboard-open .step-help,
            .form-container-card.keyboard-open .step-lead { display: none; }
        }
        @media (prefers-reduced-motion: reduce) { .btn-spinner { animation-duration: 2s; } }
    `;
    document.head.appendChild(style);
}
