let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

let viewDate = new Date();
document.getElementById('date').valueAsDate = new Date();

// --- FONCTIONS DE NAVIGATION ET UI ---

function changeMonth(diff) {
    viewDate.setMonth(viewDate.getMonth() + diff);
    render();
}

function checkDayType() {
    const dVal = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(dVal);
    const dayNum = new Date(dVal).getDay();
    
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = (type === 'work' && !isH) ? 'block' : 'none';
    
    const btn = document.getElementById('btn-save');
    if(dayNum === 5) btn.classList.add('friday-alert');
    else btn.classList.remove('friday-alert');

    document.getElementById('month-alert').style.display = (new Date().getDate() >= 25) ? 'block' : 'none';
}

// --- LOGIQUE DE SAISIE ---

// La fonction de conversion (placée ici mais appelée à la fin)
function setupQuickTime(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function() {
        let val = this.value.replace(':', '').trim();
        if (!val) return;
        if (val.length === 3) val = '0' + val; 
        if (val.length === 4) {
            const h = val.substring(0, 2);
            const m = val.substring(2, 4);
            if(h < 24 && m < 60) this.value = `${h}:${m}`;
        }
    });
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const chantier = document.getElementById('chantier').value || "Chantier";
    const editId = document.getElementById('edit-id').value;
    const isH = joursFeries2026.includes(date);
    
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { 
        dur = 420; 
        start = isH ? "FÉRIÉ" : type.toUpperCase(); 
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Veuillez saisir les horaires.");
        // Vérification du format avant calcul
        if(!sR.includes(':') || !eR.includes(':')) return alert("Format heure invalide (ex: 08:00)");
        
        dur = (new Date(`${date}T${eR}`) - new Date(`${date}T${sR}`)) / 60000 - p;
        start = sR; end = eR;
    }

    const session = { id: editId ? parseInt(editId) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier, pause: p };

    if (editId) data[data.findIndex(s => s.id === parseInt(editId))] = session;
    else data.push(session);

    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm();
    render();
}

// --- CALCULS ET AFFICHAGE ---

function render() {
    const hist = document.getElementById('history'); 
    if(!hist) return;
    hist.innerHTML = '';

    const label = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('current-view-label').innerText = label;

    let tM = 0, sM = 0, weekTotalNow = 0;
    const now = new Date();
    const curWeek = getWeekNumber(now);

    const filtered = data.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let currentWeek = null, weekTotal = 0;

    filtered.forEach((s, i) => {
        const d = new Date(s.date);
        const wNum = getWeekNumber(d);

        tM += s.duration;
        if(s.type === 'work' || s.type === 'ferie') sM++;
        if(wNum === curWeek && d.getFullYear() === now.getFullYear()) weekTotalNow += s.duration;

        if (currentWeek !== wNum) {
            if (currentWeek !== null) finalizeWeek(currentWeek, weekTotal);
            currentWeek = wNum; weekTotal = 0;
            hist.innerHTML += `<div class="week-separator"><span>SEMAINE ${wNum}</span><span id="week-sum-${wNum}"></span></div>`;
        }
        weekTotal += s.duration;

        const deltaDay = s.duration - 420;
        const dStyle = deltaDay >= 0 ? 'text-success' : 'text-danger';
        const dShow = deltaDay === 0 ? '' : `<small class="${dStyle} fw-bold ms-1">(${deltaDay>0?'+':''}${fH(deltaDay)})</small>`;

        hist.innerHTML += `
            <div class="card p-3 mb-2 border-start border-4 ${s.type==='ferie'?'bg-holiday':'border-primary'} shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div onclick="editS(${s.id})" style="flex-grow:1;">
                        <small class="text-uppercase text-muted">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                        <div class="fw-bold">${s.type==='work'?'🏗️ '+s.chantier:'✨ '+s.type.toUpperCase()}</div>
                        <small class="text-muted">${s.start} - ${s.end} ${dShow}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${s.duration>=420?'bg-success':'bg-secondary'} rounded-pill">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-link text-danger border-0 bg-transparent d-block ms-auto mt-2 p-1"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
            </div>`;
        if (i === filtered.length - 1) finalizeWeek(wNum, weekTotal);
    });

    document.getElementById('month-hours').innerText = fH(tM);
    const mDelta = tM - (151.67 * 60);
    document.getElementById('month-delta-ui').innerHTML = `<span class="delta-tag ${mDelta>=0?'delta-pos':'delta-neg'}">${mDelta>=0?'+':''}${fH(mDelta)}</span>`;

    document.getElementById('current-week-num').innerText = curWeek;
    document.getElementById('current-week-hours').innerText = fH(weekTotalNow);
    const wDelta = weekTotalNow - 2100;
    document.getElementById('current-week-delta-ui').innerHTML = `<span class="delta-tag ${wDelta>=0?'delta-pos':'delta-neg'}">${wDelta>=0?'+':''}${fH(wDelta)}</span>`;

    const brut = (tM / 60) * settings.hourlyBrut;
    const net = (brut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";

    document.getElementById('calc-hours').innerText = fH(tM);
    document.getElementById('calc-brut-base').innerText = brut.toFixed(2) + " €";
    document.getElementById('calc-charges').innerText = "- " + (brut * (1 - settings.ratioNet)).toFixed(2) + " €";
    document.getElementById('calc-meals-count').innerText = sM;
    document.getElementById('calc-meals-val').innerText = "+ " + (sM * settings.mealVal).toFixed(2) + " €";
    document.getElementById('calc-net-total').innerText
