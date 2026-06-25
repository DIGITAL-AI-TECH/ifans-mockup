/**
 * ifans — Simulação de App (Mockup Interativo)
 * Estado compartilhado entre todas as telas
 */

const App = (() => {
  // ─── Estado global ───
  const state = {
    user: {
      id: 1,
      nome: 'Você',
      handle: 'voce',
      avatar: null,
      ehCriador: false,
    },
    creditos: 1250,
    notificacoes: 3,
    mensagensNaoLidas: 2,
    seguindo: new Set(['sofia', 'luna', 'emma']),
    curtidos: new Set(['p1', 'p3', 'p5']),
    salvos: new Set(['p1']),
    assinando: new Set(),
    desbloqueados: new Set(),
    tema: localStorage.getItem('ifans-tema') || 'dark',
  };

  // ─── Tema ───
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    state.tema = tema;
    localStorage.setItem('ifans-tema', tema);
    const btns = document.querySelectorAll('.btn-tema');
    btns.forEach(btn => {
      btn.setAttribute('aria-label', tema === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
      btn.innerHTML = tema === 'dark'
        ? `<img src="icons/eye.svg" width="20" height="20" alt="">`
        : `<img src="icons/eye.svg" width="20" height="20" alt="" style="filter:invert(1)">`;
    });
  }

  function toggleTema() {
    aplicarTema(state.tema === 'dark' ? 'light' : 'dark');
  }

  // ─── Créditos ───
  function atualizarExibicaoCreditos() {
    document.querySelectorAll('[data-creditos]').forEach(el => {
      el.textContent = state.creditos.toLocaleString('pt-BR');
    });
  }

  function gastarCreditos(valor) {
    if (state.creditos < valor) return false;
    state.creditos -= valor;
    atualizarExibicaoCreditos();
    mostrarToast(`-${valor} créditos`, 'info');
    return true;
  }

  function adicionarCreditos(valor) {
    state.creditos += valor;
    atualizarExibicaoCreditos();
    mostrarToast(`+${valor} créditos adicionados! 🎉`, 'success');
  }

  // ─── Curtidas ───
  function toggleCurtida(postId, el) {
    const counter = el.closest('.post-actions')?.querySelector(`[data-counter="${postId}"]`);
    const icon = el.querySelector('img') || el;

    if (state.curtidos.has(postId)) {
      state.curtidos.delete(postId);
      el.classList.remove('ativo');
      if (counter) {
        const atual = parseInt(counter.textContent.replace(/\D/g, '')) || 0;
        counter.textContent = formatarContador(atual - 1);
      }
    } else {
      state.curtidos.add(postId);
      el.classList.add('ativo');
      animarCurtida(el);
      if (counter) {
        const atual = parseInt(counter.textContent.replace(/\D/g, '')) || 0;
        counter.textContent = formatarContador(atual + 1);
      }
    }
  }

  function animarCurtida(el) {
    const burst = document.createElement('span');
    burst.className = 'curtida-burst';
    burst.textContent = '❤️';
    el.style.position = 'relative';
    el.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
  }

  // ─── Seguir ───
  function toggleSeguir(handle, btn) {
    if (state.seguindo.has(handle)) {
      state.seguindo.delete(handle);
      btn.textContent = 'Seguir';
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');
    } else {
      state.seguindo.add(handle);
      btn.textContent = 'Seguindo';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-ghost');
    }
  }

  // ─── Salvar ───
  function toggleSalvar(postId, btn) {
    if (state.salvos.has(postId)) {
      state.salvos.delete(postId);
      btn.classList.remove('ativo');
      btn.setAttribute('aria-label', 'Salvar');
    } else {
      state.salvos.add(postId);
      btn.classList.add('ativo');
      btn.setAttribute('aria-label', 'Salvo');
      mostrarToast('Salvo na sua coleção', 'success');
    }
  }

  // ─── Desbloquear post ───
  function desbloquearPost(postId, custo, el) {
    if (state.desbloqueados.has(postId)) return;
    abrirModalDesbloquear(postId, custo, el);
  }

  function confirmarDesbloqueio(postId, custo, overlay) {
    if (!gastarCreditos(custo)) {
      mostrarToast('Créditos insuficientes. Compre mais créditos.', 'erro');
      return;
    }
    state.desbloqueados.add(postId);
    // Remove blur overlay
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);
    mostrarToast('Conteúdo desbloqueado! 🔓', 'success');
  }

  // ─── Assinar criador ───
  function assinarCriador(handle, custo, btn) {
    if (state.assinando.has(handle)) {
      // Cancelar assinatura
      abrirConfirmacao(
        'Cancelar assinatura?',
        `Você perderá acesso ao conteúdo exclusivo de @${handle}.`,
        () => {
          state.assinando.delete(handle);
          btn.textContent = `Assinar · ${custo} créditos/mês`;
          btn.classList.remove('btn-ghost');
          btn.classList.add('btn-secondary');
          mostrarToast('Assinatura cancelada', 'info');
        }
      );
    } else {
      abrirModalAssinatura(handle, custo, btn);
    }
  }

  // ─── Enviar gorjeta ───
  function abrirModalGorjeta(handle) {
    const modal = document.getElementById('modal-gorjeta');
    if (!modal) return criarModalGorjeta(handle);
    modal.style.display = 'flex';
    modal.setAttribute('data-handle', handle);
  }

  function criarModalGorjeta(handle) {
    const modal = document.createElement('div');
    modal.id = 'modal-gorjeta';
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Enviar gorjeta para @${handle}`);
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-titulo">Enviar gorjeta 💰</h2>
          <button class="btn-fechar" onclick="App.fecharModal('modal-gorjeta')" aria-label="Fechar">×</button>
        </div>
        <p class="modal-subtitulo">Para @${handle}</p>
        <div class="gorjeta-opcoes">
          ${[5, 10, 25, 50, 100].map(v => `
            <button class="btn btn-outline gorjeta-valor" onclick="this.closest('.gorjeta-opcoes').querySelectorAll('.gorjeta-valor').forEach(b=>b.classList.remove('ativo'));this.classList.add('ativo');document.getElementById('gorjeta-custom').value='${v}'">
              ${v} créditos
            </button>
          `).join('')}
        </div>
        <div class="input-grupo">
          <label class="input-label" for="gorjeta-custom">Outro valor</label>
          <input id="gorjeta-custom" type="number" min="1" max="9999" placeholder="Ex: 30" class="input-field">
        </div>
        <div class="input-grupo">
          <label class="input-label" for="gorjeta-msg">Mensagem (opcional)</label>
          <input id="gorjeta-msg" type="text" placeholder="Adorei o conteúdo! ❤️" class="input-field">
        </div>
        <div class="modal-footer">
          <p class="saldo-info">Seu saldo: <strong data-creditos>${state.creditos.toLocaleString('pt-BR')}</strong> créditos</p>
          <button class="btn btn-secondary btn-full" onclick="App._confirmarGorjeta('${handle}')">Enviar gorjeta</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal('modal-gorjeta'); });
    document.body.appendChild(modal);
  }

  function _confirmarGorjeta(handle) {
    const valor = parseInt(document.getElementById('gorjeta-custom')?.value) || 0;
    if (!valor || valor < 1) { mostrarToast('Informe o valor da gorjeta', 'erro'); return; }
    if (!gastarCreditos(valor)) { mostrarToast('Créditos insuficientes', 'erro'); return; }
    fecharModal('modal-gorjeta');
    mostrarToast(`Gorjeta de ${valor} créditos enviada para @${handle}! 🎉`, 'success');
  }

  // ─── Modais ───
  function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => { modal.style.display = 'none'; modal.style.opacity = ''; }, 200);
    }
  }

  function abrirModalDesbloquear(postId, custo, overlayEl) {
    const existente = document.getElementById('modal-desbloquear');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-desbloquear';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-titulo">🔓 Desbloquear conteúdo</h2>
          <button class="btn-fechar" onclick="App.fecharModal('modal-desbloquear')" aria-label="Fechar">×</button>
        </div>
        <p class="modal-subtitulo">Este é um conteúdo exclusivo pay-per-view.</p>
        <div class="desbloqueio-custo">
          <span class="custo-valor">${custo}</span>
          <span class="custo-label">créditos</span>
        </div>
        <p class="saldo-info">Seu saldo: <strong data-creditos>${state.creditos.toLocaleString('pt-BR')}</strong> créditos</p>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="App.fecharModal('modal-desbloquear')">Cancelar</button>
          <button class="btn btn-secondary" onclick="App._confirmarDesbloqueio('${postId}', ${custo})">Desbloquear agora</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal('modal-desbloquear'); });
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.style.opacity = '1');
  }

  function _confirmarDesbloqueio(postId, custo) {
    if (!gastarCreditos(custo)) { mostrarToast('Créditos insuficientes. Compre mais créditos.', 'erro'); return; }
    fecharModal('modal-desbloquear');
    state.desbloqueados.add(postId);
    // Remove overlay do post
    const overlay = document.querySelector(`[data-post-id="${postId}"] .post-locked-overlay`);
    if (overlay) {
      overlay.style.transition = 'opacity 0.5s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }
    mostrarToast('Conteúdo desbloqueado! 🔓', 'success');
  }

  function abrirModalAssinatura(handle, custo, btn) {
    const existente = document.getElementById('modal-assinatura');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-assinatura';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-titulo">⭐ Assinar @${handle}</h2>
          <button class="btn-fechar" onclick="App.fecharModal('modal-assinatura')" aria-label="Fechar">×</button>
        </div>
        <div class="assinatura-beneficios">
          <p class="beneficio-item">✅ Acesso a todo o conteúdo exclusivo</p>
          <p class="beneficio-item">✅ Mensagens diretas sem limites</p>
          <p class="beneficio-item">✅ Conteúdo novo antes dos outros</p>
          <p class="beneficio-item">✅ Cancele quando quiser</p>
        </div>
        <div class="desbloqueio-custo">
          <span class="custo-valor">${custo}</span>
          <span class="custo-label">créditos/mês</span>
        </div>
        <p class="saldo-info">Seu saldo: <strong data-creditos>${state.creditos.toLocaleString('pt-BR')}</strong> créditos</p>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="App.fecharModal('modal-assinatura')">Agora não</button>
          <button class="btn btn-secondary btn-full" onclick="App._confirmarAssinatura('${handle}', ${custo})">Assinar agora</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal('modal-assinatura'); });
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.style.opacity = '1');
  }

  function _confirmarAssinatura(handle, custo) {
    if (!gastarCreditos(custo)) { mostrarToast('Créditos insuficientes. Compre mais créditos.', 'erro'); return; }
    fecharModal('modal-assinatura');
    state.assinando.add(handle);
    // Atualiza botão de assinar se existir
    const btnAssinar = document.querySelector(`[data-assinar="${handle}"]`);
    if (btnAssinar) {
      btnAssinar.textContent = 'Assinando ✓';
      btnAssinar.classList.remove('btn-secondary');
      btnAssinar.classList.add('btn-ghost');
    }
    mostrarToast(`Você agora assina @${handle}! 🌟`, 'success');
  }

  function abrirConfirmacao(titulo, mensagem, onConfirmar) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-confirmacao';
    modal.innerHTML = `
      <div class="modal-content modal-sm">
        <h2 class="modal-titulo">${titulo}</h2>
        <p class="modal-subtitulo">${mensagem}</p>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="App.fecharModal('modal-confirmacao')">Cancelar</button>
          <button class="btn btn-destructive" id="btn-confirmar">Confirmar</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal('modal-confirmacao'); });
    document.body.appendChild(modal);
    document.getElementById('btn-confirmar').onclick = () => {
      fecharModal('modal-confirmacao');
      onConfirmar();
    };
    requestAnimationFrame(() => modal.style.opacity = '1');
  }

  // ─── Share Sheet ───
  function abrirCompartilhar(titulo, url) {
    const existente = document.getElementById('share-sheet');
    if (existente) existente.remove();

    const sheet = document.createElement('div');
    sheet.id = 'share-sheet';
    sheet.className = 'bottom-sheet-overlay';
    sheet.innerHTML = `
      <div class="bottom-sheet">
        <div class="bottom-sheet-handle"></div>
        <h3 class="bottom-sheet-titulo">Compartilhar</h3>
        <div class="share-opcoes">
          <button class="share-opcao" onclick="App.fecharModal('share-sheet');App.mostrarToast('Link copiado! 📋','success')">
            <span class="share-icon">🔗</span> Copiar link
          </button>
          <button class="share-opcao" onclick="App.fecharModal('share-sheet')">
            <span class="share-icon">💬</span> Enviar mensagem
          </button>
          <button class="share-opcao" onclick="App.fecharModal('share-sheet')">
            <span class="share-icon">📸</span> Compartilhar nos Stories
          </button>
          <button class="share-opcao" onclick="App.fecharModal('share-sheet')">
            <span class="share-icon">📤</span> Compartilhar fora do app
          </button>
        </div>
        <button class="btn btn-outline btn-full" onclick="App.fecharModal('share-sheet')">Cancelar</button>
      </div>
    `;
    sheet.addEventListener('click', (e) => { if (e.target === sheet) fecharModal('share-sheet'); });
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('aberto'));
  }

  function fecharBottomSheet(id) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.remove('aberto');
    setTimeout(() => sheet.remove(), 300);
  }

  // ─── Toast ───
  function mostrarToast(mensagem, tipo = 'info') {
    const toastArea = document.getElementById('toast-area') || criarToastArea();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toastArea.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visivel'));
    setTimeout(() => {
      toast.classList.remove('visivel');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function criarToastArea() {
    const area = document.createElement('div');
    area.id = 'toast-area';
    document.body.appendChild(area);
    return area;
  }

  // ─── Comentários ───
  function enviarComentario(inputId, listaId) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    if (!input || !lista || !input.value.trim()) return;
    const texto = input.value.trim();
    input.value = '';

    const item = document.createElement('div');
    item.className = 'comentario-item novo';
    item.innerHTML = `
      <div class="comentario-avatar avatar avatar-sm">
        <span class="avatar-iniciais" style="background: var(--color-brand-primary)">VC</span>
      </div>
      <div class="comentario-corpo">
        <div class="comentario-header">
          <strong>Você</strong>
          <span class="comentario-tempo">agora</span>
        </div>
        <p class="comentario-texto">${texto.replace(/</g, '&lt;')}</p>
        <div class="comentario-acoes">
          <button class="btn-comentario-acao" onclick="App.mostrarToast('Resposta em breve...','info')">Responder</button>
          <button class="btn-comentario-curtida" onclick="this.classList.toggle('ativo')">
            <img src="icons/heart.svg" width="12" height="12" alt=""> 0
          </button>
        </div>
      </div>
    `;
    lista.prepend(item);
    requestAnimationFrame(() => item.classList.remove('novo'));
  }

  // ─── Navegação ativa no bottom nav ───
  function marcarNavAtiva() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const mapa = {
      'feed.html': 'feed',
      'discover.html': 'discover',
      'messages.html': 'messages',
      'notifications.html': 'notifications',
      'settings.html': 'profile',
      'wallet.html': 'profile',
      'credits.html': 'profile',
      'search.html': 'discover',
      'profile.html': 'profile',
      'creator-dashboard.html': 'profile',
    };
    const ativa = mapa[path] || 'feed';
    document.querySelectorAll('.bottom-nav-tab').forEach(tab => {
      tab.classList.toggle('ativo', tab.dataset.tab === ativa);
      tab.setAttribute('aria-current', tab.dataset.tab === ativa ? 'page' : 'false');
    });
  }

  // ─── Formatação ───
  function formatarContador(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return n.toString();
  }

  // ─── Init ───
  function init() {
    aplicarTema(state.tema);
    atualizarExibicaoCreditos();
    marcarNavAtiva();

    // Notificação badge
    document.querySelectorAll('[data-notif-badge]').forEach(el => {
      if (state.notificacoes > 0) {
        el.textContent = state.notificacoes;
        el.style.display = 'flex';
      }
    });

    // Messages badge
    document.querySelectorAll('[data-msg-badge]').forEach(el => {
      if (state.mensagensNaoLidas > 0) {
        el.textContent = state.mensagensNaoLidas;
        el.style.display = 'flex';
      }
    });

    // Botões de tema
    document.querySelectorAll('.btn-tema').forEach(btn => {
      btn.addEventListener('click', toggleTema);
    });

    // Curtidas já curtidas
    state.curtidos.forEach(id => {
      const btn = document.querySelector(`[data-curtir="${id}"]`);
      if (btn) btn.classList.add('ativo');
    });

    // Salvos
    state.salvos.forEach(id => {
      const btn = document.querySelector(`[data-salvar="${id}"]`);
      if (btn) btn.classList.add('ativo');
    });

    // Seguindo
    state.seguindo.forEach(handle => {
      const btn = document.querySelector(`[data-seguir="${handle}"]`);
      if (btn) {
        btn.textContent = 'Seguindo';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
      }
    });
  }

  // ─── API pública ───
  return {
    state,
    init,
    toggleTema,
    toggleCurtida,
    toggleSeguir,
    toggleSalvar,
    desbloquearPost,
    _confirmarDesbloqueio,
    assinarCriador,
    _confirmarAssinatura,
    abrirModalGorjeta,
    _confirmarGorjeta,
    abrirCompartilhar,
    fecharModal,
    fecharBottomSheet,
    mostrarToast,
    enviarComentario,
    adicionarCreditos,
    gastarCreditos,
    formatarContador,
  };
})();

