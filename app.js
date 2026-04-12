let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

document.getElementById('date').valueAsDate = new Date();

function checkDayType() {
    const dateVal = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(dateVal);
    const day = new Date(dateVal).getDay();
    
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = (type === 'work' && !isH) ? 'block' : 'none';
    
    // Alerte Vendredi
    const btn = document.getElementById('btn-save');
    if(day === 5) btn.classList.add('friday-alert');
    else btn.classList.remove('friday-alert');

    // Alerte Fin de mois
    const d = new Date().getDate();
    document.getElementById('month-alert').style.display = (d >= 25) ? 'block' : 'none';
}

function showSalaryDetail() {
    var myModal = new bootstrap.Modal(document.getElementById('salaryModal'));
    myModal.show();
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const chantier = document.getElementById('chantier').value || "Chantier non précisé";
    const editId = document.getElementById('edit-id').value;
    const isH = joursFeries2026.includes(date);
    
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { 
        dur = 420; // 7h par défaut
        start = isH ? "FÉRIÉ" : type.toUpperCase(); 
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Veuillez remplir les horaires.");
        dur = (new Date(`${date}T${eR}`) - new Date(`${date}T${sR}`)) / 60000 - p;
        start = sR; end = eR;
    }

    const sessionData = { id: editId ? parseInt(editId) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier, pause: p };

    if (editId) {
        data[data.findIndex(s => s.id === parseInt(editId))] = sessionData;
    } else {
        data.push(sessionData);
    }

    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm();
    render();
}

function render() {
    const hist = document.getElementById('history'); 
    hist.innerHTML = '';
    let tM = 0, sM = 0;
    const now = new Date();
    const currentWNum = getWeekNumber(now);
    let currentWeekTotal = 0;

    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let currentWeek = null, weekTotal = 0;

    data.forEach((s, i) => {
        const d = new Date(s.date);
        const wNum = getWeekNumber(d);

        // Cumuls
        if (d.getMonth() === now.getMonth()) { 
            tM += s.duration; 
            if(s.type === 'work' || s.type === 'ferie') sM++; 
        }
        if (wNum === currentWNum && d.getFullYear() === now.getFullYear()) {
            currentWeekTotal += s.duration;
        }

        // Séparateurs Semaines
        if (currentWeek !== wNum) {
            if (currentWeek !== null) finalizeWeek(currentWeek, weekTotal);
            currentWeek = wNum; weekTotal = 0;
            hist.innerHTML += `<div class="week-separator"><span>SEMAINE ${wNum}</span><span id="week-sum-${wNum}"></span></div>`;
        }
        weekTotal += s.duration;

        // Delta Journalier
        const deltaDay = s.duration - 420;
        const deltaClass = deltaDay >= 0 ? 'text-success' : 'text-danger';
        const displayDelta = deltaDay === 0 ? '' : `<small class="${deltaClass} fw-bold ms-1">(${deltaDay > 0 ? '+' : ''}${fH(deltaDay)})</small>`;

        // Rendu Carte
        hist.innerHTML += `
            <div class="card p-3 mb-2 border-start border-4 ${s.type==='ferie'?'bg-holiday':'border-primary'} shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div onclick="editS(${s.id})" style="flex-grow:1;">
                        <small class="text-uppercase text-muted">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                        <div class="fw-bold">${s.type==='work' ? '🏗️ ' + s.chantier : '✨ ' + s.type.toUpperCase()}</div>
                        <small class="text-muted">${s.start} - ${s.end} ${displayDelta}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${s.duration>=420?'bg-success':'bg-secondary'} rounded-pill">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-link text-danger border-0 bg-transparent d-block ms-auto mt-2 p-1"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
            </div>`;
        
        if (i === data.length - 1) finalizeWeek(wNum, weekTotal);
    });

    // --- MISE À JOUR TUILES HAUT ---
    document.getElementById('month-hours').innerText = fH(tM);
    const mDelta = tM - (151.67 * 60); 
    document.getElementById('month-delta-ui').innerHTML = `<span class="delta-tag ${mDelta >= 0 ? 'delta-pos' : 'delta-neg'}">${mDelta >= 0 ? '+' : ''}${fH(mDelta)}</span>`;

    document.getElementById('current-week-num').innerText = currentWNum;
    document.getElementById('current-week-hours').innerText = fH(currentWeekTotal);
    const wDelta = currentWeekTotal - 2100;
    document.getElementById('current-week-delta-ui').innerHTML = `<span class="delta-tag ${wDelta >= 0 ? 'delta-pos' : 'delta-neg'}">${wDelta >= 0 ? '+' : ''}${fH(wDelta)}</span>`;

    // --- CALCULS SALAIRE ---
    const brutTotal = (tM / 60) * settings.hourlyBrut;
    const charges = brutTotal * (1 - settings.ratioNet);
    const mealsVal = sM * settings.mealVal;
    const netTotal = (brutTotal - charges) + mealsVal;

    document.getElementById('net-salary').innerText = netTotal.toFixed(2).replace('.', ',') + " €";
    document.getElementById('calc-hours').innerText = fH(tM);
    document.getElementById('calc-brut-base').innerText = brutTotal.toFixed(2) + " €";
    document.getElementById('calc-charges').innerText = "- " + charges.toFixed(2) + " €";
    document.getElementById('calc-meals-count').innerText = sM;
    document.getElementById('calc-meals-val').innerText = "+ " + mealsVal.toFixed(2) + " €";
    document.getElementById('calc-net-total').innerText = netTotal.toFixed(2).replace('.', ',') + " €";
}

function finalizeWeek(wNum, total) {
    const delta = total - 2100;
    const deltaUi = `<span class="delta-tag ${delta >= 0 ? 'delta-pos' : 'delta-neg'} ms-2">${delta >= 0 ? '+' : ''}${fH(delta)}</span>`;
    const target = document.getElementById(`week-sum-${wNum}`);
    if(target) target.innerHTML = fH(total) + deltaUi;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function fH(min) { 
    const m = Math.abs(min); 
    return `${min < 0 ? '-' : ''}${Math.floor(m/60)}h${Math.round(m%60).toString().padStart(2,'0')}`; 
}

function editS(id) {
    const s = data.find(item => item.id === id);
    document.getElementById('date').value = s.date;
    document.getElementById('day-type').value = (s.type === 'ferie') ? 'work' : s.type;
    document.getElementById('chantier').value = (s.chantier === "undefined" || !s.chantier) ? "" : s.chantier;
    document.getElementById('start').value = (s.start && s.start.includes(':')) ? s.start : "";
    document.getElementById('end').value = (s.end && s.end.includes(':')) ? s.end : "";
    document.getElementById('break').value = s.pause || 45;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('form-card').classList.add('edit-mode');
    document.getElementById('btn-save').innerText = "Mettre à jour la ligne";
    checkDayType();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('chantier').value = "";
    document.getElementById('start').value = "";
    document.getElementById('end').value = "";
    document.getElementById('edit-id').value = "";
    document.getElementById('form-card').classList.remove('edit-mode');
    document.getElementById('btn-save').innerText = "Enregistrer";
}

function deleteS(id) { if(confirm("Supprimer cette entrée ?")) { data = data.filter(s => s.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function resetAll() { if(confirm("Supprimer TOUTES les données ?")) { localStorage.clear(); data = []; render(); } }
function exportToPDF() { html2pdf().from(document.getElementById('printable-area')).save('Heures_Chantier.pdf'); }

checkDayType();
render();
