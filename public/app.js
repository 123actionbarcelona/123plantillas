// Estado de la aplicación
let templates = [];
let filteredTemplates = [];
let categories = [];
let tags = [];
let selectedCategory = 'all';
let selectedTags = new Set();
let editingId = null;
let authToken = null;
let currentUser = null;

// Sistema de preload optimizado
let allTags = [];
let allCategories = [];
let preloadComplete = false;

// URL de la API: usar el mismo origen (host:puerto) desde el que se sirve la app
const API_URL = `${window.location.origin}/api`;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

// =================================
// FUNCIONES DE AUTENTICACIÓN
// =================================

// Inicializar autenticación
async function initAuth() {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    authToken = token;
    try {
      const isValid = await verifyToken();
      if (isValid) {
        await showMainApp();
        return;
      }
    } catch (error) {
      console.log('Token inválido, redirigiendo a login');
    }
  }
  
  showLoginScreen();
}

// Verificar token con el servidor
async function verifyToken() {
  try {
    const response = await fetch(`${API_URL}/verify`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Mostrar pantalla de login
function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
  setupLoginListeners();
}

// Mostrar aplicación principal
async function showMainApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  
  // Actualizar info del usuario
  if (currentUser) {
    document.getElementById('userInfo').textContent = currentUser.username;
  }
  
  setupEventListeners();
  
  // Inicializar sistema de preload optimizado
  await initializePreloadSystem();
  
  updateStats();
  
  // Auto-actualizar cada 30 segundos para sincronización
  setInterval(() => {
    loadTemplates(true);
  }, 30000);
}

// Configurar listeners del login
function setupLoginListeners() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Manejar login
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  
  // Mostrar estado de carga
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Iniciando sesión...';
  loginBtn.disabled = true;
  loginError.classList.add('hidden');
  
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Login exitoso
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      
      showToast('Login exitoso', 'success');
      await showMainApp();
    } else {
      // Error en login
      loginError.textContent = data.error;
      loginError.classList.remove('hidden');
    }
  } catch (error) {
    loginError.textContent = 'Error de conexión. Verifica que el servidor esté ejecutándose.';
    loginError.classList.remove('hidden');
  } finally {
    // Restaurar botón
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i><span>Iniciar Sesión</span>';
    loginBtn.disabled = false;
  }
}

// Logout
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  templates = [];
  filteredTemplates = [];
  showLoginScreen();
  showToast('Sesión cerrada exitosamente', 'success');
}

// Obtener headers con autenticación
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

// Manejar errores de autenticación
function handleAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    logout();
    return true;
  }
  return false;
}

// =================================
// CONFIGURACIÓN DE EVENT LISTENERS
// =================================

// Configurar event listeners
function setupEventListeners() {
  // Botón logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Botón gestionar usuarios
  document.getElementById('manageUsersBtn').addEventListener('click', openUserManagement);
  
  // Botón gestionar categorías
  const manageCatBtn = document.getElementById('manageCategoriesBtn');
  if (manageCatBtn) {
    manageCatBtn.addEventListener('click', openCategoriesModal);
    console.log('Event listener añadido a manageCategoriesBtn');
  } else {
    console.error('Botón manageCategoriesBtn no encontrado');
  }
  
  // Botón editor visual
  const editorBtn = document.getElementById('editorBtn');
  if (editorBtn) {
    editorBtn.addEventListener('click', () => {
      window.location.href = 'editor.html';
    });
  }
  
  // Botón gestionar tags
  const manageTagsBtn = document.getElementById('manageTagsBtn');
  if (manageTagsBtn) {
    manageTagsBtn.addEventListener('click', openTagsModal);
  }
  
  // Botón agregar plantilla
  document.getElementById('addTemplateBtn').addEventListener('click', () => {
    openAddModal();
  });
  
  // Botón agregar plantilla desde empty state
  const emptyStateBtn = document.getElementById('emptyStateAddBtn');
  if (emptyStateBtn) {
    emptyStateBtn.addEventListener('click', () => {
      document.getElementById('addTemplateBtn').click();
    });
  }

  // Formulario agregar plantilla
  document.getElementById('addTemplateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    addTemplate();
  });

  // Formulario editar plantilla
  document.getElementById('editTemplateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    updateTemplate();
  });

  // Botones cancelar
  document.getElementById('cancelAddBtn').addEventListener('click', closeAddModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
  
  // Botones cerrar modales
  const closeAddBtn = document.getElementById('closeAddModalBtn');
  if (closeAddBtn) closeAddBtn.addEventListener('click', closeAddModal);
  
  const closeEditBtn = document.getElementById('closeEditModalBtn');
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
  
  const closeCatModalTop = document.getElementById('closeCategoriesModalTop');
  if (closeCatModalTop) closeCatModalTop.addEventListener('click', closeCategoriesModal);
  
  const closeTagsModalTop = document.getElementById('closeTagsModalTop');
  if (closeTagsModalTop) closeTagsModalTop.addEventListener('click', closeTagsModal);
  
  const closeTagsModalBottom = document.getElementById('closeTagsModalBottom');
  if (closeTagsModalBottom) closeTagsModalBottom.addEventListener('click', closeTagsModal);
  
  const closeEditCatBtn = document.getElementById('closeEditCategoryModalBtn');
  if (closeEditCatBtn) closeEditCatBtn.addEventListener('click', closeEditCategoryModal);
  
  const closeEditTagBtn = document.getElementById('closeEditTagModalBtn');
  if (closeEditTagBtn) closeEditTagBtn.addEventListener('click', closeEditTagModal);
  
  // Botones de bulk actions
  const assignCatBulkBtn = document.getElementById('assignCategoryBulkBtn');
  if (assignCatBulkBtn) assignCatBulkBtn.addEventListener('click', assignCategoryBulk);
  
  const deleteBulkBtn = document.getElementById('deleteBulkBtn');
  if (deleteBulkBtn) deleteBulkBtn.addEventListener('click', deleteBulk);
  
  const cancelBulkBtn = document.getElementById('cancelBulkSelectionBtn');
  if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', cancelBulkSelection);
  
  // Quick tag buttons para templateTags
  const addQuickTagBtn = document.getElementById('addQuickTagBtn');
  if (addQuickTagBtn) {
    addQuickTagBtn.addEventListener('click', () => {
      showQuickTagForm('templateTags');
    });
  }
  
  const createQuickTagBtn = document.getElementById('createQuickTagBtn');
  if (createQuickTagBtn) {
    createQuickTagBtn.addEventListener('click', () => {
      createQuickTag('templateTags');
    });
  }
  
  const hideQuickTagBtn = document.getElementById('hideQuickTagBtn');
  if (hideQuickTagBtn) {
    hideQuickTagBtn.addEventListener('click', () => {
      hideQuickTagForm('templateTags');
    });
  }
  
  const quickTagNameInput = document.getElementById('quickTagName-templateTags');
  if (quickTagNameInput) {
    quickTagNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createQuickTag('templateTags');
      }
    });
  }
  
  // Quick tag buttons para editTemplateTags
  const editQuickTagBtn = document.getElementById('editQuickTagBtn');
  if (editQuickTagBtn) {
    editQuickTagBtn.addEventListener('click', () => {
      showQuickTagForm('editTemplateTags');
    });
  }
  
  const createEditQuickTagBtn = document.getElementById('createEditQuickTagBtn');
  if (createEditQuickTagBtn) {
    createEditQuickTagBtn.addEventListener('click', () => {
      createQuickTag('editTemplateTags');
    });
  }
  
  const hideEditQuickTagBtn = document.getElementById('hideEditQuickTagBtn');
  if (hideEditQuickTagBtn) {
    hideEditQuickTagBtn.addEventListener('click', () => {
      hideQuickTagForm('editTemplateTags');
    });
  }
  
  const editQuickTagNameInput = document.getElementById('quickTagName-editTemplateTags');
  if (editQuickTagNameInput) {
    editQuickTagNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createQuickTag('editTemplateTags');
      }
    });
  }

  // Click fuera del modal para cerrar
  document.getElementById('addTemplateModal').addEventListener('click', (e) => {
    if (e.target.id === 'addTemplateModal') {
      closeAddModal();
    }
  });

  document.getElementById('editTemplateModal').addEventListener('click', (e) => {
    if (e.target.id === 'editTemplateModal') {
      closeEditModal();
    }
  });
  
  // Delegación de eventos para elementos dinámicos
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const id = target.dataset.id;
    
    switch(action) {
      case 'showQuickCategoryMenu':
        showQuickCategoryMenu(e, id);
        break;
      case 'editTemplate':
        editTemplate(id);
        break;
      case 'editTemplate-visual':
        window.location.href = `editor.html?edit=${id}`;
        break;
      case 'deleteTemplate':
        deleteTemplate(id);
        break;
      case 'syncTemplate':
        syncTemplate(id);
        break;
      case 'copyTemplate':
        copyTemplate(id);
        break;
      case 'sendEmailWithTemplate':
        sendEmailWithTemplate(id);
        break;
      case 'previewTemplate':
        previewTemplate(id);
        break;
      case 'editUser':
        editUser(id);
        break;
      case 'deleteUser':
        const username = target.dataset.username;
        deleteUser(id, username);
        break;
      case 'editCategory':
        editCategory(id);
        break;
      case 'deleteCategory':
        deleteCategory(id);
        break;
      case 'editTag':
        editTag(id);
        break;
      case 'deleteTag':
        deleteTag(id);
        break;
      case 'closeEmailModal':
        closeEmailModal();
        break;
      case 'updateEmailPreview':
        updateEmailPreview();
        break;
      case 'openTagsModal':
        openTagsModal();
        break;
    }
  });

  // Búsqueda eliminada - no se usa
}

