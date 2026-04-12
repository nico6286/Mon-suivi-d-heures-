let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];
let viewDate = new Date();

window.onload = () => {
    document.getElementById('date').valueAsDate = new Date();
    setupQuickTime('start'); setupQuickTime('end');
    render();
};

function setupQuickTime(id) {
    document.getElementById(id).addEventListener('blur', function() {
        let val = this.value.replace(':', '').trim();
        if (val.length === 3) val = '0' + val; 
        if (val.length === 4) this.value = val.substring(0, 2) + ":" + val.substring(2, 4);
    });
}

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isW = (type === 'work' && !joursFeries2026.includes(document.getElementById('date').value));
    document.getElementById('work-inputs').style.display = isW ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = isW ? 'block' : 'none';
}

function saveSession() {
    const date = document.getElementById('date').value;
    const type = document.getElementById('day-type').value;
    const isH = joursFeries2026.includes(date);
    let dur = 0, start = "--:--", end = "--:--", p = 0;

    if (isH || type !== 'work') { 
        dur = 420; start = isH ? "FÉRIÉ" : type.toUpperCase(); 
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!sR.includes(':') || !eR.includes(':')) return alert("Format HH:MM");
        dur = (new Date(date + 'T' + eR) - new Date(date + 'T' + sR)) / 60000 - p;
        start = sR; end = eR;
    }

    const session = { id: document.getElementById('edit-id').value ? parseInt(document.getElementById('edit-id').value) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier: document.getElementById('chantier').value };
    const idx = data.findIndex(s => s.id === session.id);
    if (idx > -1) data[idx] = session; else data.push(session);
    
    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm(); render();
}

function render() {
    const label = document.getElementById('current-view-label');
    label.innerText = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
    const hist = document.getElementById('history');
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
            hist.innerHTML += `<div class="week-separator"><span>SEM ${w}</span><span>${fH(wT)} (${wD>=0?'+':''}${fH(wD)})</span></div>`;
        }
        const dD = s.duration - 420;
        hist.innerHTML += `<div class="work-card d-flex justify-content-between align-items-center" onclick="editS(${s.id})">
            <div><small>${d.getDate()}/${d.getMonth()+1}</small> <div class="fw-bold small">${s.chantier || s.type}</div></div>
            <div class="text-end"><span class="badge bg-primary">${fH(s.duration)}</span><div style="font-size:0.7rem" class="${dD>=0?'text-success':'text-danger'}">${dD>=0?'+':''}${fH(dD)}</div></div>
        </div>`;
    });

    document.getElementById('month-hours').innerText = fH(tM);
    const net = ((tM / 60) * settings.hourlyBrut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";
    document.getElementById('current-week-hours').innerText = fH(weekTotalNow);
}

function getWeekNumber(d) { let date = new Date(d.getTime()); date.setHours(0,0,0,0); date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7); return 1 + Math.round(((date.getTime() - new Date(date.getFullYear(),0,4).getTime()) / 86400000 - 3 + (new Date(date.getFullYear(),0,4).getDay() + 6) % 7) / 7); }
function fH(min) { const m = Math.abs(min); return (min < 0 ? '-' : '') + Math.floor(m/60) + "h" + Math.round(m%60).toString().padStart(2,'0'); }
function changeMonth(diff) { viewDate.setMonth(viewDate.getMonth() + diff); render(); }
function editS(id) { const s = data.find(x => x.id === id); document.getElementById('date').value = s.date; document.getElementById('edit-id').value = s.id; document.getElementById('btn-save').innerText = "MAJ"; document.getElementById('form-card').classList.add('edit-mode'); checkDayType(); }
function resetForm() { document.getElementById('edit-id').value = ""; document.getElementById('btn-save').innerText = "Enregistrer"; document.getElementById('form-card').classList.remove('edit-mode'); }
function exportJSON() { const b = new Blob([JSON.stringify(data)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "suivi.json"; a.click(); }
function importJSON() { document.getElementById('importFile').click(); }
function handleImport(input) { const r = new FileReader(); r.onload = e => { data = JSON.parse(e.target.result); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); }; r.readAsText(input.files[0]); }
function exportToPDF() { html2pdf().from(document.getElementById('history')).save('Heures.pdf'); }
