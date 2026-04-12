let data = JSON.parse(localStorage.getItem('work_tracker_data')) || [];
let settings = JSON.parse(localStorage.getItem('work_tracker_settings')) || { hourlyBrut: 12.2861, mealVal: 10.40 };

const joursFeries2026 = ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"];

// Mappage des icônes par type
const typeIcons = {
    'work': '<i class="bi bi-briefcase text-primary me-2"></i>',
    'cp': '<i class="bi bi-sun text-absence me-2"></i>',
    'maladie': '<i class="bi bi-hospital text-absence me-2"></i>',
    'recup': '<i class="bi bi-hourglass-split text-absence me-2"></i>',
    'sans-solde': '<i class="bi bi-dash-circle text-muted me-2"></i>',
    'ferie': '<i class="bi bi-stars text-warning me-2"></i>'
};

document.getElementById('date').valueAsDate = new Date();

function updateAlerts() {
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const isAfterTime = (now.getHours() > 14 || (now.getHours() === 14 && now.getMinutes() >= 30));
    const btn = document.getElementById('export-btn');
    if(isFriday && isAfterTime) btn.classList.add('friday-alert');
    else btn.classList.remove('friday-alert');

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    document.getElementById('month-alert').style.display = (now.getDate() >= lastDay - 2) ? 'block' : 'none';
}
setInterval(updateAlerts, 60000);
updateAlerts();

document.getElementById('start').addEventListener('input', fTime);
document.getElementById('end').addEventListener('input', fTime);
function fTime(e) { let v = e.target.value.replace(/:/g, ''); if (v.length > 2) e.target.value = v.substring(0, v.length - 2) + ":" + v.substring(v.length - 2); }

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

    if (isH || type !== 'work') {
        dur = 420 * ratio; start = isH ? "FÉRIÉ" : type.toUpperCase();
    } else {
        let sR = document.getElementById('start').value, eR = document.getElementById('end').value;
        p = parseInt(document.getElementById('break').value) || 0;
        if (!date || !sR || !eR) return alert("Veuillez remplir les heures.");
        start = sR.padStart(5, '0'); end = eR.padStart(5, '0');
        dur = (new Date(`${date}T${end}`) - new Date(`${date}T${start}`)) / 60000 - p;
    }
    if (dur <= 0) return alert("L'heure de fin doit être après le début.");
    data.push({ id: Date.now(), date, start, end, pause: p, duration: dur, type: isH ? 'ferie' : type, ratio });
    localStorage.setItem('work_tracker_data', JSON.stringify(data));
    render();
}

function render() {
    const hist = document.getElementById('history'); hist.innerHTML = '';
    let tW = 0, tM = 0, sM = 0, lastW = null;
    const now = new Date(), cW = getISOWeek(now), cM = now.getMonth();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const weekTotals = {};
    data.forEach(s => { const w = getISOWeek(new Date(s.date)); weekTotals[w] = (weekTotals[w] || 0) + s.duration; });

    data.forEach(s => {
        const d = new Date(s.date), w = getISOWeek(d), isM = d.getMonth() === cM && d.getFullYear() === now.getFullYear();
        if (w !== lastW) { 
            hist.innerHTML += `<div class="week-separator"><span><i class="bi bi-hash me-1"></i>SEMAINE ${w}</span><span>Total: ${fH(weekTotals[w])}</span></div>`; 
            lastW = w; 
        }
        if (w === cW) tW += s.duration;
        if (isM) { tM += s.duration; if(s.type === 'work') sM++; }

        let bCl = s.duration > 420 ? 'bg-goal-over' : (s.duration === 420 ? 'bg-goal-exact' : 'bg-goal-under');
        if (s.type !== 'work' && s.type !== 'ferie') bCl = 'bg-absence';
        
        const icon = typeIcons[s.type] || typeIcons['work'];

        hist.innerHTML += `
            <div class="card p-3 mb-2 border-0 shadow-sm border-start border-4 ${s.type === 'ferie' ? 'bg-holiday' : 'border-primary'}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="me-3 text-center" style="width: 45px;">
                            <span class="d-block fw-bold text-uppercase small">${d.toLocaleDateString('fr-FR', {weekday:'short'})}</span>
                            <span class="d-block h5 mb-0">${d.getDate()}</span>
                        </div>
                        <div>
                            <div class="fw-bold d-flex align-items-center">${icon} ${s.type==='ferie'?'JOUR FÉRIÉ':s.type.charAt(0).toUpperCase()+s.type.slice(1)}</div>
                            <small class="text-muted">${s.type==='work' ? '<i class="bi bi-clock me-1"></i>'+s.start+' - '+s.end : (s.ratio < 1 ? 'Demi-journée' : 'Journée entière')}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge ${bCl} rounded-pill px-3 py-2 mb-2 d-block">${fH(s.duration)}</span>
                        <button onclick="deleteS(${s.id})" class="btn-delete p-0"><i class="bi bi-x-circle-fill"></i></button>
                    </div>
                </div>
            </div>`;
    });

    document.getElementById('week-hours').innerText = fH(tW);
    document.getElementById('month-hours').innerText = fH(tM);
    const diff = tW - 2100;
    document.getElementById('week-delta').innerHTML = diff >= 0 
        ? `<span class="text-success small fw-bold"><i class="bi bi-plus-circle-fill me-1"></i>+${fH(diff)}</span>` 
        : `<span class="text-danger small fw-bold"><i class="bi bi-dash-circle-fill me-1"></i>-${fH(Math.abs(diff))}</span>`;
    
    const sNet = (tM / 60) * settings.hourlyBrut * 0.77 + (sM * settings.mealVal);
    document.getElementById('net-salary').innerText = `${sNet.toFixed(2).replace('.', ',')} €`;
    document.getElementById('details-paye').innerHTML = `<i class="bi bi-info-circle me-1"></i> ${fH(tM)} travaillées • ${sM} paniers repas`;
}

function exportToPDF(mode) {
    const now = new Date();
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthName = months[now.getMonth()];
    const weekNum = getISOWeek(now);
    const headerTitle = document.getElementById('pdf-header-title');
    const subTitle = document.getElementById('pdf-subtitle');
    
    let filename = (mode === 'week') ? `Semaine_${weekNum}_${monthName}_2026.pdf` : `Synthese_${monthName}_2026.pdf`;
    subTitle.innerText = (mode === 'week') ? `Relevé Hebdomadaire - Semaine ${weekNum} (${monthName} 2026)` : `Récapitulatif Mensuel - ${monthName} 2026`;

    headerTitle.style.display = 'block';
    const element = document.getElementById('printable-area');
    html2pdf().set({ margin: 10, filename: filename, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
    .from(element).save().then(() => { headerTitle.style.display = 'none'; });
}

function deleteS(id) { if(confirm("Supprimer cette entrée ?")) { data = data.filter(s => s.id !== id); localStorage.setItem('work_tracker_data', JSON.stringify(data)); render(); } }
function getISOWeek(d) { let date = new Date(d); date.setHours(0,0,0,0); date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7); let w1 = new Date(date.getFullYear(), 0, 4); return 1 + Math.round(((date.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7); }
function fH(min) { return `${Math.floor(min/60)}h${Math.round(min%60).toString().padStart(2,'0')}`; }
function resetAll() { if(confirm("⚠️ VOULEZ-VOUS TOUT EFFACER ?\nCette action est irréversible.")) { localStorage.clear(); data = []; render(); } }
render();