// Cargar plantillas desde el servidor
async function loadTemplates(silent = false) {
  if (!silent) showLoading(true);
  
  // Preservar el estado actual de filtros durante refresh
  const preserveFilters = silent && (selectedCategory !== 'all' || selectedTags.size > 0);
  
  try {
    const response = await fetch(`${API_URL}/templates`, {
      headers: getAuthHeaders()
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al cargar plantillas');
    
    templates = await response.json();
    
    // Si estamos preservando filtros, aplicarlos después de cargar
    if (preserveFilters) {
      console.log('Auto-refresh: Preservando filtros activos');
      filterTemplates();
    } else {
      filteredTemplates = [...templates];
      renderTemplates();
    }
    
    if (!silent) {
      showToast('Plantillas cargadas exitosamente');
    }
  } catch (error) {
    console.error('Error cargando plantillas:', error);
    if (!silent) {
      showToast('Error al cargar plantillas. Intentando modo offline...', 'error');
      loadOfflineTemplates();
    }
  } finally {
    showLoading(false);
  }
}

// Cargar plantillas offline (fallback)
function loadOfflineTemplates() {
  const stored = localStorage.getItem('emailTemplates_backup');
  if (stored) {
    templates = JSON.parse(stored);
    filteredTemplates = [...templates];
    renderTemplates();
    showToast('Modo offline activado', 'warning');
  }
}

// Sistema de preload optimizado - Cargar TODOS los datos al inicio
async function initializePreloadSystem() {
  console.log('Inicializando sistema de preload optimizado...');
  showLoading(true);
  
  try {
    // Cargar todos los datos en paralelo
    const [templatesResponse, categoriesResponse, allTagsResponse] = await Promise.all([
      fetch(`${API_URL}/templates`, { headers: getAuthHeaders() }),
      fetch(`${API_URL}/categories`, { headers: getAuthHeaders() }),
      fetch(`${API_URL}/tags`, { headers: getAuthHeaders() })
    ]);
    
    // Verificar errores de autenticación
    if (handleAuthError(templatesResponse) || handleAuthError(categoriesResponse) || handleAuthError(allTagsResponse)) {
      return;
    }
    
    // Procesar respuestas
    if (templatesResponse.ok) {
      templates = await templatesResponse.json();
      filteredTemplates = [...templates];
      console.log(`Preload: ${templates.length} plantillas cargadas`);
    }
    
    if (categoriesResponse.ok) {
      allCategories = await categoriesResponse.json();
      categories = [...allCategories];
      console.log(`Preload: ${categories.length} categorías cargadas`);
      renderCategoryFilters();
      updateCategorySelects();
    }
    
    if (allTagsResponse.ok) {
      allTags = await allTagsResponse.json();
      console.log(`Preload: ${allTags.length} tags cargados en total`);
    }
    
    // Renderizar contenido inicial
    renderTemplates();
    preloadComplete = true;
    
    console.log('Sistema de preload completado exitosamente');
    showToast('Aplicación optimizada - Filtros serán instantáneos');
    
  } catch (error) {
    console.error('Error en preload system:', error);
    // Fallback a cargar por separado
    loadTemplates();
    loadCategories();
  } finally {
    showLoading(false);
  }
}

// Guardar backup local
function saveBackup() {
  localStorage.setItem('emailTemplates_backup', JSON.stringify(templates));
}

// Renderizar plantillas
function renderTemplates() {
  const grid = document.getElementById('templatesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (filteredTemplates.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  grid.innerHTML = filteredTemplates.map((template) => {
    const categoryColor = template.category_color || '#6b7280';
    const categoryName = template.category_name || 'Sin categoría';
    const categoryIcon = template.category_icon || '';
    
    const catIdClass = template.category_id ? String(template.category_id) : 'none';
    return `
      <div class="bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden template-card relative transform hover:-translate-y-1 cat-border-${catIdClass}" data-id="${template.id}">
        <div class="category-border category-border-${catIdClass}"></div>
        <div class="category-border-glow category-border-glow-${catIdClass}"></div>
        
        <!-- Header con botones de acción -->
        <div class="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-end items-center gap-1">
          <button data-action="showQuickCategoryMenu" data-id="${template.id}" 
            class="p-2 text-indigo-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm" title="Cambiar categoría">
            <i class="fas fa-tag"></i>
          </button>
          <button data-action="editTemplate" data-id="${template.id}" 
            class="p-2 text-blue-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button data-action="editTemplate-visual" data-id="${template.id}" 
            class="p-2 text-purple-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm" title="Editor Visual">
            <i class="fas fa-magic"></i>
          </button>
          <button data-action="deleteTemplate" data-id="${template.id}" 
            class="p-2 text-red-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          <button data-action="syncTemplate" data-id="${template.id}" 
            class="p-2 text-green-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm" title="Sincronizar">
            <i class="fas fa-sync"></i>
          </button>
        </div>
        
        <!-- Contenido principal -->
        <div class="p-8">
          <div class="text-center mb-6">
            <h3 class="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">${escapeHtml(template.title)}</h3>
            ${template.description ? `
              <p class="text-gray-600 mb-6 text-lg leading-relaxed">${escapeHtml(template.description)}</p>
            ` : ''}
            
            <div class="flex flex-wrap gap-2 justify-center mb-4">
            ${template.tags && template.tags.length > 0 ? template.tags.map(tag => {
                return `
                  <span class="px-4 py-2 rounded-lg text-sm font-semibold shadow-md tag-chip-${tag.id}">
                    ${escapeHtml(tag.name)}
                  </span>
                `;
              }).join('') : ''}
            </div>
            
            <div class="flex items-center justify-center gap-2">
              <span class="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md cat-badge-${catIdClass}">
                ${categoryIcon ? `<i class="fas ${categoryIcon}"></i>` : ''}
                <span class="text-sm font-semibold">${escapeHtml(categoryName)}</span>
              </span>
            </div>
          </div>
          
          <!-- Vista previa -->
          <div class="template-preview bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 mb-6 border-2 border-gray-200 shadow-inner">
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <iframe srcdoc="<!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body {
                      margin: 0;
                      padding: 20px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100%;
                      box-sizing: border-box;
                    }
                    html, body {
                      height: 100%;
                    }
                    * {
                      box-sizing: border-box;
                    }
                  </style>
                </head>
                <body>
                  ${template.html.replace(/"/g, '&quot;')}
                </body>
                </html>" 
                class="w-full h-72 border-0"></iframe>
            </div>
          </div>
          
          <!-- Botones principales - Responsive -->
          <div class="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
            <button data-action="copyTemplate" data-id="${template.id}" 
              class="col-span-1 sm:flex-1 px-2 sm:px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
              <i class="fas fa-copy text-base sm:text-sm"></i>
              <span class="hidden sm:inline">Copiar Código</span>
              <span class="sm:hidden">Copiar</span>
            </button>
            <button data-action="sendEmailWithTemplate" data-id="${template.id}" 
              class="col-span-1 sm:flex-1 px-2 sm:px-4 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
              <i class="fas fa-paper-plane text-base sm:text-sm"></i>
              <span class="hidden sm:inline">Enviar Email</span>
              <span class="sm:hidden">Enviar</span>
            </button>
            <button data-action="previewTemplate" data-id="${template.id}" 
              class="col-span-1 px-2 sm:px-4 py-2.5 sm:py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
              <i class="fas fa-eye text-base sm:text-sm"></i>
              <span class="sr-only">Vista Previa</span>
            </button>
          </div>
          
          ${template.updated_at ? `
            <div class="mt-3 text-xs text-gray-500 text-right">
              <i class="fas fa-clock"></i> Actualizado: ${new Date(template.updated_at).toLocaleString()}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  saveBackup();
}

// Agregar nueva plantilla
async function addTemplate() {
  const title = document.getElementById('templateTitle').value;
  const email_subject = document.getElementById('templateEmailSubject').value;
  const description = document.getElementById('templateDescription').value;
  const html = document.getElementById('templateHTML').value;
  const category_id = document.getElementById('templateCategory').value || null;
  const tagIds = getSelectedTags('templateTags');
  
  // Debug para ver qué valores estamos obteniendo
  console.log('Valores del formulario:', {
    title,
    email_subject,
    description,
    html: html.substring(0, 100) + '...',
    category_id,
    tagIds
  });
  
  showLoading(true);
  
  try {
    const payload = { 
      name: title || 'Sin título', // Asegurar que siempre haya un valor
      description: description || 'Sin descripción',
      html: html || '<p>Plantilla vacía</p>',
      category_id,
      email_subject: email_subject || 'Sin asunto'
    };
    
    console.log('Enviando al servidor:', payload);
    
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al crear plantilla');
    
    const newTemplate = await response.json();
    
    // Asignar tags si hay alguno seleccionado
    if (tagIds.length > 0) {
      await fetch(`${API_URL}/templates/${newTemplate.id}/tags`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tagIds })
      });
      // Recargar para obtener los tags
      await loadTemplates();
    } else {
      templates.unshift(newTemplate);
      filteredTemplates = [...templates];
      renderTemplates();
    }
    
    closeAddModal();
    showToast('Plantilla agregada exitosamente');
    updateStats();
    
    // Limpiar formulario
    document.getElementById('addTemplateForm').reset();
  } catch (error) {
    console.error('Error agregando plantilla:', error);
    showToast('Error al agregar plantilla', 'error');
  } finally {
    showLoading(false);
  }
}

// Editar plantilla
async function editTemplate(id) {
  const template = templates.find(t => t.id === id);
  if (!template) return;
  
  editingId = id;
  
  document.getElementById('editTemplateTitle').value = template.title;
  document.getElementById('editTemplateEmailSubject').value = template.email_subject || template.title;
  document.getElementById('editTemplateDescription').value = template.description;
  document.getElementById('editTemplateHTML').value = template.html;
  
  // Cargar categorías
  loadCategoriesForTemplateSelect();
  
  // Cargar categoría si existe
  const categorySelect = document.getElementById('editTemplateCategory');
  if (categorySelect) {
    categorySelect.value = template.category_id || '';
    
    // Agregar listener para cambio de categoría
    categorySelect.onchange = function() {
      updateTagCheckboxesInContainer('editTemplateTags', this.value);
      // Limpiar selección de tags al cambiar categoría
      const checkboxes = document.querySelectorAll('#editTemplateTags .tag-checkbox');
      checkboxes.forEach(cb => cb.checked = false);
    };
  }
  
  // Cargar tags de la categoría correspondiente
  updateTagCheckboxesInContainer('editTemplateTags', template.category_id);
  
  // Después de cargar los tags, seleccionar los del template
  setTimeout(() => {
    const templateTagIds = template.tags ? template.tags.map(t => t.id) : [];
    setSelectedTags('editTemplateTags', templateTagIds);
  }, 100);
  
  document.getElementById('editTemplateModal').classList.remove('hidden');
}

