const GITHUB_USER = 'LuanMont6';

const PINNED_REPOS = ['N1-TOOLKIT', 'Escala-Visual-Analogica-de-Apetite', 'Conecta_MCZ'];

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function relativeTime(dateString) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffHours = Math.floor((now - then) / (1000 * 60 * 60));

  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}m`;
}

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), index * 70);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function setMetric(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function hydratePinnedProjects(repos) {
  const reposByName = new Map(repos.map((repo) => [repo.name, repo]));

  PINNED_REPOS.forEach((repoName) => {
    const repo = reposByName.get(repoName);
    const card = document.querySelector(`[data-repo="${repoName}"]`);
    if (!card || !repo) return;

    const timeEl = card.querySelector('[data-field="time"]');
    const updatedEl = card.querySelector('[data-field="updated"]');
    const languageEl = card.querySelector('[data-field="language"]');
    const repoLink = card.querySelector('[data-field="repo-link"]');
    const demoLink = card.querySelector('[data-field="demo-link"]');

    if (timeEl) timeEl.textContent = relativeTime(repo.pushed_at);
    if (updatedEl) updatedEl.textContent = `Atualizado em ${formatDateShort(repo.pushed_at)}`;
    if (languageEl && repo.language) languageEl.textContent = repo.language;
    if (repoLink) repoLink.href = repo.html_url;

    if (demoLink) {
      if (repo.homepage) {
        demoLink.href = repo.homepage;
        demoLink.classList.remove('hidden-link');
      } else if (!demoLink.classList.contains('hidden-link')) {
        demoLink.classList.add('hidden-link');
      }
    }
  });
}

function renderActivity(events) {
  const activityList = document.getElementById('activityList');
  if (!activityList) return;

  activityList.innerHTML = '';

  const filtered = events
    .filter((event) => event.type === 'PushEvent' || event.type === 'PullRequestEvent' || event.type === 'CreateEvent')
    .slice(0, 6);

  if (!filtered.length) {
    activityList.innerHTML = '<li>Sem atividade publica recente para exibir.</li>';
    return;
  }

  filtered.forEach((event) => {
    const li = document.createElement('li');
    const repoName = event.repo?.name || 'repositorio';
    const date = formatDateShort(event.created_at);

    if (event.type === 'PushEvent') {
      li.textContent = `Push em ${repoName} (${date})`;
    } else if (event.type === 'PullRequestEvent') {
      li.textContent = `Pull request em ${repoName} (${date})`;
    } else {
      li.textContent = `Criacao de branch/recurso em ${repoName} (${date})`;
    }

    activityList.appendChild(li);
  });
}

function getTopLanguage(repos) {
  const count = {};
  repos.forEach((repo) => {
    if (repo.language) count[repo.language] = (count[repo.language] || 0) + 1;
  });

  const entries = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return entries[0] ? entries[0][0] : 'N/A';
}

async function bootstrap() {
  document.getElementById('currentYear').textContent = String(new Date().getFullYear());

  try {
    const [profileRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`),
      fetch(`https://api.github.com/users/${GITHUB_USER}/events/public`),
    ]);

    const [profile, reposRaw, events] = await Promise.all([profileRes.json(), reposRes.json(), eventsRes.json()]);

    const repos = reposRaw
      .filter((repo) => !repo.fork)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    setMetric('reposCount', profile.public_repos ?? '--');
    setMetric('followersCount', profile.followers ?? '--');
    setMetric('followingCount', profile.following ?? '--');
    setMetric('topLang', getTopLanguage(repos));

    hydratePinnedProjects(repos);
    renderActivity(Array.isArray(events) ? events : []);
  } catch (error) {
    renderActivity([]);
  }

  setupReveal();
}

bootstrap();
