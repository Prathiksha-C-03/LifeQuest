const STORAGE_KEY = "lifeQuestSaveV1";

let config = {
  xpPerLevel: 100,
  dailyGoal: 3,
  quests: []
};

let state = {
  xp: 0,
  completed: [],
  customQuests: [],
  streak: 0,
  lastActiveDate: null,
  lastCompletionDate: null,
  completionDates: {},
  badges: [],
  filter: "all"
};

const badges = [
  {
    id: "first",
    icon: "🌱",
    title: "First Steps",
    description: "Complete your first quest",
    test: s => s.completed.length >= 1
  },
  {
    id: "five",
    icon: "⚔️",
    title: "Quest Warrior",
    description: "Complete 5 quests",
    test: s => s.completed.length >= 5
  },
  {
    id: "ten",
    icon: "🏆",
    title: "Quest Champion",
    description: "Complete 10 quests",
    test: s => s.completed.length >= 10
  },
  {
    id: "level5",
    icon: "👑",
    title: "Rising Legend",
    description: "Reach level 5",
    test: s => getLevel(s.xp) >= 5
  },
  {
    id: "streak3",
    icon: "🔥",
    title: "On Fire",
    description: "Maintain a 3-day streak",
    test: s => s.streak >= 3
  }
];

const $ = id => document.getElementById(id);

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function previousDay(key) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - 1);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getLevel(xp) {
  return Math.floor(xp / config.xpPerLevel) + 1;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast("Could not save progress in this browser.");
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    if (!data || typeof data !== "object") return;

    state.xp = Number.isFinite(data.xp)
      ? Math.max(0, data.xp) : 0;

    state.completed = Array.isArray(data.completed)
      ? data.completed : [];

    state.customQuests = Array.isArray(data.customQuests)
      ? data.customQuests : [];

    state.streak = Number.isInteger(data.streak)
      ? Math.max(0, data.streak) : 0;

    state.lastActiveDate = data.lastActiveDate || null;
    state.lastCompletionDate = data.lastCompletionDate || null;

    state.completionDates =
      data.completionDates &&
      typeof data.completionDates === "object"
        ? data.completionDates : {};

    state.badges = Array.isArray(data.badges)
      ? data.badges : [];

    if (["all", "active", "completed"].includes(data.filter)) {
      state.filter = data.filter;
    }
  } catch (error) {
    console.warn("Could not load saved progress.", error);
  }
}

function getAllQuests() {
  return [...config.quests, ...state.customQuests];
}

function isCompleted(id) {
  return state.completed.includes(id);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function renderQuests() {
  const list = $("questList");
  const all = getAllQuests();

  const visible = all.filter(quest => {
    const done = isCompleted(quest.id);

    if (state.filter === "active") return !done;
    if (state.filter === "completed") return done;

    return true;
  });

  $("questCount").textContent =
    `${all.filter(q => !isCompleted(q.id)).length} remaining`;

  if (!visible.length) {
    list.innerHTML =
      '<p class="empty">No quests here. Add a new quest to continue!</p>';
    return;
  }

  list.innerHTML = visible.map(quest => {
    const done = isCompleted(quest.id);

    return `
      <article class="quest-item ${done ? "done" : ""}">
        <input
          class="quest-check"
          type="checkbox"
          data-complete="${escapeHTML(quest.id)}"
          aria-label="Complete ${escapeHTML(quest.title)}"
          ${done ? "checked disabled" : ""}
        >
        <div class="quest-content">
          <h3>${escapeHTML(quest.title)}</h3>
          <div class="quest-meta">
            <span class="category">${escapeHTML(quest.category)}</span>
            <span class="xp-pill">⚡ ${Number(quest.xp)} XP</span>
          </div>
        </div>
        ${quest.custom ? `
          <button class="delete-btn"
            data-delete="${escapeHTML(quest.id)}"
            aria-label="Delete quest">×</button>
        ` : ""}
      </article>
    `;
  }).join("");
}

function updateStreak() {
  const today = todayKey();

  if (state.lastActiveDate === today) return;

  if (state.lastActiveDate === previousDay(today)) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }

  state.lastActiveDate = today;
}

function checkBadges() {
  const unlocked = [];

  badges.forEach(badge => {
    if (badge.test(state) && !state.badges.includes(badge.id)) {
      state.badges.push(badge.id);
      unlocked.push(badge);
    }
  });

  unlocked.forEach(badge => {
    showToast(`🏅 Badge unlocked: ${badge.title}!`);
  });
}

function renderBadges() {
  $("badgeList").innerHTML = badges.map(badge => {
    const unlocked = state.badges.includes(badge.id);

    return `
      <article class="badge-item ${unlocked ? "unlocked" : ""}">
        <span class="badge-icon">${badge.icon}</span>
        <div>
          <h3>${badge.title} ${unlocked ? "✓" : "🔒"}</h3>
          <p>${badge.description}</p>
        </div>
      </article>
    `;
  }).join("");
}