// Actualizar plantilla
async function updateTemplate() {
  if (!editingId) return;
  
  const title = document.getElementById('editTemplateTitle').value;
  const email_subject = document.getElementById('editTemplateEmailSubject').value;
  const description = document.getElementById('editTemplateDescription').value;
  const html = document.getElementById('editTemplateHTML').value;
  const category_id = document.getElementById('editTemplateCategory')?.value || null;
  const tagIds = getSelectedTags('editTemplateTags');
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/templates/${editingId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: title, description, html, category_id, email_subject })
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al actualizar plantilla');
    
    const updatedTemplate = await response.json();
    
    // Actualizar tags
    await fetch(`${API_URL}/templates/${editingId}/tags`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tagIds })
    });
    
    // Recargar plantillas para obtener los tags actualizados
    await loadTemplates();
    
    closeEditModal();
    showToast('Plantilla actualizada exitosamente');
    updateStats();
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    showToast('Error al actualizar plantilla', 'error');
  } finally {
    showLoading(false);
  }
}

// Eliminar plantilla
async function deleteTemplate(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla? Esta acción se sincronizará en todos los dispositivos.')) {
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al eliminar plantilla');
    
    templates = templates.filter(t => t.id !== id);
    filteredTemplates = [...templates];
    renderTemplates();
    showToast('Plantilla eliminada exitosamente', 'error');
    updateStats();
  } catch (error) {
    console.error('Error eliminando plantilla:', error);
    showToast('Error al eliminar plantilla', 'error');
  } finally {
    showLoading(false);
  }
}

// Sincronizar plantilla individual
async function syncTemplate(id) {
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      headers: getAuthHeaders()
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al sincronizar');
    
    const updatedTemplate = await response.json();
    const index = templates.findIndex(t => t.id === id);
    
    if (index !== -1) {
      templates[index] = updatedTemplate;
      filteredTemplates = [...templates];
      renderTemplates();
      showToast('Plantilla sincronizada');
    }
  } catch (error) {
    console.error('Error sincronizando:', error);
    showToast('Error al sincronizar', 'error');
  } finally {
    showLoading(false);
  }
}

// Copiar al portapapeles
function copyTemplate(id) {
  const template = templates.find(t => t.id === id);
  if (!template) return;
  
  navigator.clipboard.writeText(template.html).then(() => {
    showToast('Código copiado al portapapeles');
  }).catch(err => {
    console.error('Error al copiar:', err);
    showToast('Error al copiar el código', 'error');
  });
}

// Vista previa en nueva ventana
function previewTemplate(id) {
  const template = templates.find(t => t.id === id);
  if (!template) return;
  
  const win = window.open('', '_blank');
  win.document.write(template.html);
  win.document.close();
}

// Función de filtrado por búsqueda eliminada - no se usa

// Funciones de búsqueda eliminadas - no se usan

// Actualizar estadísticas (contextuales a filtros actuales)
function updateStats() {
  try {
    // Usar filteredTemplates para estadísticas contextuales
    const currentTemplates = filteredTemplates || templates;
    
    // Total de plantillas mostradas
    document.getElementById('totalTemplates').textContent = currentTemplates.length;
    
    // Última actualización de las plantillas mostradas
    if (currentTemplates.length > 0) {
      const dates = currentTemplates
        .map(t => t.updated_at || t.created_at)
        .filter(date => date)
        .sort((a, b) => new Date(b) - new Date(a));
      
      if (dates.length > 0) {
        const latestDate = new Date(dates[0]);
        document.getElementById('lastUpdate').textContent = latestDate.toLocaleDateString('es-ES');
      } else {
        document.getElementById('lastUpdate').textContent = 'Sin datos';
      }
    } else {
      document.getElementById('lastUpdate').textContent = 'Sin plantillas';
    }
    
    // Espacio usado (calculado basándose en plantillas mostradas)
    const totalSize = currentTemplates.reduce((total, template) => {
      const contentSize = (template.html_content?.length || 0) + (template.subject?.length || 0);
      return total + contentSize;
    }, 0);
    
    const sizeInKB = (totalSize / 1024).toFixed(2);
    document.getElementById('storageUsed').textContent = `${sizeInKB} KB`;
    
  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    document.getElementById('totalTemplates').textContent = '0';
    document.getElementById('lastUpdate').textContent = 'Error';
    document.getElementById('storageUsed').textContent = '0 KB';
  }
}

// Modal functions
function openAddModal() {
  document.getElementById('addTemplateModal').classList.remove('hidden');
  loadCategoriesForTemplateSelect();
  updateTagCheckboxesInContainer('templateTags');
  
  // Agregar listener para cambio de categoría
  const categorySelect = document.getElementById('templateCategory');
  if (categorySelect) {
    categorySelect.onchange = function() {
      updateTagCheckboxesInContainer('templateTags', this.value);
    };
  }
  
  document.getElementById('templateTitle').focus();
}

function closeAddModal() {
  document.getElementById('addTemplateModal').classList.add('hidden');
  document.getElementById('addTemplateForm').reset();
}

function closeEditModal() {
  document.getElementById('editTemplateModal').classList.add('hidden');
  editingId = null;
}

// Mostrar indicador de carga
function showLoading(show) {
  const existingLoader = document.getElementById('loadingIndicator');
  
  if (show) {
    if (!existingLoader) {
      const loader = document.createElement('div');
      loader.id = 'loadingIndicator';
      loader.className = 'fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
      loader.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>Sincronizando...</span>
      `;
      document.body.appendChild(loader);
    }
  } else {
    if (existingLoader) {
      existingLoader.remove();
    }
  }
}

// Mostrar notificación toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  toastMessage.textContent = message;
  
  // Cambiar color según el tipo
  let bgColor = 'bg-green-600';
  let icon = 'fa-check-circle';
  
  if (type === 'error') {
    bgColor = 'bg-red-600';
    icon = 'fa-exclamation-circle';
  } else if (type === 'warning') {
    bgColor = 'bg-yellow-600';
    icon = 'fa-exclamation-triangle';
  }
  
  toast.className = `fixed bottom-8 right-8 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg toast z-50 flex items-center gap-3`;
  toast.querySelector('i').className = `fas ${icon}`;
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Función para escapar HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Verificar conexión con el servidor
async function checkServerConnection() {
  try {
    const response = await fetch(`${API_URL}/templates`);
    return response.ok;
  } catch {
    return false;
  }
}

// Verificar conexión al cargar
checkServerConnection().then(isConnected => {
  if (!isConnected) {
    showToast('No se puede conectar al servidor. Modo offline activado.', 'warning');
    loadOfflineTemplates();
  }
});

// =================================
// GESTIÓN DE USUARIOS
// =================================

let users = [];
let editingUserId = null;

// Abrir modal de gestión de usuarios
async function openUserManagement() {
  document.getElementById('userManagementModal').classList.remove('hidden');
  await loadUsers();
  setupUserManagementListeners();
}

// Cerrar modal de gestión de usuarios
function closeUserManagement() {
  document.getElementById('userManagementModal').classList.add('hidden');
  document.getElementById('createUserForm').reset();
}

// Cerrar modal de edición de usuario
function closeEditUser() {
  document.getElementById('editUserModal').classList.add('hidden');
  document.getElementById('editUserForm').reset();
  editingUserId = null;
}

// Configurar listeners de gestión de usuarios
function setupUserManagementListeners() {
  // Solo configurar una vez
  if (document.getElementById('createUserForm').hasEventListener) return;
  
  // Marcar que ya tiene listeners
  document.getElementById('createUserForm').hasEventListener = true;
  
  // Crear usuario
  document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
  
  // Editar usuario
  document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
  
  // Cerrar modales
  document.getElementById('closeUserModal').addEventListener('click', closeUserManagement);
  document.getElementById('cancelEditUser').addEventListener('click', closeEditUser);
  
  // Click fuera del modal para cerrar
  document.getElementById('userManagementModal').addEventListener('click', (e) => {
    if (e.target.id === 'userManagementModal') {
      closeUserManagement();
    }
  });
  
  document.getElementById('editUserModal').addEventListener('click', (e) => {
    if (e.target.id === 'editUserModal') {
      closeEditUser();
    }
  });
}

// Cargar usuarios desde el servidor
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });
    
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error('Error al cargar usuarios');
    
    users = await response.json();
    renderUsers();
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    showToast('Error al cargar usuarios', 'error');
  }
}

// Renderizar lista de usuarios
function renderUsers() {
  const usersList = document.getElementById('usersList');
  
  if (users.length === 0) {
    usersList.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-users text-4xl mb-4"></i>
        <p>No hay usuarios adicionales</p>
      </div>
    `;
    return;
  }
  
  usersList.innerHTML = users.map(user => {
    const isCurrentUser = user.id === currentUser.id;
    const createdDate = new Date(user.created_at).toLocaleDateString('es-ES');
    
    return `
      <div class="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <i class="fas fa-user text-purple-600 text-lg"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800">${escapeHtml(user.username)}</span>
              ${isCurrentUser ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Tú</span>' : ''}
            </div>
            ${user.email ? `<p class="text-gray-600 text-sm"><i class="fas fa-envelope mr-1"></i>${escapeHtml(user.email)}</p>` : ''}
            <p class="text-gray-500 text-xs">Creado: ${createdDate}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button data-action="editUser" data-id="${user.id}" 
            class="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-1"
            title="Editar usuario">
            <i class="fas fa-edit"></i>
            <span class="hidden md:inline">Editar</span>
          </button>
          ${!isCurrentUser ? `
            <button data-action="deleteUser" data-id="${user.id}" data-username="${escapeHtml(user.username)}" 
              class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
              title="Eliminar usuario">
              <i class="fas fa-trash"></i>
              <span class="hidden md:inline">Eliminar</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Manejar creación de usuario
async function handleCreateUser(e) {
  e.preventDefault();
  
  const username = document.getElementById('newUsername').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('newPassword').value;
  
  if (password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, email, password })
    });
    
    if (handleAuthError(response)) return;
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error, 'error');
      return;
    }
    
    users.unshift(data);
    renderUsers();
    document.getElementById('createUserForm').reset();
    showToast('Usuario creado exitosamente', 'success');
    
  } catch (error) {
    console.error('Error creando usuario:', error);
    showToast('Error al crear usuario', 'error');
  } finally {
    showLoading(false);
  }
}

