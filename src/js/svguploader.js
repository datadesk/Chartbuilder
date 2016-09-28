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
