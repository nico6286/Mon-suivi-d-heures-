let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40 };
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

const typeIcons = { 'work': 'bi-briefcase', 'cp': 'bi-sun', 'maladie': 'bi-hospital', 'recup': 'bi-hourglass-split', 'ferie': 'bi-stars' };

document.getElementById('date').valueAsDate = new Date();

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(document.getElementById('date').value);
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('absence-options').style.display = (type !== 'work' || isH) ? 'block' : 'none';
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(date);
    const ratio = parseFloat(document.querySelector('input[name="abs-duration"]:checked').value);
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { dur = 420 * ratio; start = isH ? "FÉRIÉ" : type.toUpperCase(); }
    else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Heures manquantes");
        dur = (new Date(`${date}T${eR}`) - new Date(`${date}T${sR}`)) / 60000 - p;
        start = sR; end = eR;
    }
    data.push({ id: Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, ratio });
    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    render();
}

function render() {
    const hist = document.getElementById('history'); hist.innerHTML = '';
    let tW = 0, tM = 0, sM = 0;
    const now = new Date();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    data.forEach(s => {
        const d = new Date(s.date);
        if (d.getMonth() === now.getMonth()) { tM += s.duration; if(s.type === 'work') sM++; }
        hist.innerHTML += `<div class="card p-3 mb-2 border-start border-4 ${s.type === 'ferie' ? 'bg-holiday' : 'border-primary'}">
            <div class="d-flex justify-content-between align-items-center">
                <div><small class="d-block text-uppercase">${d.toLocaleDateString('fr-FR',{weekday:'short'})} ${d.getDate()}</small>
                <div class="fw-bold"><i class="bi ${typeIcons[s.type]} me-1"></i> ${s.start} - ${s.end}</div></div>
                <div class="text-end"><span class="badge ${s.duration>=420?'bg-success':'bg-danger'} rounded-pill">${fH(s.duration)}</span>
                <button onclick="deleteS(${s.id})" class="btn-delete d-block ms-auto"><i class="bi bi-x-circle"></i></button></div>
            </div></div>`;
    });
    document.getElementById('month-hours').innerText = fH(tM);
    const sNet = (tM / 60) * settings.hourlyBrut * 0.77 + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = `${sNet.toFixed(2)} €`;
    document.getElementById('details-paye').innerText = `${fH(tM)} • ${sM} paniers`;
}

function fH(min) { return `${Math.floor(min/60)}h${Math.round(min%60).toString().padStart(2,'0')}`; }
function deleteS(id) { data = data.filter(s => s.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); }
function resetAll() { if(confirm("Tout effacer ?")) { localStorage.clear(); data = []; render(); } }
render();
