(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var out$ = typeof exports != 'undefined' && exports || typeof define != 'undefined' && {} || this;

  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

  function isElement(obj) {
    return obj instanceof HTMLElement || obj instanceof SVGElement;
  }

  function requireDomNode(el) {
    if (!isElement(el)) {
      throw new Error('an HTMLElement or SVGElement is required; got ' + el);
    }
  }

  function isExternal(url) {
    return url && url.lastIndexOf('http',0) == 0 && url.lastIndexOf(window.location.host) == -1;
  }

  function inlineImages(el, callback) {
    requireDomNode(el);

    var images = el.querySelectorAll('image'),
        left = images.length,
        checkDone = function() {
          if (left === 0) {
            callback();
          }
        };

    checkDone();
    for (var i = 0; i < images.length; i++) {
      (function(image) {
        var href = image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
        if (href) {
          if (isExternal(href.value)) {
            console.warn("Cannot render embedded images linking to external hosts: "+href.value);
            return;
          }
        }
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();
        href = href || image.getAttribute('href');
        if (href) {
          img.src = href;
          img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            image.setAttributeNS("http://www.w3.org/1999/xlink", "href", canvas.toDataURL('image/png'));
            left--;
            checkDone();
          }
          img.onerror = function() {
            console.log("Could not load "+href);
            left--;
            checkDone();
          }
        } else {
          left--;
          checkDone();
        }
      })(images[i]);
    }
  }

  function styles(el, selectorRemap) {
    var css = "";
    var sheets = document.styleSheets;

    for (var i = 0; i < sheets.length; i++) {
      try {
        var rules = sheets[i].cssRules;
      } catch (e) {
        console.warn("Stylesheet could not be loaded: "+sheets[i].href);
        continue;
      }

      if (rules != null) {
        for (var j = 0; j < rules.length; j++) {
          var rule = rules[j];
          if (typeof(rule.style) != "undefined") {
            var match, selectorText;

            try {
              selectorText = rule.selectorText;
            } catch(err) {
              console.warn('The following CSS rule has an invalid selector: "' + rule + '"', err);
            }

            try {
              if (selectorText) {
                match = el.querySelector(selectorText);
              }
            } catch(err) {
              console.warn('Invalid CSS selector "' + selectorText + '"', err);
            }

            if (match) {
              var selector = selectorRemap ? selectorRemap(rule.selectorText) : rule.selectorText;
              css += selector + " { " + rule.style.cssText + " }\n";
            } else if(rule.cssText.match(/^@font-face/)) {
              css += rule.cssText + '\n';
            }
          }
        }
      }
    }
    return css;
  }

  function getDimension(el, clone, dim) {
    var v = (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
      (clone.getAttribute(dim) !== null && !clone.getAttribute(dim).match(/%$/) && parseInt(clone.getAttribute(dim))) ||
      el.getBoundingClientRect()[dim] ||
      parseInt(clone.style[dim]) ||
      parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return (typeof v === 'undefined' || v === null || isNaN(parseFloat(v))) ? 0 : v;
  }

  function reEncode(data) {
    data = encodeURIComponent(data);
    data = data.replace(/%([0-9A-F]{2})/g, function(match, p1) {
      var c = String.fromCharCode('0x'+p1);
      return c === '%' ? '%25' : c;
    });
    return decodeURIComponent(data);
  }

  out$.svgAsDataUri = function(el, options, cb) {
    requireDomNode(el);

    options = options || {};
    options.scale = options.scale || 1;
    options.responsive = options.responsive || false;
    var xmlns = "http://www.w3.org/2000/xmlns/";

    inlineImages(el, function() {
      var outer = document.createElement("div");
      var clone = el.cloneNode(true);
      var width, height;
      if(el.tagName == 'svg') {
        width = options.width || getDimension(el, clone, 'width');
        height = options.height || getDimension(el, clone, 'height');
      } else if(el.getBBox) {
        var box = el.getBBox();
        width = box.x + box.width;
        height = box.y + box.height;
        clone.setAttribute('transform', clone.getAttribute('transform').replace(/translate\(.*?\)/, ''));

        var svg = document.createElementNS('http://www.w3.org/2000/svg','svg')
        svg.appendChild(clone)
        clone = svg;
      } else {
        console.error('Attempted to render non-SVG element', el);
        return;
      }

      clone.setAttribute("version", "1.1");
      if (!clone.getAttribute('xmlns')) {
        clone.setAttributeNS(xmlns, "xmlns", "http://www.w3.org/2000/svg");
      }
      if (!clone.getAttribute('xmlns:xlink')) {
        clone.setAttributeNS(xmlns, "xmlns:xlink", "http://www.w3.org/1999/xlink");
      }

      if (options.responsive) {
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      } else {
        clone.setAttribute("width", width * options.scale);
        clone.setAttribute("height", height * options.scale);
      }

      clone.setAttribute("viewBox", [
        options.left || 0,
        options.top || 0,
        width,
        height
      ].join(" "));

      var fos = clone.querySelectorAll('foreignObject > *');
      for (var i = 0; i < fos.length; i++) {
        fos[i].setAttributeNS(xmlns, "xmlns", "http://www.w3.org/1999/xhtml");
      }

      outer.appendChild(clone);

      var css = styles(el, options.selectorRemap);
      var s = document.createElement('style');
      s.setAttribute('type', 'text/css');
      s.innerHTML = "<![CDATA[\n" + css + "\n]]>";
      var defs = document.createElement('defs');
      defs.appendChild(s);
      clone.insertBefore(defs, clone.firstChild);

      var svg = doctype + outer.innerHTML;
      var uri = 'data:image/svg+xml;base64,' + window.btoa(reEncode(svg));
      if (cb) {
        cb(uri);
      }
    });
  }

  out$.svgAsPngUri = function(el, options, cb) {
    requireDomNode(el);

    out$.svgAsDataUri(el, options, function(uri) {
      var image = new Image();
      image.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        if(options && options.backgroundColor){
          context.fillStyle = options.backgroundColor;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(image, 0, 0);
        var a = document.createElement('a'), png;
        try {
          png = canvas.toDataURL('image/png');
        } catch (e) {
          if ((typeof SecurityError !== 'undefined' && e instanceof SecurityError) || e.name == "SecurityError") {
            console.error("Rendered SVG images cannot be downloaded in this browser.");
            return;
          } else {
            throw e;
          }
        }
        cb(png);
      }
      image.onerror = function(error) {
        console.error('There was an error loading the data URI as an image', error);
      }
      image.src = uri;
    });
  }

  function download(name, uri) {
    var a = document.createElement('a');
    a.download = name;
    a.href = uri;
    document.body.appendChild(a);
    a.addEventListener("click", function(e) {
      a.parentNode.removeChild(a);
    });
    a.click();
  }

  out$.saveSvg = function(el, name, options) {
    requireDomNode(el);

    options = options || {};
    out$.svgAsDataUri(el, options, function(uri) {
      download(name, uri);
    });
  }

  out$.saveSvgAsPng = function(el, name, options) {
    requireDomNode(el);

    options = options || {};
    out$.svgAsPngUri(el, options, function(uri) {
      download(name, uri);
    });
  }

  // if define is defined create as an AMD module
  if (typeof define !== 'undefined') {
    define(function() {
      return out$;
    });
  }
})();

},{}],2:[function(require,module,exports){
    var saveSvgAsPng = require("save-svg-as-png");
    var submitBtn = $('#submit-btn');
    var preview = document.getElementById('svg-preview');
    var previewHolder = document.getElementById('preview-holder');
    var svgSlugInput = $("#svg-slug");
    var slugOutputHolder = document.getElementById('slug-holder');
    var slugOutput = document.getElementById('slug-output');
    var uploadBtnHolder = document.getElementById('upload-btn-holder');
    var msgHolder = document.getElementById('message-holder');
    var noSlugWarning = document.getElementById('no-slug-warning');
    var slug = "";
    var $input = $('#file');
    var $label = $('#uploader-label');
    var droppedFiles = false;

    // Whether drag and drop uploading is supported
    var isAdvancedUpload = function() {
        var div = document.createElement('div');
        return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
    }();

    var showFileName = function(files) {
        $label.text(files[ 0 ].name);
    };

    // Reads the uploaded file and renders it into a div
    // Which is used for the rest of the upload process
    var renderSVGPreview = function(files) {
        // TODO: won't need to do this once we can ensure just one file is uploaded
        var file = files[0],
            reader = new FileReader();

        $label.removeClass('alert-danger');
        reader.readAsText(file, "UTF-8");
        reader.onload = function(evt) {
            $svgUploaderForm.addClass('has-content');
            previewHolder.classList.remove('hidden');
            preview.innerHTML = evt.target.result;

            // Fill in the slug, if nothing present
            if (document.getElementById('svg-slug').value.trim() === '') {
                var fileSlug = file.name.replace('.svg', '');
                svgSlugInput.val(fileSlug);
                updateSlug();
            }

            validateSlug();
        };

    };

    var validateSVG = function(files) {
        // Validate that the uploaded file is actually an SVG file
        if (files[0].type === "image/svg+xml") {
            showFileName(files);
            renderSVGPreview(files);
        } else {
            $label.text("Your uploaded file must be an SVG").addClass('alert-danger');
        }
    };

    var $svgUploaderForm = $('#draggable-uploader');

    if (isAdvancedUpload) {
        $svgUploaderForm.addClass('has-advanced-upload');
        $svgUploaderForm.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
        })
        .on('dragover dragenter', function() {
            $svgUploaderForm.addClass('is-dragover');
        })
        .on('dragleave dragend drop', function() {
            $svgUploaderForm.removeClass('is-dragover');
        })
        .on('drop', function(e) {
            droppedFiles = e.originalEvent.dataTransfer.files;
            validateSVG(droppedFiles)
        });
    }

    $input.on('change', function(e) {
        validateSVG(e.target.files);
    });




    function slugify(v){
        var slug = v.toLowerCase();
        // Switch spaces to slugs
        slug = slug.replace(/\s/g, "-");
        // Trim special characters
        slug = slug.replace(/[^\w-]+/g, "");
        return slug;
    }

    function sendToP2P(slug, uri, ratio) {
        return new Promise(function(resolve, reject) {
            var params = "slug=" + slug + "&ratio=" + ratio + "&source=blurbinator&data=" +  encodeURIComponent(uri);
            var postrequest = new XMLHttpRequest();
            postrequest.open("POST", "../send-to-p2p/", true);
            postrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            postrequest.onload = function() {
                if (postrequest.status == 200) {
                    // Probably should have something render on success
                    resolve(postrequest.response);
                } else if (postrequest.status == 500) {
                    reject(postrequest.response);
                }
            };
            var msg = "<p>Uploading to P2P...</p>";
            uploadBtnHolder.insertAdjacentHTML('beforeend',msg);
            postrequest.send(params);
        });
    }

    function sendToS3(filename, uri) {
        return new Promise(function(resolve, reject) {
            var params = "name=" + filename + "&filedata=" + encodeURIComponent(uri);
            var postrequest = new XMLHttpRequest();
            postrequest.open("POST", "../save-to-s3/", true);
            postrequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            postrequest.onload = function() {
                if (postrequest.status == 200) {
                    resolve(postrequest.response);
                }
            };

            postrequest.send(params);
        });
    }

    submitBtn.on('click', function(e) {
        e.preventDefault();
        var w = preview.clientWidth,
            h = preview.clientHeight,
            svg = preview.firstElementChild,
            ratio = ((h / w) * 100).toFixed(2).toString();

        includeFontFace(svg);
        svg = p2pUnjank(svg);

        var uri = btoa(encodeURIComponent(svg));

        // Replaces upload button with confirmation message
        function onSuccess() {
            var msg = "<p>Your SVG has been successfully saved to P2P. You can view your chart at <a target='_blank' href='../get-p2p-admin-url/?slug=" + slug + "'><strong>" + slug + "</strong></a></p><a href='' class='btn btn-large'>Upload another SVG</a>";
            uploadBtnHolder.classList.add('hidden');
            msgHolder.innerHTML = msg;
        }

        // Replaces upload button with error message
        function onError() {
            var msg = "<p class='alert alert-danger'>There was an error saving to P2P.</p>";
            uploadBtnHolder.classList.add('hidden');
            msgHolder.innerHTML = msg;
        }

        // Save PNG as data URI
        saveSvgAsPng.svgAsPngUri(preview.firstElementChild, { scale: 2.0 }, function(pngUri){
            var pngFilename = slug + ".png";
            // save image to S3
            sendToS3(pngFilename, pngUri)
                .then(sendToP2P(slug, uri, ratio))
                .then(onSuccess)
                .catch(onError);
        });
    });

    function updateSlug() {
        slug = slugify(document.getElementById('svg-slug').value);
        slugOutput.innerHTML = slug;
        validateSlug();
    }

    svgSlugInput.on('input propertychange', updateSlug);

    function validateSlug() {
        if (document.getElementById('svg-slug').value.trim() !== '') {
            noSlugWarning.classList.add('hidden');
            slugOutputHolder.classList.remove('hidden');
            if (droppedFiles) {
                uploadBtnHolder.classList.remove('hidden');
            }
        } else {
            noSlugWarning.classList.remove('hidden');
            slugOutputHolder.classList.add('hidden');
            uploadBtnHolder.classList.add('hidden');
        }
    }

    function includeFontFace(svg) {
        var styleTag = svg.getElementsByTagName('style')[0];
        var fontFaceString = "\
@font-face {\
    font-family: 'BentonGothic-Regular';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothic-Medium';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothic-Bold';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-bold.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-bold.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothic-Black';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-black.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-black.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothicTab-Regular';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothic-RegularItalic';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular-italic.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-regular-italic.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}\
@font-face {\
    font-family: 'BentonGothic-BoldItalic';\
    src: url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-bold-italic.woff') format('woff'),\
        url('https://s3.amazonaws.com/latimes-datadesk-template/fonts/0.5.0/benton-gothic-bold-italic.ttf') format('truetype');\
    font-weight:normal;\
    font-style:normal;\
}";


        if (typeof styleTag !== 'undefined') {
            styleTag.innerHTML += fontFaceString;
        } else {
            styleTag = document.createElement('style');
            styleTag.setAttribute('type', 'text/css');
            styleTag.innerHTML = fontFaceString;
        }
    }


    // Check if the SVG has an image child element, and if so,
    // Can we replace it with a
    function p2pUnjank(svg) {
        var svgClone = svg.cloneNode(true);

        // Set xml:space to default, to prevent weird spacing issues in Firefox.
        svgClone.setAttribute('xml:space', 'default');

        // var img = svgClone.querySelector('image');
        var images = svgClone.querySelectorAll('image');

        if (images.length > 0) {
            for (var i = 0; i < images.length; i++) {
                var img = images[i];

                // Get the parent node of the image
                var par = img.parentNode;

                // Clone the attributes of the image element
                var b64img = img.getAttribute('xlink:href');
                var imgHeight = img.getAttribute('height');
                var imgWidth = img.getAttribute('width');
                var transform = img.getAttribute('transform');

                // Create a rect tag, copy over the image attributes, and remove the image
                var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.id = 'reference-rect-' + i;
                rect.setAttribute('class', 'reference-rect');
                rect.setAttribute('xlink:href', b64img);
                rect.setAttributeNS(null, 'height', imgHeight);
                rect.setAttributeNS(null, 'width', imgWidth);
                rect.setAttributeNS(null, 'transform', transform);
                par.appendChild(rect);
                par.removeChild(img);

            }
        }

        // Create a script that converts the rect BACK into an image,
        // with all its corresponding attributes, when this is rendered in p2p
        var script = document.createElement('script');
        script.text = document.getElementById('unjank-script-template').text;
        svgClone.appendChild(script);

        return svgClone.outerHTML;

    }

},{"save-svg-as-png":1}]},{},[2]);
