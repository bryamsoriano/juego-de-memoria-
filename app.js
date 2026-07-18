/* ============================================================
   VARIABLES GLOBALES DEL JUEGO
   ============================================================ */
let time = 0;              // segundos transcurridos (cronómetro)
let interval = null;       // referencia al setInterval del cronómetro
let chonoStatus = 'stopped'; // 'stopped', 'running'

let firstCard = null;      // primera carta volteada
let secondCard = null;     // segunda carta volteada
let boardLocked = false;   // evita clics mientras se comparan 2 cartas

let movesCount = 0;        // número de intentos (pares comparados)
let pairsFound = 0;        // parejas encontradas
let pairsTotal = 0;        // total de parejas del nivel actual
let currentLevel = 0;      // número total de cartas del nivel actual

const RANKING_KEY = 'memoria_ranking'; // clave usada en localStorage

/* ============================================================
   CRONÓMETRO
   ============================================================ */
function updateChonoDisplay() {
  let hours = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  let seconds = time % 60;

  let hoursStr = hours.toString().padStart(2, '0');
  let minutesStr = minutes.toString().padStart(2, '0');
  let secondsStr = seconds.toString().padStart(2, '0');

  document.getElementById('chonometer-display').innerText =
    `${hoursStr}:${minutesStr}:${secondsStr}`;
}

function startChono() {
  if (chonoStatus !== 'running') {
    chonoStatus = 'running';
    interval = setInterval(() => {
      time++;
      updateChonoDisplay();
    }, 1000);
  }
}

function stopChono() {
  clearInterval(interval);
  chonoStatus = 'stopped';
}

function resetChono() {
  stopChono();
  time = 0;
  updateChonoDisplay();
}

/* ============================================================
   INICIO DEL JUEGO
   ============================================================ */
function startCards() {
  const objSelect = document.getElementById('level-games');
  const objGridCards = document.getElementById('grid-cards');
  const playerName = document.getElementById('player-name').value.trim();
  let selectValue = objSelect.value;

  if (playerName === '') {
    alert('Debes escribir tu nombre antes de iniciar');
    return;
  }

  if (selectValue === '') {
    alert('Debe seleccionar un nivel de juego');
    objGridCards.innerHTML = '<label class="viewLoad">Load.....</label>';
    return;
  }

  // Reiniciar variables de la partida
  currentLevel = parseInt(selectValue, 10);
  pairsTotal = currentLevel / 2;
  pairsFound = 0;
  movesCount = 0;
  firstCard = null;
  secondCard = null;
  boardLocked = true; // bloqueado durante la vista previa

  document.getElementById('moves-count').innerText = '0';
  document.getElementById('pairs-count').innerText = '0';
  document.getElementById('pairs-total').innerText = pairsTotal;

  resetChono();

  objGridCards.innerHTML = '';
  createCards(currentLevel, objGridCards);
  showPreviewThenHide(objGridCards);
}

function createCards(level, objGrid) {
  const arrayImg = ['img_1.png', 'img_2.png', 'img_3.png', 'img_4.png', 'img_5.png',
                     'img_6.png', 'img_7.png', 'img_8.png', 'img_9.png', 'img_10.png'];
  const getNewArray = shuffleArrayCard(arrayImg, level / 2);
  let textElements = '';

  for (let i = 0; i < level; i++) {
    textElements += `<div class="item-grid" data-matched="false">
        <img onclick="validateSelectCard(this)" src="assets/img/${getNewArray[i]}" data-src="${getNewArray[i]}" alt="carta">
      </div>`;
  }
  objGrid.innerHTML = textElements;
}

function shuffleArrayCard(getArray, level) {
  let newShuffle = [...getArray].sort(() => Math.random() - 0.5);
  let newArray = [];

  for (let i = 0; i < level; i++) {
    newArray[i] = newShuffle[i];
  }
  // Se duplica el array para formar las parejas y se vuelve a mezclar
  let mingle = [...newArray, ...newArray];
  return mingle.sort(() => Math.random() - 0.5);
}

/* Muestra las cartas boca arriba unos segundos, luego las tapa
   y arranca el cronómetro (empieza el juego real) */
