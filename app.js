let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

let viewDate = new Date();

// Initialisation au chargement
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
    const dInput = document.getElementById('date');
    if(!dInput) return;
    const dVal = dInput.value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(dVal);
    
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = (type === 'work' && !isH) ? 'block' : 'none';
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

    let tM = 0, sM = 0;
    const filtered = data.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered.forEach(s => {
        tM += s.duration;
        if(s.type === 'work' || s.type === 'ferie') sM++;
        hist.innerHTML += `<div class="card p-3 mb-2 border-start border-4 border-primary shadow-sm">
            <div class="d-flex justify-content-between">
                <div><b>${s.date}</b><br><small>${s.chantier}</small></div>
                <div class="text-end"><b>${fH(s.duration)}</b><br>
                <button onclick="deleteS(${s.id})" class="btn btn-sm text-danger"><i class="bi bi-trash"></i></button></div>
            </div>
        </div>`;
    });

    document.getElementById('month-hours').innerText = fH(tM);
    const net = ((tM / 60) * settings.hourlyBrut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";
}

function fH(min) { 
    const m = Math.abs(min); 
    return (min < 0 ? '-' : '') + Math.floor(m/60) + "h" + (m%60).toString().padStart(2,'0'); 
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
    a.download = "sauvegarde_heures.json";
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