function renderStats() {
  const level = getLevel(state.xp);
  const xpInLevel = state.xp % config.xpPerLevel;
  const percent = (xpInLevel / config.xpPerLevel) * 100;
  const completedToday = state.completionDates[todayKey()] || 0;
  const dailyPercent = Math.min(
    100,
    (completedToday / config.dailyGoal) * 100
  );

  $("levelNumber").textContent = level;
  $("levelText").textContent =
    `Level ${level} · ${level === 1 ? "Beginner" :
      level < 5 ? "Adventurer" :
      level < 10 ? "Veteran" : "Legend"}`;

  $("xpText").textContent =
    `${xpInLevel} / ${config.xpPerLevel} XP`;
  $("totalXp").textContent = `Total XP: ${state.xp}`;
  $("xpBar").style.width = `${percent}%`;

  $("statXP").textContent = state.xp;
  $("statDone").textContent = state.completed.length;
  $("statStreak").textContent =
    `${state.streak} ${state.streak === 1 ? "day" : "days"}`;
  $("statBadges").textContent = state.badges.length;

  $("dailyBar").style.width = `${dailyPercent}%`;
  $("dailyText").textContent =
    `${completedToday} / ${config.dailyGoal} completed today` +
    (completedToday >= config.dailyGoal ? " ✓" : "");
}

function render() {
  renderQuests();
  renderStats();
  renderBadges();
}

function completeQuest(id) {
  const quest = getAllQuests().find(q => q.id === id);

  if (!quest || isCompleted(id)) return;

  const oldLevel = getLevel(state.xp);

  state.completed.push(id);
  state.xp += Number(quest.xp) || 0;

  const today = todayKey();
  state.completionDates[today] =
    (state.completionDates[today] || 0) + 1;
  state.lastCompletionDate = today;

  updateStreak();
  checkBadges();
  saveState();
  render();

  if (getLevel(state.xp) > oldLevel) {
    showToast(`🎉 LEVEL UP! You reached Level ${getLevel(state.xp)}!`);
  } else {
    showToast(`+${quest.xp} XP earned! Quest completed! ⚡`);
  }
}

function addQuest(event) {
  event.preventDefault();

  const title = $("questInput").value.trim();
  const category = $("categoryInput").value;

  if (!title) return;

  state.customQuests.push({
    id: "custom_" + Date.now() + "_" +
      Math.random().toString(36).slice(2, 7),
    title,
    category,
    xp: 20,
    custom: true
  });

  $("questInput").value = "";

  saveState();
  render();
  showToast("New quest added! Worth 20 XP.");
}

function deleteQuest(id) {
  const quest = state.customQuests.find(q => q.id === id);

  if (!quest) return;

  if (isCompleted(id)) {
    showToast("Completed quests cannot be deleted.");
    return;
  }

  state.customQuests = state.customQuests.filter(q => q.id !== id);
  saveState();
  render();
  showToast("Quest removed.");
}

function setFilter(filter) {
  state.filter = filter;

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === filter
    );
  });

  renderQuests();
  saveState();
}

function resetGame() {
  const confirmed = confirm(
    "Reset all LifeQuest progress, XP, badges, and custom quests?"
  );

  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);

  state = {
    xp: 0,
    completed: [],
    customQuests: [],
    streak: 0,
    lastActiveDate: null,
    lastCompletionDate: null,
    completionDates: {},
    badges: [],
    filter: "all"
  };

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === "all"
    );
  });

  render();
  showToast("Your adventure starts again!");
}

async function init() {
  try {
    const response = await fetch("quests.json");

    if (!response.ok) {
      throw new Error("Could not load quests.json");
    }

    const data = await response.json();

    config.xpPerLevel = Number(data.xpPerLevel) || 100;
    config.dailyGoal = Number(data.dailyGoal) || 3;
    config.quests = data.quests.map(quest => ({
      ...quest,
      custom: false
    }));

    loadState();

    // A streak expires if the player misses an entire day.
    if (
      state.lastActiveDate &&
      state.lastActiveDate !== todayKey() &&
      state.lastActiveDate !== previousDay(todayKey())
    ) {
      state.streak = 0;
      state.lastActiveDate = null;
    }

    checkBadges();
    saveState();
    render();
  } catch (error) {
    console.error(error);
    $("questList").innerHTML =
      '<p class="empty">Could not load quests. Start the app using VS Code Live Server.</p>';
  }
}

$("questForm").addEventListener("submit", addQuest);
$("resetBtn").addEventListener("click", resetGame);

$("questList").addEventListener("change", event => {
  const id = event.target.dataset.complete;

  if (id && event.target.checked) {
    completeQuest(id);
  }
});

$("questList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");

  if (button) {
    deleteQuest(button.dataset.delete);
  }
});

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
  });
});

init();