// Auto-inicializar
document.addEventListener('DOMContentLoaded', App.init);

/* ═══════════════════════════════════════════════════
   FEED VIEWER — grid thumb → fullscreen reel
   ═══════════════════════════════════════════════════ */
const FeedViewer = (() => {
  const MOCK_CREATORS = [
    { initial: 'A', name: 'Ana Lima', tier: 'Creator', tierColor: '#FD296C', bg: 'linear-gradient(135deg,#442AC0,#1B1158)', likes: '1.2k', comments: '48', caption: 'Novo ensaio disponível para assinantes!' },
    { initial: 'R', name: 'Rafa Alves', tier: 'VIP', tierColor: '#F59E0B', bg: 'linear-gradient(135deg,#281A80,#442AC0)', likes: '2.1k', comments: '73', caption: 'Qual tema vocês querem pro próximo ensaio?' },
    { initial: 'C', name: 'Carol M.', tier: null, bg: 'linear-gradient(135deg,#FD296C,#442AC0)', likes: '892', comments: '31', caption: 'Sessão de hoje ficou incrível! Obrigada a todos 💜' },
    { initial: 'K', name: 'Kris', tier: 'Creator', tierColor: '#FD296C', bg: 'linear-gradient(135deg,#6B4FEB,#442AC0)', likes: '3.4k', comments: '112', caption: 'Live amanhã às 20h — vem me assistir!' },
    { initial: 'L', name: 'Lara', tier: null, bg: 'linear-gradient(135deg,#1B4332,#40916C)', likes: '445', comments: '19', caption: 'Domingo é dia de conteúdo novo 🌿' },
  ];

  function buildReelItem(creator, index) {
    const tierBadge = creator.tier
      ? `<span class="post-card-tier-badge" style="background:${creator.tierColor}">${creator.tier}</span>`
      : '';
    return `
      <div class="reel-item" data-reel-index="${index}">
        <div class="reel-media">
          <div class="post-card-media-bg" style="background:${creator.bg}"></div>
        </div>
        <div class="reel-gradient-overlay"></div>
        <div class="reel-sidebar">
          <div class="reel-sidebar-creator">
            <div class="avatar-initials avatar-md ring-creator" style="font-size:16px">${creator.initial}</div>
            <button class="reel-subscribe-btn" aria-label="Assinar ${creator.name}">+</button>
          </div>
          <button class="reel-action-btn" aria-label="Curtir">
            <img src="icons/heart.svg" alt="" aria-hidden="true" style="width:26px;height:26px;filter:brightness(0) invert(1)">
            <span>${creator.likes}</span>
          </button>
          <button class="reel-action-btn" aria-label="Comentar">
            <img src="icons/message.svg" alt="" aria-hidden="true" style="width:26px;height:26px;filter:brightness(0) invert(1)">
            <span>${creator.comments}</span>
          </button>
          <button class="reel-action-btn" aria-label="Gorjeta">
            <img src="icons/zap.svg" alt="" aria-hidden="true" style="width:26px;height:26px;filter:brightness(0) invert(1)">
          </button>
          <button class="reel-action-btn" aria-label="Compartilhar">
            <img src="icons/share.svg" alt="" aria-hidden="true" style="width:26px;height:26px;filter:brightness(0) invert(1)">
          </button>
        </div>
        <div class="reel-footer">
          <div class="reel-creator-name">${creator.name} ${tierBadge}</div>
          <p class="reel-caption">${creator.caption}</p>
        </div>
      </div>`;
  }

  function open(thumbIndex) {
    const dialog = document.getElementById('feedViewer');
    if (!dialog) return;
    const reel = dialog.querySelector('.feed-viewer-reel');

    // Substituir reel com versão dinâmica baseada no index clicado
    const items = MOCK_CREATORS.map((c, i) => buildReelItem(c, i)).join('');
    reel.innerHTML = items;

    dialog.showModal();
    document.body.style.overflow = 'hidden';

    // Scroll para o item correspondente
    const targetIndex = thumbIndex % MOCK_CREATORS.length;
    const targetItem = reel.children[targetIndex];
    if (targetItem) {
      requestAnimationFrame(() => {
        targetItem.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }

    // Fechar ao clicar no backdrop
    dialog.addEventListener('click', function backdropClose(e) {
      if (e.target === dialog) {
        FeedViewer.close();
        dialog.removeEventListener('click', backdropClose);
      }
    }, { once: true });
  }

  function close() {
    const dialog = document.getElementById('feedViewer');
    if (dialog && dialog.open) {
      dialog.close();
      document.body.style.overflow = '';
    }
  }

  return { open, close };
})();

/* ═══════════════════════════════════════════════════
   FEED GRID — click handlers + infinite scroll
   ═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Bind click nos thumbs iniciais
  function bindThumbClicks() {
    document.querySelectorAll('.grid-thumb:not(.grid-thumb--skeleton)').forEach((thumb, i) => {
      if (!thumb.dataset.bound) {
        thumb.dataset.bound = '1';
        thumb.addEventListener('click', () => {
          const idx = parseInt(thumb.dataset.index ?? i, 10);
          FeedViewer.open(idx);
        });
      }
    });
  }
  bindThumbClicks();

  // Fechar viewer com Escape (já nativo no <dialog>, mas garantir body overflow)
  document.getElementById('feedViewer')?.addEventListener('close', () => {
    document.body.style.overflow = '';
  });

  // ── Infinite Scroll ──
  const grid = document.querySelector('.feed-grid');
  const sentinel = document.querySelector('.feed-sentinel');
  if (!grid || !sentinel) return;

  let batchCount = 0;
  const MORE_CREATORS = [
    { initial: 'S', name: 'Sofia', bg: 'linear-gradient(135deg,#E01256,#442AC0)', likes: '5.1k', icon: 'heart' },
    { initial: 'M', name: 'Maya', bg: 'linear-gradient(135deg,#3422A0,#FD296C)', likes: '987', icon: 'heart' },
    { initial: 'T', name: 'Tati', bg: 'linear-gradient(135deg,#442AC0,#281A80)', likes: '2.3k', icon: 'heart' },
    { initial: 'P', name: 'Pri', bg: 'linear-gradient(135deg,#FD296C,#1B1158)', likes: '734', icon: 'heart' },
    { initial: 'V', name: 'Vic', bg: 'linear-gradient(135deg,#0D4C92,#3422A0)', likes: '1.6k', icon: 'heart' },
    { initial: 'G', name: 'Gabi', bg: 'linear-gradient(135deg,#5E54B8,#FD296C)', likes: '441', icon: 'heart' },
  ];

  function loadMoreThumbs() {
    if (batchCount >= 3) { observer.disconnect(); return; } // max 3 batches no mockup

    // Inserir 4 skeletons imediatamente
    const skeletons = [];
    for (let i = 0; i < 4; i++) {
      const sk = document.createElement('div');
      sk.className = 'grid-thumb grid-thumb--skeleton';
      sk.setAttribute('aria-hidden', 'true');
      grid.insertBefore(sk, sentinel);
      skeletons.push(sk);
    }

    // Substituir skeletons por thumbs reais após 800ms
    setTimeout(() => {
      const baseIndex = 9 + (batchCount * 6);
      skeletons.forEach((sk, i) => {
        const c = MORE_CREATORS[(batchCount * 4 + i) % MORE_CREATORS.length];
        const thumbIndex = baseIndex + i;
        sk.className = 'grid-thumb';
        sk.setAttribute('role', 'listitem');
        sk.setAttribute('aria-label', `Post de ${c.name}, ${c.likes} curtidas`);
        sk.setAttribute('data-index', thumbIndex);
        sk.removeAttribute('aria-hidden');
        sk.innerHTML = `
          <div class="grid-thumb-media">
            <div class="post-card-media-bg" style="background:${c.bg}"></div>
          </div>
          <div class="grid-thumb-footer">
            <div class="grid-thumb-creator">
              <div class="avatar-initials avatar-xs" style="font-size:10px">${c.initial}</div>
              <span class="grid-thumb-creator-name">${c.name}</span>
            </div>
            <div class="grid-thumb-stats">
              <img src="icons/heart.svg" alt="" aria-hidden="true" style="width:12px;height:12px;filter:brightness(0) invert(1)">
              <span>${c.likes}</span>
            </div>
          </div>`;
        sk.addEventListener('click', () => FeedViewer.open(thumbIndex));
      });
      batchCount++;
    }, 800);
  }

  const observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) loadMoreThumbs(); },
    { rootMargin: '200px' }
  );
  observer.observe(sentinel);
});

/* ═══════════════════════════════════════════════════
   FEED HOME — infinite scroll de post-cards
   ═══════════════════════════════════════════════════ */
(function () {
  const sentinel = document.getElementById('feedSentinel');
  if (!sentinel) return; // só roda no feed.html

  const list = document.getElementById('feedPostList');
  let feedBatch = 0;

  const MORE_POSTS = [
    { initial: 'K', name: 'Kris', badge: 'Premium', badgeColor: '#6B4FEB', bg: 'linear-gradient(135deg,#6B4FEB,#281A80)', likes: '3.4k', comments: '72', time: 'ha 14h', caption: 'Novo set de fotos disponivel!' },
    { initial: 'L', name: 'Lara', badge: 'Creator', badgeColor: '#FD296C', bg: 'linear-gradient(135deg,#47409A,#1B1158)', likes: '987', comments: '23', time: 'ha 18h', caption: 'Bastidores da semana!' },
    { initial: 'M', name: 'Maya', badge: 'Creator', badgeColor: '#FD296C', bg: 'linear-gradient(135deg,#3422A0,#FD296C)', likes: '1.5k', comments: '55', time: 'ha 22h', caption: 'Boa noite pessoal!' },
  ];

  function buildPostCard(p) {
    return `<article class="post-card">
      <div class="post-card-header">
        <div class="avatar-initials avatar-md" style="font-size:16px">${p.initial}</div>
        <div class="post-card-creator-info">
          <div class="post-card-creator-name">${p.name} <span class="post-card-tier-badge" style="background:${p.badgeColor}">${p.badge}</span></div>
          <div class="post-card-time">${p.time}</div>
        </div>
        <button class="post-card-menu-btn" aria-label="Opcoes"><img src="icons/ellipsis-h.svg" alt="" aria-hidden="true"></button>
      </div>
      <div class="post-card-media"><div class="post-card-media-bg" style="background:${p.bg}"></div></div>
      <div class="post-card-actions">
        <button class="post-card-action-btn" aria-label="Curtir"><img src="icons/heart.svg" alt="" aria-hidden="true" style="width:20px;height:20px;opacity:0.55"><span>${p.likes}</span></button>
        <button class="post-card-action-btn" aria-label="Comentar"><img src="icons/message.svg" alt="" aria-hidden="true" style="width:20px;height:20px;opacity:0.55"><span>${p.comments}</span></button>
        <button class="post-card-action-btn" aria-label="Gorjeta"><img src="icons/zap.svg" alt="" aria-hidden="true" style="width:20px;height:20px;opacity:0.55"><span>Gorjeta</span></button>
        <span class="post-card-action-spacer"></span>
        <button class="post-card-action-btn" aria-label="Compartilhar"><img src="icons/share.svg" alt="" aria-hidden="true" style="width:20px;height:20px;opacity:0.55"></button>
      </div>
      <div class="post-card-footer">
        <div class="post-card-likes">${p.likes} curtidas</div>
        <p class="post-card-caption"><strong>${p.name}</strong> ${p.caption}</p>
        <div class="post-card-comments">Ver todos os ${p.comments} comentarios</div>
      </div>
    </article>`;
  }

  function loadMorePosts() {
    if (feedBatch >= 2) { feedObserver.disconnect(); return; }
    const post = MORE_POSTS[feedBatch % MORE_POSTS.length];
    const el = document.createElement('div');
    el.innerHTML = buildPostCard(post);
    list.insertBefore(el.firstElementChild, sentinel);
    feedBatch++;
  }

  const feedObserver = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) loadMorePosts(); },
    { rootMargin: '200px' }
  );
  feedObserver.observe(sentinel);
})();

