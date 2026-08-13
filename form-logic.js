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

    questions.forEach((q, i) => {
        let inner = '';
        if(q.type === 'name') {
            inner = `<div class="name-row">
                        <div class="input-group"><label>First Name</label><input type="text" name="${q.id}_first" placeholder="First"></div>
                        <div class="input-group"><label>Last Name</label><input type="text" name="${q.id}_last" placeholder="Last"></div>
                     </div>`;
        } else if(q.type === 'address') {
            inner = `<div class="input-group"><label>Street Address</label><input type="text" name="${q.id}_st" placeholder="123 Main St"></div>
                     <div class="name-row">
                        <div class="input-group"><label>City</label><input type="text" name="${q.id}_city" placeholder="City"></div>
                        <div class="input-group"><label>State</label><input type="text" name="${q.id}_state" placeholder="State"></div>
                        <div class="input-group"><label>Zip</label><input type="text" name="${q.id}_zip" placeholder="Zip"></div>
                     </div>`;
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
            inner = `<div class="input-group"><textarea name="${q.id}" rows="4" placeholder="Briefly describe..."></textarea></div>`;
        } else {
            let cls = '', type = 'text', ph = '';
            if(q.type==='email') { type='email'; ph='email@example.com'; }
            if(q.type==='phone') { type='tel'; cls='fmt-phone'; ph='(555) 555-5555'; }
            if(q.type==='number') { type='number'; cls='fmt-num'; ph='Ex: 40'; }
            if(q.type==='curr') { type='text'; cls='fmt-curr'; ph='$0'; }
            if(q.type==='curr_dec') { type='text'; cls='fmt-curr-dec'; ph='$0.00'; }
            inner = `<div class="input-group"><input type="${type}" name="${q.id}" class="${cls}" placeholder="${ph}"></div>`;
        }

        const stepDiv = document.createElement('div');
        stepDiv.className = 'form-step';
        stepDiv.id = `step-${i}`;
        stepDiv.innerHTML = `
            <div class="step-header">
                <h3 class="step-title">${q.title}</h3>
            </div>
            <div class="step-inputs">${inner}</div>
            <div class="form-actions" id="actions-${i}"></div>
        `;
        container.appendChild(stepDiv);
    });

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

    // Smooth Pop-In Animation Trigger
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (btnStart) {
                const rect = btnStart.getBoundingClientRect();
                const originX = rect.left + rect.width / 2;
                const originY = rect.top + rect.height / 2; 
                formContainer.style.transformOrigin = `${originX}px ${originY}px`;
            }
            
            formContainer.classList.remove('show');
            overlayBg.classList.remove('is-open');

            setTimeout(() => {
                formContainer.classList.remove('keyboard-open', 'is-open');
                formContainer.style.transformOrigin = ''; 
                formContainer.style.height = ''; 
                formContainer.style.top = ''; 
                form.reset(); 
                currentStepIndex = 0;
                stepHistory = [];
                document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active', 'active-reverse'));
                document.body.classList.remove('form-open', 'no-scroll');
                window.scrollTo(0, savedScrollY);
            }, 400); 
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
            btnBack.innerHTML = `<img src="https://andrewmarth.com/images/arrow_back.png" alt="Back" class="btn-icon btn-icon-back"> Back`;
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
        
        if (nextStepIndex === -1) {
            btnForward.innerHTML = `Submit <img src="https://andrewmarth.com/images/submit.png" alt="Submit" class="btn-icon btn-icon-forward">`;
        } else {
            btnForward.innerHTML = `Next <img src="https://andrewmarth.com/images/arrow_forward.png" alt="Next" class="btn-icon btn-icon-forward">`;
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

    function renderFlow() {
        document.querySelectorAll('.form-step').forEach(s => {
            s.classList.remove('active', 'active-reverse');
        });
        const currentEl = document.getElementById(`step-${currentStepIndex}`);
        currentEl.classList.add(slideDirection === 'forward' ? 'active' : 'active-reverse');
        updateActions();

        if (window.innerWidth > 768) {
            const firstInput = currentEl.querySelector('input[type="text"], input[type="tel"], input[type="email"], input[type="number"]');
            if (firstInput) setTimeout(() => firstInput.focus(), 50);
        }
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
            if(i.type !== 'radio') {
                if(!i.value.trim()) {
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
        if(!validateStep(currentEl)) return;

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
            const uniqueNames = [...new Set(inputs.map(i => i.name))];
            
            uniqueNames.forEach(name => {
                if (!isActive) {
                    finalData.append(name, "");
                } else {
                    const els = inputs.filter(i => i.name === name);
                    if (els[0].type === 'radio') {
                        const checked = els.find(el => el.checked);
                        finalData.append(name, checked ? checked.value : "");
                    } else {
                        finalData.append(name, els[0].value);
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
