/* Colour search module — shared logic for the kiln and hot shop catalogues.
   Usage:  ColorSearch.mount('#el', { data: 'colors/kiln-colors.json', mode: 'kiln' });
   Both modes read the same JSON shape; only the filter groups and the
   detail panel differ. */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- labels
  var CHEM_LABEL = {
    copper: 'Contains copper',
    sulfur: 'Contains sulfur',
    sulfur_selenium: 'Contains sulfur / selenium',
    copper_and_sulfur: 'Contains copper and sulfur',
    lead: 'Contains lead',
    reactive: 'Reactive base, no copper, sulfur or lead',
    alchemy: 'Alchemy, reacts with silver',
    none: 'No copper, sulfur or lead',
    unclassified: 'Not classified'
  };
  var CHEM_SHORT = {
    copper: 'Copper', sulfur: 'Sulfur / selenium', lead: 'Lead',
    reactive: 'Reactive base', alchemy: 'Alchemy', none: 'None of these'
  };
  var CHEM_ELEM = {
    copper: 'copper-bearing', sulfur: 'sulfur-bearing',
    sulfur_selenium: 'sulfur or selenium-bearing',
    copper_and_sulfur: 'copper-and-sulfur-bearing',
    lead: 'lead-bearing', reactive: 'reactive', alchemy: 'Alchemy',
    none: 'copper, sulfur and lead free'
  };
  // chip -> every stored value that contains that element
  var CHEM_MATCH = {
    copper: ['copper', 'copper_and_sulfur'],
    sulfur: ['sulfur', 'sulfur_selenium', 'copper_and_sulfur'],
    lead: ['lead'],
    reactive: ['reactive'],
    alchemy: ['alchemy'],
    none: ['none']
  };
  var CHEM_TONE = {
    copper: 'copper', copper_and_sulfur: 'copper',
    sulfur: 'sulfur', sulfur_selenium: 'sulfur',
    lead: 'lead', reactive: 'reactive', alchemy: 'alchemy', none: 'none'
  };
  var METAL_NOTE = {
    sulfur_selenium: 'Also reacts with silver. Many glasses can stain when fired with silver.',
    alchemy: 'Formulated to react with silver.',
    reactive: 'May also react with copper leaf and silver.'
  };
  var REACTS_WITH = {
    Bullseye: {
      copper: ['sulfur_selenium', 'reactive'],
      sulfur_selenium: ['copper', 'lead'],
      lead: ['sulfur_selenium'],
      reactive: ['copper'],
      alchemy: []
    },
    Wissmach: {
      copper: ['sulfur', 'copper_and_sulfur'],
      sulfur: ['copper', 'copper_and_sulfur'],
      copper_and_sulfur: ['copper', 'sulfur', 'copper_and_sulfur']
    },
    Oceanside: {}
  };

  var CAT_LABEL = {
    opalescent: 'Opalescent', transparent: 'Transparent',
    streaky_2color: 'Streaky, 2 color', streaky_3color: 'Streaky, 3 color',
    collage: 'Collage', ring_mottle: 'Ring mottle', opaque: 'Opaque',
    prisma: 'Prisma', translucent: 'Translucent',
    semi_translucent: 'Semi-translucent', pearl_opal: 'Pearl Opal',
    opalart: 'OpalArt', spirit: 'Spirit', baroque: 'Baroque',
    casting: 'Casting billet', aventurine: 'Aventurine', disc: 'Disc'
  };
  var OPACITY_OF = {
    transparent: 'transparent', opalescent: 'opaque', opaque: 'opaque',
    ring_mottle: 'opaque', streaky_2color: 'mixed', streaky_3color: 'mixed',
    prisma: 'mixed', collage: 'mixed', translucent: 'mixed',
    semi_translucent: 'mixed', pearl_opal: 'mixed', opalart: 'mixed',
    spirit: 'mixed', baroque: 'mixed'
  };
  var OPACITY_LABEL = {
    transparent: 'Transparent', opaque: 'Opaque / opal', mixed: 'Streaky / mixed'
  };

  var KILN_FORM_ABBR = {
    sheet: 'SH', frit: 'FR', powder: 'PW', stringer: 'ST',
    rod: 'RD', billet: 'BI', confetti: 'CO', ribbon: 'RB', noodle: 'ND'
  };
  var KILN_FORM_LABEL = {
    sheet: 'Sheet', frit: 'Frit', powder: 'Powder', stringer: 'Stringer',
    rod: 'Rod', billet: 'Billet', confetti: 'Confetti', ribbon: 'Ribbon',
    noodle: 'Noodle'
  };
  var HOT_FORM_ABBR = {
    bar: 'ROD', powder: 'PWD', disc: 'DISC', frit_00: '00', frit_0: '0',
    frit_1: '1', frit_2: '2', frit_3: '3', frit_4: '4', frit_5: '5'
  };
  var HOT_FORM_ORDER = ['bar', 'powder', 'disc', 'frit_00', 'frit_0',
    'frit_1', 'frit_2', 'frit_3', 'frit_4', 'frit_5'];

  var OP_LABEL_HOT = {
    transparent: 'Transparent', opaque: 'Opaque', aventurine: 'Aventurine',
    disc: 'Disc'
  };

  // ---------------------------------------------------------------- helpers
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function uniq(a) { var s = []; a.forEach(function (x) { if (x && s.indexOf(x) < 0) s.push(x); }); return s; }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function list(names) {
    return names.length > 1
      ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
      : names[0];
  }

  function behLabel(c) {
    if (c.strikes && c.reduces) return 'Strikes + reduces';
    if (c.strikes) return 'Strikes';
    if (c.reduces) return 'Reduces';
    return null;
  }

  // ---------------------------------------------------------------- mount
  function mount(target, opts) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return;
    opts = opts || {};
    var mode = opts.mode === 'hotshop' ? 'hotshop' : 'kiln';

    host.classList.add('cs-root');
    host.innerHTML =
      '<div class="cs-controls">' +
        '<div class="cs-searchrow">' +
          '<input type="search" autocomplete="off" spellcheck="false" ' +
            'aria-label="Search colours" placeholder="' +
            (mode === 'kiln' ? 'Search name or code'
                             : 'Search name, number or German name') + '">' +
          '<button class="cs-ghost" type="button" hidden>Clear</button>' +
        '</div>' +
        '<div class="cs-filters"></div>' +
        '<div class="cs-count"></div>' +
      '</div>' +
      '<ul class="cs-results"><li class="cs-loading">Loading colours…</li></ul>';

    var input = host.querySelector('input');
    var clearBtn = host.querySelector('.cs-ghost');
    var filterBar = host.querySelector('.cs-filters');
    var countEl = host.querySelector('.cs-count');
    var listEl = host.querySelector('.cs-results');

    fetch(opts.data)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (DB) { start(DB); })
      .catch(function (err) {
        listEl.innerHTML = '<li class="cs-empty"><b>Could not load the colour data.</b>' +
          'Expected it at <code>' + esc(opts.data) + '</code>. ' + esc(err.message) + '</li>';
      });

    function start(DB) {
      var colors = DB.colors;
      colors.forEach(function (c) {
        c._op = mode === 'kiln' ? (OPACITY_OF[c.category] || null) : c.opacity;
      });

      var brands = uniq(colors.map(function (c) { return c.brand; }));
      var hues = uniq(colors.map(function (c) { return c.hue; })).sort();
      var coeOf = {};
      colors.forEach(function (c) { if (!coeOf[c.brand]) coeOf[c.brand] = c.coe; });

      var GROUPS;
      if (mode === 'kiln') {
        var chems = ['copper', 'sulfur', 'lead', 'reactive', 'alchemy', 'none']
          .filter(function (k) {
            return colors.some(function (c) { return CHEM_MATCH[k].indexOf(c.chemistry) > -1; });
          });
        GROUPS = [
          { key: 'brand', label: 'Glass', opts: brands,
            text: function (v) { return v + (coeOf[v] ? ' \u00b7 COE ' + coeOf[v] : ''); } },
          { key: 'opacity', label: 'Opacity',
            opts: ['transparent', 'opaque', 'mixed'].filter(function (o) {
              return colors.some(function (c) { return c._op === o; }); }),
            text: function (v) { return OPACITY_LABEL[v]; } },
          { key: 'chemistry', label: 'Contains', opts: chems, dot: 'chem',
            text: function (v) { return CHEM_SHORT[v] || CHEM_LABEL[v]; } },
          { key: 'hue', label: 'Color', opts: hues, text: cap },
          { key: 'form', label: 'Form',
            opts: ['sheet', 'frit', 'powder', 'stringer', 'rod', 'billet', 'confetti', 'ribbon']
              .filter(function (f) { return colors.some(function (c) { return (c.forms || {})[f]; }); }),
            text: function (v) { return KILN_FORM_LABEL[v]; } }
        ];
      } else {
        GROUPS = [
          { key: 'brand', label: 'Glass', opts: brands, text: function (v) { return v; } },
          { key: 'behaviour', label: 'Working', opts: ['strike', 'reduce'], dot: 'beh',
            text: function (v) { return v === 'strike' ? 'Strikes' : 'Reduces'; } },
          { key: 'opacity', label: 'Opacity',
            opts: uniq(colors.map(function (c) { return c.opacity; })),
            text: function (v) { return OP_LABEL_HOT[v] || cap(v); } },
          { key: 'hue', label: 'Color', opts: hues, text: cap },
          { key: 'form', label: 'Form',
            opts: HOT_FORM_ORDER.filter(function (f) {
              return colors.some(function (c) { return (c.forms || {})[f]; }); }),
            text: function (v) {
              return { bar: 'Rod', powder: 'Powder', disc: 'Disc' }[v] || 'Frit ' + v.split('_')[1];
            } },
          { key: 'leadfree', label: 'Lead', opts: ['yes'], text: function () { return 'Lead-free'; } }
        ];
      }

      var state = { q: '' };
      GROUPS.forEach(function (g) { state[g.key] = null; });

      // ---- chips
      GROUPS.forEach(function (g) {
        if (!g.opts.length) return;
        var row = document.createElement('div');
        row.className = 'cs-fgroup';
        var lab = document.createElement('span');
        lab.className = 'cs-flabel';
        lab.textContent = g.label;
        row.appendChild(lab);
        var wrap = document.createElement('span');
        wrap.className = 'cs-fchips';
        g.opts.forEach(function (opt) {
          var b = document.createElement('button');
          b.className = 'cs-chip';
          b.type = 'button';
          b.setAttribute('aria-pressed', 'false');
          b.dataset.key = g.key;
          b.dataset.val = opt;
          if (g.dot) {
            var d = document.createElement('span');
            d.className = 'cs-dot';
            d.style.background = 'var(--' + (g.dot === 'chem' ? 'chem-' : 'beh-') + opt + ')';
            b.appendChild(d);
          }
          b.appendChild(document.createTextNode(g.text(opt)));
          b.addEventListener('click', function () {
            state[g.key] = state[g.key] === opt ? null : opt;
            sync(); render();
          });
          wrap.appendChild(b);
        });
        row.appendChild(wrap);
        filterBar.appendChild(row);
      });

      function sync() {
        Array.prototype.forEach.call(filterBar.querySelectorAll('.cs-chip'), function (b) {
          b.setAttribute('aria-pressed', String(state[b.dataset.key] === b.dataset.val));
        });
        var any = state.q || GROUPS.some(function (g) { return state[g.key]; });
        clearBtn.hidden = !any;
      }

      // ---- search
      function hay(c) {
        if (c._h) return c._h;
        c._h = [
          c.code, c.name, c.brand, c.german_name || '', c.also_known_as || '',
          'coe' + (c.coe || ''), (c.category || '').replace(/_/g, ' '), c.hue || '',
          CHEM_LABEL[c.chemistry] || '', behLabel(c) || '', c.leadfree ? 'lead-free' : '',
          (c.variants || []).map(function (v) { return (v.suffix || '') + ' ' + (v.description || ''); }).join(' '),
          (c.item_codes || []).map(function (v) { return v.code + ' ' + v.form; }).join(' '),
          Object.keys(c.forms || {}).join(' ')
        ].join(' ').toLowerCase();
        return c._h;
      }

      function matches(c) {
        if (state.brand && c.brand !== state.brand) return false;
        if (state.opacity && c._op !== state.opacity) return false;
        if (state.hue && c.hue !== state.hue) return false;
        if (state.form && !(c.forms || {})[state.form]) return false;
        if (state.chemistry &&
            (CHEM_MATCH[state.chemistry] || []).indexOf(c.chemistry) < 0) return false;
        if (state.behaviour === 'strike' && !c.strikes) return false;
        if (state.behaviour === 'reduce' && !c.reduces) return false;
        if (state.leadfree === 'yes' && !c.leadfree) return false;
        if (state.q) {
          var h = hay(c);
          return state.q.toLowerCase().split(/\s+/).every(function (t) {
            return !t || h.indexOf(t) > -1;
          });
        }
        return true;
      }

      // ---- detail
      function detail(c) {
        var h = '<dl>';
        h += '<dt>Maker</dt><dd>' + esc(c.brand) + (c.coe ? ', COE ' + c.coe : '') + '</dd>';
        if (c.product_type) h += '<dt>Sold as</dt><dd>' + esc(c.product_type) + '</dd>';
        if (c.buy_url) {
          h += '<dt>Buy / preview</dt><dd><a href="' + esc(c.buy_url) +
               '" target="_blank" rel="noopener noreferrer">' +
               esc(c.retailer || 'View colour') + '</a></dd>';
        }
        if (mode === 'kiln') {
          h += '<dt>Type</dt><dd>' + esc(CAT_LABEL[c.category] || c.category) + '</dd>';
          h += '<dt>Chemistry</dt><dd>' + esc(CHEM_LABEL[c.chemistry] || c.chemistry) + '</dd>';
        } else {
          h += '<dt>Opacity</dt><dd>' + esc(OP_LABEL_HOT[c.opacity] || c.opacity) + '</dd>';
          if (c.german_name) h += '<dt>German</dt><dd>' + esc(c.german_name) + '</dd>';
          if (c.also_known_as) h += '<dt>Also called</dt><dd>' + esc(c.also_known_as) + '</dd>';
          var bl = behLabel(c);
          if (bl) h += '<dt>Behaviour</dt><dd>' + bl + '</dd>';
          if (c.leadfree) h += '<dt>Lead</dt><dd>Lead-free</dd>';
        }
        if (c.price_code) h += '<dt>Price tier</dt><dd>' + esc(c.price_code) + '</dd>';
        var asof = DB.price_as_of ? ' <span class="cs-asof">as of ' + fmtDate(DB.price_as_of) + '</span>' : '';
        if (c.price_per_kg) h += '<dt>Price</dt><dd>$' + c.price_per_kg.toFixed(0) + ' per kg' + asof + '</dd>';
        else if (c.price_each) h += '<dt>Price</dt><dd>$' + c.price_each.toFixed(2) +
          (mode === 'kiln' ? ' per billet' : ' each') + asof + '</dd>';
        if (mode === 'kiln') {
          var forms = Object.keys(KILN_FORM_LABEL).filter(function (k) { return (c.forms || {})[k]; })
            .map(function (k) { return KILN_FORM_LABEL[k]; });
          h += '<dt>Available as</dt><dd>' + (forms.length ? forms.join(', ') : 'Sheet only') + '</dd>';
        }
        h += '</dl>';

        if (mode === 'kiln' && c.item_codes && c.item_codes.length) {
          h += '<h3>Order codes</h3><ul class="cs-codes">';
          c.item_codes.forEach(function (it) {
            h += '<li><span class="cs-ic">' + esc(it.code) + '</span> ' + esc(it.form) + '</li>';
          });
          h += '</ul>';
        } else if (c.variants && c.variants.length) {
          h += '<h3>Variants</h3><ul>';
          c.variants.forEach(function (v) {
            h += '<li>' + esc(v.description || v.suffix) + '</li>';
          });
          h += '</ul>';
        }

        if (mode === 'hotshop') {
          var offered = HOT_FORM_ORDER.filter(function (k) { return (c.forms || {})[k]; });
          h += '<h3>Forms</h3><ul>';
          if (offered.length) {
            offered.forEach(function (k) {
              h += '<li>' + esc((DB.form_scale || {})[k] || k) + '</li>';
            });
          } else {
            h += '<li>None listed by the retailer.</li>';
          }
          h += '</ul>';
        }

        if (mode === 'kiln') {
          var partners = (REACTS_WITH[c.brand] || {})[c.chemistry];
          if (partners) {
            var txt = '';
            if (partners.length) {
              txt = 'Reacts against ' + list(partners.map(function (p) { return CHEM_ELEM[p] || p; })) + ' glass.';
            }
            if (c.chemistry === 'copper_and_sulfur') {
              txt += ' Carrying both, it can also react within the sheet itself.';
            }
            if (METAL_NOTE[c.chemistry]) txt += (txt ? ' ' : '') + METAL_NOTE[c.chemistry];
            txt += ' Reaction groups apply within ' + c.brand + ' only.';
            h += '<div class="cs-note"><strong>' + esc(CHEM_LABEL[c.chemistry]) + '.</strong> ' + txt + '</div>';
          } else if (c.chemistry === 'none') {
            h += '<div class="cs-note">' + esc(c.brand) + ' lists this as containing no copper, ' +
                 'sulfur or lead, so it will not form a reaction line against those.' +
                 (c.chemistry_note ? ' ' + esc(c.chemistry_note) : '') + '</div>';
          } else if (c.brand === 'Oceanside') {
            h += '<div class="cs-note cs-quiet">Oceanside does not publish a reaction chart, ' +
                 'so nothing is classified here. Fire a test tile before committing.</div>';
          } else {
            h += '<div class="cs-note cs-quiet">Not on ' + esc(c.brand) + '\u2019s reaction chart. ' +
                 'That does not rule out a reaction. Fire a test tile before committing.</div>';
          }
          if (c.strikes === true) {
            h += '<div class="cs-note"><strong>Strikes.</strong> Cold color is not fired color. ' +
                 'Flagged from the maker\u2019s own product naming, so a blank here does not rule out striking.</div>';
          }
          if (!c.tested_compatible) {
            h += '<div class="cs-note cs-warn"><strong>Not fusible.</strong> ' + esc(c.brand) +
                 ' lists this as non-fusible, for stained glass or mosaic. It is not tested ' +
                 'compatible and should not go in a fusing layup.</div>';
          }
        }
        if (c.notes) h += '<div class="cs-note">' + esc(c.notes) + '</div>';
        if (c.reaction_notes) h += '<div class="cs-note">' + esc(c.reaction_notes) + '</div>';
        return h;
      }

      function formStrip(c) {
        if (!c.forms) return '';
        if (mode === 'kiln') {
          return Object.keys(KILN_FORM_ABBR).filter(function (k) { return c.forms[k]; })
            .map(function (k) { return KILN_FORM_ABBR[k]; }).join(' ');
        }
        return HOT_FORM_ORDER.filter(function (k) { return c.forms[k]; })
          .map(function (k) { return HOT_FORM_ABBR[k]; }).join(' ');
      }

      function tone(c) {
        if (mode === 'kiln') return CHEM_TONE[c.chemistry] || '';
        if (c.strikes && c.reduces) return 'both';
        if (c.strikes) return 'strike';
        if (c.reduces) return 'reduce';
        return '';
      }

      function render() {
        var hits = colors.filter(matches);
        countEl.textContent = hits.length + (hits.length === 1 ? ' color' : ' colors');
        listEl.innerHTML = '';
        if (!hits.length) {
          listEl.innerHTML = '<li class="cs-empty"><b>Nothing matches that.</b>' +
            'Try a color code, part of a name, or drop a filter.</li>';
          return;
        }
        var frag = document.createDocumentFragment();
        hits.forEach(function (c) {
          var li = document.createElement('li');
          li.className = 'cs-row';
          li.dataset.tone = tone(c);
          li.dataset.brandi = String(brands.indexOf(c.brand));

          var btn = document.createElement('button');
          btn.className = 'cs-rowbtn';
          btn.type = 'button';
          btn.setAttribute('aria-expanded', 'false');
          var sub = mode === 'kiln'
            ? (CAT_LABEL[c.category] || c.category) +
              (c.chemistry && c.chemistry !== 'unclassified'
                ? ' \u00b7 ' + CHEM_LABEL[c.chemistry] : '')
            : (OP_LABEL_HOT[c.opacity] || c.opacity) +
              (c.german_name ? ' \u00b7 ' + c.german_name : '') +
              (behLabel(c) ? ' \u00b7 ' + behLabel(c) : '') +
              (c.leadfree ? ' \u00b7 Lead-free' : '');
          btn.innerHTML =
            '<span class="cs-code">' + esc(c.code) + '</span>' +
            '<span class="cs-nm">' + esc(c.name) + '</span>' +
            '<span class="cs-forms">' + formStrip(c) + '</span>' +
            '<span class="cs-sub"><span class="cs-brand">' + esc(c.brand) + '</span> \u00b7 ' +
            esc(sub) + '</span>';

          var det = document.createElement('div');
          det.className = 'cs-detail';
          det.hidden = true;
          btn.addEventListener('click', function () {
            if (!det.hidden) {
              det.hidden = true;
              btn.setAttribute('aria-expanded', 'false');
            } else {
              if (!det.dataset.built) { det.innerHTML = detail(c); det.dataset.built = '1'; }
              det.hidden = false;
              btn.setAttribute('aria-expanded', 'true');
            }
          });
          li.appendChild(btn);
          li.appendChild(det);
          frag.appendChild(li);
        });
        listEl.appendChild(frag);
      }

      var t;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { state.q = input.value.trim(); sync(); render(); }, 110);
      });
      clearBtn.addEventListener('click', function () {
        state.q = '';
        GROUPS.forEach(function (g) { state[g.key] = null; });
        input.value = '';
        sync(); render(); input.focus();
      });

      sync();
      render();
    }
  }

  global.ColorSearch = { mount: mount };
}(window));