/* ═══════════════════════════════════════════════════
   DISCOVER — toggle Conteúdo | Criadores
   ═══════════════════════════════════════════════════ */
function toggleDiscoverView(view) {
  const content = document.getElementById('discoverViewContent');
  const creators = document.getElementById('discoverViewCreators');
  const tabContent = document.getElementById('discoverTabContent');
  const tabCreators = document.getElementById('discoverTabCreators');
  if (!content || !creators) return;

  if (view === 'content') {
    content.style.display = '';
    creators.style.display = 'none';
    tabContent.classList.add('ativo');   tabContent.setAttribute('aria-selected', 'true');
    tabCreators.classList.remove('ativo'); tabCreators.setAttribute('aria-selected', 'false');
  } else {
    content.style.display = 'none';
    creators.style.display = '';
    tabCreators.classList.add('ativo');  tabCreators.setAttribute('aria-selected', 'true');
    tabContent.classList.remove('ativo'); tabContent.setAttribute('aria-selected', 'false');
  }
}

/* ═══════════════════════════════════════════════════
   DISCOVER VIEWER — grid-thumb click + viewer dialog
   ═══════════════════════════════════════════════════ */
const DiscoverViewer = (() => {
  const DISC_CREATORS = [
    { initial: 'A', name: 'Ana Lima', badge: 'Creator', badgeColor: '#FD296C', bg: 'linear-gradient(135deg,#442AC0,#1B1158)', likes: '1.2k', comments: '48' },
    { initial: 'B', name: 'Bia Santos', badge: 'Premium', badgeColor: null, bg: 'linear-gradient(135deg,#1B1158,#0D0B1E)', locked: true, price: '50 cr.' },
    { initial: 'C', name: 'Carol M.', badge: 'Creator', badgeColor: '#FD296C', bg: 'linear-gradient(135deg,#FD296C,#442AC0)', likes: '892', comments: '31' },
    { initial: 'K', name: 'Kris', badge: 'Premium', badgeColor: '#6B4FEB', bg: 'linear-gradient(135deg,#6B4FEB,#281A80)', likes: '3.4k', comments: '72' },
    { initial: 'L', name: 'Lara', badge: 'Creator', badgeColor: '#FD296C', bg: 'linear-gradient(135deg,#47409A,#1B1158)', likes: '621', comments: '14' },
    { initial: 'R', name: 'Rafa Alves', badge: 'VIP', badgeColor: '#F59E0B', bg: 'linear-gradient(135deg,#281A80,#442AC0)', likes: '2.1k', comments: '127' },
  ];

  function buildReelItem(c) {
    if (c.locked) {
      return `<div class="reel-item reel-item--locked">
        <div class="reel-media"><div class="post-card-media-bg" style="background:${c.bg}"></div></div>
        <div class="reel-gradient-overlay"></div>
        <div class="reel-ppv-cta">
          <img src="icons/lock.svg" alt="" style="width:40px;height:40px;filter:brightness(0) invert(1)">
          <button class="reel-ppv-unlock-btn"><img src="icons/coins.svg" alt="" style="width:18px;height:18px;filter:brightness(0) invert(1)"> Desbloquear — ${c.price}</button>
        </div>
        <div class="reel-sidebar">
          <div class="reel-sidebar-creator"><div class="avatar-initials avatar-md ring-premium" style="font-size:16px;background:#3422A0">${c.initial}</div><button class="reel-subscribe-btn" aria-label="Assinar ${c.name}">+</button></div>
        </div>
        <div class="reel-footer"><div class="reel-creator-name">${c.name}</div></div>
      </div>`;
    }
    return `<div class="reel-item">
      <div class="reel-media"><div class="post-card-media-bg" style="background:${c.bg}"></div></div>
      <div class="reel-gradient-overlay"></div>
      <div class="reel-sidebar">
        <div class="reel-sidebar-creator"><div class="avatar-initials avatar-md" style="font-size:16px">${c.initial}</div><button class="reel-subscribe-btn" aria-label="Assinar ${c.name}">+</button></div>
        <button class="reel-action-btn" aria-label="Curtir"><img src="icons/heart.svg" alt="" style="width:26px;height:26px;filter:brightness(0) invert(1)"><span>${c.likes}</span></button>
        <button class="reel-action-btn" aria-label="Comentar"><img src="icons/message.svg" alt="" style="width:26px;height:26px;filter:brightness(0) invert(1)"><span>${c.comments}</span></button>
        <button class="reel-action-btn" aria-label="Gorjeta"><img src="icons/zap.svg" alt="" style="width:26px;height:26px;filter:brightness(0) invert(1)"></button>
        <button class="reel-action-btn" aria-label="Compartilhar"><img src="icons/share.svg" alt="" style="width:26px;height:26px;filter:brightness(0) invert(1)"></button>
      </div>
      <div class="reel-footer"><div class="reel-creator-name">${c.name} <span class="post-card-tier-badge" style="background:${c.badgeColor}">${c.badge}</span></div></div>
    </div>`;
  }

  function open(idx) {
    const dialog = document.getElementById('discoverViewer');
    if (!dialog) return;
    const reel = document.getElementById('discoverViewerReel');
    reel.innerHTML = DISC_CREATORS.map(c => buildReelItem(c)).join('');
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    const items = reel.querySelectorAll('.reel-item');
    if (items[idx]) items[idx].scrollIntoView({ behavior: 'instant' });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }, { once: true });
  }

  function close() {
    const dialog = document.getElementById('discoverViewer');
    if (dialog && dialog.open) { dialog.close(); document.body.style.overflow = ''; }
  }

  return { open, close };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Bind thumbs do discover
  document.querySelectorAll('#discoverViewContent .grid-thumb').forEach((thumb, i) => {
    thumb.addEventListener('click', () => DiscoverViewer.open(i));
  });
  document.getElementById('discoverViewer')?.addEventListener('close', () => { document.body.style.overflow = ''; });
});

