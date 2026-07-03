const boardElement = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusText = document.getElementById("statusText");
const winLine = document.getElementById("winLine");
const celebration = document.getElementById("celebration");
const xScore = document.getElementById("xScore");
const oScore = document.getElementById("oScore");
const drawScore = document.getElementById("drawScore");
const playerXInput = document.getElementById("playerX");
const playerOInput = document.getElementById("playerO");
const difficultyWrap = document.getElementById("difficultyWrap");
const soundToggle = document.getElementById("soundToggle");

const wins = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const lineStyles = {
  "0,1,2": { x: "50%", y: "18.1%", angle: "0deg", length: "76%" },
  "3,4,5": { x: "50%", y: "50%", angle: "0deg", length: "76%" },
  "6,7,8": { x: "50%", y: "81.9%", angle: "0deg", length: "76%" },
  "0,3,6": { x: "18.1%", y: "50%", angle: "90deg", length: "76%" },
  "1,4,7": { x: "50%", y: "50%", angle: "90deg", length: "76%" },
  "2,5,8": { x: "81.9%", y: "50%", angle: "90deg", length: "76%" },
  "0,4,8": { x: "50%", y: "50%", angle: "45deg", length: "98%" },
  "2,4,6": { x: "50%", y: "50%", angle: "-45deg", length: "98%" },
};

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let mode = "duo";
let difficulty = "easy";
let soundOn = true;
let scores = { X: 0, O: 0, draws: 0 };
let nextBotStarter = "X";
let botMoveTimer = null;
let audioContext = null;

function playerName(mark) {
  const raw = mark === "X" ? playerXInput.value : playerOInput.value;
  return raw.trim() || `Player ${mark}`;
}

function markSvg(mark) {
  if (mark === "X") {
    return `
      <svg class="mark mark-x" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M22 22 L78 78"></path>
        <path d="M78 22 L22 78"></path>
      </svg>
    `;
  }

  return `
    <svg class="mark mark-o" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="31"></circle>
      <path class="shine" d="M35 28 C43 22 55 21 64 26"></path>
    </svg>
  `;
}

function setStatus(message) {
  statusText.textContent = message;
}

function renderBoard() {
  cells.forEach((cell, index) => {
    const mark = board[index];
    cell.innerHTML = mark ? markSvg(mark) : "";
    cell.classList.toggle("filled", Boolean(mark));
    cell.disabled = gameOver || Boolean(mark) || (mode === "bot" && currentPlayer === "O");
    cell.setAttribute("aria-label", mark ? `${cell.dataset.label || cell.ariaLabel}, ${mark}` : cell.dataset.label || cell.ariaLabel);
  });
}

function updateScoreboard() {
  xScore.textContent = scores.X;
  oScore.textContent = scores.O;
  drawScore.textContent = scores.draws;
}

function checkWinner(testBoard = board) {
  for (const combo of wins) {
    const [a, b, c] = combo;
    if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
      return { mark: testBoard[a], combo };
    }
  }
  return null;
}

function openSquares(testBoard = board) {
  return testBoard.map((value, index) => (value ? null : index)).filter((value) => value !== null);
}

function randomStarter() {
  return Math.random() < 0.5 ? "X" : "O";
}

function takeBotStarter(randomize = false) {
  if (randomize) nextBotStarter = randomStarter();

  const starter = nextBotStarter;
  nextBotStarter = starter === "X" ? "O" : "X";
  return starter;
}

function starterForNewRound(randomizeBotStarter = false) {
  return mode === "bot" ? takeBotStarter(randomizeBotStarter) : "X";
}

function clearBotMoveTimer() {
  if (botMoveTimer === null) return;
  window.clearTimeout(botMoveTimer);
  botMoveTimer = null;
}

function scheduleBotMove(delay) {
  clearBotMoveTimer();
  botMoveTimer = window.setTimeout(() => {
    botMoveTimer = null;
    botMove();
  }, delay);
}

function endRound(result) {
  gameOver = true;
  cells.forEach((cell) => { cell.disabled = true; });

  if (result) {
    scores[result.mark] += 1;
    result.combo.forEach((index) => cells[index].classList.add("win"));
    showWinLine(result.combo);
    setStatus(`${playerName(result.mark)} wins this round`);
    burstConfetti(result.mark);
    playTone(result.mark === "X" ? 523.25 : 659.25, 0.14, "triangle");
    setTimeout(() => playTone(783.99, 0.18, "sine"), 90);
  } else {
    scores.draws += 1;
    setStatus("A bright, tidy draw");
    burstConfetti("draw");
    playTone(392, 0.12, "sine");
    setTimeout(() => playTone(440, 0.14, "sine"), 110);
  }

  updateScoreboard();
}

function showWinLine(combo) {
  const style = lineStyles[combo.join(",")];
  winLine.style.setProperty("--line-x", style.x);
  winLine.style.setProperty("--line-y", style.y);
  winLine.style.setProperty("--line-angle", style.angle);
  winLine.style.setProperty("--line-length", style.length);
  winLine.classList.add("visible");
}

