/*
  Configuration des URLs n8n
  Laisser vides pour utiliser le mode localStorage mock
*/
const N8N_GET_URL = "https://n8n-u1vc.onrender.com/webhook/scan";    
const N8N_STORE_URL = "https://n8n-u1vc.onrender.com/webhook/store";  
const N8N_DELETE_URL = "https://n8n-u1vc.onrender.com/webhook/delete"; 

const appKey = 'monptiboo_demo_link_v2'; // Clé localStorage quand N8N pas configuré

// Variables globales
let currentIndex = 0;
const slidesCount = 3;

$(document).ready(function() {
    initializeApp();
});

function initializeApp() {
    initializeCarousel();
    initializeEventListeners();
    loadStoredValue();
    setSlide(0);
}

// =============================================================================
// GESTION DU CAROUSEL
// =============================================================================

function initializeCarousel() {
    setupTouchEvents();
    setupDotsNavigation();
    setupKeyboardNavigation();
}

function setSlide(index) {
    // Assurer que l'index reste dans les limites
    if (index < 0) index = 0;
    if (index >= slidesCount) index = slidesCount - 1;
    
    currentIndex = index;
    const percentage = -100 * index;
    
    $('#track').css('transform', `translateX(${percentage}%)`);
    updateDotsNavigation(index);
}

function updateDotsNavigation(activeIndex) {
    $('.dot').removeClass('active');
    $(`.dot[data-index="${activeIndex}"]`).addClass('active');
}

function setupTouchEvents() {
    let startX = null;
    
    $('#slides')
        .on('touchstart', function(e) {
            startX = e.originalEvent.touches[0].clientX;
        })
        .on('touchmove', function(e) {
            if (startX === null) return;
            const currentX = e.originalEvent.touches[0].clientX;
            const deltaX = currentX - startX;
            const slidesWidth = $('#slides').width();
            const transformValue = -100 * currentIndex + (deltaX / slidesWidth * 100);
            
            $('#track').css('transform', `translateX(${transformValue}%)`);
        })
        .on('touchend', function(e) {
            if (startX === null) return;
            
            const endX = e.originalEvent.changedTouches[0].clientX;
            const deltaX = endX - startX;
            
            if (Math.abs(deltaX) > 40) {
                if (deltaX < 0) {
                    setSlide(currentIndex + 1);
                } else {
                    setSlide(currentIndex - 1);
                }
            } else {
                setSlide(currentIndex);
            }
            
            startX = null;
        });
}

function setupDotsNavigation() {
    $('.dot').on('click keydown', function(e) {
        if (e.type === 'keydown' && !(e.key === 'Enter' || e.key === ' ')) return;
        const index = Number($(this).data('index'));
        setSlide(index);
    });
}

function setupKeyboardNavigation() {
    $(document).on('keydown', function(e) {
        if (e.key === 'ArrowLeft') setSlide(currentIndex - 1);
        if (e.key === 'ArrowRight') setSlide(currentIndex + 1);
    });
}

// =============================================================================
// GESTION DES ÉVÉNEMENTS
// =============================================================================

function initializeEventListeners() {
    setupInputEvents();
    setupButtonEvents();
    setupModalEvents();
}

function setupInputEvents() {
    $('#driveInput')
        .on('input', handleInputChange)
        .on('keypress', handleInputKeypress);
}

function setupButtonEvents() {
    $('#validateBtn').on('click', handleValidateClick);
    $('#ctaBtn').on('click', handleCTAClick);
    $('#trash').on('click', showDeleteConfirmation);
}

function setupModalEvents() {
    $(document)
        .on('click', '#cancelDelete', hideDeleteModal)
        .on('click', '#confirmDelete', confirmDelete);
}

// =============================================================================
// GESTION DE LA SAISIE UTILISATEUR
// =============================================================================

function handleInputChange() {
    const hasValue = $(this).val().trim().length > 0;
    $('#validateBtn').toggle(hasValue);
    $('#trash').hide(); // Cacher la poubelle pendant la saisie
}

function handleInputKeypress(e) {
    if (e.which === 13) { // Touche Entrée
        handleInputSave.call(this);
    }
}

function handleValidateClick() {
    handleInputSave.call($('#driveInput'));
}

