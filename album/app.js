const photos = window.ALBUM_PHOTOS;
const heart = document.querySelector('#photo-heart');
const dialog = document.querySelector('#lightbox');
const viewerImage = document.querySelector('#viewer-image');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rows = [
  [2, 3, 7, 8],
  [1, 2, 3, 4, 6, 7, 8, 9],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [2, 3, 4, 5, 6, 7, 8],
  [3, 4, 5, 6, 7],
  [4, 5, 6],
  [5],
];
const tiles = [];
let paused = false;
let currentPhoto = 0;
let returnFocus;
let shuffleVersion = 0;

function shuffledIndices() {
  const indices = photos.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

const firstBatch = shuffledIndices();
rows.forEach((columns, row) => columns.forEach(column => {
  const index = firstBatch[tiles.length % photos.length];
  const tile = document.createElement('button');
  tile.className = 'photo-tile';
  tile.type = 'button';
  tile.style.gridArea = `${row + 1} / ${column + 1}`;
  tile.style.setProperty('--tilt', `${(Math.random() - .5) * 5}deg`);
  tile.dataset.layer = '0';
  tile.dataset.index = index;
  tile.setAttribute('aria-label', `放大回忆 ${photos[index].id}`);
  const front = new Image();
  front.src = photos[index].thumb;
  front.alt = '';
  front.draggable = false;
  const back = new Image();
  back.alt = '';
  back.draggable = false;
  tile.append(front, back);
  tile.addEventListener('click', () => openViewer(Number(tile.dataset.index), tile));
  heart.append(tile);
  tiles.push(tile);
}));

function changeHeart() {
  const version = ++shuffleVersion;
  const batch = shuffledIndices();
  tiles.forEach((tile, i) => {
    const index = batch[i % photos.length];
    const nextLayer = tile.dataset.layer === '0' ? 1 : 0;
    const nextImage = tile.children[nextLayer];
    nextImage.onload = () => {
      setTimeout(() => {
        if (version !== shuffleVersion) return;
        tile.dataset.layer = String(nextLayer);
        tile.dataset.index = index;
        tile.setAttribute('aria-label', `放大回忆 ${photos[index].id}`);
      }, reducedMotion.matches ? 0 : i * 13);
    };
    nextImage.src = photos[index].thumb;
  });
}
heart.addEventListener('animationiteration', () => {
  if (!paused && !dialog.open) changeHeart();
});
document.querySelector('#shuffle-heart').addEventListener('click', changeHeart);

function updatePlayback() {
  heart.classList.toggle('is-paused', paused || dialog.open || document.hidden);
  heart.classList.toggle('is-reduced', reducedMotion.matches);
  document.querySelector('#toggle-heart').setAttribute('aria-pressed', String(paused));
  document.querySelector('#pause-icon').textContent = paused ? '▷' : 'Ⅱ';
  document.querySelector('#pause-label').textContent = paused ? '继续心跳' : '暂停心跳';
}
document.querySelector('#toggle-heart').addEventListener('click', () => {
  paused = !paused;
  updatePlayback();
});
document.addEventListener('visibilitychange', updatePlayback);
reducedMotion.addEventListener('change', updatePlayback);
updatePlayback();

document.querySelectorAll('.photo-count').forEach(element => element.textContent = photos.length);

function displayPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  const photo = photos[currentPhoto];
  viewerImage.src = photo.src;
  viewerImage.alt = `我们的回忆 ${photo.id}`;
  document.querySelector('#viewer-counter').textContent = `${photo.id} / ${String(photos.length).padStart(3, '0')}`;
  document.querySelector('#viewer-caption').textContent = `心动片刻 · ${photo.id}`;
  // 提前加载相邻两张，连续翻阅时更流畅。
  [-1, 1].forEach(step => {
    const image = new Image();
    image.src = photos[(currentPhoto + step + photos.length) % photos.length].src;
  });
}
function openViewer(index, trigger) {
  returnFocus = trigger;
  displayPhoto(index);
  dialog.showModal();
  document.body.classList.add('viewer-open');
  updatePlayback();
  document.querySelector('#close-viewer').focus();
}
document.querySelector('#close-viewer').addEventListener('click', () => dialog.close());
document.querySelector('#prev-photo').addEventListener('click', () => displayPhoto(currentPhoto - 1));
document.querySelector('#next-photo').addEventListener('click', () => displayPhoto(currentPhoto + 1));
dialog.addEventListener('close', () => {
  document.body.classList.remove('viewer-open');
  updatePlayback();
  returnFocus?.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
document.addEventListener('keydown', event => {
  if (!dialog.open) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); displayPhoto(currentPhoto - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); displayPhoto(currentPhoto + 1); }
});
let touchX = 0;
let touchY = 0;
viewerImage.addEventListener('touchstart', event => {
  touchX = event.changedTouches[0].clientX;
  touchY = event.changedTouches[0].clientY;
}, { passive: true });
viewerImage.addEventListener('touchend', event => {
  const dx = event.changedTouches[0].clientX - touchX;
  const dy = event.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) displayPhoto(currentPhoto + (dx < 0 ? 1 : -1));
}, { passive: true });