// Editar usuario
async function editUser(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;
  
  editingUserId = id;
  document.getElementById('editUserId').value = id;
  document.getElementById('editUsername').value = user.username;
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editPassword').value = '';
  
  document.getElementById('editUserModal').classList.remove('hidden');
}

// Manejar edición de usuario
async function handleEditUser(e) {
  e.preventDefault();
  
  if (!editingUserId) return;
  
  const username = document.getElementById('editUsername').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const password = document.getElementById('editPassword').value;
  
  if (password && password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  
  showLoading(true);
  
  try {
    const payload = { username, email };
    if (password) {
      payload.password = password;
    }
    
    const response = await fetch(`${API_URL}/users/${editingUserId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (handleAuthError(response)) return;
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error, 'error');
      return;
    }
    
    const index = users.findIndex(u => u.id === editingUserId);
    if (index !== -1) {
      users[index] = data;
      renderUsers();
    }
    
    closeEditUser();
    showToast('Usuario actualizado exitosamente', 'success');
    
    // Si es el usuario actual, actualizar la info del header
    if (editingUserId === currentUser.id) {
      currentUser = { ...currentUser, ...data };
      document.getElementById('userInfo').textContent = currentUser.username;
    }
    
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    showToast('Error al actualizar usuario', 'error');
  } finally {
    showLoading(false);
  }
}

// Eliminar usuario
async function deleteUser(id, username) {
  if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"?`)) {
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (handleAuthError(response)) return;
    
    if (!response.ok) {
      const data = await response.json();
      showToast(data.error, 'error');
      return;
    }
    
    users = users.filter(u => u.id !== id);
    renderUsers();
    showToast('Usuario eliminado exitosamente', 'error');
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    showToast('Error al eliminar usuario', 'error');
  } finally {
    showLoading(false);
  }
}

// =================================
// FUNCIONES DE ENVÍO DE EMAIL
// =================================

// Obtener variables de una plantilla
async function getTemplateVariables(templateId) {
  try {
    const response = await fetch(`${API_URL}/templates/${templateId}/variables`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      console.error('Error response:', response.status, response.statusText);
      throw new Error('Error obteniendo variables');
    }
    
    const data = await response.json();
    console.log('Variables detectadas para plantilla', templateId, ':', data.variables);
    return data.variables || [];
  } catch (error) {
    console.error('Error obteniendo variables:', error);
    return [];
  }
}

// Función principal para enviar email con plantilla
async function sendEmailWithTemplate(templateId) {
  const template = templates.find(t => t.id === templateId);
  if (!template) {
    console.error('Plantilla no encontrada:', templateId);
    return;
  }
  
  console.log('Enviando email con plantilla:', template.title);
  
  // Primero obtener las variables de la plantilla
  const variables = await getTemplateVariables(templateId);
  console.log('Variables obtenidas:', variables);
  
  // Crear y mostrar el modal de envío
  showEmailModal(template, variables);
}

// Mostrar modal de envío de email
function showEmailModal(template, variables) {
  console.log('showEmailModal llamado con variables:', variables);
  
  // Asegurar que variables es un array
  if (!Array.isArray(variables)) {
    console.warn('Variables no es un array, convirtiendo:', variables);
    variables = [];
  }
  
  // Crear el modal si no existe
  let modal = document.getElementById('emailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emailModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center hidden';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="modal-backdrop absolute inset-0 bg-black bg-opacity-50" data-action="closeEmailModal"></div>
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden slide-in">
      <div class="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 relative">
        <h2 class="text-2xl font-bold flex items-center gap-3">
          <i class="fas fa-paper-plane"></i>
          Enviar Email con Gmail
        </h2>
        <button data-action="closeEmailModal" 
            class="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl transition-colors duration-200 hover:bg-white hover:bg-opacity-10 rounded-full w-8 h-8 flex items-center justify-center">
            <i class="fas fa-times"></i>
        </button>
      </div>
      <form id="emailForm" class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <input type="hidden" id="emailTemplateId" value="${template.id}">
        
        <!-- Información del destinatario -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 class="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <i class="fas fa-user"></i> Información del Destinatario
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">
                <i class="fas fa-envelope mr-2"></i>Email del Destinatario
              </label>
              <input type="email" id="recipientEmail" required 
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                placeholder="cliente@ejemplo.com">
            </div>
            <div>
              <label class="block text-gray-700 font-semibold mb-2">
                <i class="fas fa-heading mr-2"></i>Asunto del Email
              </label>
              <input type="text" id="emailSubject" required 
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                placeholder="Asunto del correo" value="${escapeHtml(template.email_subject || template.title)}">
            </div>
          </div>
        </div>
        
        <!-- Variables dinámicas -->
        ${variables.length > 0 ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 class="font-bold text-yellow-900 mb-3 flex items-center gap-2">
              <i class="fas fa-magic"></i> Personalización del Mensaje
            </h3>
            <p class="text-sm text-gray-600 mb-4">Esta plantilla contiene variables personalizables. Completa los valores:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="variablesContainer">
              ${variables.map(variable => `
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">
                    {{${variable}}}
                  </label>
                  <input type="text" 
                    data-variable="${variable}"
                    class="variable-input w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-yellow-500"
                    placeholder="Valor para ${variable}">
                </div>
              `).join('')}
            </div>
          </div>
        ` : '<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center text-gray-600"><i class="fas fa-info-circle mr-2"></i>Esta plantilla no contiene variables personalizables</div>'}
        
        <!-- Preview -->
        <div class="mb-6">
          <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-eye"></i> Vista Previa del Email
          </h3>
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <iframe id="emailPreview" srcdoc="${template.html.replace(/"/g, '&quot;')}" 
              class="w-full h-64 rounded border-0"></iframe>
          </div>
        </div>
        
        <!-- Botones -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" data-action="closeEmailModal" 
            class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          ${variables.length > 0 ? `
            <button type="button" data-action="updateEmailPreview" 
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <i class="fas fa-sync"></i>
              Actualizar Preview
            </button>
          ` : ''}
          <button type="submit" 
            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <i class="fas fa-paper-plane"></i>
            Enviar Email
          </button>
        </div>
      </form>
    </div>
  `;
  
  // Agregar evento al formulario
  document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);
  
  // Agregar eventos a los inputs de variables para actualizar preview automáticamente
  document.querySelectorAll('.variable-input').forEach(input => {
    input.addEventListener('input', debounce(updateEmailPreview, 500));
  });
  
  // Mostrar el modal
  modal.classList.remove('hidden');
}

// Cerrar modal de email
function closeEmailModal() {
  const modal = document.getElementById('emailModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Actualizar preview del email
async function updateEmailPreview() {
  const templateId = document.getElementById('emailTemplateId').value;
  const variables = {};
  
  // Recoger valores de las variables
  document.querySelectorAll('.variable-input').forEach(input => {
    variables[input.dataset.variable] = input.value;
  });
  
  try {
    const response = await fetch(`${API_URL}/templates/${templateId}/preview`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variables })
    });
    
    if (!response.ok) throw new Error('Error generando preview');
    
    const data = await response.json();
    document.getElementById('emailPreview').srcdoc = data.html;
    showToast('Preview actualizado', 'success');
  } catch (error) {
    console.error('Error actualizando preview:', error);
    showToast('Error actualizando preview', 'error');
  }
}

// Manejar envío del email
async function handleEmailSubmit(e) {
  e.preventDefault();
  
  const templateId = document.getElementById('emailTemplateId').value;
  const recipientEmail = document.getElementById('recipientEmail').value;
  const subject = document.getElementById('emailSubject').value;
  
  // Recoger valores de las variables
  const variables = {};
  document.querySelectorAll('.variable-input').forEach(input => {
    variables[input.dataset.variable] = input.value;
  });
  
  showLoading(true);
  
  try {
    // Enviar email usando el backend
    const response = await fetch(`${API_URL}/templates/${templateId}/send`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: subject,
        variables: variables
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error enviando email');
    }
    
    showToast('✅ ¡Email enviado exitosamente!', 'success');
    closeEmailModal();
    
    // Guardar en historial local (opcional)
    const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
    history.unshift({
      to: recipientEmail,
      subject: subject,
      templateId: templateId,
      variables: variables,
      sentAt: new Date().toISOString()
    });
    localStorage.setItem('emailHistory', JSON.stringify(history.slice(0, 50))); // Mantener últimos 50
    
  } catch (error) {
    console.error('Error completo:', error);
    
    // Verificar específicamente si es un error de configuración
    if (error.message && (
      error.message.includes('Email no configurado') || 
      error.message.includes('EMAIL_USER') || 
      error.message.includes('EMAIL_PASS') ||
      error.message.includes('configura EMAIL')
    )) {
      showToast('⚠️ Email no configurado en el servidor', 'error');
      alert(`Para configurar el envío de emails:
      
1. Abre el archivo .env en la raíz del proyecto
2. Añade tu email de Gmail: EMAIL_USER=tu-email@gmail.com
3. Genera una contraseña de aplicación en Gmail:
   - Ve a https://myaccount.google.com/security
   - Activa verificación en 2 pasos
   - Busca "Contraseñas de aplicaciones"
   - Genera una nueva para "Correo"
4. Añade la contraseña: EMAIL_PASS=tu-contraseña-de-16-caracteres
5. Reinicia el servidor`);
    } else if (error.message && error.message.includes('Error de autenticación')) {
      showToast('❌ Error de autenticación con Gmail', 'error');
      alert('Error de autenticación con Gmail. Por favor verifica:\n\n' +
        '1. Que el email en EMAIL_USER sea correcto\n' +
        '2. Que la contraseña de aplicación en EMAIL_PASS sea válida\n' +
        '3. Que hayas generado una contraseña de aplicación (no tu contraseña normal)\n' +
        '4. Que la verificación en 2 pasos esté activa en tu cuenta de Gmail');
    } else {
      // Mostrar el error real sin el mensaje de configuración
      const errorMsg = error.message || 'Error enviando email';
      showToast('❌ ' + errorMsg, 'error');
      console.log('Error detallado:', errorMsg);
    }
  } finally {
    showLoading(false);
  }
}


// Función de debounce para optimizar actualizaciones
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hacer global las funciones que necesita el HTML
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.syncTemplate = syncTemplate;
window.copyTemplate = copyTemplate;
window.previewTemplate = previewTemplate;
window.sendEmailWithTemplate = sendEmailWithTemplate;
window.closeEmailModal = closeEmailModal;
window.updateEmailPreview = updateEmailPreview;
window.openUserManagement = openUserManagement;
window.closeUserManagement = closeUserManagement;
window.closeEditUser = closeEditUser;
window.editUser = editUser;
window.deleteUser = deleteUser;

// =================================
// FUNCIONES DE CATEGORÍAS
// =================================

// Cargar categorías
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error cargando categorías');
    
    categories = await response.json();
    renderCategoryFilters();
    updateCategorySelects();
    
  } catch (error) {
    console.error('Error cargando categorías:', error);
    categories = [];
  }
}