// =============================================================================
// VALIDATION ET SAUVEGARDE
// =============================================================================

function looksLikeUrl(input) {
    try {
        const url = new URL(input);
        return ['http:', 'https:'].includes(url.protocol);
    } catch (e) {
        return false;
    }
}

async function handleInputSave() {
    const inputValue = $(this).val().trim();
    
    if (inputValue && looksLikeUrl(inputValue)) {
        await saveLinkToServer(inputValue);
    } else if (inputValue && inputValue.length > 0) {
        showUrlValidationError();
    }
}

async function saveLinkToServer(linkValue) {
    const { uid, token } = getUrlParams();
    
    setIconLoading();
    
    try {
        const response = await $.ajax({
            url: N8N_STORE_URL,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                folder_url: linkValue,
                uid: uid,
                token: token,
                timestamp: new Date().toISOString(),
            })
        });
        
        const result = Array.isArray(response) ? response[0] : response;
        console.log('Save result:', result);
        
        if (result.uid) {
            handleSaveSuccess();
        } else {
            handleSaveError();
        }
        
    } catch (error) {
        console.error('Erreur API:', error);
        handleSaveError();
    }
}

function handleSaveSuccess() {
    setIconSuccess();
    $('#validateBtn').hide();
    
    $('#driveInput')
        .prop('disabled', true)
        .css('background-color', '#f8f9fa')
        .attr('placeholder', 'Lien enregistré avec succès !');
    
    showToast('✓ Sauvegarde réussie !', 'success');
    updateCTAState();
}

function handleSaveError() {
    setIconError();
    showToast('❌ Erreur de sauvegarde', 'error');
}

function showUrlValidationError() {
    setIconError();
    showToast('Veuillez vérifier le format du lien', 'error');
}

// =============================================================================
// SUPPRESSION
// =============================================================================

function showDeleteConfirmation() {
    createDeleteModalIfNeeded();
    $('#deleteModal').fadeIn(300);
}

function createDeleteModalIfNeeded() {
    if ($('#deleteModal').length === 0) {
        $('body').append(`
            <div id="deleteModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer le lien vers votre coffre digital ?</p>
                        <p><strong>Vos fichiers ne seront pas supprimés</strong> - seul le lien sera retiré.</p>
                    </div>
                    <div class="modal-actions">
                        <button id="cancelDelete" class="btn-secondary">Annuler</button>
                        <button id="confirmDelete" class="btn-primary">Supprimer</button>
                    </div>
                </div>
            </div>
        `);
    }
}

function hideDeleteModal() {
    $('#deleteModal').fadeOut(300);
}

async function confirmDelete() {
    hideDeleteModal();
    await handleInputDelete();
}

async function handleInputDelete() {
    const { uid, token } = getUrlParams();
    
    // Afficher le loading sur l'icône de poubelle
    $('#trash i').removeClass('fa-trash').addClass('fa-spinner fa-spin');
    
    try {
        const response = await $.ajax({
            url: N8N_DELETE_URL,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                uid: uid,
                token: token
            })
        });
        
        const result = Array.isArray(response) ? response[0] : response;
        console.log('Delete result:', result);
        
        resetInterfaceAfterDelete();
        showToast('Lien supprimé avec succès !', 'success');
        
    } catch (error) {
        console.error('Erreur suppression:', error);
        handleDeleteError();
    }
}

function resetInterfaceAfterDelete() {
    setIconDefault();
    enableInput();
    $('#driveInput').val('');
    $('#validateBtn').hide();
    $('#trash').hide();
    updateCTAState();
    
    // Remettre l'icône poubelle normale
    $('#trash i').removeClass('fa-spinner fa-spin').addClass('fa-trash');
}

function handleDeleteError() {
    // Remettre l'icône poubelle normale en cas d'erreur
    $('#trash i').removeClass('fa-spinner fa-spin').addClass('fa-trash');
    showToast('❌ Erreur lors de la suppression', 'error');
}

// =============================================================================
// GESTION DES ICÔNES
// =============================================================================

function setIconLoading() {
    const icon = $('#linkIcon');
    icon.removeClass('fa-link fa-check fa-xmark icon-success icon-error')
        .addClass('fa-spinner icon-loading');
}

