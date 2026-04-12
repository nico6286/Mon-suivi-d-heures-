let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];
let viewDate = new Date();

window.onload = () => {
    if(document.getElementById('date')) document.getElementById('date').valueAsDate = new Date();
    setupQuickTime('start'); setupQuickTime('end');
    render(); checkDayType();
};

function changeMonth(diff) { viewDate.setMonth(viewDate.getMonth() + diff); render(); }

function setupQuickTime(id) {
    const el = document.getElementById(id);
    el.addEventListener('blur', function() {
        let val = this.value.replace(':', '').trim();
        if (val.length === 3) val = '0' + val; 
        if (val.length === 4) this.value = val.substring(0, 2) + ":" + val.substring(2, 4);
    });
}

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(document.getElementById('date').value);
    document.getElementById('work-inputs').style.display = (type === 'work' && !isH) ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = (type === 'work' && !isH) ? 'block' : 'none';
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(date);
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { dur = 420; start = isH ? "FÉRIÉ" : type.toUpperCase(); }
    else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!sR.includes(':') || !eR.includes(':')) return alert("Heures invalides");
        dur = (new Date(date + 'T' + eR) - new Date(date + 'T' + sR)) / 60000 - p;
        start = sR; end = eR;
    }

    const session = { id: document.getElementById('edit-id').value || Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier: document.getElementById('chantier').value, pause: p };
    const idx = data.findIndex(s => s.id == session.id);
    if (idx > -1) data[idx] = session; else data.push(session);

    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm(); render();
}

function render() {
    const hist = document.getElementById('history');
    const label = document.getElementById('current-view-label');
    label.innerText = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
    hist.innerHTML = '';

    let tM = 0, sM = 0, weekTotalNow = 0, weekGroups = {};
    const curW = getWeekNumber(new Date());

    const filtered = data.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(s => {
        const w = getWeekNumber(new Date(s.date));
        weekGroups[w] = (weekGroups[w] || 0) + s.duration;
        tM += s.duration;
        if(s.type === 'work' || s.type === 'ferie') sM++;
        if(w === curW) weekTotalNow += s.duration;
    });

    let lastW = null;
    filtered.forEach(s => {
        const d = new Date(s.date), w = getWeekNumber(d);
        if (lastW !== w) {
            lastW = w; const wT = weekGroups[w], wD = wT - 2100;
            hist.innerHTML += `<div class="week-separator"><span>SEMAINE ${w}</span><span>${fH(wT)} <small class="${wD>=0?'text-success':'text-danger'}">(${wD>=0?'+':''}${fH(wD)})</small></span></div>`;
        }
        const dD = s.duration - 420;
        hist.innerHTML += `
            <div class="work-card d-flex justify-content-between align-items-center" onclick="editS(${s.id})">
                <div>
                    <small class="text-muted text-uppercase">${d.toLocaleDateString('fr-FR',{weekday:'short'})}. ${d.getDate()}</small>
                    <div class="fw-bold small">${s.type==='work'?'🏗️ '+s.chantier:'✨ '+s.type.toUpperCase()}</div>
                    <small class="text-muted">${s.start}-${s.end} <b class="${dD>=0?'text-success':'text-danger'}">(${dD>=0?'+':''}${fH(dD)})</b></small>
                </div>
                <div class="text-end">
                    <span class="badge ${s.duration>=420?'bg-success':'bg-secondary'} mb-1">${fH(s.duration)}</span>
                    <i class="bi bi-trash3 text-danger d-block" onclick="event.stopPropagation();deleteS(${s.id})"></i>
                </div>
            </div>`;
    });

    document.getElementById('month-hours').innerText = fH(tM);
    const mD = tM - (151.67 * 60);
    document.getElementById('month-delta-ui').innerHTML = `<span class="delta-tag ${mD>=0?'delta-pos':'delta-neg'}">${mD>=0?'+':''}${fH(mD)}</span>`;
    document.getElementById('week-label').innerText = `SEMAINE ${curW}`;
    document.getElementById('current-week-hours').innerText = fH(weekTotalNow);
    const wD = weekTotalNow - 2100;
    document.getElementById('current-week-delta-ui').innerHTML = `<span class="delta-tag ${wD>=0?'delta-pos':'delta-neg'}">${wD>=0?'+':''}${fH(wD)}</span>`;
    const net = ((tM / 60) * settings.hourlyBrut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";
}

function showSalaryDetail() {
    const tM = Array.from(data).reduce((acc, s) => acc + s.duration, 0); // Simplifié pour l'exemple
    alert(`Détails Estimation :\n- Heures : ${fH(tM)}\n- Taux : ${settings.hourlyBrut}€/h\n- Net (~77%) + Panier Repas`);
}

function getWeekNumber(d) {
    let date = new Date(d.getTime()); date.setHours(0,0,0,0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    return 1 + Math.round(((date.getTime() - new Date(date.getFullYear(),0,4).getTime()) / 86400000 - 3 + (new Date(date.getFullYear(),0,4).getDay() + 6) % 7) / 7);
}

function fH(min) { const m = Math.abs(min); return (min < 0 ? '-' : '') + Math.floor(m/60) + "h" + Math.round(m%60).toString().padStart(2,'0'); }

function editS(id) {
    const s = data.find(x => x.id == id);
    document.getElementById('date').value = s.date;
    document.getElementById('day-type').value = s.type === 'ferie' ? 'work' : s.type;
    document.getElementById('chantier').value = s.chantier;
    document.getElementById('start').value = s.start; document.getElementById('end').value = s.end;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('btn-save').innerText = "Mettre à jour";
    document.getElementById('form-card').classList.add('edit-mode');
    checkDayType(); window.scrollTo(0,0);
}

function resetForm() { document.getElementById('edit-id').value = ""; document.getElementById('btn-save').innerText = "Enregistrer"; document.getElementById('form-card').classList.remove('edit-mode'); }
function deleteS(id) { if(confirm("Supprimer ?")) { data = data.filter(x => x.id != id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function exportJSON() { const blob = new Blob([JSON.stringify(data)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "backup.json"; a.click(); }
function importJSON() { document.getElementById('importFile').click(); }
function handleImport(input) { const reader = new FileReader(); reader.onload = e => { data = JSON.parse(e.target.result); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); }; reader.readAsText(input.files[0]); }
function exportToPDF() { 
    const mois = document.getElementById('current-view-label').innerText.replace(' ', '_');
    html2pdf().from(document.getElementById('history')).save(`Heures_${mois}.pdf`); 
}