// Renderizar filtros de categoría
function renderCategoryFilters() {
  const container = document.getElementById('categoryFilters');
  const currentFilters = container.querySelectorAll('.category-chip:not([data-category="all"])');
  currentFilters.forEach(chip => chip.remove());
  
  categories.forEach(category => {
    const chip = document.createElement('button');
    chip.dataset.category = category.id;
    chip.className = 'category-chip px-4 py-2 rounded-full text-white transition-all';
    chip.style.backgroundColor = category.color;
    chip.innerHTML = `
      ${category.icon ? `<i class="fas ${category.icon} mr-2"></i>` : ''}
      ${category.name}
    `;
    chip.addEventListener('click', async () => await filterByCategory(category.id));
    container.appendChild(chip);
  });
  
  // Actualizar chip activo
  updateActiveChip();
}

// Filtrar por categoría
async function filterByCategory(categoryId) {
  console.log('Filtrando por categoría:', categoryId);
  
  // Prevenir operaciones concurrentes
  if (window.filteringInProgress) {
    console.log('Filtrado ya en progreso, ignorando...');
    return;
  }
  window.filteringInProgress = true;
  
  try {
    selectedCategory = categoryId;
    
    // Resetear tags seleccionados cuando cambiamos de categoría
    selectedTags.clear();
    
    // Cargar tags de la categoría seleccionada y esperar a que termine
    await loadTags(categoryId);
    
    updateActiveChip();
    
    // Solo filtrar después de que los tags estén completamente cargados
    filterTemplates();
    
  } catch (error) {
    console.error('Error en filterByCategory:', error);
  } finally {
    window.filteringInProgress = false;
  }
}

// Actualizar chip activo
function updateActiveChip() {
  document.querySelectorAll('.category-chip').forEach(chip => {
    if (chip.dataset.category === selectedCategory) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// Actualizar selects de categorías
function updateCategorySelects() {
  const selects = ['templateCategory', 'editTemplateCategory'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '<option value="">Sin categoría</option>';
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
    }
  });
}

// Abrir modal de categorías
function openCategoriesModal() {
  console.log('Abriendo modal de categorías...');
  const modal = document.getElementById('categoriesModal');
  if (modal) {
    modal.classList.remove('hidden');
    loadCategoryStats();
  } else {
    console.error('Modal de categorías no encontrado');
  }
}

// Cerrar modal de categorías
function closeCategoriesModal() {
  document.getElementById('categoriesModal').classList.add('hidden');
}

// Cargar estadísticas de categorías
async function loadCategoryStats() {
  try {
    const response = await fetch(`${API_URL}/categories/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error cargando estadísticas');
    
    const stats = await response.json();
    renderCategoriesList(stats);
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// Renderizar lista de categorías
function renderCategoriesList(categoriesWithStats) {
  const tbody = document.getElementById('categoriesList');
  tbody.innerHTML = '';
  
  categoriesWithStats.forEach((category, index) => {
    const tr = document.createElement('tr');
    tr.setAttribute('draggable', 'true');
    tr.dataset.id = category.id;
    tr.innerHTML = `
      <td class="px-4 py-3">
        <button class="text-gray-400 hover:text-gray-600 cursor-move">
          <i class="fas fa-grip-vertical"></i>
        </button>
      </td>
      <td class="px-4 py-3 font-medium">${category.name}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded cat-swatch-${category.id}"></div>
          <span class="text-sm text-gray-600">${category.color}</span>
        </div>
      </td>
      <td class="px-4 py-3">
        ${category.icon ? `<i class="fas ${category.icon}"></i>` : '-'}
      </td>
      <td class="px-4 py-3">
        <span class="bg-gray-100 px-2 py-1 rounded text-sm">${category.template_count}</span>
      </td>
      <td class="px-4 py-3 text-right flex items-center gap-2 justify-end">
        <button data-action="moveUpCategory" data-id="${category.id}" title="Subir" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-chevron-up"></i>
        </button>
        <button data-action="moveDownCategory" data-id="${category.id}" title="Bajar" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-chevron-down"></i>
        </button>
        <button data-action="editCategory" data-id="${category.id}" class="text-blue-600 hover:text-blue-800 mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button data-action="deleteCategory" data-id="${category.id}" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  enableCategoryDragAndDrop(tbody);
  attachCategoryClickHandlers(tbody);
}

// Drag & Drop para categorías
let dragCatRow = null;
function enableCategoryDragAndDrop(tbody) {
  tbody.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    dragCatRow = tr;
    tr.classList.add('opacity-60');
    e.dataTransfer.effectAllowed = 'move';
  });
  tbody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tr = e.target.closest('tr');
    if (!tr || tr === dragCatRow) return;
    const rect = tr.getBoundingClientRect();
    const after = (e.clientY - rect.top) / rect.height > 0.5;
    tr.parentNode.insertBefore(dragCatRow, after ? tr.nextSibling : tr);
  });
  tbody.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!dragCatRow) return;
    dragCatRow.classList.remove('opacity-60');
    dragCatRow = null;
    const orders = Array.from(tbody.querySelectorAll('tr')).map((row, idx) => ({ id: row.dataset.id, order_index: idx }));
    try {
      const resp = await fetch(`${API_URL}/categories/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orders })
      });
      if (!resp.ok) throw new Error('Error reordenando categorías');
      showToast('Orden de categorías actualizado', 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el orden', 'error');
    }
  });
}

// Click handlers para mover arriba/abajo (compatible móvil)
function attachCategoryClickHandlers(tbody) {
  tbody.onclick = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const row = btn.closest('tr');
    if (!row) return;
    if (action === 'moveUpCategory' && row.previousElementSibling) {
      row.parentNode.insertBefore(row, row.previousElementSibling);
    } else if (action === 'moveDownCategory' && row.nextElementSibling) {
      row.parentNode.insertBefore(row.nextElementSibling, row);
    } else if (action === 'editCategory') {
      editCategory(id);
      return;
    } else if (action === 'deleteCategory') {
      deleteCategory(id);
      return;
    } else {
      return;
    }
    // Persistir después de mover
    const orders = Array.from(tbody.querySelectorAll('tr')).map((r, idx) => ({ id: r.dataset.id, order_index: idx }));
    try {
      const resp = await fetch(`${API_URL}/categories/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orders })
      });
      if (!resp.ok) throw new Error('Error reordenando categorías');
      showToast('Orden de categorías actualizado', 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el orden', 'error');
    }
  };
}

// Añadir categoría
async function addCategory(e) {
  e.preventDefault();
  
  const name = document.getElementById('categoryName').value;
  const color = document.getElementById('categoryColor').value;
  const icon = document.getElementById('categoryIcon').value;
  
  try {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, color, icon })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando categoría');
    }
    
    showToast('Categoría creada exitosamente');
    document.getElementById('addCategoryForm').reset();
    loadCategories();
    loadCategoryStats();
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  }
}

// Eliminar categoría
async function deleteCategory(id) {
  if (!confirm('¿Estás seguro de eliminar esta categoría? Las plantillas no se eliminarán.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error eliminando categoría');
    
    showToast('Categoría eliminada exitosamente');
    loadCategories();
    loadCategoryStats();
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Error eliminando categoría', 'error');
  }
}

// Setup de listeners para categorías
document.addEventListener('DOMContentLoaded', () => {
  // Filtro "Todas"
  const allChip = document.querySelector('[data-category="all"]');
  if (allChip) {
    allChip.addEventListener('click', async () => await filterByCategory('all'));
  }
  
  // Modal de categorías
  const closeBtn = document.getElementById('closeCategoriesModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCategoriesModal);
  }
  
  // Formulario de añadir categoría
  const addForm = document.getElementById('addCategoryForm');
  if (addForm) {
    addForm.addEventListener('submit', addCategory);
  }
});

// =================================
// ASIGNACIÓN RÁPIDA Y BULK ACTIONS
// =================================

let selectedTemplates = new Set();
let currentTemplateForCategory = null;

// Mostrar menú de categorías rápido
function showQuickCategoryMenu(event, templateId) {
  event.stopPropagation();
  currentTemplateForCategory = templateId;
  
  const menu = document.getElementById('quickCategoryMenu');
  const optionsContainer = document.getElementById('quickCategoryOptions');
  
  // Limpiar opciones anteriores
  optionsContainer.innerHTML = '';
  
  // Añadir opción "Sin categoría"
  const noCategoryOption = document.createElement('button');
  noCategoryOption.className = 'w-full px-4 py-2 text-left hover:bg-gray-100 text-sm';
  noCategoryOption.innerHTML = '<i class="fas fa-times-circle mr-2 text-gray-400"></i>Sin categoría';
  noCategoryOption.onclick = () => assignQuickCategory(null);
  optionsContainer.appendChild(noCategoryOption);
  
  // Añadir categorías
  categories.forEach(category => {
    const option = document.createElement('button');
    option.className = 'w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center gap-2';
    option.innerHTML = `
      <div class="w-4 h-4 rounded cat-swatch-${category.id}"></div>
      ${category.icon ? `<i class="fas ${category.icon}"></i>` : ''}
      ${category.name}
    `;
    option.onclick = () => assignQuickCategory(category.id);
    optionsContainer.appendChild(option);
  });
  
  // Posicionar el menú
  const rect = event.target.getBoundingClientRect();
  menu.style.top = rect.bottom + 'px';
  menu.style.left = rect.left + 'px';
  menu.classList.remove('hidden');
  
  // Cerrar al hacer click fuera
  setTimeout(() => {
    document.addEventListener('click', hideQuickCategoryMenu);
  }, 100);
}