function setIconSuccess() {
    const icon = $('#linkIcon');
    icon.removeClass('fa-spinner fa-xmark icon-loading icon-error')
        .addClass('fa-link icon-success');
}

function setIconError() {
    const icon = $('#linkIcon');
    icon.removeClass('fa-spinner fa-check icon-loading icon-success')
        .addClass('fa-link icon-error');
}

function setIconDefault() {
    const icon = $('#linkIcon');
    icon.removeClass('fa-spinner fa-check fa-xmark icon-loading icon-success icon-error')
        .addClass('fa-link')
        .css('color', '#b49b92');
}

// =============================================================================
// GESTION DE L'INTERFACE
// =============================================================================

function enableInput() {
    $('#driveInput')
        .prop('disabled', false)
        .css({
            'background-color': 'white',
            'border-color': 'rgba(242,215,207,0.9)',
            'opacity': '1'
        })
        .attr('placeholder', 'Collez votre lien Drive ici...');
}

function updateCTAState() {
    const hasValidValue = $('#driveInput').val() && $('#driveInput').val().trim().length > 5;
    
    if (hasValidValue) {
        $('#ctaBtn')
            .removeClass('disabled')
            .attr('aria-disabled', 'false');
        $('.field').css('border', '2px solid #22c55e');
        $('#trash').show();
    } else {
        $('#ctaBtn')
            .addClass('disabled')
            .attr('aria-disabled', 'true');
        $('#trash').hide();
    }
}

function handleCTAClick() {
    const url = $('#driveInput').val() && $('#driveInput').val().trim() || '';
    
    if (url && looksLikeUrl(url)) {
        window.open(url, '_blank');
    } else {
        shakeInputField();
    }
}

function shakeInputField() {
    $('#driveInput').animate({
        'margin-left': '-6px'
    }, 130).animate({
        'margin-left': '6px'
    }, 130).animate({
        'margin-left': '0'
    }, 130);
}

// =============================================================================
// NOTIFICATIONS ET UTILITAIRES
// =============================================================================

function showToast(message, type = 'success') {
    const toast = $('#toast');
    
    // Réinitialiser les classes et styles
    toast.removeClass('error success').addClass(type);
    toast.text(message);
    
    // S'assurer qu'il est visible et opaque
    toast.css({
        'display': 'block',
        'opacity': '1'
    }).fadeIn(300);
    
    setTimeout(() => {
        toast.fadeOut(300);
    }, 3000);
}

function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        uid: urlParams.get('uid'),
        token: urlParams.get('token')
    };
}

// =============================================================================
// CHARGEMENT INITIAL
// =============================================================================

async function loadStoredValue() {
    const { uid, token } = getUrlParams();
    
    if (N8N_GET_URL) {
        try {
            // Loading 
            setIconLoading()
            $('#driveInput')
            .prop('disabled', true)
            .css({
                'background-color': 'white',
                'border-color': 'rgba(242,215,207,0.9)',
                'opacity': '1'
            })
            .attr('placeholder', 'Recherche en cours ...');
            const url = new URL(N8N_GET_URL);
            if (uid) url.searchParams.append('uid', uid);
            if (token) url.searchParams.append('token', token);
            
            const data = await $.get(url.toString());
            const result = Array.isArray(data) ? data[0] : data;
            console.log('get result:', result);
            
            if (result && result.uid != '') {
                console.log("uid"+uid)
                if (result && result.folder_url) {
                    console.log("folder"+result.folder_url)
                    $('#driveInput').val(result.folder_url);
                    // Si un lien est trouvé, mettre à jour l'interface en conséquence
                    setIconSuccess();
                    $('#validateBtn').hide();
                    $('#driveInput').prop('disabled', true);
                    $('#driveInput').css('background-color', '#f8f9fa');
                }else{
                     // y'a rien
                setIconDefault()
                enableInput()
               
                }
            } else {
                // y'a rien
                setIconDefault()
                enableInput()
            }
            
        } catch (e) {
            console.warn('Erreur n8n get:', e);
            setIconError()
        }
    } else {
        // Fallback localStorage
        const storedValue = localStorage.getItem(appKey);
        if (storedValue) {
            $('#driveInput').val(storedValue);
        }
    }
    updateCTAState();
}