function clearWinEffects() {
  cells.forEach((cell) => cell.classList.remove("win"));
  winLine.classList.remove("visible");
  celebration.innerHTML = "";
}

function playMove(index) {
  if (gameOver || board[index]) return;

  board[index] = currentPlayer;
  playTone(currentPlayer === "X" ? 349.23 : 440, 0.08, "square");
  renderBoard();

  const result = checkWinner();
  if (result) {
    endRound(result);
    return;
  }

  if (openSquares().length === 0) {
    endRound(null);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  setStatus(`${playerName(currentPlayer)}'s turn`);
  renderBoard();

  if (mode === "bot" && currentPlayer === "O") {
    setStatus(`${playerName("O")} is thinking`);
    scheduleBotMove(520);
  }
}

function botMove() {
  if (gameOver || mode !== "bot" || currentPlayer !== "O") return;
  const index = difficulty === "smart" ? smartMove() : cheerfulMove();
  playMove(index);
}

function cheerfulMove() {
  const choices = openSquares();
  const winning = findTacticalMove("O");
  const blocking = findTacticalMove("X");

  if (winning !== null && Math.random() > 0.25) return winning;
  if (blocking !== null && Math.random() > 0.42) return blocking;
  return choices[Math.floor(Math.random() * choices.length)];
}

function smartMove() {
  const winning = findTacticalMove("O");
  if (winning !== null) return winning;

  const blocking = findTacticalMove("X");
  if (blocking !== null) return blocking;

  if (!board[4]) return 4;

  const corners = [0, 2, 6, 8].filter((index) => !board[index]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

  const choices = openSquares();
  return choices[Math.floor(Math.random() * choices.length)];
}

function findTacticalMove(mark) {
  for (const index of openSquares()) {
    const testBoard = [...board];
    testBoard[index] = mark;
    if (checkWinner(testBoard)?.mark === mark) return index;
  }
  return null;
}

function newRound(starter = "X") {
  clearBotMoveTimer();
  board = Array(9).fill("");
  currentPlayer = starter;
  gameOver = false;
  clearWinEffects();
  setStatus(`${playerName(currentPlayer)} starts`);
  renderBoard();

  if (mode === "bot" && currentPlayer === "O") {
    scheduleBotMove(420);
  }
}

function burstConfetti(kind) {
  const colors = kind === "X"
    ? ["var(--x)", "var(--accent)", "var(--accent-3)", "#ffffff"]
    : kind === "O"
      ? ["var(--o)", "var(--accent-2)", "var(--accent)", "#ffffff"]
      : ["var(--draw)", "var(--accent)", "var(--o)", "var(--x)"];

  celebration.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 42;
    const distance = 110 + Math.random() * 180;
    piece.className = "confetti";
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--rotate", `${Math.random() * 180}deg`);
    celebration.appendChild(piece);
  }
}

function playTone(frequency, duration, type) {
  if (!soundOn) return;

  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  } catch {
    soundOn = false;
  }
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  difficultyWrap.classList.toggle("visible", mode === "bot");
  playerOInput.value = mode === "bot" ? "Computer" : (playerOInput.value === "Computer" ? "Player O" : playerOInput.value);
  newRound(starterForNewRound(mode === "bot"));
}

function setDifficulty(nextDifficulty) {
  difficulty = nextDifficulty;
  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.classList.toggle("active", button.dataset.difficulty === difficulty);
  });
  newRound(starterForNewRound());
}

function setTheme(theme) {
  document.body.classList.remove("theme-citrus", "theme-space");
  if (theme !== "rainbow") document.body.classList.add(`theme-${theme}`);
  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });
}

function resetScores() {
  scores = { X: 0, O: 0, draws: 0 };
  updateScoreboard();
  newRound(starterForNewRound(mode === "bot"));
}

function toggleSound() {
  soundOn = !soundOn;
  soundToggle.classList.toggle("sound-off", !soundOn);
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
}

cells.forEach((cell) => {
  cell.dataset.label = cell.getAttribute("aria-label");
  cell.addEventListener("click", () => playMove(Number(cell.dataset.index)));
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll("[data-difficulty]").forEach((button) => {
  button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
});

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.theme));
});

document.getElementById("newRound").addEventListener("click", () => newRound(starterForNewRound()));
document.getElementById("resetScores").addEventListener("click", resetScores);
soundToggle.addEventListener("click", toggleSound);

[playerXInput, playerOInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (!gameOver) setStatus(`${playerName(currentPlayer)}'s turn`);
  });
});

boardElement.addEventListener("keydown", (event) => {
  const activeIndex = cells.indexOf(document.activeElement);
  if (activeIndex < 0) return;

  const moves = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: 3,
    ArrowUp: -3,
  };

  if (!(event.key in moves)) return;
  event.preventDefault();

  const nextIndex = (activeIndex + moves[event.key] + cells.length) % cells.length;
  cells[nextIndex].focus();
});

newRound("X");