// Ocultar menú de categorías
function hideQuickCategoryMenu() {
  document.getElementById('quickCategoryMenu').classList.add('hidden');
  document.removeEventListener('click', hideQuickCategoryMenu);
}

// Asignar categoría rápidamente
async function assignQuickCategory(categoryId) {
  if (!currentTemplateForCategory) return;
  
  try {
    const response = await fetch(`${API_URL}/templates/assign-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        templateIds: [currentTemplateForCategory],
        categoryId: categoryId
      })
    });
    
    if (!response.ok) throw new Error('Error asignando categoría');
    
    showToast('Categoría actualizada');
    hideQuickCategoryMenu();
    loadTemplates();
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Error asignando categoría', 'error');
  }
}

// Activar modo de selección múltiple
function enableBulkSelection() {
  const templates = document.querySelectorAll('.template-card');
  templates.forEach(card => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'template-checkbox absolute top-4 left-4 w-5 h-5 z-10';
    checkbox.dataset.templateId = card.dataset.id;
    checkbox.onchange = () => updateBulkSelection();
    card.appendChild(checkbox);
  });
  
  document.getElementById('bulkActionsBar').classList.remove('hidden');
  updateBulkSelection();
}

// Actualizar selección bulk
function updateBulkSelection() {
  selectedTemplates.clear();
  const checkboxes = document.querySelectorAll('.template-checkbox:checked');
  checkboxes.forEach(cb => selectedTemplates.add(cb.dataset.templateId));
  
  document.getElementById('selectedCount').textContent = 
    `${selectedTemplates.size} plantilla${selectedTemplates.size !== 1 ? 's' : ''} seleccionada${selectedTemplates.size !== 1 ? 's' : ''}`;
}

// Cancelar selección bulk
function cancelBulkSelection() {
  selectedTemplates.clear();
  document.querySelectorAll('.template-checkbox').forEach(cb => cb.remove());
  document.getElementById('bulkActionsBar').classList.add('hidden');
}

// Asignar categoría en bulk
async function assignCategoryBulk() {
  if (selectedTemplates.size === 0) {
    showToast('Selecciona al menos una plantilla', 'error');
    return;
  }
  
  // Mostrar diálogo de selección de categoría
  const categoryId = prompt('Ingresa el ID de la categoría (deja vacío para "Sin categoría"):');
  
  try {
    const response = await fetch(`${API_URL}/templates/assign-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        templateIds: Array.from(selectedTemplates),
        categoryId: categoryId || null
      })
    });
    
    if (!response.ok) throw new Error('Error asignando categorías');
    
    const result = await response.json();
    showToast(`${result.affected} plantillas actualizadas`);
    cancelBulkSelection();
    loadTemplates();
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Error asignando categorías', 'error');
  }
}

