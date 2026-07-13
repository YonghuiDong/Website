(function () {
  var selector = ".main img";
  var imageFile = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;
  var overlay;
  var overlayImage;
  var overlayCaption;
  var closeButton;

  function matches(element, selectorText) {
    var fn = element.matches || element.msMatchesSelector || element.webkitMatchesSelector;
    return fn && fn.call(element, selectorText);
  }

  function closest(element, selectorText) {
    while (element && element.nodeType === 1) {
      if (matches(element, selectorText)) return element;
      element = element.parentElement;
    }
    return null;
  }

  function imageSource(image) {
    var parentLink = closest(image, "a");

    if (parentLink && parentLink.href && imageFile.test(parentLink.href)) {
      return parentLink.href;
    }

    return image.currentSrc || image.src;
  }

  function imageCaption(image) {
    var figure = closest(image, "figure");
    var figcaption = figure ? figure.querySelector("figcaption") : null;

    if (figcaption && figcaption.textContent.trim()) {
      return figcaption.textContent.trim();
    }

    return image.getAttribute("alt") || "";
  }

  function shouldEnhance(image) {
    var parentLink = closest(image, "a");
    var width = image.naturalWidth || image.width;
    var height = image.naturalHeight || image.height;

    if (!image.src) return false;
    if (closest(image, ".masthead") || closest(image, ".image-lightbox")) return false;
    if (image.classList.contains("inline-icon") || image.classList.contains("site-logo")) return false;
    if (parentLink && parentLink.href && !imageFile.test(parentLink.href)) return false;
    if (width && height && width < 120 && height < 120) return false;

    return true;
  }

  function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "image-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Expanded image");

    closeButton = document.createElement("button");
    closeButton.className = "image-lightbox__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close expanded image");

    overlayImage = document.createElement("img");
    overlayImage.className = "image-lightbox__image";
    overlayImage.alt = "";

    overlayCaption = document.createElement("div");
    overlayCaption.className = "image-lightbox__caption";
    overlayCaption.hidden = true;

    overlay.appendChild(closeButton);
    overlay.appendChild(overlayImage);
    overlay.appendChild(overlayCaption);
    document.body.appendChild(overlay);

    overlayImage.addEventListener("load", fitOverlayImage);
    closeButton.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeOverlay();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        closeOverlay();
      }
    });
    window.addEventListener("resize", function () {
      if (overlay.classList.contains("is-open")) fitOverlayImage();
    });
  }

  function fitOverlayImage() {
    var maxWidth;
    var maxHeight;
    var scale;

    if (!overlayImage || !overlayImage.naturalWidth || !overlayImage.naturalHeight) return;

    maxWidth = Math.min(window.innerWidth * 0.96, 1400);
    maxHeight = window.innerHeight * 0.88;
    scale = Math.min(maxWidth / overlayImage.naturalWidth, maxHeight / overlayImage.naturalHeight);

    if (!isFinite(scale) || scale <= 0) return;

    overlayImage.style.width = Math.round(overlayImage.naturalWidth * scale) + "px";
    overlayImage.style.height = Math.round(overlayImage.naturalHeight * scale) + "px";
  }

  function openOverlay(image, event) {
    var captionText;

    if (event) event.preventDefault();
    ensureOverlay();

    overlayImage.style.width = "";
    overlayImage.style.height = "";
    overlayImage.src = imageSource(image);
    overlayImage.alt = image.getAttribute("alt") || "";
    if (overlayImage.complete) fitOverlayImage();

    captionText = imageCaption(image);
    overlayCaption.textContent = captionText;
    overlayCaption.hidden = !captionText;

    overlay.classList.add("is-open");
    document.body.classList.add("has-image-lightbox");

    try {
      closeButton.focus({ preventScroll: true });
    } catch (error) {
      closeButton.focus();
    }
  }

  function closeOverlay() {
    if (!overlay) return;

    overlay.classList.remove("is-open");
    document.body.classList.remove("has-image-lightbox");
    overlayImage.removeAttribute("src");
    overlayImage.style.width = "";
    overlayImage.style.height = "";
    overlayCaption.hidden = true;
  }

  function enhanceImages() {
    var images = document.querySelectorAll(selector);
    var i;

    for (i = 0; i < images.length; i += 1) {
      (function (image) {
        if (!shouldEnhance(image) || image.dataset.lightboxImage) return;

        image.dataset.lightboxImage = "true";
        image.setAttribute("role", "button");
        image.setAttribute("tabindex", "0");
        image.setAttribute("aria-label", "Open image larger");

        image.addEventListener("click", function (event) {
          openOverlay(image, event);
        });

        image.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            openOverlay(image, event);
          }
        });
      })(images[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceImages);
  } else {
    enhanceImages();
  }
})();
