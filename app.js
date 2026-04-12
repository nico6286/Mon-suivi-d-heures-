let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
const settings = { hourlyBrut: 12.2861, mealVal: 10.40, ratioNet: 0.77 }; 
const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];
let viewDate = new Date();

window.onload = () => {
    document.getElementById('date').valueAsDate = new Date();
    ['start', 'end'].forEach(id => {
        document.getElementById(id).addEventListener('blur', function() {
            let val = this.value.replace(':', '').trim();
            if (val.length === 3) val = '0' + val; 
            if (val.length === 4) this.value = val.substring(0, 2) + ":" + val.substring(2, 4);
        });
    });
    render();
};

function checkDayType() {
    const type = document.getElementById('day-type').value;
    const isW = (type === 'work' && !joursFeries2026.includes(document.getElementById('date').value));
    document.getElementById('work-inputs').style.display = isW ? 'flex' : 'none';
    document.getElementById('chantier-div').style.display = isW ? 'block' : 'none';
}

function showSalaryDetail() {
    alert(`Calcul :\n- Taux : ${settings.hourlyBrut}€ Brut\n- Panier : ${settings.mealVal}€ / jour travaillé`);
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

    const session = { id: document.getElementById('edit-id').value ? parseInt(document.getElementById('edit-id').value) : Date.now(), date, start, end, duration: dur, type: isH ? 'ferie' : type, chantier: document.getElementById('chantier').value, pause: p };
    const idx = data.findIndex(s => s.id === session.id);
    if (idx > -1) data[idx] = session; else data.push(session);
    
    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    resetForm(); render();
}

function render() {
    const label = document.getElementById('current-view-label');
    label.innerText = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
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

    const mD = tM - (151.67 * 60);
    document.getElementById('month-delta').innerHTML = `<span class="delta-tag ${mD>=0?'bg-pos':'bg-neg'}">${mD>=0?'+':''}${fH(mD)}</span>`;
    document.getElementById('week-label').innerText = "Semaine " + curW;
    const wD = weekTotalNow - 2100;
    document.getElementById('week-delta').innerHTML = `<span class="delta-tag ${wD>=0?'bg-pos':'bg-neg'}">${wD>=0?'+':''}${fH(wD)}</span>`;

    let lastW = null;
    filtered.forEach(s => {
        const d = new Date(s.date), w = getWeekNumber(d);
        if (lastW !== w) {
            lastW = w; const wT = weekGroups[w], wD_row = wT - 2100;
            hist.innerHTML += `<div class="week-header"><span>Semaine ${w}</span><span>${fH(wT)} (${wD_row>=0?'+':''}${fH(wD_row)})</span></div>`;
        }
        const dD = s.duration - 420;
        const icon = s.type === 'work' ? '🏗️' : '✨';
        const detailTxt = s.type === 'work' ? `${s.start} - ${s.end} (Pause ${s.pause}min)` : s.start;
        
        hist.innerHTML += `
            <div class="work-card" onclick="editS(${s.id})">
                <div class="d-flex align-items-center">
                    <div class="me-3 fw-bold text-secondary" style="font-size:0.85rem">${d.getDate()}/${d.getMonth()+1}</div>
                    <div><div class="fw-bold text-uppercase" style="font-size:0.75rem; color:#475569">${icon} ${s.chantier || s.type}</div><div class="info-detail">${detailTxt}</div></div>
                </div>
                <div class="d-flex align-items-center">
                    <div class="text-end me-3">
                        <div class="badge-hours">${fH(s.duration)}</div>
                        <div style="font-size:0.7rem; font-weight:800;" class="${dD>=0?'text-success':'text-danger'}">${dD>=0?'+':''}${fH(dD)}</div>
                    </div>
                    <i class="bi bi-x-circle-fill text-danger opacity-50 fs-5" onclick="event.stopPropagation();deleteS(${s.id})"></i>
                </div>
            </div>`;
    });

    document.getElementById('month-hours').innerText = fH(tM);
    document.getElementById('current-week-hours').innerText = fH(weekTotalNow);
    const net = ((tM / 60) * settings.hourlyBrut * settings.ratioNet) + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = net.toFixed(2).replace('.', ',') + " €";
}

function editS(id) {
    const s = data.find(x => x.id === id);
    document.getElementById('date').value = s.date;
    document.getElementById('chantier').value = s.chantier || '';
    document.getElementById('day-type').value = (s.type === 'ferie') ? 'work' : s.type;
    document.getElementById('start').value = (s.start && s.start.includes(':')) ? s.start : "";
    document.getElementById('end').value = (s.end && s.end.includes(':')) ? s.end : "";
    document.getElementById('break').value = s.pause || 45;
    document.getElementById('edit-id').value = s.id;
    document.getElementById('btn-save').innerText = "METTRE À JOUR";
    document.getElementById('form-card').classList.add('edit-mode');
    checkDayType();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function deleteS(id) { if(confirm("Supprimer ?")) { data = data.filter(x => x.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function resetForm() { document.getElementById('edit-id').value = ""; document.getElementById('chantier').value = ""; document.getElementById('btn-save').innerText = "ENREGISTRER"; document.getElementById('form-card').classList.remove('edit-mode'); }
function fH(min) { const m = Math.abs(min); return (min < 0 ? '-' : '') + Math.floor(m/60) + "h" + Math.round(m%60).toString().padStart(2,'0'); }
function getWeekNumber(d) { let date = new Date(d.getTime()); date.setHours(0,0,0,0); date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7); return 1 + Math.round(((date.getTime() - new Date(date.getFullYear(),0,4).getTime()) / 86400000 - 3 + (new Date(date.getFullYear(),0,4).getDay() + 6) % 7) / 7); }
function changeMonth(diff) { viewDate.setMonth(viewDate.getMonth() + diff); render(); }
function exportJSON() { 
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    const b = new Blob([JSON.stringify(data)], {type:"application/json"}); 
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(b); 
    a.download = `sauvegarde-heures-${dateStr}.json`; 
    a.click(); 
}
function importJSON() { document.getElementById('importFile').click(); }

function handleImport(input) { 
    const r = new FileReader(); 
    r.onload = e => { 
        data = JSON.parse(e.target.result); 
        localStorage.setItem('work_tracker_data', JSON.stringify(data)); 
        render(); 
    }; 
    r.readAsText(input.files[0]); 
}

function exportToPDF() { 
    const mois = document.getElementById('current-view-label').innerText;
    const element = document.getElementById('history');
    const options = {
        margin: 10,
        filename: `Suivi-Heures-${mois}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(options).from(element).save(); 
}