// Eliminar en bulk
async function deleteBulk() {
  if (selectedTemplates.size === 0) {
    showToast('Selecciona al menos una plantilla', 'error');
    return;
  }
  
  if (!confirm(`¿Estás seguro de eliminar ${selectedTemplates.size} plantilla(s)?`)) {
    return;
  }
  
  let deleted = 0;
  for (const templateId of selectedTemplates) {
    try {
      const response = await fetch(`${API_URL}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) deleted++;
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
    }
  }
  
  showToast(`${deleted} plantillas eliminadas`);
  cancelBulkSelection();
  loadTemplates();
}

// Añadir botón de selección múltiple
document.addEventListener('DOMContentLoaded', () => {
  // Añadir botón de selección múltiple al header
  const header = document.querySelector('header .flex.items-center.gap-3');
  if (header) {
    const bulkBtn = document.createElement('button');
    bulkBtn.id = 'bulkSelectBtn';
    bulkBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors';
    bulkBtn.innerHTML = '<i class="fas fa-check-square mr-2"></i>Selección';
    bulkBtn.onclick = enableBulkSelection;
    header.insertBefore(bulkBtn, header.children[1]);
  }
  
  // Listener para "Seleccionar todo"
  const selectAll = document.getElementById('selectAllTemplates');
  if (selectAll) {
    selectAll.onchange = () => {
      const checkboxes = document.querySelectorAll('.template-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAll.checked);
      updateBulkSelection();
    };
  }
});

// Exportar funciones para uso global
window.openCategoriesModal = openCategoriesModal;
window.closeCategoriesModal = closeCategoriesModal;
window.deleteCategory = deleteCategory;
// Editar categoría
async function editCategory(categoryId) {
  // Buscar la categoría actual
  const category = categories.find(c => c.id === categoryId);
  if (!category) return;
  
  // Llenar el formulario con los datos actuales
  document.getElementById('editCategoryId').value = category.id;
  document.getElementById('editCategoryName').value = category.name;
  document.getElementById('editCategoryColor').value = category.color;
  document.getElementById('editCategoryColorText').value = category.color;
  document.getElementById('editCategoryIcon').value = category.icon || '';
  
  // Actualizar preview del icono
  updateIconPreview(category.icon);
  
  // Mostrar el modal
  document.getElementById('editCategoryModal').classList.remove('hidden');
}

// Cerrar modal de edición
function closeEditCategoryModal() {
  document.getElementById('editCategoryModal').classList.add('hidden');
}

// Actualizar preview del icono
function updateIconPreview(icon) {
  const preview = document.getElementById('editCategoryIconPreview');
  if (icon) {
    preview.innerHTML = `<i class="fas ${icon}"></i>`;
  } else {
    preview.innerHTML = '<i class="fas fa-question text-gray-400"></i>';
  }
}

// Guardar cambios de categoría
async function saveCategoryChanges(e) {
  e.preventDefault();
  
  const id = document.getElementById('editCategoryId').value;
  const name = document.getElementById('editCategoryName').value;
  const color = document.getElementById('editCategoryColor').value;
  const icon = document.getElementById('editCategoryIcon').value;
  
  try {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, color, icon })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error actualizando categoría');
    }
    
    showToast('Categoría actualizada exitosamente');
    closeEditCategoryModal();
    loadCategories();
    loadCategoryStats();
    loadTemplates(); // Recargar plantillas para actualizar los badges
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  }
}

// Event listeners para el modal de edición
document.addEventListener('DOMContentLoaded', () => {
  // Formulario de editar categoría
  const editForm = document.getElementById('editCategoryForm');
  if (editForm) {
    editForm.addEventListener('submit', saveCategoryChanges);
  }
  
  // Sincronizar color picker con texto
  const colorPicker = document.getElementById('editCategoryColor');
  const colorText = document.getElementById('editCategoryColorText');
  
  if (colorPicker && colorText) {
    colorPicker.addEventListener('change', (e) => {
      colorText.value = e.target.value;
    });
    
    colorText.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        colorPicker.value = e.target.value;
      }
    });
  }
  
  // Preview del icono
  const iconInput = document.getElementById('editCategoryIcon');
  if (iconInput) {
    iconInput.addEventListener('input', (e) => {
      updateIconPreview(e.target.value);
    });
  }
});

window.editCategory = editCategory;
window.closeEditCategoryModal = closeEditCategoryModal;
window.showQuickCategoryMenu = showQuickCategoryMenu;
window.assignCategoryBulk = assignCategoryBulk;
window.deleteBulk = deleteBulk;
window.cancelBulkSelection = cancelBulkSelection;

// =================================
// SISTEMA DE TAGS
// =================================

// Cargar tags
async function loadTags(categoryId = null) {
  try {
    // Si no hay categoría o es 'all', no cargar tags
    if (!categoryId || categoryId === 'all') {
      tags = [];
      renderTagFilters();
      return;
    }
    
    // Si el preload está completo, filtrar desde memoria (OPTIMIZACIÓN)
    if (preloadComplete && allTags.length > 0) {
      console.log(`Optimización: Filtrando tags desde memoria para categoría ${categoryId}`);
      tags = allTags.filter(tag => String(tag.category_id) === String(categoryId));
      console.log(`Tags filtrados desde memoria: ${tags.length} tags para categoría ${categoryId}`);
      renderTagFilters();
      updateTagCheckboxes();
      return;
    }
    
    // Fallback: Cargar desde API (solo si preload no está disponible)
    console.log(`Fallback: Cargando tags desde API para categoría ${categoryId}`);
    
    // Mostrar indicador de carga
    const container = document.getElementById('tagFilters');
    if (container) {
      container.innerHTML = '<span class="text-gray-500 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando tags...</span>';
    }
    
    let url = `${API_URL}/tags?category_id=${categoryId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error cargando tags');
    
    tags = await response.json();
    console.log(`Tags cargados desde API para categoría ${categoryId}:`, tags);
    renderTagFilters();
    updateTagCheckboxes();
    
  } catch (error) {
    console.error('Error cargando tags:', error);
    tags = [];
    renderTagFilters();
  }
}

// Renderizar filtros de tags
function renderTagFilters() {
  const container = document.getElementById('tagFilters');
  const tagSection = document.getElementById('tagFilterSection');
  if (!container) return;
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  // Si no hay categoría seleccionada o es "all", ocultar la sección de tags
  if (selectedCategory === 'all') {
    if (tagSection) {
      tagSection.style.display = 'none';
    }
    return;
  }
  
  // Mostrar la sección de tags
  if (tagSection) {
    tagSection.style.display = 'block';
  }
  
  // Agregar botón "Todos" primero
  const allButton = document.createElement('button');
  allButton.dataset.tagId = 'all';
  allButton.className = 'tag-chip px-3 py-1.5 rounded-full text-white transition-all';
  allButton.style.backgroundColor = selectedTags.size === 0 ? '#6b7280' : '#6b728080';
  allButton.innerHTML = '<i class="fas fa-hashtag mr-1"></i>Todos';
  allButton.onclick = () => {
    selectedTags.clear();
    renderTagFilters();
    filterTemplates();
  };
  container.appendChild(allButton);
  
  // Si no hay tags para esta categoría, mostrar mensaje
  if (tags.length === 0) {
    const message = document.createElement('span');
    message.className = 'text-gray-500 text-sm italic ml-3';
    message.innerHTML = `
      No hay tags para esta categoría. 
      <button data-action="openTagsModal" class="text-indigo-600 hover:text-indigo-700 underline">
        Crear tags
      </button>
    `;
    container.appendChild(message);
    return;
  }
  
  tags.forEach(tag => {
    const chip = document.createElement('button');
    chip.dataset.tagId = tag.id;
    chip.className = 'tag-chip px-3 py-1.5 rounded-full text-white transition-all';
    
    // Aplicar estilo según si está seleccionado
    if (selectedTags.has(tag.id)) {
      chip.style.backgroundColor = tag.color;
      chip.style.boxShadow = `0 0 0 3px ${tag.color}40`;
    } else {
      chip.style.backgroundColor = `${tag.color}CC`;
    }
    
    chip.innerHTML = `
      ${tag.icon ? `<i class="fas ${tag.icon} mr-1"></i>` : ''}
      ${tag.name}
    `;
    chip.addEventListener('click', () => toggleTagFilter(tag.id));
    container.appendChild(chip);
  });
}

// Toggle filtro de tag (selección única)
function toggleTagFilter(tagId) {
  if (tagId === 'all') {
    selectedTags.clear();
  } else {
    // Limpiar selección previa y seleccionar solo este tag
    selectedTags.clear();
    selectedTags.add(tagId);
  }
  
  updateActiveTagChips();
  filterTemplates();
}

// Actualizar chips activos
function updateActiveTagChips() {
  document.querySelectorAll('.tag-chip').forEach(chip => {
    const tagId = chip.dataset.tagId;
    if (tagId === 'all' && selectedTags.size === 0) {
      chip.classList.add('active');
    } else if (selectedTags.has(tagId)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// Filtrar plantillas por categoría y tags
function filterTemplates() {
  
  filteredTemplates = templates.filter(template => {
    // Filtro de categoría - Normalizar tipos para comparación segura
    if (selectedCategory !== 'all') {
      const templateCategoryId = String(template.category_id);
      const selectedCategoryStr = String(selectedCategory);
      if (templateCategoryId !== selectedCategoryStr) {
        return false;
      }
    }
    
    // Filtro de tags - Normalizar tipos de IDs (lógica OR)
    if (selectedTags.size > 0) {
      const templateTagIds = template.tags ? template.tags.map(t => String(t.id)) : [];
      const selectedTagIds = Array.from(selectedTags).map(id => String(id));
      const hasAnyTag = selectedTagIds.some(tagId => 
        templateTagIds.includes(tagId)
      );
      if (!hasAnyTag) return false;
    }
    
    return true;
  });
  
  console.log(`Filtrado completado: ${filteredTemplates.length}/${templates.length} plantillas`);
  renderTemplates(filteredTemplates);
  updateStats(); // Actualizar estadísticas después de filtrar
}

// Actualizar checkboxes de tags en formularios
function updateTagCheckboxes() {
  updateTagCheckboxesInContainer('templateTags');
  updateTagCheckboxesInContainer('editTemplateTags');
}

function updateTagCheckboxesInContainer(containerId, categoryFilter = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  // Determinar qué tags mostrar
  let tagsToShow = allTags || tags;
  
  // Si hay un filtro de categoría específico, aplicarlo
  if (categoryFilter && categoryFilter !== '') {
    tagsToShow = tagsToShow.filter(tag => String(tag.category_id) === String(categoryFilter));
  }
  
  tagsToShow.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded';
    label.innerHTML = `
      <input type="checkbox" value="${tag.id}" class="tag-checkbox">
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs tag-chip-outline-${tag.id}">
        ${tag.icon ? `<i class="fas ${tag.icon}"></i>` : ''}
        ${tag.name}
      </span>
    `;
    container.appendChild(label);
  });
}

// Obtener tags seleccionados de un formulario
function getSelectedTags(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  
  const checkboxes = container.querySelectorAll('.tag-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Establecer tags seleccionados en un formulario
function setSelectedTags(containerId, tagIds) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.querySelectorAll('.tag-checkbox').forEach(cb => {
    cb.checked = tagIds.includes(cb.value);
  });
}

// Mostrar formulario rápido de creación de tag
function showQuickTagForm(containerId) {
  const button = containerId === 'templateTags' 
    ? document.getElementById('addQuickTagBtn')
    : document.getElementById('editQuickTagBtn');
  const form = document.getElementById(`quickTagForm-${containerId}`);
  
  if (button && form) {
    button.style.display = 'none';
    form.classList.remove('hidden');
    document.getElementById(`quickTagName-${containerId}`).focus();
  }
}

// Ocultar formulario rápido de creación de tag
function hideQuickTagForm(containerId) {
  const button = containerId === 'templateTags' 
    ? document.getElementById('addQuickTagBtn')
    : document.getElementById('editQuickTagBtn');
  const form = document.getElementById(`quickTagForm-${containerId}`);
  
  if (button && form) {
    button.style.display = 'flex';
    form.classList.add('hidden');
    // Limpiar campos
    document.getElementById(`quickTagName-${containerId}`).value = '';
    document.getElementById(`quickTagColor-${containerId}`).value = '#9ca3af';
  }
}

// Crear tag rápido desde modal de plantilla
async function createQuickTag(containerId) {
  const name = document.getElementById(`quickTagName-${containerId}`).value.trim();
  const color = document.getElementById(`quickTagColor-${containerId}`).value;
  
  if (!name) {
    showToast('El nombre del tag es obligatorio', 'error');
    return;
  }
  
  // Obtener categoría seleccionada en el modal
  let categoryId = '';
  if (containerId === 'templateTags') {
    categoryId = document.getElementById('templateCategory').value;
  } else if (containerId === 'editTemplateTags') {
    categoryId = document.getElementById('editTemplateCategory').value;
  }
  
  if (!categoryId) {
    showToast('Selecciona una categoría primero', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, color, category_id: categoryId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando tag');
    }
    
    const newTag = await response.json();
    
    showToast('Tag creado exitosamente');
    
    // Actualizar datos globales
    if (allTags) {
      allTags.push(newTag);
    }
    
    // Recargar tags filtrados por la categoría
    updateTagCheckboxesInContainer(containerId, categoryId);
    
    // Seleccionar automáticamente el nuevo tag
    setTimeout(() => {
      const newCheckbox = document.querySelector(`#${containerId} input[value="${newTag.id}"]`);
      if (newCheckbox) {
        newCheckbox.checked = true;
      }
    }, 100);
    
    // Ocultar formulario
    hideQuickTagForm(containerId);
    
    // Actualizar tags en el filtro principal si es necesario
    if (String(categoryId) === String(selectedCategory)) {
      loadTags(selectedCategory);
    }
    
  } catch (error) {
    console.error('Error creando tag:', error);
    showToast(error.message, 'error');
  }
}

// Cargar categorías en los selectores de plantillas
function loadCategoriesForTemplateSelect() {
  const addSelect = document.getElementById('templateCategory');
  const editSelect = document.getElementById('editTemplateCategory');
  
  if (addSelect) {
    addSelect.innerHTML = '<option value="">Sin categoría</option>';
    categories.forEach(category => {
      const option = new Option(category.name, category.id);
      addSelect.add(option);
    });
  }
  
  if (editSelect) {
    editSelect.innerHTML = '<option value="">Sin categoría</option>';
    categories.forEach(category => {
      const option = new Option(category.name, category.id);
      editSelect.add(option);
    });
  }
}

// Abrir modal de tags
function openTagsModal() {
  document.getElementById('tagsModal').classList.remove('hidden');
  loadCategoriesForTagFilter();
  loadTagsList();
  loadCategoriesForTagSelect();
}

// Cerrar modal de tags
function closeTagsModal() {
  document.getElementById('tagsModal').classList.add('hidden');
}

// Cargar categorías para el filtro del modal de tags
function loadCategoriesForTagFilter() {
  const filterSelect = document.getElementById('categoryFilterSelect');
  
  // Limpiar y agregar opción "Todas"
  filterSelect.innerHTML = '<option value="all">Todas las categorías</option>';
  
  // Agregar categorías
  categories.forEach(category => {
    const option = new Option(category.name, category.id);
    filterSelect.add(option);
  });
  
  // Preseleccionar la categoría actual si hay una activa
  if (selectedCategory !== 'all') {
    filterSelect.value = selectedCategory;
    tagsCategoryFilter = selectedCategory;
  }
  
  // Agregar event listener para el filtro
  filterSelect.onchange = function() {
    loadTagsList(this.value);
  };
}

// Cargar categorías en los selectores del modal de tags
function loadCategoriesForTagSelect() {
  const addSelect = document.getElementById('tagCategoryId');
  const editSelect = document.getElementById('editTagCategoryId');
  
  // Limpiar selectores
  addSelect.innerHTML = '<option value="">Seleccionar categoría</option>';
  editSelect.innerHTML = '<option value="">Seleccionar categoría</option>';
  
  // Agregar categorías
  categories.forEach(category => {
    const option1 = new Option(category.name, category.id);
    const option2 = new Option(category.name, category.id);
    addSelect.add(option1);
    editSelect.add(option2);
  });
  
  // Preseleccionar categoría activa en el formulario de creación
  if (tagsCategoryFilter !== 'all') {
    addSelect.value = tagsCategoryFilter;
  }
}

// Variable global para almacenar el filtro de categoría en el modal
let tagsCategoryFilter = 'all';

// Cargar lista de tags con estadísticas
async function loadTagsList(categoryFilter = 'all') {
  const tbody = document.getElementById('tagsList');
  tbody.innerHTML = '';
  
  // Actualizar filtro global
  tagsCategoryFilter = categoryFilter;
  
  // Cargar todos los tags
  try {
    const response = await fetch(`${API_URL}/tags`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error cargando tags');
    
    const allTags = await response.json();
    
    // Contar uso de cada tag
    const tagUsage = {};
    allTags.forEach(tag => {
      tagUsage[tag.id] = templates.filter(t => 
        t.tags && t.tags.some(tt => tt.id === tag.id)
      ).length;
    });
    
    // Agrupar tags por categoría
    const tagsByCategory = {};
    allTags.forEach(tag => {
      const categoryName = tag.category_name || 'Sin categoría';
      if (!tagsByCategory[categoryName]) {
        tagsByCategory[categoryName] = [];
      }
      tagsByCategory[categoryName].push(tag);
    });
    
    // Filtrar tags por categoría si es necesario
    let tagsToShow = allTags;
    if (categoryFilter !== 'all') {
      tagsToShow = allTags.filter(tag => String(tag.category_id) === String(categoryFilter));
    }

    // Agrupar tags filtrados por categoría
    const filteredTagsByCategory = {};
    tagsToShow.forEach(tag => {
      const categoryName = tag.category_name || 'Sin categoría';
      if (!filteredTagsByCategory[categoryName]) {
        filteredTagsByCategory[categoryName] = [];
      }
      filteredTagsByCategory[categoryName].push(tag);
    });
    
    // Renderizar tags agrupados por categoría
    Object.keys(filteredTagsByCategory).sort().forEach(categoryName => {
      filteredTagsByCategory[categoryName].forEach(tag => {
        const tr = document.createElement('tr');
        tr.setAttribute('draggable', categoryFilter !== 'all' ? 'true' : 'false');
        tr.dataset.id = tag.id;
        tr.dataset.categoryId = tag.category_id || '';
        tr.innerHTML = `
          <td class="px-4 py-3">
            <span class="px-2 py-1 rounded text-sm ${tag.category_id ? `cat-filter-chip-${tag.category_id}` : 'bg-gray-100'}">
              ${categoryName}
            </span>
          </td>
          <td class="px-4 py-3 font-medium">
            <span class="inline-flex items-center gap-1">
              ${tag.icon ? `<i class="fas ${tag.icon}"></i>` : ''}
              ${tag.name}
            </span>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded tag-swatch-${tag.id}"></div>
              <span class="text-sm text-gray-600">${tag.color}</span>
            </div>
          </td>
          <td class="px-4 py-3">
            ${tag.icon ? `<i class="fas ${tag.icon}"></i>` : '-'}
          </td>
          <td class="px-4 py-3">
            <span class="bg-gray-100 px-2 py-1 rounded text-sm">${tagUsage[tag.id] || 0}</span>
          </td>
          <td class="px-4 py-3 text-right flex items-center gap-2 justify-end">
            ${categoryFilter !== 'all' ? `
            <button data-action="moveUpTag" data-id="${tag.id}" data-category-id="${tag.category_id}" title="Subir" class="text-gray-500 hover:text-gray-700"><i class='fas fa-chevron-up'></i></button>
            <button data-action="moveDownTag" data-id="${tag.id}" data-category-id="${tag.category_id}" title="Bajar" class="text-gray-500 hover:text-gray-700"><i class='fas fa-chevron-down'></i></button>
            ` : ''}
            <button data-action="editTag" data-id="${tag.id}" class="text-purple-600 hover:text-purple-800 mr-2">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="deleteTag" data-id="${tag.id}" class="text-red-600 hover:text-red-800">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
    if (categoryFilter !== 'all') {
      enableTagDragAndDrop(tbody, categoryFilter);
      attachTagClickHandlers(tbody, categoryFilter);
    }
  } catch (error) {
    console.error('Error cargando lista de tags:', error);
  }
}

// Drag & Drop para tags por categoría
let dragTagRow = null;
function enableTagDragAndDrop(tbody, categoryId) {
  tbody.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || tr.dataset.categoryId !== String(categoryId)) return;
    dragTagRow = tr;
    tr.classList.add('opacity-60');
    e.dataTransfer.effectAllowed = 'move';
  });
  tbody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tr = e.target.closest('tr');
    if (!tr || !dragTagRow) return;
    if (tr.dataset.categoryId !== String(categoryId)) return;
    const rect = tr.getBoundingClientRect();
    const after = (e.clientY - rect.top) / rect.height > 0.5;
    tr.parentNode.insertBefore(dragTagRow, after ? tr.nextSibling : tr);
  });
  tbody.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!dragTagRow) return;
    dragTagRow.classList.remove('opacity-60');
    dragTagRow = null;
    const rows = Array.from(tbody.querySelectorAll(`tr[data-category-id="${categoryId}"]`));
    const orders = rows.map((row, idx) => ({ id: row.dataset.id, order_index: idx }));
    try {
      const resp = await fetch(`${API_URL}/tags/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category_id: categoryId, orders })
      });
      if (!resp.ok) throw new Error('Error reordenando tags');
      showToast('Orden de tags actualizado', 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el orden', 'error');
    }
  });
}

// Click handlers para mover tags (compatible móvil)
function attachTagClickHandlers(tbody, categoryId) {
  tbody.onclick = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action !== 'moveUpTag' && action !== 'moveDownTag') return;
    if (String(btn.dataset.categoryId) !== String(categoryId)) return;
    const row = btn.closest('tr');
    if (!row) return;
    if (action === 'moveUpTag' && row.previousElementSibling) {
      // solo mover si el anterior pertenece a la misma categoría
      if (row.previousElementSibling.dataset.categoryId === String(categoryId)) {
        row.parentNode.insertBefore(row, row.previousElementSibling);
      }
    } else if (action === 'moveDownTag' && row.nextElementSibling) {
      if (row.nextElementSibling.dataset.categoryId === String(categoryId)) {
        row.parentNode.insertBefore(row.nextElementSibling, row);
      }
    } else {
      return;
    }
    const rows = Array.from(tbody.querySelectorAll(`tr[data-category-id="${categoryId}"]`));
    const orders = rows.map((r, idx) => ({ id: r.dataset.id, order_index: idx }));
    try {
      const resp = await fetch(`${API_URL}/tags/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ category_id: categoryId, orders })
      });
      if (!resp.ok) throw new Error('Error reordenando tags');
      showToast('Orden de tags actualizado', 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el orden', 'error');
    }
  };
}

// Añadir tag
async function addTag(e) {
  e.preventDefault();
  
  const name = document.getElementById('tagName').value;
  const color = document.getElementById('tagColor').value;
  const icon = document.getElementById('tagIcon').value;
  const category_id = document.getElementById('tagCategoryId').value;
  
  try {
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, color, icon, category_id })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando tag');
    }
    
    showToast('Tag creado exitosamente');
    document.getElementById('addTagForm').reset();
    loadTags(selectedCategory);
    loadTagsList(tagsCategoryFilter);
    loadCategoriesForTagSelect();
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  }
}

// Editar tag
async function editTag(tagId) {
  // Buscar el tag en todos los tags (no solo los filtrados)
  try {
    const response = await fetch(`${API_URL}/tags/${tagId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Tag no encontrado');
    
    const tag = await response.json();
    
    document.getElementById('editTagId').value = tag.id;
    document.getElementById('editTagName').value = tag.name;
    document.getElementById('editTagColor').value = tag.color;
    document.getElementById('editTagColorText').value = tag.color;
    document.getElementById('editTagIcon').value = tag.icon || '';
    document.getElementById('editTagCategoryId').value = tag.category_id || '';
    
    // Asegurarse de que las categorías están cargadas en el selector
    if (!document.getElementById('editTagCategoryId').options.length > 1) {
      loadCategoriesForTagSelect();
      setTimeout(() => {
        document.getElementById('editTagCategoryId').value = tag.category_id || '';
      }, 100);
    }
    
    updateTagIconPreview(tag.icon);
    document.getElementById('editTagModal').classList.remove('hidden');
  } catch (error) {
    console.error('Error cargando tag:', error);
    showToast('Error al cargar el tag', 'error');
  }
}

// Cerrar modal de edición de tag
function closeEditTagModal() {
  document.getElementById('editTagModal').classList.add('hidden');
}

// Actualizar preview del icono de tag
function updateTagIconPreview(icon) {
  const preview = document.getElementById('editTagIconPreview');
  if (icon) {
    preview.innerHTML = `<i class="fas ${icon}"></i>`;
  } else {
    preview.innerHTML = '<i class="fas fa-question text-gray-400"></i>';
  }
}

// Guardar cambios de tag
async function saveTagChanges(e) {
  e.preventDefault();
  
  const id = document.getElementById('editTagId').value;
  const name = document.getElementById('editTagName').value;
  const color = document.getElementById('editTagColor').value;
  const icon = document.getElementById('editTagIcon').value;
  const category_id = document.getElementById('editTagCategoryId').value;
  
  try {
    const response = await fetch(`${API_URL}/tags/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, color, icon, category_id })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error actualizando tag');
    }
    
    showToast('Tag actualizado exitosamente');
    closeEditTagModal();
    loadTags(selectedCategory);
    loadTagsList(tagsCategoryFilter);
    loadTemplates();
    
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  }
}

// Eliminar tag
async function deleteTag(id) {
  if (!confirm('¿Estás seguro de eliminar este tag? Se quitará de todas las plantillas.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/tags/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Error eliminando tag');
    
    showToast('Tag eliminado exitosamente');
    loadTags(selectedCategory);
    loadTagsList(tagsCategoryFilter);
    loadTemplates();
    
  } catch (error) {
    console.error('Error:', error);
    showToast('Error eliminando tag', 'error');
  }
}

// Event listeners para tags
document.addEventListener('DOMContentLoaded', () => {
  // Formulario de añadir tag
  const addTagForm = document.getElementById('addTagForm');
  if (addTagForm) {
    addTagForm.addEventListener('submit', addTag);
  }
  
  // Formulario de editar tag
  const editTagForm = document.getElementById('editTagForm');
  if (editTagForm) {
    editTagForm.addEventListener('submit', saveTagChanges);
  }
  
  // Sincronizar color picker con texto para tags
  const tagColorPicker = document.getElementById('editTagColor');
  const tagColorText = document.getElementById('editTagColorText');
  
  if (tagColorPicker && tagColorText) {
    tagColorPicker.addEventListener('change', (e) => {
      tagColorText.value = e.target.value;
    });
    
    tagColorText.addEventListener('input', (e) => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
        tagColorPicker.value = e.target.value;
      }
    });
  }
  
  // Preview del icono de tag
  const tagIconInput = document.getElementById('editTagIcon');
  if (tagIconInput) {
    tagIconInput.addEventListener('input', (e) => {
      updateTagIconPreview(e.target.value);
    });
  }
  
  // Filtro "Todos" para tags
  const allTagChip = document.querySelector('[data-tag="all"]');
  if (allTagChip) {
    allTagChip.addEventListener('click', () => toggleTagFilter('all'));
  }
});

// Exportar funciones de tags
window.openTagsModal = openTagsModal;
window.closeTagsModal = closeTagsModal;
window.editTag = editTag;
window.closeEditTagModal = closeEditTagModal;
window.deleteTag = deleteTag;
window.showQuickTagForm = showQuickTagForm;
window.hideQuickTagForm = hideQuickTagForm;
window.createQuickTag = createQuickTag;