/* ═══════════════════════════════════════════════════
   PROFILE — toggle Grid | Feed
   ═══════════════════════════════════════════════════ */
function toggleProfileView(view) {
  const gridView = document.getElementById('profileViewGrid');
  const feedView = document.getElementById('profileViewFeed');
  const btnGrid = document.getElementById('profileBtnGrid');
  const btnFeed = document.getElementById('profileBtnFeed');
  if (!gridView || !feedView) return;

  const brandPrimary = 'var(--color-brand-primary)';
  const bgSec = 'var(--color-bg-secondary)';

  const feedSvg = document.getElementById('profileFeedIcon');
  if (view === 'grid') {
    gridView.style.display = '';
    feedView.style.display = 'none';
    btnGrid.style.background = brandPrimary;
    btnGrid.querySelector('img').style.filter = 'brightness(0) invert(1)';
    btnFeed.style.background = bgSec;
    if (feedSvg) feedSvg.setAttribute('stroke', 'rgba(255,255,255,0.4)');
  } else {
    gridView.style.display = 'none';
    feedView.style.display = '';
    btnFeed.style.background = brandPrimary;
    if (feedSvg) feedSvg.setAttribute('stroke', '#fff');
    btnGrid.style.background = bgSec;
    btnGrid.querySelector('img').style.filter = 'brightness(0) invert(0.4)';
  }
}
