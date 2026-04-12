let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

let viewDate = new Date();

window.onload = function() {
    if(document.getElementById('date')) document.getElementById('date').valueAsDate = new Date();
    setupQuickTime('start');
    setupQuickTime('end');
    render();
    checkDayType();
};

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
}

function setupQuickTime(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function() {
        let val = this.value.replace(':', '').trim();
        if (val.length === 3) val = '0' + val; 
        if (val.length === 4) {
            const h = val.substring(0, 2);
            const m = val.substring(2, 4);
            if(h < 24 && m < 60) this.value = h + ":" + m;
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
        let sR = document.getElementById('start').value;
        let eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!sR.includes(':') || !eR.includes(':')) return alert("Format heure incorrect (ex: 800)");
        dur = (new Date(date + 'T' + eR) - new Date(date + 'T' + sR)) / 60000 - p;
        start = sR; end = eR;
    }

    const session = { id: editId ? parseInt(editId) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier, pause: p };
    
    if (editId) data[data.findIndex(s => s.id === parseInt(editId))] = session;
    else data.push(session);

    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm();
    render();
}

function render() {
    const label = document.getElementById('current-view-label');
    const hist = document.getElementById('history');
    if(!label || !hist) return;

    label.innerText = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
    hist.innerHTML = '';

    let tM = 0, sM = 0, currentWeek = null;
    const filtered = data.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(s => {
        const d = new Date(s.date);
        const wNum = getWeekNumber(d);
        tM += s.duration;
        if(s.type === 'work' || s.type === 'ferie') sM++;

        // Séparateur de semaine
        if (currentWeek !== wNum) {
            currentWeek = wNum;
            hist.innerHTML += `<div class="week-separator"><span>SEMAINE ${wNum}</span></div>`;
        }

        const deltaDay = s.duration - 420;
        const dStyle = deltaDay >= 0 ? 'text-success' : 'text-danger';
        const dShow = deltaDay === 0 ? '' : `<small class="${dStyle} fw-bold ms-1">(${deltaDay>0?'+':''}${fH(deltaDay)})</small>`;

        hist.innerHTML += `
            <div class="card p-3 mb-2 border-start border-4 ${s.type==='ferie'?'bg-holiday':'border-primary'} shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div onclick="editS(${s.id})" style="flex-grow:1;">
                        <small class="text-uppercase text-muted">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                        <div class="fw-bold">${s.type === 'work' ? '🏗️ ' + s.chantier : '✨ ' + s.type.toUpperCase()}</div>
                        <small class="text-muted">${s.start} - ${s.end} ${dShow}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${s.duration >= 420 ? 'bg-success' : 'bg-secondary'} rounded-pill">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-link text-danger border-0 bg-transparent d-block ms-auto mt-2 p-1"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('month-hours').innerText = fH(tM);
    const net = ((tM / 60) * settings.hourlyBrut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

function editS(id) {
    const s = data.find(x => x.id === id);
    document.getElementById('date').value = s.date;
    document.getElementById('day-type').value = (s.type === 'ferie') ? 'work' : s.type;
    document.getElementById('chantier').value = s.chantier || "";
    document.getElementById('start').value = s.start.includes(':') ? s.start : "";
    document.getElementById('end').value = s.end.includes(':') ? s.end : "";
    document.getElementById('break').value = s.pause || 45;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('btn-save').innerText = "Mettre à jour";
    // Remet la zone en jaune
    document.getElementById('form-card').classList.add('edit-mode');
    checkDayType();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fH(min) { 
    const m = Math.abs(min); 
    return (min < 0 ? '-' : '') + Math.floor(m/60) + "h" + Math.round(m%60).toString().padStart(2,'0'); 
}

function resetForm() {
    document.getElementById('edit-id').value = "";
    document.getElementById('chantier').value = "";
    document.getElementById('btn-save').innerText = "Enregistrer";
    document.getElementById('form-card').classList.remove('edit-mode');
}

function deleteS(id) { if(confirm("Supprimer ?")) { data = data.filter(x => x.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function exportJSON() {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup.json";
    a.click();
}
function importJSON() { document.getElementById('importFile').click(); }
function handleImport(input) {
    const reader = new FileReader();
    reader.onload = e => {
        data = JSON.parse(e.target.result);
        localStorage.setItem('work_tracker_data', JSON.stringify(data));
        render();
    };
    reader.readAsText(input.files[0]);
}
function exportToPDF() { html2pdf().from(document.getElementById('history')).save("Heures.pdf"); }