function showPreviewThenHide(objContainerCards) {
  const elementsCards = objContainerCards.querySelectorAll('img');
  setTimeout(() => {
    elementsCards.forEach(item => {
      item.src = 'assets/img/img_0.png'; // img_0.png = reverso de la carta
    });
    boardLocked = false;
    startChono();
  }, 3000);
}

/* ============================================================
   LÓGICA DE SELECCIÓN DE CARTAS
   ============================================================ */
function validateSelectCard(imgEl) {
  const cardEl = imgEl.parentElement;

  if (boardLocked) return;
  if (cardEl.dataset.matched === 'true') return;
  if (imgEl === firstCard) return; // no permitir clic doble en la misma carta

  imgEl.src = 'assets/img/' + imgEl.dataset.src;

  if (!firstCard) {
    firstCard = imgEl;
    return;
  }

  secondCard = imgEl;
  boardLocked = true;
  movesCount++;
  document.getElementById('moves-count').innerText = movesCount;

  const isMatch = firstCard.dataset.src === secondCard.dataset.src;

  if (isMatch) {
    firstCard.parentElement.dataset.matched = 'true';
    secondCard.parentElement.dataset.matched = 'true';
    firstCard.parentElement.classList.add('matched');
    secondCard.parentElement.classList.add('matched');
    pairsFound++;
    document.getElementById('pairs-count').innerText = pairsFound;

    resetTurn();

    if (pairsFound === pairsTotal) {
      finishGame();
    }
  } else {
    setTimeout(() => {
      firstCard.src = 'assets/img/img_0.png';
      secondCard.src = 'assets/img/img_0.png';
      resetTurn();
    }, 800);
  }
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  boardLocked = false;
}

/* ============================================================
   FIN DEL JUEGO + PUNTAJE + RANKING
   ============================================================ */
function finishGame() {
  stopChono();

  const playerName = document.getElementById('player-name').value.trim() || 'Jugador';
  const score = calculateScore(currentLevel, time, movesCount);

  saveScore({
    name: playerName,
    level: currentLevel,
    time: time,
    moves: movesCount,
    score: score
  });

  renderRanking();

  setTimeout(() => {
    alert(`¡Felicidades ${playerName}! Completaste el nivel en ${formatTime(time)} con ${movesCount} movimientos.\nPuntaje obtenido: ${score}`);
  }, 200);
}

/* Fórmula simple de puntaje:
   - Se parte de un puntaje base según el nivel (más cartas = más puntos posibles)
   - Se restan puntos por cada segundo transcurrido
   - Se restan puntos por cada movimiento de más (comparado con el mínimo posible) */
function calculateScore(level, timeSpent, moves) {
  const basePoints = level * 100;
  const minMoves = level / 2;
  const extraMoves = Math.max(0, moves - minMoves);

  let score = basePoints - (timeSpent * 3) - (extraMoves * 15);
  return Math.max(score, 10); // nunca menos de 10 puntos
}

function formatTime(totalSeconds) {
  let hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  let minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  let seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/* ============================================================
   PERSISTENCIA DEL RANKING (localStorage)
   ============================================================ */
function getRanking() {
  const raw = localStorage.getItem(RANKING_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveScore(entry) {
  const ranking = getRanking();
  ranking.push(entry);
  // Ordenar de mayor a menor puntaje y quedarnos con el top 10
  ranking.sort((a, b) => b.score - a.score);
  const top10 = ranking.slice(0, 10);
  localStorage.setItem(RANKING_KEY, JSON.stringify(top10));
}

function renderRanking() {
  const ranking = getRanking();
  const tbody = document.getElementById('ranking-body');

  if (ranking.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="ranking-empty">Aún no hay partidas jugadas</td></tr>';
    return;
  }

  tbody.innerHTML = ranking.map((entry, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${entry.name}</td>
      <td>${entry.level} cartas</td>
      <td>${formatTime(entry.time)}</td>
      <td>${entry.moves}</td>
      <td>${entry.score}</td>
    </tr>
  `).join('');
}

function clearRanking() {
  if (confirm('¿Seguro que deseas borrar toda la clasificación?')) {
    localStorage.removeItem(RANKING_KEY);
    renderRanking();
  }
}

/* Al cargar la página, mostrar el ranking guardado previamente */
document.addEventListener('DOMContentLoaded', renderRanking);
