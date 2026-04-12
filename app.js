let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; // 23% de charges
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

document.getElementById('date').valueAsDate = new Date();

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(document.getElementById('date').value);
    const day = new Date(document.getElementById('date').value).getDay();
    
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

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const chantier = document.getElementById('chantier').value || "CHANTIER";
    const editId = document.getElementById('edit-id').value;
    const isH = joursFeries2026.includes(date);
    
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { 
        dur = 420; // Base 7h
        start = isH ? "FÉRIÉ" : type.toUpperCase(); 
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Heures manquantes");
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
    const hist = document.getElementById('history'); hist.innerHTML = '';
    let tM = 0, sM = 0;
    const now = new Date();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let currentWeek = null, weekTotal = 0;

    data.forEach((s, i) => {
        const d = new Date(s.date);
        const wNum = getWeekNumber(d);

        if (d.getMonth() === now.getMonth()) { tM += s.duration; if(s.type === 'work') sM++; }

        if (currentWeek !== wNum) {
            if (currentWeek !== null) finalizeWeek(currentWeek, weekTotal);
            currentWeek = wNum; weekTotal = 0;
            hist.innerHTML += `<div class="week-separator"><span>SEMAINE ${wNum}</span><span id="week-sum-${wNum}"></span></div>`;
        }

        weekTotal += s.duration;
        const deltaDay = s.duration - 420;
        const deltaClass = deltaDay >= 0 ? 'text-success' : 'text-danger';
        const displayDelta = deltaDay === 0 ? '' : `<small class="${deltaClass} fw-bold">(${deltaDay > 0 ? '+' : ''}${fH(deltaDay)})</small>`;

        hist.innerHTML += `
            <div class="card p-3 mb-2 border-start border-4 ${s.type==='ferie'?'bg-holiday':'border-primary'}">
                <div class="d-flex justify-content-between align-items-center">
                    <div onclick="editS(${s.id})" style="flex-grow:1;">
                        <small class="text-uppercase text-muted">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                        <div class="fw-bold">${s.type==='work'?'🏗️ '+s.chantier:'✨ '+s.type.toUpperCase()}</div>
                        <small class="text-muted">${s.start} - ${s.end} ${displayDelta}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${s.duration>=420?'bg-success':'bg-secondary'} rounded-pill">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-link text-danger border-0 bg-transparent d-block ms-auto mt-2"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
            </div>`;
        
        if (i === data.length - 1) finalizeWeek(wNum, weekTotal);
    });

    // Totaux Mois
    document.getElementById('month-hours').innerText = fH(tM);
    document.getElementById('month-meals').innerText = sM;
    document.getElementById('meals-val').innerText = (sM * settings.mealVal).toFixed(2) + "€";
    
    // Calcul Salaire NET
    const netPay = (tM / 60) * settings.hourlyBrut * settings.ratioNet + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = netPay.toFixed(2).replace('.', ',') + " €";
    document.getElementById('details-paye').innerText = `${fH(tM)} Net (après charges ~23%)`;
}

function finalizeWeek(wNum, total) {
    const delta = total - 2100; // 35h = 2100 min
    const deltaUi = `<span class="delta-tag ${delta >= 0 ? 'delta-pos' : 'delta-neg'}">${delta >= 0 ? '+' : ''}${fH(delta)}</span>`;
    document.getElementById(`week-sum-${wNum}`).innerHTML = fH(total) + deltaUi;
}

function getWeekNumber(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7); }
function fH(min) { const m = Math.abs(min); return `${min < 0 ? '-' : ''}${Math.floor(m/60)}h${Math.round(m%60).toString().padStart(2,'0')}`; }
function editS(id) { /* Même logique qu'avant */ }
function resetForm() { /* Même logique qu'avant */ }
function deleteS(id) { if(confirm("Supprimer ?")) { data = data.filter(s => s.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function resetAll() { if(confirm("Tout effacer ?")) { localStorage.clear(); data = []; render(); } }
function exportToPDF() { html2pdf().from(document.getElementById('printable-area')).save('Heures_Pro.pdf'); }
checkDayType(); render();
