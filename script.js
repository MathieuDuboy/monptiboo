/*
  Configure these URLs with your n8n endpoints if you have them.
  Leave empty to use localStorage mock mode.
*/
const N8N_GET_URL = "";    // e.g. "https://n8n.example/webhook/get-link?badge_id=XYZ"
const N8N_STORE_URL = "";  // e.g. "https://n8n.example/webhook/store-link"
const N8N_DELETE_URL = ""; // e.g. "https://n8n.example/webhook/delete-link"

const appKey = 'monptiboo_demo_link_v2'; // localStorage key when N8N not configured

$(document).ready(function() {
  let currentIndex = 0;
  const slidesCount = 3;
  
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

  // Set slide function
  function setSlide(i) {
    if (i < 0) i = 0;
    if (i >= slidesCount) i = slidesCount - 1;
    currentIndex = i;
    const pct = -100 * i;
    $('#track').css('transform', 'translateX(' + pct + '%)');
    $('.dot').removeClass('active');
    $('.dot[data-index="' + i + '"]').addClass('active');
  }

  /* Touch swipe */
  let startX = null;
  $('#slides')
    .on('touchstart', function(e) {
      startX = e.originalEvent.touches[0].clientX;
    })
    .on('touchmove', function(e) {
      if (startX === null) return;
      const dx = e.originalEvent.touches[0].clientX - startX;
      $('#track').css('transform', 'translateX(' + (-100 * currentIndex + dx / $('#slides').width() * 100) + '%)');
    })
    .on('touchend', function(e) {
      if (startX === null) return;
      const dx = e.originalEvent.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) setSlide(currentIndex + 1);
        else setSlide(currentIndex - 1);
      } else {
        setSlide(currentIndex);
      }
      startX = null;
    });

  /* Dots click/keyboard */
  $('.dot').on('click keydown', function(e) {
    if (e.type === 'keydown' && !(e.key === 'Enter' || e.key === ' ')) return;
    setSlide(Number($(this).data('index')));
  });

  /* Validate URL-ish */
  function looksLikeUrl(s) {
    try {
      const u = new URL(s);
      return ['http:', 'https:'].includes(u.protocol);
    } catch (e) {
      return false;
    }
  }

  /* Update CTA & trash visibility */
  function updateCTAState() {
    const val = $('#driveInput').val() && $('#driveInput').val().trim().length > 5;
    if (val) {
      $('#ctaBtn').removeClass('disabled').attr('aria-disabled', 'false');
      $('.field').css('border', '2px solid #22c55e');      $('#trash').show();
    } else {
      $('#ctaBtn').addClass('disabled').attr('aria-disabled', 'true');
      $('#trash').hide();
    }
  }

  /* CTA click */
  $('#ctaBtn').on('click', function() {
    const url = $('#driveInput').val() && $('#driveInput').val().trim() || '';
    if (url && looksLikeUrl(url)) {
      window.open(url, '_blank');
    } else {
      // small shake
      $('#driveInput').animate({
        'margin-left': '-6px'
      }, 130).animate({
        'margin-left': '6px'
      }, 130).animate({
        'margin-left': '0'
      }, 130);
    }
  });

    // Modal de confirmation pour suppression
    $('#trash').on('click', function() {
        // Créer la modale si elle n'existe pas
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
        
        // Afficher la modale
        $('#deleteModal').fadeIn(300);
    });

    // Annuler
    $(document).on('click', '#cancelDelete', function() {
        $('#deleteModal').fadeOut(300);
    });

    // Confirmer la suppression
    $(document).on('click', '#confirmDelete', function() {
        $('#deleteModal').fadeOut(300);
        // Ici tu appelleras ta fonction de suppression
        //deleteLink();*
        showToast('Lien supprimé avec succès !', 'success');

    });


  let saveTimeout;
  /* Input events -> store on blur */
  $('#driveInput')
  .on('input', updateCTAState)
  .on('focusout', function() {
      // Petit délai pour être sûr que l'utilisateur a vraiment fini
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
          const v = $(this).val() && $(this).val().trim();
          if (v && looksLikeUrl(v)) {
              //await storeLink(v);
              showToast('Lien enregistré avec succès !', 'success');
          } else if (v && v.length > 0) {
              showToast('Veuillez vérifier le format du lien', 'error');
          }
          //updateCTAState();
      }, 300); // 300ms de délai
  });

  /* Load stored value on init */
  async function loadStored() {
    if (N8N_GET_URL) {
      try {
        const data = await $.get(N8N_GET_URL);
        if (data && data.link) $('#driveInput').val(data.link);
      } catch (e) {
        console.warn('n8n get error', e);
      }
    } else {
      const v = localStorage.getItem(appKey);
      if (v) $('#driveInput').val(v);
    }
    updateCTAState();
  }

  /* Keyboard support */
  $(document).on('keydown', function(e) {
    if (e.key === 'ArrowLeft') setSlide(currentIndex - 1);
    if (e.key === 'ArrowRight') setSlide(currentIndex + 1);
  });

  /* Init */
  setSlide(0);
  loadStored();
});