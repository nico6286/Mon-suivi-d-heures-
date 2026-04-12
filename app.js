let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

// Initialisation sécurisée de la date de vue
let viewDate = new Date();

document.getElementById('date').valueAsDate = new Date();

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
// Fonction de conversion magique (800 -> 08:00)
function formatQuickTime(input) {
    input.addEventListener('blur', function() {
        let val = this.value.replace(':', '');
        if (val.length === 3) val = '0' + val; // 800 -> 0800
        if (val.length === 4) {
            const h = val.substring(0, 2);
            const m = val.substring(2, 4);
            if(h < 24 && m < 60) this.value = `${h}:${m}`;
        }
    });
}

// Active la conversion sur les deux champs
formatQuickTime(document.getElementById('start'));
formatQuickTime(document.getElementById('end'));

function render() {
    const hist = document.getElementById('history'); 
    if(!hist) return;
    hist.innerHTML = '';

    // Mise à jour du label du mois
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

    // Stats
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

    // Modale
    document.getElementById('calc-hours').innerText = fH(tM);
    document.getElementById('calc-brut-base').innerText = brut.toFixed(2) + " €";
    document.getElementById('calc-charges').innerText = "- " + (brut * (1 - settings.ratioNet)).toFixed(2) + " €";
    document.getElementById('calc-meals-count').innerText = sM;
    document.getElementById('calc-meals-val').innerText = "+ " + (sM * settings.mealVal).toFixed(2) + " €";
    document.getElementById('calc-net-total').innerText = net.toFixed(2).replace('.', ',') + " €";
}

function finalizeWeek(wNum, total) {
    const d = total - 2100;
    const ui = `<span class="delta-tag ${d>=0?'delta-pos':'delta-neg'} ms-2">${d>=0?'+':''}${fH(d)}</span>`;
    const target = document.getElementById(`week-sum-${wNum}`);
    if(target) target.innerHTML = fH(total) + ui;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

function fH(min) { 
    const m = Math.abs(min); 
    return `${min < 0 ? '-' : ''}${Math.floor(m/60)}h${Math.round(m%60).toString().padStart(2,'0')}`; 
}

function editS(id) {
    const s = data.find(x => x.id === id);
    document.getElementById('date').value = s.date;
    document.getElementById('day-type').value = s.type === 'ferie' ? 'work' : s.type;
    document.getElementById('chantier').value = s.chantier || "";
    document.getElementById('start').value = s.start.includes(':') ? s.start : "";
    document.getElementById('end').value = s.end.includes(':') ? s.end : "";
    document.getElementById('break').value = s.pause || 45;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('form-card').classList.add('edit-mode');
    document.getElementById('btn-save').innerText = "Mettre à jour";
    checkDayType();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('edit-id').value = "";
    document.getElementById('chantier').value = "";
    document.getElementById('form-card').classList.remove('edit-mode');
    document.getElementById('btn-save').innerText = "Enregistrer";
}

function deleteS(id) { if(confirm("Supprimer ?")) { data = data.filter(x => x.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }

function showSalaryDetail() { new bootstrap.Modal(document.getElementById('salaryModal')).show(); }

// EXPORT / IMPORT SÉCURISÉS
function exportJSON() {
    const dataStr = JSON.stringify(data, null, 2);
    const name = `backup_heures_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.json`;
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    window.URL.revokeObjectURL(url);
}

function importJSON() { document.getElementById('importFile').click(); }

function handleImport(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if(confirm("Écraser les données actuelles par cette sauvegarde ?")) {
                data = imported;
                localStorage.setItem('work_tracker_data', JSON.stringify(data));
                render();
            }
        } catch(err) { alert("Fichier invalide"); }
    };
    reader.readAsText(input.files[0]);
}

function exportToPDF() { html2pdf().from(document.getElementById('printable-area')).save(`Heures_${viewDate.getMonth()+1}_${viewDate.getFullYear()}.pdf`); }

// Lancement
checkDayType();
render();
