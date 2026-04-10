import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const baseUrl = req.nextUrl.origin;

  const js = `(function() {
  'use strict';

  var FORM_ID = ${JSON.stringify(formId)};
  var BASE_URL = ${JSON.stringify(baseUrl)};

  // Find the script tag that loaded us to place the form nearby
  var scripts = document.querySelectorAll('script[src*="/api/embed/"]');
  var currentScript = scripts[scripts.length - 1];
  if (!currentScript) return;

  // Create host container
  var host = document.createElement('div');
  host.id = 'ya-form-' + FORM_ID;
  currentScript.parentNode.insertBefore(host, currentScript.nextSibling);

  // Attach Shadow DOM
  var shadow = host.attachShadow({ mode: 'open' });

  // ---- Styles ----
  var style = document.createElement('style');
  style.textContent = \`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

    :host {
      all: initial;
      display: block;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #1a1a2e;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .ya-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 520px;
      margin: 0 auto;
      padding: 40px;
      position: relative;
    }

    .ya-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }

    .ya-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--accent, #ff7a59);
      border-radius: 50%;
      animation: ya-spin 0.7s linear infinite;
    }

    @keyframes ya-spin {
      to { transform: rotate(360deg); }
    }

    .ya-heading {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 6px;
    }

    .ya-description {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 32px;
      line-height: 1.5;
    }

    .ya-fields {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .ya-field-group {
      display: flex;
      flex-direction: column;
    }

    .ya-label {
      font-size: 13px;
      font-weight: 600;
      color: #33475b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .ya-required {
      color: #ef4444;
      margin-left: 2px;
    }

    .ya-input,
    .ya-textarea,
    .ya-select {
      width: 100%;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      color: #1a1a2e;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }

    .ya-input {
      height: 48px;
      padding: 0 16px;
    }

    .ya-textarea {
      min-height: 100px;
      padding: 12px 16px;
      resize: vertical;
      line-height: 1.5;
    }

    .ya-select {
      height: 48px;
      padding: 0 40px 0 16px;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 16px;
      cursor: pointer;
    }

    .ya-input:focus,
    .ya-textarea:focus,
    .ya-select:focus {
      border-color: var(--accent, #ff7a59);
      box-shadow: 0 0 0 3px var(--accent-ring, rgba(255, 122, 89, 0.15));
    }

    .ya-input::placeholder,
    .ya-textarea::placeholder {
      color: #9ca3af;
    }

    .ya-input.ya-field-error,
    .ya-textarea.ya-field-error,
    .ya-select.ya-field-error {
      border-color: #ef4444;
    }

    .ya-input.ya-field-error:focus,
    .ya-textarea.ya-field-error:focus,
    .ya-select.ya-field-error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }

    .ya-validation-error {
      font-size: 12px;
      color: #ef4444;
      margin-top: 4px;
      overflow: hidden;
      animation: ya-slide-down 0.2s ease-out;
    }

    @keyframes ya-slide-down {
      from { max-height: 0; opacity: 0; }
      to { max-height: 30px; opacity: 1; }
    }

    .ya-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: ya-slide-down 0.2s ease-out;
    }

    .ya-error-banner-text {
      font-size: 14px;
      color: #dc2626;
      flex: 1;
    }

    .ya-error-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: #dc2626;
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    .ya-error-dismiss:hover {
      opacity: 0.7;
    }

    .ya-submit {
      width: 100%;
      height: 52px;
      background: var(--accent, #ff7a59);
      color: #ffffff;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }

    .ya-submit:hover:not(:disabled) {
      background: var(--accent-hover, #e8643f);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--accent-shadow, rgba(255, 122, 89, 0.3));
    }

    .ya-submit:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 6px var(--accent-shadow, rgba(255, 122, 89, 0.2));
    }

    .ya-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .ya-submit-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: ya-spin 0.7s linear infinite;
    }

    .ya-honeypot {
      position: absolute;
      left: -9999px;
      opacity: 0;
      height: 0;
      width: 0;
      overflow: hidden;
    }

    /* Success state */
    .ya-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 260px;
      text-align: center;
      animation: ya-fade-in 0.4s ease-out;
    }

    @keyframes ya-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ya-success-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
    }

    .ya-success-heading {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .ya-success-message {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.5;
      max-width: 360px;
    }

    .ya-footer {
      text-align: center;
      margin-top: 24px;
    }

    .ya-footer a {
      font-size: 11px;
      color: #9ca3af;
      text-decoration: none;
      transition: color 0.2s;
    }

    .ya-footer a:hover {
      color: #6b7280;
    }

    /* Form fade-out */
    .ya-form-exiting {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }

    @media (max-width: 560px) {
      .ya-card {
        padding: 28px 20px;
        border-radius: 12px;
        margin: 0 8px;
      }
      .ya-heading {
        font-size: 20px;
      }
    }
  \`;

  shadow.appendChild(style);

  // ---- Card container ----
  var card = document.createElement('div');
  card.className = 'ya-card';
  shadow.appendChild(card);

  // Show loading
  card.innerHTML = '<div class="ya-loading"><div class="ya-spinner"></div></div>';

  // ---- Fetch form config ----
  fetch(BASE_URL + '/api/forms/' + FORM_ID)
    .then(function(res) {
      if (!res.ok) throw new Error('Form not found');
      return res.json();
    })
    .then(function(data) {
      var form = data.form || data;
      renderForm(form);
    })
    .catch(function(err) {
      card.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#6b7280;font-size:14px;">Unable to load form. Please try again later.</div>';
    });

  // ---- Helpers ----
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function darkenHex(hex, pct) {
    var c = hexToRgb(hex);
    var f = 1 - pct / 100;
    var r = Math.round(c.r * f);
    var g = Math.round(c.g * f);
    var b = Math.round(c.b * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---- Render ----
  function renderForm(formData) {
    var fields = formData.fields || [];
    var settings = formData.settings || {};
    var accent = settings.accentColor || '#ff7a59';
    var accentRgb = hexToRgb(accent);
    var accentHover = darkenHex(accent, 10);

    // Set CSS custom properties
    card.style.setProperty('--accent', accent);
    card.style.setProperty('--accent-hover', accentHover);
    card.style.setProperty('--accent-ring', 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',0.15)');
    card.style.setProperty('--accent-shadow', 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',0.3)');

    card.innerHTML = '';

    // Error banner container
    var errorBanner = document.createElement('div');
    errorBanner.id = 'ya-error-banner';
    errorBanner.style.display = 'none';
    card.appendChild(errorBanner);

    // Form element
    var formEl = document.createElement('form');
    formEl.id = 'ya-form';
    formEl.noValidate = true;
    card.appendChild(formEl);

    // Heading
    if (settings.heading) {
      var h = document.createElement('h2');
      h.className = 'ya-heading';
      h.textContent = settings.heading;
      formEl.appendChild(h);
    }

    // Description
    if (settings.description) {
      var desc = document.createElement('p');
      desc.className = 'ya-description';
      desc.textContent = settings.description;
      formEl.appendChild(desc);
    }

    // Fields container
    var fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'ya-fields';
    formEl.appendChild(fieldsContainer);

    // Render each field
    fields.forEach(function(field) {
      var group = document.createElement('div');
      group.className = 'ya-field-group';

      var label = document.createElement('label');
      label.className = 'ya-label';
      label.textContent = field.label;
      if (field.required) {
        var star = document.createElement('span');
        star.className = 'ya-required';
        star.textContent = ' *';
        label.appendChild(star);
      }
      label.setAttribute('for', 'ya-field-' + field.name);
      group.appendChild(label);

      var input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'ya-textarea';
      } else if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'ya-select';
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Select...';
        input.appendChild(defaultOpt);
        (field.options || []).forEach(function(opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.className = 'ya-input';
        input.type = field.type === 'phone' ? 'tel' : field.type || 'text';
      }

      input.id = 'ya-field-' + field.name;
      input.name = field.name;
      if (field.required) input.required = true;
      if (field.type !== 'select' && field.type !== 'textarea') {
        input.placeholder = field.label;
      }
      group.appendChild(input);

      fieldsContainer.appendChild(group);
    });

    // Honeypot field
    var honeypot = document.createElement('div');
    honeypot.className = 'ya-honeypot';
    honeypot.setAttribute('aria-hidden', 'true');
    var hpInput = document.createElement('input');
    hpInput.type = 'text';
    hpInput.name = 'website_url';
    hpInput.tabIndex = -1;
    hpInput.autocomplete = 'off';
    honeypot.appendChild(hpInput);
    formEl.appendChild(honeypot);

    // Hidden timestamp
    var tsInput = document.createElement('input');
    tsInput.type = 'hidden';
    tsInput.name = '_timestamp';
    tsInput.value = String(Date.now());
    formEl.appendChild(tsInput);

    // Submit button
    var btnWrap = document.createElement('div');
    btnWrap.style.marginTop = '8px';
    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'ya-submit';
    btn.textContent = settings.submitButtonText || 'Submit';
    btnWrap.appendChild(btn);
    fieldsContainer.appendChild(btnWrap);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'ya-footer';
    var footerLink = document.createElement('a');
    footerLink.href = 'https://yachtingadvisors.com';
    footerLink.target = '_blank';
    footerLink.rel = 'noopener noreferrer';
    footerLink.textContent = 'Powered by Yachting Advisors';
    footer.appendChild(footerLink);
    formEl.appendChild(footer);

    // ---- Form submission ----
    formEl.addEventListener('submit', function(e) {
      e.preventDefault();

      // Check honeypot
      if (hpInput.value) return;

      // Clear previous errors
      clearErrors();

      // Validate
      var valid = true;
      fields.forEach(function(field) {
        var el = shadow.getElementById('ya-field-' + field.name);
        if (!el) return;
        var val = el.value.trim();

        if (field.required && !val) {
          showFieldError(el, field.label + ' is required');
          valid = false;
          return;
        }

        if (field.type === 'email' && val) {
          var emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailRegex.test(val)) {
            showFieldError(el, 'Please enter a valid email address');
            valid = false;
          }
        }

        if (field.type === 'phone' && val) {
          var cleaned = val.replace(/[^\\d+]/g, '');
          if (cleaned.length < 7) {
            showFieldError(el, 'Please enter a valid phone number');
            valid = false;
          }
        }
      });

      if (!valid) return;

      // Collect data in the format the backend expects
      var fieldValues = {};
      fields.forEach(function(field) {
        var el = shadow.getElementById('ya-field-' + field.name);
        if (el) fieldValues[field.name] = el.value.trim();
      });
      var hpEl = shadow.querySelector('[name="website_url"]');
      var formDataObj = {
        form_id: FORM_ID,
        fields: fieldValues,
        hp: hpEl ? hpEl.value : '',
        ts: parseInt(tsInput.value, 10) || 0
      };

      // Set loading state
      btn.disabled = true;
      btn.innerHTML = '<div class="ya-submit-spinner"></div> Sending...';

      // Submit
      fetch(BASE_URL + '/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataObj)
      })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Submission failed'); });
        return res.json();
      })
      .then(function() {
        showSuccess(settings);
      })
      .catch(function(err) {
        showFormError(err.message || 'Something went wrong. Please try again.');
        btn.disabled = false;
        btn.innerHTML = settings.submitButtonText || 'Submit';
      });
    });

    function clearErrors() {
      var errs = shadow.querySelectorAll('.ya-validation-error');
      for (var i = 0; i < errs.length; i++) errs[i].remove();
      var errFields = shadow.querySelectorAll('.ya-field-error');
      for (var j = 0; j < errFields.length; j++) errFields[j].classList.remove('ya-field-error');
      errorBanner.style.display = 'none';
    }

    function showFieldError(el, message) {
      el.classList.add('ya-field-error');
      var errDiv = document.createElement('div');
      errDiv.className = 'ya-validation-error';
      errDiv.textContent = message;
      el.parentNode.appendChild(errDiv);
    }

    function showFormError(message) {
      errorBanner.style.display = '';
      errorBanner.className = 'ya-error-banner';
      errorBanner.innerHTML = '<span class="ya-error-banner-text">' + escapeHtml(message) + '</span><button class="ya-error-dismiss" type="button" aria-label="Dismiss">&times;</button>';
      var dismissBtn = errorBanner.querySelector('.ya-error-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', function() {
          errorBanner.style.display = 'none';
        });
      }
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }

    function showSuccess(settings) {
      var formEl = shadow.getElementById('ya-form');
      if (formEl) formEl.classList.add('ya-form-exiting');
      errorBanner.style.display = 'none';

      setTimeout(function() {
        card.innerHTML = '';
        var success = document.createElement('div');
        success.className = 'ya-success';

        // Checkmark SVG
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'ya-success-icon');
        svg.setAttribute('viewBox', '0 0 64 64');
        svg.setAttribute('fill', 'none');

        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', '32');
        circle.setAttribute('cy', '32');
        circle.setAttribute('r', '30');
        circle.setAttribute('stroke', accent);
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('fill', 'rgba(' + accentRgb.r + ',' + accentRgb.g + ',' + accentRgb.b + ',0.08)');
        svg.appendChild(circle);

        var check = document.createElementNS(svgNS, 'polyline');
        check.setAttribute('points', '20,33 28,41 44,25');
        check.setAttribute('stroke', accent);
        check.setAttribute('stroke-width', '3');
        check.setAttribute('stroke-linecap', 'round');
        check.setAttribute('stroke-linejoin', 'round');
        check.setAttribute('fill', 'none');
        svg.appendChild(check);

        success.appendChild(svg);

        var heading = document.createElement('h2');
        heading.className = 'ya-success-heading';
        heading.textContent = 'Thank you!';
        success.appendChild(heading);

        if (settings.successMessage) {
          var msg = document.createElement('p');
          msg.className = 'ya-success-message';
          msg.textContent = settings.successMessage;
          success.appendChild(msg);
        }

        card.appendChild(success);

        // Footer
        var footer = document.createElement('div');
        footer.className = 'ya-footer';
        var footerLink = document.createElement('a');
        footerLink.href = 'https://yachtingadvisors.com';
        footerLink.target = '_blank';
        footerLink.rel = 'noopener noreferrer';
        footerLink.textContent = 'Powered by Yachting Advisors';
        footer.appendChild(footerLink);
        card.appendChild(footer);
      }, 300);
    }
  }

})();`;

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
