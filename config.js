    const app = document.getElementById('app');
    const themeBtn = document.getElementById('themeBtn');
    const anchors = Array.from(document.querySelectorAll('[data-anchor]'));
    const coordsInput = document.getElementById('coordsInput');
    const statPontos = document.getElementById('stat-pontos');
    const statKg = document.getElementById('stat-kg');
    const statUsers = document.getElementById('stat-users');
    const recordsContainer = document.getElementById('recordsContainer');
    const lastUpdate = document.getElementById('lastUpdate');
    const rankingEl = document.getElementById('ranking');

    //localStorage
    (function initTheme(){
      const saved = localStorage.getItem('ru_theme') || 'light';
      setTheme(saved);
    })();

    themeBtn.addEventListener('click', () => {
      const current = app.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
      themeBtn.setAttribute('aria-pressed', next === 'dark');
    });
    function setTheme(t){
      app.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      localStorage.setItem('ru_theme', t);
    }

    
    anchors.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
        // set ativar
        anchors.forEach(x => x.classList.remove('active'));
        a.classList.add('active');
      });
    });

    const MOCK_RECORDS = [
      {date:'2025-11-15', place:'Praça Central', material:'Plástico', kg:12.4},
      {date:'2025-11-12', place:'CEU Bairro Novo', material:'Papel', kg:8.0},
      {date:'2025-11-08', place:'Terminal 2', material:'Metal', kg:24.5},
      {date:'2025-11-02', place:'Rua 5', material:'Vidro', kg:6.7},
    ];
    const MOCK_STATS = {pontos:128, kg:3452, users:1246};
    const MOCK_RANK = [
      {name:'Maria S.', pts:124},
      {name:'João P.', pts:117},
      {name:'Ana R.', pts:104},
    ];

    function renderDashboard(){
      statPontos.textContent = MOCK_STATS.pontos;
      statKg.textContent = MOCK_STATS.kg + ' kg';
      statUsers.textContent = MOCK_STATS.users;
      lastUpdate.textContent = new Date().toLocaleString();

      recordsContainer.innerHTML = '';
      MOCK_RECORDS.forEach(r => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<div>${r.date}</div><div>${r.place}</div><div>${r.material}</div><div>${r.kg}</div>`;
        recordsContainer.appendChild(row);
      });

      rankingEl.innerHTML = '';
      MOCK_RANK.forEach(x => {
        const li = document.createElement('li');
        li.textContent = x.name + ' — ' + x.pts + ' pts';
        rankingEl.appendChild(li);
      });
    }
    renderDashboard();

    // Chart.js
    const ctx = document.getElementById('chartColetas').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Semana 1','Semana 2','Semana 3','Semana 4'],
        datasets: [{label:'kg coletados', data:[820, 900, 750, 980], borderRadius:8}]
      },
      options: {
        plugins:{legend:{display:false}},
        scales:{
          y:{beginAtZero:true}
        },
        maintainAspectRatio: false
      }
    });

    // --- mapa
    // Corumbá-MS 
    const DEFAULT_CENTER = [-18.9814, -57.6591];
    const map = L.map('map', {zoomControl:true}).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // cadastro
    const mini = L.map('miniMap', {zoomControl:false, attributionControl:false}).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mini);

    // icon 
    const iconFactory = (color) => L.divIcon({
      html: `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 4px 8px rgba(0,0,0,.2);border:2px solid white"></span>`,
      className: ''
    });

    let markersLayer = L.layerGroup().addTo(map);
    let miniMarkers = L.layerGroup().addTo(mini);

    let POINTS = [];

    function generateRandomPoints(n=25){
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      const types = ['Plástico','Papel','Metal','Vidro','Orgânico'];
      POINTS = []; // replace
      for(let i=0;i<n;i++){
        const lat = Math.random()*(northEast.lat - southWest.lat) + southWest.lat;
        const lng = Math.random()*(northEast.lng - southWest.lng) + southWest.lng;
        const tipo = types[Math.floor(Math.random()*types.length)];
        const active = Math.random() > 0.12;
        POINTS.push({
          id: 'p' + Date.now() + i,
          name: 'Ponto ' + (i+1),
          tipo,
          lat, lng,
          active
        });
      }
      renderPoints();
    }

    function renderPoints(filter='all'){
      markersLayer.clearLayers();
      miniMarkers.clearLayers();
      const filtered = POINTS.filter(p => filter === 'all' ? true : p.tipo === filter);
      filtered.forEach(p=>{
        const color = p.active ? '#2e8b57' : '#98a4a0';
        const marker = L.marker([p.lat,p.lng], {icon:iconFactory(color)}).addTo(markersLayer);
        const popup = `<strong>${p.name}</strong><div class="small">Tipo: ${p.tipo}</div><div class="small">Status: ${p.active ? 'Ativo':'Inativo'}</div>`;
        marker.bindPopup(popup);
        const m2 = L.circleMarker([p.lat,p.lng], {radius:6, color:color, fillColor:color, fillOpacity:1}).addTo(miniMarkers);
      });

      // atualizar counts
      statPontos.textContent = POINTS.length;
    }

    //  points inicial
    generateRandomPoints(40);

    // map click -> gerar novo point
    map.on('click', (e)=>{
      const {lat,lng} = e.latlng;
      const name = prompt('Nome do ponto de coleta (ex: Praça X):');
      if(!name) return;
      const tipo = prompt('Tipo de resíduo (Plástico/Papel/Metal/Vidro/Orgânico):','Plástico') || 'Plástico';
      const novo = {id:'p'+Date.now(), name, tipo, lat, lng, active:true};
      POINTS.push(novo);
      renderPoints(document.getElementById('filterType').value);
      alert('Ponto criado. Coordenadas: ' + lat.toFixed(6) + ', ' + lng.toFixed(6));
    });

    // miniMap
    mini.on('click', (e)=>{
      coordsInput.value = e.latlng.lat.toFixed(6) + ', ' + e.latlng.lng.toFixed(6);
      coordsInput.focus();
    });

    // filtro
    document.getElementById('filterType').addEventListener('change', (e)=>{
      renderPoints(e.target.value);
    });

    document.getElementById('randomize').addEventListener('click', ()=>{
      generateRandomPoints(40 + Math.floor(Math.random()*60));
    });

    // form cadastro 
    document.getElementById('pontoForm').addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const data = new FormData(ev.target);
      const nome = data.get('nome');
      const responsavel = data.get('responsavel');
      const tipo = data.get('tipo');
      const coords = data.get('coords') || '';
      let latlng = null;
      try {
        const [lat, lng] = coords.split(',').map(s=>parseFloat(s.trim()));
        if(!isNaN(lat) && !isNaN(lng)) latlng = [lat, lng];
      } catch(e){}
      if(!latlng){ alert('Forneça coordenadas válidas (ex: -18.9814, -57.6591) ou clique no mini mapa.'); return;}
      const novo = {id:'p'+Date.now(), name:nome, tipo, lat:latlng[0], lng:latlng[1], active:true, contact:responsavel};
      POINTS.push(novo);
      renderPoints(document.getElementById('filterType').value);
      // map
      map.setView([latlng[0], latlng[1]], 15, {animate:true});
      ev.target.reset();
      alert('Ponto salvo com sucesso!');
    });

    document.getElementById('locateMe').addEventListener('click', ()=>{
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
          mini.setView([pos.coords.latitude,pos.coords.longitude],15);
          map.setView([pos.coords.latitude,pos.coords.longitude],14);
        }, err=>{
          alert('Não foi possível obter localização: ' + err.message);
        });
      } else alert('Geolocalização não disponível.');
    });

    // login
    document.getElementById('loginForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      alert('Login mock — integrações via backend.');
    });
    document.getElementById('coopForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      alert('Cooperativa registrada (mock). Obrigado!');
      e.target.reset();
    });

    //exportar CSV
    function arrayToCSV(rows){
      return rows.map(r => Object.values(r).map(v => `"${(''+v).replace(/"/g,'""')}"`).join(',')).join('\\n');
    }
    document.getElementById('exportCSV').addEventListener('click', ()=>{
      const rows = POINTS.slice(0,100).map(p => ({id:p.id,name:p.name,tipo:p.tipo,lat:p.lat,lng:p.lng,active:p.active}));
      const csv = 'id,nome,tipo,lat,lng,active\\n' + arrayToCSV(rows);
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'pontos_reciclaurbana.csv'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    // pesquisa
    document.getElementById('globalSearch').addEventListener('input', (e)=>{
      const q = e.target.value.toLowerCase();
      anchors.forEach(a => a.classList.remove('active'));
      if(!q) return;
      // highlight
      const matches = POINTS.filter(p => p.name.toLowerCase().includes(q) || (p.tipo && p.tipo.toLowerCase().includes(q)));
      if(matches.length){
        const m = matches[0];
        map.setView([m.lat,m.lng],15);
        // open
        const tmp = L.circleMarker([m.lat,m.lng], {radius:10, color:'#f08c00'}).addTo(map);
        setTimeout(()=>map.removeLayer(tmp), 2200);
      }
    });

    // initial
    document.addEventListener('DOMContentLoaded', ()=>{
      anchors[0].classList.add('active');
    });

    // c onsole debugging (dev)
    window.RU = {map, POINTS, generateRandomPoints, renderPoints};
