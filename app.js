let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40 };
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

const typeIcons = { 'work': 'bi-briefcase', 'cp': 'bi-sun', 'maladie': 'bi-hospital', 'recup': 'bi-hourglass-split', 'ferie': 'bi-stars' };

document.getElementById('date').valueAsDate = new Date();

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(document.getElementById('date').value);
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = (type === 'work' && !isH) ? 'block' : 'none';
    document.getElementById('absence-options').style.display = (type !== 'work' || isH) ? 'block' : 'none';
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const chantier = document.getElementById('chantier').value || "Chantier non précisé";
    const editId = document.getElementById('edit-id').value;
    const isH = joursFeries2026.includes(date);
    const ratio = parseFloat(document.querySelector('input[name="abs-duration"]:checked').value);
    
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { 
        dur = 420 * ratio; 
        start = isH ? "FÉRIÉ" : type.toUpperCase(); 
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Veuillez remplir les heures.");
        dur = (new Date(`${date}T${eR}`) - new Date(`${date}T${sR}`)) / 60000 - p;
        start = sR; end = eR;
    }

    const sessionData = { id: editId ? parseInt(editId) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, ratio, chantier, pause: p };

    if (editId) {
        const index = data.findIndex(s => s.id === parseInt(editId));
        data[index] = sessionData;
    } else {
        data.push(sessionData);
    }

    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm();
    render();
}

function editS(id) {
    const s = data.find(item => item.id === id);
    document.getElementById('date').value = s.date;
    document.getElementById('day-type').value = s.type === 'ferie' ? 'work' : s.type;
    document.getElementById('chantier').value = s.chantier === "undefined" ? "" : (s.chantier || "");
    document.getElementById('start').value = (s.start && s.start.includes(':')) ? s.start : "";
    document.getElementById('end').value = (s.end && s.end.includes(':')) ? s.end : "";
    document.getElementById('break').value = s.pause || 45;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('form-card').classList.add('edit-mode');
    document.getElementById('btn-save').innerText = "Mettre à jour";
    document.getElementById('btn-save').className = "btn btn-warning w-100 fw-bold py-3";
    checkDayType();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
    const hist = document.getElementById('history'); hist.innerHTML = '';
    let tM = 0, sM = 0;
    const now = new Date();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let currentWeek = null;
    let weekTotal = 0;
    let weekHtml = "";

    data.forEach((s, index) => {
        const d = new Date(s.date);
        const wNum = getWeekNumber(d);

        if (d.getMonth() === now.getMonth()) { 
            tM += s.duration; 
            if(s.type === 'work') sM++; 
        }

        if (currentWeek !== wNum) {
            if (currentWeek !== null) {
                hist.innerHTML = hist.innerHTML.replace(`##TOTAL_${currentWeek}##`, fH(weekTotal));
            }
            currentWeek = wNum;
            weekTotal = 0;
            hist.innerHTML += `<div class="week-separator"><span>Semaine ${wNum}</span><span id="week-sum-${wNum}">##TOTAL_${wNum}##</span></div>`;
        }

        weekTotal += s.duration;
        const displayTitle = s.type === 'work' ? `Chantier : ${s.chantier}` : s.type.toUpperCase();
        
        hist.innerHTML += `
            <div class="card p-3 mb-2 border-start border-4 ${s.type === 'ferie' ? 'bg-holiday' : 'border-primary'}">
                <div class="d-flex justify-content-between align-items-center">
                    <div onclick="editS(${s.id})" style="flex-grow:1;">
                        <small class="d-block text-uppercase text-muted">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                        <div class="fw-bold"><i class="bi ${typeIcons[s.type] || 'bi-calendar'} me-1"></i> ${displayTitle}</div>
                        <small class="text-muted">${s.start} - ${s.end} ${s.pause > 0 ? '('+s.pause+'m pause)' : ''}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${s.duration>=420?'bg-success':'bg-secondary'} rounded-pill d-block mb-2">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-delete"><i class="bi bi-trash3"></i></button>
                    </div>
                </div>
            </div>`;

        if (index === data.length - 1) {
            hist.innerHTML = hist.innerHTML.replace(`##TOTAL_${wNum}##`, fH(weekTotal));
        }
    });
    
    document.getElementById('month-hours').innerText = fH(tM);
    document.getElementById('month-meals').innerText = sM;
    const sNet = (tM / 60) * settings.hourlyBrut * 0.77 + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = `${sNet.toFixed(2).replace('.', ',')} €`;
    document.getElementById('details-paye').innerText = `${fH(tM)} travaillées • ${sM} paniers`;
}

function fH(min) { 
    return `${Math.floor(min/60)}h${Math.round(min%60).toString().padStart(2,'0')}`; 
}

function resetForm() {
    document.getElementById('chantier').value = "";
    document.getElementById('start').value = "";
    document.getElementById('end').value = "";
    document.getElementById('edit-id').value = "";
    document.getElementById('form-card').classList.remove('edit-mode');
    document.getElementById('btn-save').innerText = "Enregistrer";
    document.getElementById('btn-save').className = "btn btn-primary w-100 fw-bold py-3";
}

function deleteS(id) { 
    if(confirm("Supprimer ?")) { data = data.filter(s => s.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } 
}

function resetAll() { 
    if(confirm("Tout effacer ?")) { localStorage.clear(); data = []; render(); } 
}

function exportToPDF() {
    const opt = { margin: 10, filename: 'suivi_heures.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(document.getElementById('printable-area')).save();
}

render();
